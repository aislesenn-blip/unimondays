
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeSession = await prisma.bulkSession.findFirst({
      where: {
        lecturerId: user.id,
        status: { in: ['PENDING', 'PROCESSING'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (activeSession) {
      return NextResponse.json(activeSession);
    }

    return NextResponse.json({ active: false });

  } catch (error: any) {
    console.error("Cloud Marking Active Fetch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
