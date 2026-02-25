import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class TierManager {
  static async checkQuota(userId: string, scriptsCount: number = 1): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;

    const used = user.used || 0;
    const quota = user.quota || 100;

    if (used + scriptsCount > quota) {
      return false;
    }
    return true;
  }

  static async incrementUsage(userId: string, scriptsCount: number = 1) {
    await prisma.user.update({
      where: { id: userId },
      data: { used: { increment: scriptsCount } },
    });
  }
}
