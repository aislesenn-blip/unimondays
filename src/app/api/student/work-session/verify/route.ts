import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 });
  }

  try {
    const session = await prisma.workSession.findUnique({
      where: { workCode: code },
      include: {
        lecturer: {
          select: { fullName: true }
        },
        class: {
          select: { name: true, code: true }
        }
      }
    });

    if (!session) {
      return NextResponse.json({ error: 'Invalid Work Code' }, { status: 404 });
    }

    if (session.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'This session is not accepting submissions.' }, { status: 403 });
    }

    // Check if deadline passed
    const now = new Date();
    const isLate = session.deadline && now > session.deadline;

    if (isLate) {
        // If strict deadline (implied by "if deadline passed... block cleanly" in prompt)
        // Prompt said: "If the deadline has passed (and the lecturer set a strict deadline), block the submission cleanly."
        // We don't have explicit "strict deadline" toggle in schema, but usually deadline implies strictness unless "allow late" is set.
        // Let's assume strict for "Zero Friction" (avoiding ambiguity).
        return NextResponse.json({ error: 'Submission deadline has passed.' }, { status: 403 });
    }

    // Return safe details
    return NextResponse.json({
      id: session.id,
      title: session.title,
      lecturerName: session.lecturer.fullName,
      className: session.class?.name,
      classCode: session.class?.code,
      deadline: session.deadline
    });

  } catch (error) {
    console.error("Verify Code Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
