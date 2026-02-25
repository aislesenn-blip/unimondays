
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch'; // Or use global fetch if available

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api';

async function main() {
  console.log("Starting Pilot Execution...");

  // 1. Authenticate (Construct Cookie)
  // We know Lecturer ID is 1 from seeding.
  const sessionCookie = JSON.stringify({ userId: 1 });
  const headers = {
    'Cookie': `auth-session=${sessionCookie}`
  };

  // 2. Upload Batch PDF
  console.log("Uploading pilot-batch.pdf...");
  const filePath = path.resolve('pilot-batch.pdf');
  if (!fs.existsSync(filePath)) {
    throw new Error("pilot-batch.pdf not found!");
  }

  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('quizId', '1'); // We know Quiz ID is 1

  const uploadRes = await fetch(`${API_URL}/upload/bulk`, {
    method: 'POST',
    body: form,
    headers: {
      ...headers,
      ...form.getHeaders()
    }
  });

  const uploadData = await uploadRes.json() as { success: boolean, jobId: string, error?: string, message?: string };
  console.log("Upload Response:", uploadData);

  if (!uploadRes.ok) {
    throw new Error(`Upload failed: ${uploadData.error}`);
  }

  const splitJobId = uploadData.jobId;
  console.log(`OCR_SPLIT Job ID: ${splitJobId}`);

  // 3. Monitor OCR_SPLIT Job
  console.log("Waiting for OCR_SPLIT...");
  await waitForJob(splitJobId);
  console.log("OCR_SPLIT Completed.");

  // 4. Monitor AI_GRADE Jobs
  console.log("Waiting for AI_GRADE jobs (expecting 5)...");

  // Wait a bit for them to be created
  await new Promise(r => setTimeout(r, 2000));

  let gradedCount = 0;
  while (gradedCount < 5) {
    const jobs = await prisma.job.findMany({
      where: {
        type: 'AI_GRADE',
        status: 'COMPLETED',
        quizId: 1
      }
    });
    gradedCount = jobs.length;
    console.log(`Graded: ${gradedCount}/5`);

    // Check for failures
    const failed = await prisma.job.count({
        where: { type: 'AI_GRADE', status: 'FAILED', quizId: 1 }
    });
    if (failed > 0) {
        console.warn(`${failed} jobs failed!`);
    }

    if (gradedCount >= 5) break;
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log("All 5 submissions graded.");

  // 5. Verify Scores
  const scores = await prisma.score.findMany({
    include: { submission: true }
  });
  console.log("Scores recorded:", scores.length);
  scores.forEach(s => {
    console.log(`- Submission ${s.submissionId}: ${s.totalMarks} marks`);
  });

  // 6. Trigger Export
  console.log("Triggering Feedback Export...");
  const exportRes = await fetch(`${API_URL}/export/feedback`, {
    method: 'POST',
    body: JSON.stringify({ quizId: 1 }),
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    }
  });

  const exportData = await exportRes.json() as { success: boolean, jobId: string, error?: string };
  console.log("Export Response:", exportData);

  if (!exportRes.ok) {
     throw new Error(`Export trigger failed: ${exportData.error}`);
  }

  const exportJobId = exportData.jobId;
  console.log(`EXPORT_ZIP Job ID: ${exportJobId}`);

  // 7. Monitor Export Job
  await waitForJob(exportJobId);
  console.log("Export Completed.");

  // 8. Get Result URL/Path
  const exportJob = await prisma.job.findUnique({ where: { id: exportJobId } });
  const result = JSON.parse(exportJob?.result || '{}');
  console.log("Export Result:", result);

  // Since we are in sandbox, we can check if file exists
  // result.filePath might be absolute or relative
  if (result.filePath) {
      const exists = fs.existsSync(result.filePath);
      console.log(`Export file exists at ${result.filePath}: ${exists}`);
  }
}

async function waitForJob(jobId: string) {
  while (true) {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new Error(`Job ${jobId} vanished!`);

    if (job.status === 'COMPLETED') return;
    if (job.status === 'FAILED') throw new Error(`Job ${jobId} failed: ${job.error}`);

    process.stdout.write('.');
    await new Promise(r => setTimeout(r, 1000));
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
