import { Job } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { readFile } from '@/lib/storage';
import { ocrDocument, extractPagesMultimodal, PageData } from '@/lib/ai/gemini';
import { gradeSubmission, GradeConfig, GradingResult } from '@/lib/ai/deepseek';
import { simulateDeepSeekCall } from '@/lib/ai/simulator';

export async function handleAiGrade(job: Job) {
  let data: any;
  try {
     data = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
  } catch (e) {
     throw new Error("Invalid job payload JSON");
  }
  const { submissionId } = data;

  if (!submissionId) {
    throw new Error("Missing submissionId in job payload.");
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      workSession: {
        include: {
          lecturer: true,
          class: true
        }
      },
      user: true
    }
  });

  if (!submission) {
    throw new Error(`Submission ${submissionId} not found.`);
  }

  if (!submission.workSession) {
    throw new Error(`WorkSession not found for submission ${submissionId}.`);
  }

  console.log(`[GRADING_START] Submission ID: ${submissionId}, WorkSession: ${submission.workSession.title}`);

  try {
      // STAGE 1: PARALLEL MULTIMODAL EXTRACTION (TRANSCRIPTION ONLY)
      const submissionExtractionTask = async (): Promise<{ rawText: string }> => {
          if (!submission.filePath) throw new Error("No file path for submission.");

          console.log(`[SUPABASE_FETCH] Submission File: ${submission.filePath}`);
          const buffer = await readFile(submission.filePath, 'exam_pdfs');

          // 1. Multimodal Page Extraction
          console.log(`[MULTIMODAL_START] Extracting pages from PDF buffer...`);
          const pages: PageData[] = await extractPagesMultimodal(buffer);

          // 2. Holistic Context Assembly (Stage 2 Prep)
          const rawText = pages.map(p => p.extractedText).join('\n\n--- PAGE BREAK ---\n\n');

          // Cache the extraction
          await prisma.submission.update({
              where: { id: submissionId },
              data: { ocrText: rawText, status: 'PROCESSING' }
          });

          return { rawText };
      };

      // PARALLEL TASK 2: Rubric OCR (with Caching)
      const rubricOcrTask = async (): Promise<string> => {
          if (submission.workSession.rubric) return submission.workSession.rubric;
          if (!submission.workSession.rubricUrl) return "Grade based on general academic standards and common sense.";

          try {
              console.log(`[SUPABASE_FETCH] Rubric File: ${submission.workSession.rubricUrl}`);
              const buffer = await readFile(submission.workSession.rubricUrl, 'exam_pdfs');
              const mimeType = submission.workSession.rubricUrl.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';

              console.log(`[OCR_START] Processing Rubric...`);
              const text = await ocrDocument(buffer, mimeType);
              console.log(`[OCR_SUCCESS] Rubric extracted: ${text.length} chars.`);

              if (text && text.length > 50) {
                  await prisma.workSession.update({
                      where: { id: submission.workSession.id },
                      data: { rubric: text }
                  }).catch(e => console.warn("[DB_WARN] Failed to cache rubric", e));
              }
              return text;
          } catch (e: any) {
              console.warn("[OCR_WARN] Rubric OCR failed, defaulting.", e.message);
              return "Grade based on general academic standards and common sense.";
          }
      };

      // PARALLEL TASK 3: Marking Scheme OCR
      const markingSchemeOcrTask = async (): Promise<string | undefined> => {
          const ms = submission.workSession.markingScheme;
          if (!ms) return undefined;

          // Check for URL-like paths (uploaded files) including 'rubrics/', 'bulk_uploads/', or pdf extensions
          if (ms.startsWith('rubrics/') || ms.startsWith('bulk_uploads/') || ms.includes('/') || ms.toLowerCase().endsWith('.pdf')) {
              try {
                  console.log(`[SUPABASE_FETCH] Marking Scheme: ${ms}`);
                  const buffer = await readFile(ms, 'exam_pdfs');
                  const mimeType = ms.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';
                  const text = await ocrDocument(buffer, mimeType);
                  return text;
              } catch (e: any) {
                  console.warn("[OCR_WARN] Marking Scheme OCR failed.", e.message);
                  return undefined;
              }
          }
          return ms;
      };

      // EXECUTE INITIAL PARALLEL TASKS
      let extractedData: { rawText: string };
      let rubricContent: string;
      let markingSchemeText: string | undefined;

      try {
          [extractedData, rubricContent, markingSchemeText] = await Promise.all([
              submissionExtractionTask(),
              submission.workSession.rubric ? Promise.resolve(submission.workSession.rubric) : rubricOcrTask(),
              markingSchemeOcrTask()
          ]);
      } catch (e: any) {
          throw new Error(`Prerequisite Check Failed: ${e.message}`);
      }

      // Explicitly cache rubric OCR result to entirely bypass rubricOcrTask for future jobs
      if (!submission.workSession.rubric && rubricContent && rubricContent.length > 50) {
          await prisma.workSession.update({
              where: { id: submission.workSession.id },
              data: { rubric: rubricContent }
          }).catch(e => console.warn("[DB_WARN] Failed to cache rubricContent", e));
      }

      const { rawText } = extractedData;

      // Identity Extraction: Scavenge the raw text for a registration number
      const idMatch = rawText.match(/(?:REGISTRATION NUMBER|REG NO|STUDENT ID)[\s:]*([A-Za-z0-9\-]+)/i);
      let extractedStudentId = idMatch ? idMatch[1] : undefined;

      if (extractedStudentId && !submission.studentRegNo) {
          await prisma.submission.update({
              where: { id: submissionId },
              data: { studentRegNo: extractedStudentId }
          });
          submission.studentRegNo = extractedStudentId; // Update local state to prevent false GHOST flagging later
      }

      // Prepare Config
      const strictnessMap: Record<string, number> = {
        'LENIENT': 0.8, 'MODERATE': 1.0, 'STRICT': 1.2
      };
      const strictnessVal = strictnessMap[submission.workSession.strictness || 'MODERATE'] || 1.0;

      let calibrationSettings;
      try {
          calibrationSettings = submission.workSession.calibration ? JSON.parse(submission.workSession.calibration) : undefined;
      } catch (e) {}

      // Build Context String
      const lecturerName = submission.workSession.lecturer.fullName || "Lecturer";
      const className = submission.workSession.class ? `${submission.workSession.class.code} - ${submission.workSession.class.name}` : "Unknown Class";
      const studentId = submission.studentRegNo || submission.user?.fullName || "Student";
      const sessionTitle = submission.workSession.title;

      const contextString = `
You are grading on behalf of ${lecturerName}.
Course: ${className}.
Assessment: ${sessionTitle}.
Student Identifier: ${studentId}.
`;

      const config: GradeConfig = {
        strictness: strictnessVal,
        markingScheme: markingSchemeText,
        lecturerNotes: submission.workSession.instructions || undefined,
        calibration: calibrationSettings,
        context: contextString
      };

      // STAGE 2: COMBINED TEXT GRADING (HOLISTIC CONTEXT)
      const totalMarks = submission.workSession.totalMarks || 100;
      console.log(`[AI_GRADE] Starting Holistic Text-Only Grading for Submission ${submissionId}.`);

      let result: GradingResult;

      try {
          if (!process.env.DEEPSEEK_API_KEY) {
              console.log(`[Simulator] Using DeepSeek Simulator`);
              const sim = await simulateDeepSeekCall(rawText);
              result = {
                  totalScore: sim.score,
                  breakdown: sim.breakdown.map((b: any) => ({
                      ...b,
                      question_id: b.question,
                      short_evidence: "SIMULATED_SNIPPET"
                  })),
                  aiReasoning: sim.reasoning,
                  confidence: sim.confidence,
                  detectedIdentity: extractedStudentId || "SIMULATED_ID"
              };
          } else {
              result = await gradeSubmission(
                  rawText,
                  rubricContent,
                  totalMarks,
                  config,
                  undefined, // Force text-only to avoid context overflow with images
                  undefined
              );
              console.log(`[AI_SUCCESS] Graded. Score: ${result.totalScore}/${totalMarks}`);
          }
      } catch (gradingError: any) {
          console.error(`[AI_GRADING_ERROR] Failed to grade holistic text:`, gradingError.message);
          throw new Error(`Holistic Grading Failed: ${gradingError.message}`);
      }

      if (!result.breakdown || !Array.isArray(result.breakdown)) {
          throw new Error("Invalid AI Result: Missing or malformed breakdown array");
      }

      // SILENT FILTERING: Map back to Prisma expected structure
      let validBreakdowns = result.breakdown.map((item: any) => ({
          ...item,
          isRelevant: true,
          mappedRubricQuestion: item.question_id || item.question,
          evidenceSnippet: item.short_evidence || item.evidenceSnippet
      }));

      let aggregatedScore = 0;
      validBreakdowns.forEach(item => {
          aggregatedScore += item.score;
      });

      const aggregatedConfidence = result.confidence ?? 95;
      const aggregatedReasoning = result.aiReasoning || "Holistic grading completed.";
      const aggregatedIdentity = extractedStudentId || result.detectedIdentity || "UNIDENTIFIED_IDENTITY";

      // 4. Save Score & Feedback
      const breakdownStr = JSON.stringify(validBreakdowns);

      await prisma.score.upsert({
        where: { submissionId: submission.id },
        update: {
          totalMarks: aggregatedScore,
          breakdown: breakdownStr,
          remarks: aggregatedReasoning,
          detectedIdentity: aggregatedIdentity,
          gradedAt: new Date()
        },
        create: {
          submissionId: submission.id,
          totalMarks: aggregatedScore,
          breakdown: breakdownStr,
          remarks: aggregatedReasoning,
          detectedIdentity: aggregatedIdentity
        }
      });

      // 5. Update Submission Status (Dynamic Confidence Threshold)
      let status: string;
      const threshold = submission.workSession.confidenceThreshold ?? 85;

      const isContextMissing = !submission.userId && !submission.studentRegNo;

      if (isContextMissing) {
          status = 'FLAGGED';
          console.warn(`[AI_IDENTITY] Unidentified GHOST submission. Flagging for manual review.`);
      } else {
          status = aggregatedConfidence >= threshold ? 'GRADED' : 'FLAGGED';
      }

      console.log(`[AI_CONFIDENCE] Score: ${aggregatedConfidence}, Threshold: ${threshold} -> Status: ${status} (Dynamic Threshold Applied)`);

      const feedbackStr = JSON.stringify({
        strengths: [],
        weaknesses: [],
        improvement: "Review holistic feedback for details."
      });

      await prisma.submission.update({
        where: { id: submission.id },
        data: {
          status,
          confidenceScore: aggregatedConfidence,
          feedback: feedbackStr
        }
      });

      // Create Audit Log
      await prisma.auditLog.create({
        data: {
          userId: submission.userId,
          action: status === 'GRADED' ? 'GRADED' : 'FLAGGED',
          details: `Submission for ${submission.workSession.title} ${status}. Score: ${aggregatedScore}`,
          severity: status === 'GRADED' ? 'INFO' : 'WARNING'
        }
      });

      if (submission.workSession.lecturerId) {
        await prisma.user.update({
            where: { id: submission.workSession.lecturerId },
            data: { used: { increment: 1 } }
        }).catch(e => console.warn(`[DB_WARN] Failed to increment quota`, e));
      }

      return {
        success: true,
        score: aggregatedScore,
        status
      };

  } catch (fatalError: any) {
      console.error(`[AI_FATAL_ERROR] Pipeline Crashed:`, fatalError);

      // RATE LIMIT ARMOR: Do not fail the submission if it's just a rate limit.
      // The queue processor will catch this and retry.
      if (fatalError.message?.includes("RATE_LIMIT_HIT")) {
          throw fatalError;
      }

      // CRITICAL: Update Status to FAILED so UI knows
      await prisma.submission.update({
          where: { id: submissionId },
          data: {
              status: 'FAILED',
              feedback: JSON.stringify({
                  error: `Grading Failed: ${fatalError.message}`,
                  details: fatalError.stack?.substring(0, 200)
              })
          }
      });

      throw fatalError;
  }
}
