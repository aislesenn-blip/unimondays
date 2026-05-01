import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { openRouterKey: true }
    });

    return NextResponse.json({ key: dbUser?.openRouterKey || "" });
  } catch (error: unknown) {
    console.error("Fetch Key Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { key } = body;

    await prisma.user.update({
      where: { id: user.id },
      data: { openRouterKey: key || null }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Save Key Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
