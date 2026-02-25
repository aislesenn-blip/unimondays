
import { PrismaClient } from '@prisma/client';
import { PDFDocument, rgb } from 'pdf-lib';
import { storage } from '../src/lib/storage';
import { enqueueJob } from '../src/lib/queue';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

// Configuration
const NUM_SCRIPTS = 50; // Sandbox limitation: 50 instead of 1000 for speed, but scalable
const UNIVERSITY_NAME = "National University of Kenya";
const LECTURER_EMAIL = "prof.x@nuk.ac.ke";
const QUIZ_CODE = "CS101-FINAL";

async function generatePdf(studentName: string, regNo: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const fontSize = 24;

  page.drawText(`National University Examination`, {
    x: 50,
    y: height - 4 * fontSize,
    size: fontSize,
    color: rgb(0, 0, 0),
  });

  page.drawText(`Student: ${studentName}`, {
    x: 50,
    y: height - 6 * fontSize,
    size: 18,
    color: rgb(0, 0, 0),
  });

  page.drawText(`RegNo: ${regNo}`, {
    x: 50,
    y: height - 8 * fontSize,
    size: 18,
    color: rgb(0, 0, 0),
  });

  page.drawText(`Answer: The mitochondria is the powerhouse of the cell.`, {
    x: 50,
    y: height - 12 * fontSize,
    size: 12,
    color: rgb(0, 0, 0),
  });

  // Add some random noise to simulate scanning artifacts
  for (let i = 0; i < 50; i++) {
     page.drawCircle({
         x: Math.random() * width,
         y: Math.random() * height,
         size: Math.random() * 2,
         color: rgb(0.5, 0.5, 0.5),
         opacity: 0.1
     });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function main() {
  console.log("🔴 STARTING REAL WORLD LOAD TEST...");
  console.log(`Target: ${NUM_SCRIPTS} Scripts`);

  const startTime = Date.now();

  // 1. Setup Environment
  console.log("[Setup] initializing database...");

  // Ensure University
  const university = await prisma.university.upsert({
    where: { code: "NUK" },
    update: {},
    create: {
      name: UNIVERSITY_NAME,
      code: "NUK",
      domain: "nuk.ac.ke"
    }
  });

  // Ensure Lecturer
  const lecturer = await prisma.user.upsert({
    where: { email: LECTURER_EMAIL },
    update: {},
    create: {
      email: LECTURER_EMAIL,
      fullName: "Professor X",
      role: "lecturer",
      universityId: university.id
    }
  });

  // Ensure Quiz
  const quiz = await prisma.quiz.upsert({
    where: { code: QUIZ_CODE },
    update: {},
    create: {
      title: "Computer Science 101 Final",
      code: QUIZ_CODE,
      lecturerId: lecturer.id,
      // universityId is inferred via Lecturer/Class
      status: "PUBLISHED",
      totalMarks: 100,
      rubric: "1. Definition of Mitochondria (5 marks)\n2. Function of Mitochondria (5 marks)\n3. Diagram correctness (5 marks)"
    }
  });

  console.log(`[Setup] University: ${university.name}, Quiz: ${quiz.title}`);

  // 2. Generate and Upload Scripts
  console.log(`[Load] Generating and Uploading ${NUM_SCRIPTS} scripts...`);

  const uploadStart = Date.now();
  const submissionIds: number[] = [];

  for (let i = 0; i < NUM_SCRIPTS; i++) {
    const regNo = `S${1000 + i}`;
    const name = `Student ${i}`;

    // Generate PDF
    const buffer = await generatePdf(name, regNo);

    // Upload (Simulate Storage Service)
    const filename = `script_${regNo}.pdf`;
    const savedPath = await storage.saveBuffer(buffer, filename, 'load_test');

    // Create Submission
    const submission = await prisma.submission.create({
      data: {
        quizId: quiz.id,
        studentRegNo: regNo,
        studentName: name,
        filePath: savedPath,
        status: 'PENDING_OCR',
        userId: null // External student
      }
    });

    // Enqueue Job (Simulate API Logic)
    // We skip OCR_SPLIT for this test and go straight to AI_GRADE if we assume text is extractable or we inject OCR text.
    // Actually, the worker does OCR if text is missing.
    // Let's enqueue AI_GRADE directly to test the grading worker primarily.
    // But the grading worker calls `ocrDocument` if text is missing.

    await enqueueJob('AI_GRADE', { submissionId: submission.id }, 1, quiz.universityId!);
    submissionIds.push(submission.id);

    if ((i + 1) % 10 === 0) process.stdout.write('.');
  }

  const uploadTime = Date.now() - uploadStart;
  console.log(`\n[Load] Upload complete in ${uploadTime}ms (${(uploadTime/NUM_SCRIPTS).toFixed(2)}ms/script)`);

  // 3. Monitor Processing
  console.log("[Processing] Waiting for workers...");
  const processStart = Date.now();

  let processed = 0;
  let failed = 0;

  // Polling loop
  while (true) {
    const pendingCount = await prisma.job.count({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] },
        type: 'AI_GRADE' // Filter by our job type if needed, but simplified
      }
    });

    const completedCount = await prisma.job.count({
      where: {
        status: 'COMPLETED',
        type: 'AI_GRADE'
      }
    });

    const failedCount = await prisma.job.count({
      where: {
        status: 'FAILED',
        type: 'AI_GRADE'
      }
    });

    // Check submissions status
    const gradedSubmissions = await prisma.submission.count({
      where: {
        quizId: quiz.id,
        status: { in: ['GRADED', 'FLAGGED'] }
      }
    });

    process.stdout.write(`\r[Status] Pending: ${pendingCount} | Completed: ${completedCount} | Failed: ${failedCount} | Graded Subs: ${gradedSubmissions}/${NUM_SCRIPTS}`);

    if (pendingCount === 0 && (completedCount + failedCount) >= NUM_SCRIPTS) {
      processed = completedCount;
      failed = failedCount;
      break;
    }

    // Check for timeout (e.g., 5 minutes)
    if (Date.now() - processStart > 300000) {
      console.log("\n[Timeout] Test timed out after 5 minutes.");
      break;
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  const totalTime = Date.now() - startTime;
  const processTime = Date.now() - processStart;

  console.log("\n\n🔴 TEST RESULTS 🔴");
  console.log("--------------------------------------------------");
  console.log(`Total Scripts: ${NUM_SCRIPTS}`);
  console.log(`Total Time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`Average Time per Script: ${(totalTime / NUM_SCRIPTS / 1000).toFixed(2)}s`);
  console.log(`Throughput: ${(NUM_SCRIPTS / (totalTime / 60000)).toFixed(2)} scripts/min`);
  console.log(`Success Rate: ${((processed / NUM_SCRIPTS) * 100).toFixed(1)}%`);
  console.log(`Failure Rate: ${((failed / NUM_SCRIPTS) * 100).toFixed(1)}%`);
  console.log("--------------------------------------------------");

  // 4. Verify Data Integrity
  const randomSub = await prisma.submission.findFirst({
      where: { quizId: quiz.id, status: 'GRADED' },
      include: { score: true }
  });

  if (randomSub && randomSub.score) {
      console.log("\n[Audit] Random Submission Check:");
      console.log(`ID: ${randomSub.id}`);
      console.log(`Score: ${randomSub.score.totalMarks}`);
      console.log(`Breakdown: ${randomSub.score.breakdown}`);
  } else {
      console.log("\n[Audit] No graded submissions found to check.");
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
