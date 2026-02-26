import { Job } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { readFile } from '@/lib/storage';
import { ocrDocument } from '@/lib/ai/gemini';
import { gradeSubmission, GradeConfig, GradingResult } from '@/lib/ai/deepseek';
import { simulateDeepSeekCall } from '@/lib/ai/simulator';

export async function handleAiGrade(job: Job) {
  const t0 = performance.now();
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

  console.log(`[AI_GRADE] Starting Parallel Processing for Submission ${submissionId}`);

  // PARALLEL TASK 1: Submission OCR
  const submissionOcrTask = async (): Promise<string> => {
      if (submission.ocrText) return submission.ocrText;
      if (!submission.filePath) throw new Error("No file path and no OCR text for submission.");

      try {
          console.log(`[AI_GRADE] OCR Submission: ${submission.filePath}`);
          const buffer = await readFile(submission.filePath, 'exam_pdfs');
          const mimeType = submission.filePath.toLowerCase().endsWith('.png') ? 'image/png' :
                           submission.filePath.toLowerCase().endsWith('.jpg') || submission.filePath.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' :
                           'application/pdf';

          const text = await ocrDocument(buffer, mimeType);

          // Save immediately
          await prisma.submission.update({
              where: { id: submissionId },
              data: { ocrText: text, status: 'PROCESSING' }
          });
          return text;
      } catch (ocrError: any) {
          console.error("[AI_GRADE] OCR Failed:", ocrError);
          await prisma.submission.update({
              where: { id: submissionId },
              data: {
                  status: 'FLAGGED',
                  feedback: JSON.stringify({ error: `OCR Processing Failed: ${ocrError.message}` })
              }
          });
          throw ocrError;
      }
  };

  // PARALLEL TASK 2: Rubric OCR (with Caching)
  const rubricOcrTask = async (): Promise<string> => {
      if (submission.workSession.rubric) return submission.workSession.rubric;
      if (!submission.workSession.rubricUrl) return "Grade based on general academic standards and common sense.";

  // If rubric text is empty but a file URL exists, try to OCR it
  // OPTIMIZATION: Only fetch if needed.
  if (!rubricContent && submission.workSession.rubricUrl) {
      try {
          console.log(`[AI_GRADE] OCR Rubric: ${submission.workSession.rubricUrl}`);
          const buffer = await readFile(submission.workSession.rubricUrl, 'exam_pdfs');
          const mimeType = submission.workSession.rubricUrl.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';
          const text = await ocrDocument(buffer, mimeType);

          // Cache logic: Save back to WorkSession so we don't re-OCR for every student
          if (text && text.length > 50) {
              await prisma.workSession.update({
                  where: { id: submission.workSession.id },
                  data: { rubric: text }
              }).catch(e => console.warn("[AI_GRADE] Failed to cache rubric text", e));
          }
          return text;
      } catch (e) {
          console.warn("[AI_GRADE] Failed to OCR Rubric. Using default.", e);
          return "Grade based on general academic standards and common sense.";
      }
  };

  // PARALLEL TASK 3: Marking Scheme OCR
  const markingSchemeOcrTask = async (): Promise<string | undefined> => {
      const ms = submission.workSession.markingScheme;
      if (!ms) return undefined;

      // Check if it's a file path (heuristic)
      if (ms.startsWith('rubrics/') || ms.includes('/') || ms.toLowerCase().endsWith('.pdf')) {
          try {
              console.log(`[AI_GRADE] OCR Marking Scheme: ${ms}`);
              const buffer = await readFile(ms, 'exam_pdfs');
              const mimeType = ms.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';
              const text = await ocrDocument(buffer, mimeType);
              return text;
          } catch (e) {
              console.warn("[AI_GRADE] Failed to OCR Marking Scheme. Ignoring.", e);
              return undefined;
          }
      }
      // Assuming it's already text if not a file path
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

  // OCR Marking Scheme if it's a file path
  // OPTIMIZATION: Truncate very long OCR texts?
  // DeepSeek Chat context is large (64k), but huge texts slow down generation.
  // For now, assume < 20 pages.
  if (config.markingScheme && (config.markingScheme.startsWith('rubrics/') || config.markingScheme.includes('/'))) {
       try {
          const msBuffer = await readFile(config.markingScheme, 'exam_pdfs'); // rubrics are in exam_pdfs bucket too?
          const msMime = config.markingScheme.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';
          const msText = await ocrDocument(msBuffer, msMime);
          config.markingScheme = msText;
       } catch (e) {
           console.warn("[AI_GRADE] Failed to OCR Marking Scheme file. Ignoring.", e);
           config.markingScheme = undefined; // Fallback to undefined so prompt ignores it
       }
  }


  // 3. Grade (Zero-Trust Tracing)
  const totalMarks = submission.workSession.totalMarks || 100;

  console.log(`[AI_GRADE] Job ${job.id} Execution Trace:`);
  console.log(`- Config: Strictness=${config.strictness}, Calibrated=${!!config.calibration}`);
  console.log(`- Rubric Length: ${rubricContent.length}`);
  console.log(`- OCR Text Length: ${ocrText.length}`);

  let result: GradingResult;

  try {
    // Simulator Check
    if (!process.env.DEEPSEEK_API_KEY) {
        console.log(`[Simulator] Using DeepSeek Simulator for Job ${job.id}`);
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
        console.log(`[AI_GRADE] Invoking DeepSeek API (High Performance Mode)...`);
        // We use gradeSubmission which calls deepseek-chat (faster model)
        result = await gradeSubmission(ocrText, rubricContent, totalMarks, config);

        const t1 = performance.now();
        console.log(`[AI_GRADE] Success. Score: ${result.totalScore}/${totalMarks}. Time: ${(t1 - t0).toFixed(2)}ms`);
    }
  } catch (aiError: any) {
      console.error(`[AI_GRADE] FATAL AI ERROR for Job ${job.id}:`, aiError);

      await prisma.submission.update({
          where: { id: submission.id },
          data: {
              status: 'FLAGGED',
              feedback: JSON.stringify({
                  error: `AI Grading Failed: ${aiError.message}. Check API Keys or Quota.`,
                  technical_details: aiError.stack,
                  provider_response: aiError.response?.data
              })
          }
      });

      throw new Error(`AI Grading Failed: ${aiError.message}`);
  }

  // 4. Save Score & Feedback
  if (typeof result.totalScore !== 'number') {
      throw new Error("Invalid AI Result: Missing totalScore");
  }

  const breakdownStr = JSON.stringify(result.breakdown);

  // Parallelize DB writes (slight optimization)
  const scorePromise = prisma.score.upsert({
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

  const status = result.confidence < 70 ? 'FLAGGED' : 'GRADED';
  const feedbackStr = JSON.stringify({
    strengths: result.strengths || [],
    weaknesses: result.weaknesses || [],
    improvement: result.improvement || "No specific advice."
  });

  const submissionPromise = prisma.submission.update({
    where: { id: submission.id },
    data: {
      status,
      confidenceScore: result.confidence,
      feedback: feedbackStr
    }
  });

  const auditPromise = prisma.auditLog.create({
    data: {
      userId: submission.userId,
      action: 'GRADED',
      details: `Submission for ${submission.workSession.title} graded. Score: ${result.totalScore}`,
      severity: 'INFO'
    }
  });

  // Execute writes in parallel
  await Promise.all([scorePromise, submissionPromise, auditPromise]);

  // Increment Lecturer Quota (Fire and forget, or non-critical)
  if (submission.workSession.lecturerId) {
    prisma.user.update({
        where: { id: submission.workSession.lecturerId },
        data: { used: { increment: 1 } }
    }).catch(e => console.warn(`[AI_GRADE] Failed to increment quota for user ${submission.workSession.lecturerId}`, e));
  }

  return {
    success: true,
    score: result.totalScore,
    status
  };
}
