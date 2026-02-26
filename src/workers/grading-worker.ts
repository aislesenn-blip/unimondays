import { Job } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { readFile } from '@/lib/storage';
import { ocrDocument } from '@/lib/ai/gemini';
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
          lecturer: true
        }
      }
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
      // PARALLEL TASK 1: Submission OCR
      const submissionOcrTask = async (): Promise<string> => {
          if (submission.ocrText) {
              console.log(`[OCR_SKIP] Submission already OCR'd. Length: ${submission.ocrText.length}`);
              return submission.ocrText;
          }
          if (!submission.filePath) throw new Error("No file path and no OCR text for submission.");

          try {
              console.log(`[SUPABASE_FETCH] Submission File: ${submission.filePath}`);
              const buffer = await readFile(submission.filePath, 'exam_pdfs');

              const mimeType = submission.filePath.toLowerCase().endsWith('.png') ? 'image/png' :
                               submission.filePath.toLowerCase().endsWith('.jpg') || submission.filePath.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' :
                               'application/pdf';

              console.log(`[OCR_START] Sending ${buffer.length} bytes to Gemini (${mimeType})...`);
              const text = await ocrDocument(buffer, mimeType);
              console.log(`[OCR_SUCCESS] Extracted ${text.length} characters.`);

              // Save immediately
              await prisma.submission.update({
                  where: { id: submissionId },
                  data: { ocrText: text, status: 'PROCESSING' }
              });
              return text;
          } catch (ocrError: any) {
              console.error("[OCR_FATAL_ERROR]", ocrError);
              throw new Error(`OCR Processing Failed: ${ocrError.message}`);
          }
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

          if (ms.startsWith('rubrics/') || ms.includes('/') || ms.toLowerCase().endsWith('.pdf')) {
              try {
                  console.log(`[SUPABASE_FETCH] Marking Scheme: ${ms}`);
                  const buffer = await readFile(ms, 'exam_pdfs');
                  const mimeType = ms.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';
                  const text = await ocrDocument(buffer, mimeType);
                  console.log(`[OCR_SUCCESS] Marking Scheme extracted: ${text.length} chars.`);
                  return text;
              } catch (e: any) {
                  console.warn("[OCR_WARN] Marking Scheme OCR failed.", e.message);
                  return undefined;
              }
          }
          return ms;
      };

      // EXECUTE PARALLEL TASKS
      let ocrText: string;
      let rubricContent: string;
      let markingSchemeText: string | undefined;

      try {
          [ocrText, rubricContent, markingSchemeText] = await Promise.all([
              submissionOcrTask(),
              rubricOcrTask(),
              markingSchemeOcrTask()
          ]);
      } catch (e: any) {
          throw new Error(`Prerequisite Check Failed: ${e.message}`);
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

      const config: GradeConfig = {
        strictness: strictnessVal,
        markingScheme: markingSchemeText,
        lecturerNotes: submission.workSession.instructions || undefined,
        calibration: calibrationSettings
      };

      // 3. Grade (Zero-Trust Tracing)
      const totalMarks = submission.workSession.totalMarks || 100;

      console.log(`[AI_GRADE] Invoking DeepSeek for Job ${job.id}`);
      console.log(`- Config: Strictness=${config.strictness}`);
      console.log(`- Payload: Submission=${ocrText.length} chars, Rubric=${rubricContent.length} chars`);

      let result: GradingResult;

      // Simulator Check
      if (!process.env.DEEPSEEK_API_KEY) {
          console.log(`[Simulator] Using DeepSeek Simulator`);
          const sim = await simulateDeepSeekCall(ocrText);
          if (sim.breakdown === "INVALID_JSON_RESPONSE") throw new Error("AI returned malformed JSON (Simulator)");

          result = {
              totalScore: sim.score,
              breakdown: sim.breakdown as any,
              aiReasoning: sim.reasoning,
              confidence: sim.confidence,
              strengths: ["Consistency", "Clarity"],
              weaknesses: ["Calculation Error"],
              improvement: "Check arithmetic."
          };
      } else {
          result = await gradeSubmission(ocrText, rubricContent, totalMarks, config);
          console.log(`[AI_SUCCESS] Graded. Score: ${result.totalScore}/${totalMarks}`);
      }

      // 4. Save Score & Feedback
      if (typeof result.totalScore !== 'number') {
          throw new Error("Invalid AI Result: Missing totalScore");
      }

      const breakdownStr = JSON.stringify(result.breakdown);

      await prisma.score.upsert({
        where: { submissionId: submission.id },
        update: {
          totalMarks: result.totalScore,
          breakdown: breakdownStr,
          remarks: result.aiReasoning,
          gradedAt: new Date()
        },
        create: {
          submissionId: submission.id,
          totalMarks: result.totalScore,
          breakdown: breakdownStr,
          remarks: result.aiReasoning
        }
      });

      // 5. Update Submission Status
      const status = result.confidence < 70 ? 'FLAGGED' : 'GRADED';

      const feedbackStr = JSON.stringify({
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
        improvement: result.improvement || "No specific advice."
      });

      await prisma.submission.update({
        where: { id: submission.id },
        data: {
          status,
          confidenceScore: result.confidence,
          feedback: feedbackStr
        }
      });

      // Create Audit Log
      await prisma.auditLog.create({
        data: {
          userId: submission.userId,
          action: 'GRADED',
          details: `Submission for ${submission.workSession.title} graded. Score: ${result.totalScore}`,
          severity: 'INFO'
        }
      });

      // Increment Lecturer Quota
      if (submission.workSession.lecturerId) {
        await prisma.user.update({
            where: { id: submission.workSession.lecturerId },
            data: { used: { increment: 1 } }
        }).catch(e => console.warn(`[DB_WARN] Failed to increment quota`, e));
      }

      return {
        success: true,
        score: result.totalScore,
        status
      };

  } catch (fatalError: any) {
      console.error(`[AI_FATAL_ERROR] Pipeline Crashed:`, fatalError);

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
