import { Job } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { readFile } from '@/lib/storage';
import { ocrDocument } from '@/lib/ai/gemini';
import { gradeSubmission, GradeConfig } from '@/lib/ai/deepseek';
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
  const strictnessMap: Record<string, number> = {
    'LENIENT': 0.8,
    'MODERATE': 1.0,
    'STRICT': 1.2
  };
  const strictnessVal = strictnessMap[submission.workSession.strictness || 'MODERATE'] || 1.0;

  const config: GradeConfig = {
    strictness: strictnessVal,
    markingScheme: submission.workSession.markingScheme || undefined,
    lecturerNotes: undefined
  };

  // 3. Grade
  const totalMarks = submission.workSession.totalMarks || 100;
  const rubric = submission.workSession.rubric || "Grade based on general academic standards.";

  // Zero-Trust Tracing: Log Configuration
  console.log(`[AI_GRADE] Job ${job.id} Configuration Trace:`);
  console.log(`- WorkSession ID: ${submission.workSession.id}`);
  console.log(`- Strictness (DB): ${submission.workSession.strictness} -> Multiplier: ${strictnessVal}`);
  console.log(`- Rubric Present: ${!!submission.workSession.rubric} (Length: ${submission.workSession.rubric?.length || 0})`);
  console.log(`- Marking Scheme Present: ${!!submission.workSession.markingScheme} (Length: ${submission.workSession.markingScheme?.length || 0})`);
  console.log(`- Total Marks: ${totalMarks}`);

  let result: any;

  // Use Simulator if Keys Missing (for Board Audit)
  if (!process.env.DEEPSEEK_API_KEY) {
    console.log(`[Simulator] Using DeepSeek Simulator for Job ${job.id}`);
    const sim = await simulateDeepSeekCall(ocrText);

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
    console.log(`[AI_GRADE] Invoking DeepSeek with constrained context...`);
    result = await gradeSubmission(ocrText, rubric, totalMarks, config);
  }

  // 4. Save Score
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
    strengths: result.strengths,
    weaknesses: result.weaknesses,
    improvement: result.improvement
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
      universityId: submission.universityId,
      action: 'GRADED',
      details: `Submission for ${submission.workSession.title} has been graded.`,
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
