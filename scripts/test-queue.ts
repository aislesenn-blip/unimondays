import { enqueueJob, claimJob, completeJob, getJobStatus } from '../src/lib/queue';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log("Enqueuing test job...");
  const job = await enqueueJob('OCR_SPLIT', { test: 'data' }, 10);
  console.log("Job enqueued:", job.id);

  console.log("Status before claim:", (await getJobStatus(job.id))?.status);

  console.log("Claiming job...");
  const claimedJob = await claimJob(['OCR_SPLIT']);

  if (!claimedJob) {
    console.error("Failed to claim job!");
    process.exit(1);
  }

  if (claimedJob.id !== job.id) {
    console.error(`Claimed wrong job! Expected ${job.id}, got ${claimedJob.id}`);
    process.exit(1);
  }

  console.log("Status after claim:", claimedJob.status);

  console.log("Completing job...");
  await completeJob(job.id, { success: true });

  const finalJob = await getJobStatus(job.id);
  console.log("Final status:", finalJob?.status);
  console.log("Result:", finalJob?.result);

  if (finalJob?.status === 'COMPLETED') {
    console.log("Test PASSED");
  } else {
    console.error("Test FAILED");
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
