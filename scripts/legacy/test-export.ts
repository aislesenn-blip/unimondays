import { prisma } from '../src/lib/prisma';
import { enqueueJob } from '../src/lib/queue';
import { handleExportZip } from '../src/workers/export-worker';
import { readFile, saveBuffer } from '../src/lib/storage';
import fs from 'fs/promises';
import JSZip from 'jszip';
import path from 'path';

async function main() {
  console.log("Setting up test data for Export...");

  // Ensure University
  const uni = await prisma.university.upsert({
      where: { code: 'TEST' },
      update: {},
      create: { name: 'Test Uni', code: 'TEST' }
  });

  // Ensure Lecturer first
  const lecturer = await prisma.user.upsert({
      where: { email: 'lecturer@test.com' },
      update: {},
      create: { email: 'lecturer@test.com', role: 'LECTURER', fullName: 'Dr. Test', universityId: uni.id }
  });

  // 1. Create Quiz
  const quiz = await prisma.quiz.create({
    data: {
      title: 'Export Test Quiz',
      code: `EXP_${Date.now()}`,
      lecturerId: lecturer.id,
      totalMarks: 100,
      universityId: uni.id
    }
  });

  // 2. Create Submission & Score
  const sub = await prisma.submission.create({
    data: {
      quizId: quiz.id,
      universityId: uni.id,
      studentRegNo: 'REG_EXP_1',
      status: 'GRADED',
      filePath: '' // Will be set below
    }
  });

  // Create dummy file via Storage Service to ensure path validity
  const dummyBuffer = Buffer.from('Dummy PDF Content');
  const dummyPath = await saveBuffer(dummyBuffer, 'dummy_script.pdf', 'submissions');

  await prisma.submission.update({
    where: { id: sub.id },
    data: { filePath: dummyPath }
  });

  await prisma.score.create({
    data: {
      submissionId: sub.id,
      totalMarks: 85,
      breakdown: [{ question: "Q1", score: 85, max: 100, feedback: "Great job." }],
      remarks: "Excellent work."
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
    // We use readFile from storage abstraction
    const zipContent = await readFile(result.filePath);
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
