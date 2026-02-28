import { Job } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { readFile } from '@/lib/storage';
import { ocrDocument } from '@/lib/ai/gemini';
import { gradeSubmission, GradeConfig, GradingResult } from '@/lib/ai/deepseek';
import { simulateDeepSeekCall } from '@/lib/ai/simulator';
import sharp from 'sharp';

export async function handleAiGrade(job: Job) {
  let data: any;
  try {
     data = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
  } catch (e) {
     console.error("[GRADING FATAL ERROR]: Invalid job payload JSON", e);
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
      // PARALLEL TASK 1: Submission OCR (Return buffer for visual analysis)
      const submissionOcrTask = async (): Promise<{ text: string, buffer: Buffer, mimeType: string }> => {
          if (!submission.filePath) throw new Error("No file path and no OCR text for submission.");

          console.log(`[SUPABASE_FETCH] Submission File: ${submission.filePath}`);
          const buffer = await readFile(submission.filePath, 'exam_pdfs');

          const mimeType = submission.filePath.toLowerCase().endsWith('.png') ? 'image/png' :
                           submission.filePath.toLowerCase().endsWith('.jpg') || submission.filePath.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' :
                           'application/pdf';

          if (submission.ocrText) {
              console.log(`[OCR_SKIP] Submission already OCR'd. Length: ${submission.ocrText.length}`);
              return { text: submission.ocrText, buffer, mimeType };
          }

          // Deep Audit Fix: Vision Pre-processing (Payload Integrity)
          // Ensure images/PDFs are not absurdly large before sending to vision models to prevent "Math Blindspots"
          // If a buffer is > 15MB, we aggressively compress images using sharp.
          let processedBuffer = buffer;
          if (processedBuffer.length > 15 * 1024 * 1024) {
              console.warn(`[VISION_WARN] Submission buffer is extremely large (${(processedBuffer.length / 1024 / 1024).toFixed(2)} MB). Applying compression...`);
              if (mimeType.startsWith('image/')) {
                  try {
                      processedBuffer = await sharp(processedBuffer)
                          .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
                          .jpeg({ quality: 80 })
                          .toBuffer();
                      console.log(`[VISION_OPT] Image compressed to ${(processedBuffer.length / 1024 / 1024).toFixed(2)} MB`);
                  } catch (sharpError) {
                      console.error("[VISION_ERROR] Failed to compress image with sharp:", sharpError);
                  }
              }
          }

          try {
              console.log(`[OCR_START] Sending ${processedBuffer.length} bytes to Gemini (${mimeType})...`);
              const text = await ocrDocument(processedBuffer, mimeType);
              console.log(`[OCR_SUCCESS] Extracted ${text.length} characters.`);

              // Save immediately
              await prisma.submission.update({
                  where: { id: submissionId },
                  data: { ocrText: text, status: 'PROCESSING' }
              });
              return { text, buffer: processedBuffer, mimeType };
          } catch (ocrError: any) {
              console.error("[GRADING FATAL ERROR]: OCR Processing Failed", ocrError);
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
              console.error("[GRADING FATAL ERROR]: Rubric OCR failed", e);
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
                  console.log(`[OCR_SUCCESS] Marking Scheme extracted: ${text.length} chars.`);
                  return text;
              } catch (e: any) {
                  console.error("[GRADING FATAL ERROR]: Marking Scheme OCR failed", e);
                  console.warn("[OCR_WARN] Marking Scheme OCR failed.", e.message);
                  return undefined;
              }
          }
          return ms;
      };

      // PARALLEL TASK 4: Question Paper OCR (Master Skeleton)
      const questionPaperOcrTask = async (): Promise<string | undefined> => {
          const qp = submission.workSession.questionPaperUrl;
          if (!qp) return undefined;

          try {
              console.log(`[SUPABASE_FETCH] Question Paper: ${qp}`);
              const buffer = await readFile(qp, 'exam_pdfs');
              const mimeType = qp.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';
              const text = await ocrDocument(buffer, mimeType);
              console.log(`[OCR_SUCCESS] Question Paper extracted: ${text.length} chars.`);
              return text;
          } catch (e: any) {
              console.error("[GRADING FATAL ERROR]: Question Paper OCR failed", e);
              console.warn("[OCR_WARN] Question Paper OCR failed.", e.message);
              return undefined;
          }
      };

      // EXECUTE PARALLEL TASKS
      let submissionData: { text: string, buffer: Buffer, mimeType: string };
      let rubricContent: string;
      let markingSchemeText: string | undefined;
      let questionPaperText: string | undefined;

      try {
          [submissionData, rubricContent, markingSchemeText, questionPaperText] = await Promise.all([
              submissionOcrTask(),
              rubricOcrTask(),
              markingSchemeOcrTask(),
              questionPaperOcrTask()
          ]);
      } catch (e: any) {
          console.error("[GRADING FATAL ERROR]: Prerequisite Check Failed", e);
          throw new Error(`Prerequisite Check Failed: ${e.message}`);
      }

      const { text: ocrText, buffer: submissionBuffer, mimeType: submissionMime } = submissionData;

      // Prepare Config
      const strictnessMap: Record<string, number> = {
        'LENIENT': 0.8, 'MODERATE': 1.0, 'STRICT': 1.2
      };
      const strictnessVal = strictnessMap[submission.workSession.strictness || 'MODERATE'] || 1.0;

      let calibrationSettings;
      try {
          calibrationSettings = submission.workSession.calibration ? JSON.parse(submission.workSession.calibration) : undefined;
      } catch (e) {
          console.error("[GRADING FATAL ERROR]: Failed to parse calibration JSON", e);
      }

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
        questionPaper: questionPaperText,
        lecturerNotes: submission.workSession.instructions || undefined,
        calibration: calibrationSettings,
        context: contextString
      };

      // 3. Grade (Zero-Trust Tracing)
      const totalMarks = submission.workSession.totalMarks || 100;

      console.log(`[AI_GRADE] Invoking AI for Job ${job.id}`);
      console.log(`- Config: Strictness=${config.strictness}`);
      console.log(`- Context: ${contextString.trim()}`);
      console.log(`- Payload: Submission=${ocrText.length} chars, Rubric=${rubricContent.length} chars`);
      if (submissionBuffer) console.log(`- Visual: Buffer loaded (${submissionBuffer.length} bytes, ${submissionMime})`);

      let result: GradingResult;

      // Simulator Check
      if (!process.env.DEEPSEEK_API_KEY) {
          console.log(`[Simulator] Using DeepSeek Simulator`);
          const sim = await simulateDeepSeekCall(ocrText);
          if (sim.breakdown === "INVALID_JSON_RESPONSE") throw new Error("AI returned malformed JSON (Simulator)");

          result = {
              total_marks_awarded: sim.score,
              total_max_marks: totalMarks,
              exam_id: "sim",
              rubric_version: "sim",
              model_version: "sim",
              results: (sim.breakdown as any).map((b: any) => ({
                  question_id: b.question,
                  marks_awarded: b.score,
                  max_marks: b.max,
                  justification: b.feedback,
                  status: "Attempted",
                  tier_used: "Tier 1",
                  alternative_valid_concept: false,
                  review_flag: false,
                  confidence: 1.0
              })),
              aiReasoning: sim.reasoning,
              confidence: sim.confidence
          };
      } else {
          // Pass image buffer for multimodal grading
          result = await gradeSubmission(ocrText, rubricContent, totalMarks, config, submissionBuffer, submissionMime);
          console.log(`[AI_SUCCESS] Graded. Score: ${result.total_marks_awarded}/${totalMarks}`);
      }

      // 4. Save Score & Feedback
      if (typeof result.total_marks_awarded !== 'number') {
          throw new Error("Invalid AI Result: Missing total_marks_awarded");
      }

      // Transform the new V2 results format into the expected breakdown format
      const formattedBreakdown = result.results?.map((item) => ({
        question: item.question_id,
        score: item.marks_awarded,
        max: item.max_marks,
        feedback: item.justification,
        rubricReference: item.tier_used,
        status: item.status,
        alternative_valid_concept: item.alternative_valid_concept,
        review_flag: item.review_flag,
        confidence: item.confidence
      })) || [];
      const breakdownStr = JSON.stringify(formattedBreakdown);

      await prisma.score.upsert({
        where: { submissionId: submission.id },
        update: {
          totalMarks: result.total_marks_awarded,
          breakdown: breakdownStr,
          remarks: result.aiReasoning,
          detectedIdentity: result.detectedIdentity,
          gradedAt: new Date()
        },
        create: {
          submissionId: submission.id,
          totalMarks: result.total_marks_awarded,
          breakdown: breakdownStr,
          remarks: result.aiReasoning,
          detectedIdentity: result.detectedIdentity
        }
      });

      // 5. Update Submission Status (Dynamic Confidence Threshold)
      // UNIDENTIFIED FALLBACK: If AI returns null identity OR 'UNIDENTIFIED_IDENTITY' literal, handle flagging.
      // If we also lack local user context (bulk upload), this is CRITICAL FLAGGING.
      let status: string;
      const threshold = submission.workSession.confidenceThreshold ?? 85;

      const isIdentityMissing = !result.detectedIdentity || result.detectedIdentity === 'UNIDENTIFIED_IDENTITY';
      const isContextMissing = !submission.userId && !submission.studentRegNo;

      if (isIdentityMissing) {
          if (isContextMissing) {
              // GHOST SUBMISSION: No AI ID, No DB ID.
              status = 'FLAGGED';
              result.confidence = 0;
              result.aiReasoning = `IDENTITY CRISIS: ${result.aiReasoning || "System could not identify student."} Please manually assign ownership.`;
              console.warn(`[AI_IDENTITY] Unidentified GHOST submission. Flagging for manual review.`);
          } else {
              // PARTIAL MATCH: No AI ID, but we know who uploaded it (Authenticated Student).
              // We proceed but maybe lower confidence? For now, we trust the auth context but log it.
              console.log(`[AI_IDENTITY] AI missed identity, but using Auth Context: ${submission.user?.fullName}`);
              status = (result.confidence ?? 0) >= threshold ? 'GRADED' : 'FLAGGED';
          }
      } else {
          status = (result.confidence ?? 0) >= threshold ? 'GRADED' : 'FLAGGED';
      }

      console.log(`[AI_CONFIDENCE] Score: ${result.confidence}, Threshold: ${threshold} -> Status: ${status} (Dynamic Threshold Applied)`);

      const feedbackStr = JSON.stringify({
        strengths: [],
        weaknesses: [],
        improvement: "Detailed feedback via AI is now embedded in question breakdowns."
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
          action: status === 'GRADED' ? 'GRADED' : 'FLAGGED',
          details: `Submission for ${submission.workSession.title} ${status}. Score: ${result.total_marks_awarded}`,
          severity: status === 'GRADED' ? 'INFO' : 'WARNING'
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
        score: result.total_marks_awarded,
        status
      };

  } catch (fatalError: any) {
      console.error(`[GRADING FATAL ERROR] Pipeline Crashed:`, fatalError);

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
