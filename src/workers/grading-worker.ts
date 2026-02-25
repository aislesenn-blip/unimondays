import { Job } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { readFile } from '@/lib/storage';
import { ocrDocument } from '@/lib/ai/gemini';
import { gradeSubmission, GradeConfig } from '@/lib/ai/deepseek';
import { simulateDeepSeekCall } from '@/lib/ai/simulator';

export async function handleAiGrade(job: Job) {
  const data = JSON.parse(job.data);
  const { submissionId } = data;

  if (!submissionId) {
    throw new Error("Missing submissionId in job data.");
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      quiz: {
        include: {
          lecturer: {
            include: {
              calibration: true
            }
          }
        }
      }
    }
  });

  if (!submission) {
    throw new Error(`Submission ${submissionId} not found.`);
  }

  if (!submission.quiz) {
    throw new Error(`Quiz not found for submission ${submissionId}.`);
  }

  // 1. Ensure OCR
  let ocrText = submission.ocrText;
  if (!ocrText && submission.filePath) {
    const buffer = await readFile(submission.filePath);
    const mimeType = submission.filePath.endsWith('.png') ? 'image/png' :
                     submission.filePath.endsWith('.jpg') ? 'image/jpeg' :
                     'application/pdf';

    ocrText = await ocrDocument(buffer, mimeType);

    // Save OCR text
    await prisma.submission.update({
      where: { id: submissionId },
      data: { ocrText, status: 'PROCESSING' }
    });
  }

  if (!ocrText) {
    throw new Error("Failed to extract text from submission.");
  }

  // 2. Prepare Grading Config
  const lecturerCalibration = submission.quiz.lecturer.calibration;
  const config: GradeConfig = {
    strictness: lecturerCalibration?.strictness || 1.0,
    markingScheme: submission.quiz.markingScheme || undefined,
    lecturerNotes: lecturerCalibration?.notes || undefined
  };

  // 3. Grade
  const totalMarks = submission.quiz.totalMarks || 100;
  const rubric = submission.quiz.rubric || "Grade based on general academic standards.";

  let result: any;

  // Use Simulator if Keys Missing (for Board Audit)
  if (!process.env.DEEPSEEK_API_KEY) {
    console.log(`[Simulator] Using DeepSeek Simulator for Job ${job.id}`);
    const sim = await simulateDeepSeekCall(ocrText);

    // Check for malformed JSON simulation
    if (sim.breakdown === "INVALID_JSON_RESPONSE") {
       throw new Error("AI returned malformed JSON (Simulator)");
    }

    result = {
      totalScore: sim.score,
      breakdown: sim.breakdown,
      aiReasoning: sim.reasoning,
      confidence: sim.confidence,
      strengths: ["Consistency", "Clarity"],
      weaknesses: ["Calculation Error"],
      improvement: "Check arithmetic."
    };
  } else {
    result = await gradeSubmission(ocrText, rubric, totalMarks, config);
  }

  // 4. Save Score
  // Check if score exists (upsert)
  await prisma.score.upsert({
    where: { submissionId: submission.id },
    update: {
      totalMarks: result.totalScore,
      breakdown: JSON.stringify(result.breakdown),
      remarks: result.aiReasoning,
      confidence: result.confidence,
      gradedAt: new Date()
    },
    create: {
      submissionId: submission.id,
      totalMarks: result.totalScore,
      breakdown: JSON.stringify(result.breakdown),
      remarks: result.aiReasoning,
      confidence: result.confidence
    }
  });

  // 5. Update Submission Status
  // If confidence is low, flag it.
  const status = result.confidence < 70 ? 'FLAGGED' : 'GRADED';

  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      status,
      confidenceScore: result.confidence,
      calibrationId: lecturerCalibration?.id,
      feedback: JSON.stringify({
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        improvement: result.improvement
      })
    }
  });

  return {
    success: true,
    score: result.totalScore,
    status
  };
}
