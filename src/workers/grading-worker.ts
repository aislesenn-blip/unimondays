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

  // 1. Ensure OCR (Student Script)
  let ocrText = submission.ocrText;
  if (!ocrText && submission.filePath) {
    try {
        console.log(`[AI_GRADE] Fetching submission file: ${submission.filePath}`);
        // Ensure bucket logic aligns with storage-supabase.ts
        const buffer = await readFile(submission.filePath, 'exam_pdfs');
        const mimeType = submission.filePath.toLowerCase().endsWith('.png') ? 'image/png' :
                         submission.filePath.toLowerCase().endsWith('.jpg') || submission.filePath.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' :
                         'application/pdf';

        ocrText = await ocrDocument(buffer, mimeType);

        // Save OCR text immediately
        await prisma.submission.update({
        where: { id: submissionId },
        data: { ocrText, status: 'PROCESSING' }
        });
    } catch (ocrError: any) {
        console.error("[AI_GRADE] OCR Failed for Submission:", ocrError);
        // CRITICAL: Write error to Feedback so it's visible in UI
        await prisma.submission.update({
            where: { id: submissionId },
            data: {
                status: 'FLAGGED',
                feedback: JSON.stringify({ error: `OCR Processing Failed: ${ocrError.message}` })
            }
        });
        throw new Error(`OCR Processing Failed: ${ocrError.message}`);
    }
  }

  if (!ocrText) {
      await prisma.submission.update({
            where: { id: submissionId },
            data: {
                status: 'FLAGGED',
                feedback: JSON.stringify({ error: "Failed to extract text from submission. File might be empty or unreadable." })
            }
      });
      throw new Error("Failed to extract text from submission. File might be empty or unreadable.");
  }

  // 2. Prepare Grading Config & Rubric
  const strictnessMap: Record<string, number> = {
    'LENIENT': 0.8,
    'MODERATE': 1.0,
    'STRICT': 1.2
  };
  const strictnessVal = strictnessMap[submission.workSession.strictness || 'MODERATE'] || 1.0;

  // Retrieve Rubric Content (Text or File)
  let rubricContent = submission.workSession.rubric;

  // If rubric text is empty but a file URL exists, try to OCR it
  if (!rubricContent && submission.workSession.rubricUrl) {
      try {
          console.log(`[AI_GRADE] Fetching Rubric URL: ${submission.workSession.rubricUrl}`);
          const rBuffer = await readFile(submission.workSession.rubricUrl, 'exam_pdfs');
          // Simple mime detection
          const rMime = submission.workSession.rubricUrl.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';
          rubricContent = await ocrDocument(rBuffer, rMime);

          console.log(`[AI_GRADE] Extracted Rubric Text (Length: ${rubricContent.length})`);
      } catch (e) {
          console.warn("[AI_GRADE] Failed to OCR Rubric File. Falling back to default.", e);
      }
  }

  if (!rubricContent) {
      rubricContent = "Grade based on general academic standards and common sense.";
  }

  // Parse Calibration Settings
  let calibrationSettings;
  if (submission.workSession.calibration) {
      try {
          calibrationSettings = JSON.parse(submission.workSession.calibration);
      } catch (e) {
          console.warn("[AI_GRADE] Failed to parse calibration JSON", e);
      }
  }

  const config: GradeConfig = {
    strictness: strictnessVal,
    markingScheme: submission.workSession.markingScheme || undefined, // URL
    lecturerNotes: submission.workSession.instructions || undefined,
    calibration: calibrationSettings
  };

  // OCR Marking Scheme if it's a file path
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
  console.log(`- Submission ID: ${submission.id}`);
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
        console.log(`[AI_GRADE] Invoking DeepSeek API...`);
        result = await gradeSubmission(ocrText, rubricContent, totalMarks, config);
        console.log(`[AI_GRADE] Success. Score: ${result.totalScore}/${totalMarks}`);
    }
  } catch (aiError: any) {
      console.error(`[AI_GRADE] FATAL AI ERROR for Job ${job.id}:`, aiError);

      // CRITICAL: Write specific error to feedback so it's visible in UI
      await prisma.submission.update({
          where: { id: submission.id },
          data: {
              status: 'FLAGGED',
              feedback: JSON.stringify({
                  error: `AI Grading Failed: ${aiError.message}. Check API Keys or Quota.`,
                  technical_details: aiError.stack
              })
          }
      });

      throw new Error(`AI Grading Failed: ${aiError.message}`);
  }

  // 4. Save Score & Feedback
  // Validate result structure
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
    }).catch(e => console.warn(`[AI_GRADE] Failed to increment quota for user ${submission.workSession.lecturerId}`, e));
  }

  return {
    success: true,
    score: result.totalScore,
    status
  };
}
