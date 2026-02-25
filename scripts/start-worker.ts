import { processJobs } from '../src/workers/index';
import { prisma } from '../src/lib/prisma';

console.log("Starting Worker Process...");

processJobs().catch(e => {
  console.error("Worker crashed:", e);
  process.exit(1);
});

// Handle shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
