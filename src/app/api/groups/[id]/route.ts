import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

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
  // Verify ownership
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { set: { include: { class: true } } }
  });

  if (!group || group.set.class.lecturerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Delete members first (cascade usually handles this but safety)
    await prisma.groupMember.deleteMany({ where: { groupId } });
    await prisma.group.delete({ where: { id: groupId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user || user.role.toUpperCase() !== 'LECTURER') return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groupId = parseInt(id);
  const { name } = await req.json();

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { set: { include: { class: true } } }
  });

  if (!group || group.set.class.lecturerId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.group.update({
    where: { id: groupId },
    data: { name }
  });

  return NextResponse.json(updated);
}
