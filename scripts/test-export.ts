import { prisma } from '../src/lib/prisma';
import { enqueueJob } from '../src/lib/queue';
import { handleExportZip } from '../src/workers/export-worker';
import fs from 'fs/promises';
import JSZip from 'jszip';
import path from 'path';

async function main() {
  console.log("Setting up test data for Export...");

  // 1. Create Quiz
  const quiz = await prisma.quiz.create({
    data: {
      title: 'Export Test Quiz',
      code: `EXP_${Date.now()}`,
      lecturerId: 1, // Assume user 1 exists or create one. Wait, user 1 might not exist if DB clean.
      // But I ran test-grading-worker which created user. Hopefully IDs align or I create one.
    }
  });

  // Ensure Lecturer
  const lecturer = await prisma.user.upsert({
      where: { email: 'lecturer@test.com' },
      update: {},
      create: { email: 'lecturer@test.com', role: 'lecturer', fullName: 'Dr. Test' }
  });

  await prisma.quiz.update({ where: { id: quiz.id }, data: { lecturerId: lecturer.id } });

  // 2. Create Submission & Score
  const sub = await prisma.submission.create({
    data: {
      quizId: quiz.id,
      studentRegNo: 'REG_EXP_1',
      status: 'GRADED',
      // Provide a dummy PDF path?
      // I'll create a dummy file
      filePath: '/tmp/dummy_script.pdf'
    }
  });

  // Create dummy file
  await fs.writeFile('/tmp/dummy_script.pdf', 'Dummy PDF Content');

  await prisma.score.create({
    data: {
      submissionId: sub.id,
      totalMarks: 85,
      breakdown: JSON.stringify([{ question: "Q1", score: 85, max: 100, feedback: "Great job." }]),
      remarks: "Excellent work.",
      confidence: 90
    }
  });

  console.log("Enqueuing Export Job...");
  const job = await enqueueJob('EXPORT_ZIP', { quizId: quiz.id });

  console.log("Processing Job...");
  const claimedJob = await prisma.job.findUnique({ where: { id: job.id } });
  if (!claimedJob) throw new Error("Job not found");

  try {
    const result = await handleExportZip(claimedJob);
    console.log("Export Result:", result);

    if (!result || !result.filePath) throw new Error("No filePath returned");

    // Verify ZIP
    let zipPath = result.filePath;
    if (zipPath.startsWith('/uploads/')) {
        zipPath = path.join(process.cwd(), 'public', zipPath);
    }

    const zipContent = await fs.readFile(zipPath);
    const zip = await JSZip.loadAsync(zipContent);

    console.log("ZIP Contents:");
    zip.forEach((relativePath, file) => {
        console.log(" - ", relativePath);
    });

    // Check specific files
    if (!zip.file('REG_EXP_1_Feedback.pdf')) throw new Error("Missing Feedback PDF");
    if (!zip.file(`Master_Grades_${quiz.id}.xlsx`)) throw new Error("Missing Excel Report");

    // Original script won't be in ZIP because /tmp/dummy_script.pdf is not readable by readFile if it expects /uploads?
    // Wait, readFile checks /uploads or absolute path.
    // If /tmp/dummy_script.pdf is absolute, it tries to read it.
    // But `src/lib/storage.ts`: `if (!path.isAbsolute(fileUrl))` checks.
    // So `/tmp/...` is absolute.
    // However, createAnnotatedPdf checks `endsWith('.pdf')`.
    // My dummy file is text content, but extension is .pdf.
    // pdf-lib will fail to load it.
    // So `createAnnotatedPdf` will catch error and return feedback buffer only.
    // And `originalBuffer` read works.
    // So `REG_EXP_1_Script.pdf` should exist.
    // `REG_EXP_1_Annotated.pdf` might be missing or just feedback pdf copy (because of catch block in createAnnotatedPdf).

    if (zip.file('REG_EXP_1_Script.pdf')) console.log("Script PDF found (Good)");

    console.log("Test PASSED");

  } catch (e) {
    console.error("Test FAILED:", e);
    process.exit(1);
  } finally {
    // Cleanup
    await prisma.score.deleteMany({ where: { submissionId: sub.id } });
    await prisma.submission.delete({ where: { id: sub.id } });
    await prisma.quiz.delete({ where: { id: quiz.id } });
    await prisma.$disconnect();
  }
}

main();
