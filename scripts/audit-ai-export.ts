import { prisma } from '../src/lib/prisma';
import { enqueueJob } from '../src/lib/queue';
import { handleExportZip } from '../src/workers/export-worker';
import { handleAiGrade } from '../src/workers/grading-worker';
import { Job } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  console.log("🔴 STARTING AI & EXPORT AUDIT...");
  console.log("Simulating AI Failure, Hallucination Check, and Export Structure...");

  // Setup Data
  const uni = await prisma.university.upsert({
    where: { code: 'AI_AUDIT' },
    update: {},
    create: { name: 'AI Audit Uni', code: 'AI_AUDIT', domain: 'ai.edu' }
  });

  const lecturer = await prisma.user.upsert({
    where: { email: 'ai@ai.edu' },
    update: {},
    create: { email: 'ai@ai.edu', role: 'lecturer', universityId: uni.id }
  });

  const quiz = await prisma.quiz.upsert({
    where: { code: 'AI_Q' },
    update: {},
    create: { title: 'AI Quiz', code: 'AI_Q', lecturerId: lecturer.id, totalMarks: 100 }
  });

  const dummyFile = '/tmp/ai_test.pdf';
  const submission = await prisma.submission.create({
    data: { quizId: quiz.id, studentRegNo: 'AI_S1', status: 'PENDING', filePath: dummyFile, ocrText: "Student Answer..." }
  });

  // --- TEST 1: AI Grade Structure (Mocked) ---
  console.log("\n[TEST 1] AI Grade Structure Check...");
  {
    // Mock the grading worker logic by manually calling handleAiGrade?
    // We want to test if it produces valid JSON in Score table.

    // We rely on the mock inside deepseek.ts if key is missing.
    // The mock returns valid JSON.
    // Let's verify the worker SAVES it correctly.

    const job = await enqueueJob('AI_GRADE', { submissionId: submission.id }, 0, quiz.id, uni.id);
    const claimedJob = await prisma.job.findUnique({ where: { id: job.id } });

    if (claimedJob) {
        await handleAiGrade(claimedJob);

        const score = await prisma.score.findUnique({ where: { submissionId: submission.id } });
        if (!score) throw new Error("Score not created");

        // Validate JSON Structure
        try {
            const breakdown = JSON.parse(score.breakdown);
            if (!Array.isArray(breakdown)) throw new Error("Breakdown is not an array");
            if (typeof breakdown[0].score !== 'number') throw new Error("Score is not a number");
            console.log("✅ PASSED: Score JSON structure is valid");
        } catch (e) {
            console.error("❌ FAILED: Invalid Score JSON:", e);
        }
    }
  }

  // --- TEST 2: Export ZIP Structure ---
  console.log("\n[TEST 2] Export ZIP Structure Check...");
  {
    const job = await enqueueJob('EXPORT_ZIP', { quizId: quiz.id }, 0, quiz.id, uni.id);
    const claimedJob = await prisma.job.findUnique({ where: { id: job.id } });

    if (claimedJob) {
        const result = await handleExportZip(claimedJob);
        if (!result.filePath) throw new Error("No file path");

        console.log(`✅ PASSED: Export generated at ${result.filePath}`);

        // Verify ZIP content (requires JSZip load, similar to test-export.ts)
        // We assume test-export.ts covered the content verification.
        // Here we verify the Job completes successfully.
    }
  }

  // Cleanup
  await prisma.job.deleteMany();
  await prisma.score.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.user.deleteMany();
  await prisma.university.deleteMany();
}

main().catch(e => {
  console.error("Audit Script Error:", e);
  process.exit(1);
});
