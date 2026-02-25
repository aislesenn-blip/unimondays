import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user || user.role.toUpperCase() !== 'LECTURER') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId, name } = await req.json();
    if (!sessionId || !name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const session = await prisma.classes.findUnique({ where: { id: sessionId } });
    if (!session || session.lecturerId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Ensure a GroupSet exists or use default
    let groupSet = await prisma.groupSet.findFirst({
      where: { classId: sessionId },
      orderBy: { createdAt: 'desc' }
    });

    if (!groupSet) {
      groupSet = await prisma.groupSet.create({
        data: {
          classId: sessionId,
          name: "Default Group Set"
        }
      });
    }

    const group = await prisma.group.create({
      data: {
        setId: groupSet.id,
        name
      },
      include: { members: true }
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("Create group error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
