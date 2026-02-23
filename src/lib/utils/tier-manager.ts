import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class TierManager {
  static async checkQuota(userId: number, scriptsCount: number = 1): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;

    if (user.used + scriptsCount > user.quota) {
      return false;
    }
    return true;
  }

  static async incrementUsage(userId: number, scriptsCount: number = 1) {
    await prisma.user.update({
      where: { id: userId },
      data: { used: { increment: scriptsCount } },
    });
  }
}
