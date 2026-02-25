import { prisma } from '../src/lib/prisma';
import { enqueueJob } from '../src/lib/queue';
import { Job } from '@prisma/client';

async function main() {
  console.log("🔴 STARTING PERFORMANCE & QUEUE AUDIT...");
  console.log("Simulating 10 Jobs, 1 Worker...");

  // Setup Data
  const uni = await prisma.university.upsert({
    where: { code: 'PERF' },
    update: {},
    create: { name: 'Perf Uni', code: 'PERF', domain: 'perf.edu' }
  });

  const lecturer = await prisma.user.upsert({
    where: { email: 'perf@perf.edu' },
    update: {},
    create: { email: 'perf@perf.edu', role: 'lecturer', universityId: uni.id }
  });

  const quiz = await prisma.quiz.upsert({
    where: { code: 'PERF_Q' },
    update: {},
    create: { title: 'Perf Quiz', code: 'PERF_Q', lecturerId: lecturer.id }
  });

  // Dummy file
  const dummyFile = '/tmp/perf_test.pdf';

  // Create Submission for AI_GRADE
  const submission = await prisma.submission.create({
    data: { quizId: quiz.id, studentRegNo: 'PERF_S1', status: 'PENDING', filePath: dummyFile }
  });

  // --- TEST 1: Enqueue 10 Jobs...
  console.log("\n[TEST 1] Enqueue 10 Jobs...");
  const startEnqueue = Date.now();
  const jobs: string[] = [];
  const JOB_COUNT = 10;

  for (let i = 0; i < JOB_COUNT; i++) {
    const job = await enqueueJob('AI_GRADE', { submissionId: submission.id }, 0, quiz.id, uni.id);
    jobs.push(job.id);
  }
  const endEnqueue = Date.now();
  console.log(`✅ Enqueued ${JOB_COUNT} jobs in ${endEnqueue - startEnqueue}ms`);

  // --- TEST 2: Processing Throughput (Simulated) ---
  console.log("\n[TEST 2] Processing Throughput...");

  const { spawn } = await import('child_process');

  // Start worker
  const worker = spawn('npx', ['tsx', 'scripts/start-worker.ts'], {
    env: { ...process.env, DEEPSEEK_API_KEY: '', GEMINI_API_KEY: '' }, // Force mock
    stdio: 'inherit'
  });

  // Poll DB for completion
  const startProcess = Date.now();
  let completed = 0;

  while (completed < JOB_COUNT) {
    await new Promise(r => setTimeout(r, 1000));
    completed = await prisma.job.count({
      where: {
        id: { in: jobs },
        status: { in: ['COMPLETED', 'FAILED'] }
      }
    });

    if (Date.now() - startProcess > 30000) {
      console.error("\n❌ TIMEOUT: Workers too slow!");
      break;
    }
  }

  const endProcess = Date.now();
  worker.kill(); // Stop worker

  console.log(`\n✅ Processed ${JOB_COUNT} jobs in ${endProcess - startProcess}ms`);
  console.log(`   Throughput: ${(JOB_COUNT / ((endProcess - startProcess)/1000)).toFixed(2)} jobs/sec`);

  // Cleanup
  await prisma.job.deleteMany({ where: { id: { in: jobs } } });
  await prisma.submission.delete({ where: { id: submission.id } });
  // Keep base data
}

main().catch(e => {
  console.error("Audit Script Error:", e);
  process.exit(1);
});
