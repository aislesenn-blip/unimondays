
// src/lib/db.ts
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';

// This setup is Vercel-friendly and uses the Data Proxy (Accelerate).
// The `log` configuration can be adjusted for different environments.
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
}).$extends(withAccelerate());

export default prisma;

