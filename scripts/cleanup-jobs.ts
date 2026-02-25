
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up jobs...");
  await prisma.job.deleteMany({});
  console.log("Jobs deleted.");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
