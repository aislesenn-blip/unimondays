import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user || user.role.toUpperCase() !== 'LECTURER') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groupId = parseInt(id);
  const { studentId } = await req.json();

  if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 });

  // Verify group ownership
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { set: { include: { class: true } } }
  });

  if (!group || group.set.class.lecturerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Remove existing assignment
  await prisma.groupMember.deleteMany({
    where: {
      userId: studentId,
      group: { setId: group.setId }
    }
  });

  // Assign
  const member = await prisma.groupMember.create({
    data: {
      groupId: groupId,
      userId: studentId
    }
  });

  return NextResponse.json(member, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user || user.role.toUpperCase() !== 'LECTURER') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groupId = parseInt(id);
  const { studentId } = await req.json();

  if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 });

  // Verify group ownership
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { set: { include: { class: true } } }
  });

  if (!group || group.set.class.lecturerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.groupMember.deleteMany({
    where: {
      groupId: groupId,
      userId: studentId
    }
  });

  return NextResponse.json({ success: true });
}
