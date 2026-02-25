import { prisma } from '../src/lib/prisma';
import { enqueueJob, claimJob, completeJob } from '../src/lib/queue';
import { handleAiGrade } from '../src/workers/grading-worker';

async function main() {
  console.log("Setting up test data...");

  // 1. Create Lecturer
  const lecturer = await prisma.user.upsert({
    where: { email: 'lecturer@test.com' },
    update: {},
    create: {
      email: 'lecturer@test.com',
      role: 'lecturer',
      fullName: 'Dr. Test'
    }
  });

  // 2. Create Quiz
  const quiz = await prisma.quiz.create({
    data: {
      title: 'Test Quiz',
      code: `TEST_${Date.now()}`,
      lecturerId: lecturer.id,
      totalMarks: 100,
      rubric: "Q1: 5 marks for definition, 5 marks for example.",
      markingScheme: "Q1 Answer: Polymorphism is...",
      status: 'PUBLISHED'
    }
  });

  // 3. Create Submission with OCR text pre-filled
  const submission = await prisma.submission.create({
    data: {
      quizId: quiz.id,
      studentRegNo: 'REG_TEST_1',
      status: 'PENDING_OCR',
      ocrText: "Student Answer: Polymorphism allows objects to be treated as instances of their parent class. Example: A generic 'Shape' class.",
      filePath: '/tmp/dummy.pdf' // Won't be read because ocrText exists
    }
  });

  console.log("Enqueuing Grading Job for submission:", submission.id);
  const job = await enqueueJob('AI_GRADE', { submissionId: submission.id });

  console.log("Processing Job...");
  // Manually call handler to avoid async worker loop complexity in test
  // But wait, handleAiGrade takes a Job object.
  // We can fetch the job first.

  const claimedJob = await prisma.job.findUnique({ where: { id: job.id } });
  if (!claimedJob) throw new Error("Job not found");

  // Call handler directly
  // Note: handleAiGrade is async
  // Also we need to mock DEEPSEEK_API_KEY if we want real call, or rely on mock in deepseek.ts if key missing.
  // I'll rely on mock in deepseek.ts if key is missing (which it is unless provided).

  try {
    const result = await handleAiGrade(claimedJob);
    console.log("Handler result:", result);

    // Verify Score
    const score = await prisma.score.findUnique({
      where: { submissionId: submission.id }
    });

    if (!score) throw new Error("Score not created!");
    console.log("Score created:", score);

    // Verify Submission Status
    const updatedSub = await prisma.submission.findUnique({ where: { id: submission.id } });
    console.log("Submission Status:", updatedSub?.status);

    if (updatedSub?.status !== 'GRADED' && updatedSub?.status !== 'FLAGGED') {
      throw new Error(`Unexpected status: ${updatedSub?.status}`);
    }

    console.log("Test PASSED");
  } catch (e) {
    console.error("Test FAILED:", e);
    process.exit(1);
  } finally {
    // Cleanup
    await prisma.score.deleteMany({ where: { submissionId: submission.id } });
    await prisma.submission.delete({ where: { id: submission.id } });
    await prisma.quiz.delete({ where: { id: quiz.id } });
    // Keep user
    await prisma.$disconnect();
  }
}

main();
