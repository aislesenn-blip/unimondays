import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { MasterCASpreadsheet } from "@/components/dashboard/MasterCASpreadsheet";
import { redirect, notFound } from "next/navigation";

export default async function CAPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const { id } = await params;

  // Fetch Class & Work Sessions
  const classData = await prisma.classes.findUnique({
    where: { id },
    include: {
      workSessions: {
        orderBy: { createdAt: 'asc' },
        where: { status: { not: 'ARCHIVED' } }
      }
    }
  });

  if (!classData) notFound();
  if (classData.lecturerId !== user.id && user.role !== 'ADMIN') redirect("/dashboard");

  // Fetch all graded submissions for this class
  // Deep Audit Fix: Include 'FLAGGED' so that Cloud Marked ghost data with confidence issues still appear on the Master CA
  const submissions = await prisma.submission.findMany({
    where: {
      workSession: { classId: id },
      status: { in: ['GRADED', 'RELEASED', 'APPEALED', 'FLAGGED'] }
    },
    include: {
      score: true,
      user: true,
      workSession: true
    }
  });

  // Transform data
  const studentMap = new Map();

  submissions.forEach(sub => {
    // Identity Priority:
    // 1. Registered User ID
    // 2. Student Registration Number (Explicitly matched or uploaded)
    // 3. AI Detected Identity
    // 4. Ghost Fallback (Submission ID) to prevent null-null merging
    const userId = sub.userId;
    let regNo = sub.studentRegNo || sub.score?.detectedIdentity;

    if (regNo === 'UNIDENTIFIED_IDENTITY' || regNo === 'UNIDENTIFIED') {
      regNo = null;
    }

    // Deep Audit Fix: Prevent 'null-null' collisions that wipe out the CA Matrix by using submission ID for fully anonymous rows
    const key = userId || regNo || `ghost-${sub.id}`;

    // Priority Logic for Name Display
    const detectedName = sub.score?.detectedIdentity;
    const primaryName = detectedName || sub.user?.fullName || sub.studentName || `Unidentified Script (${sub.id.substring(0,6)})`;

    // Secondary Info (Email or RegNo)
    const secondaryInfo = sub.studentRegNo || sub.user?.email || '';

    if (!studentMap.has(key)) {
      studentMap.set(key, {
        id: key,
        name: primaryName,
        secondaryInfo: secondaryInfo,
        regNo: sub.studentRegNo || sub.score?.detectedIdentity || sub.user?.email || 'N/A',
        scores: {}
      });
    }

    const student = studentMap.get(key);

    // Upgrade the name/identity dynamically if a subsequent submission has better AI extraction data
    if (detectedName && detectedName !== 'UNIDENTIFIED_IDENTITY' && student.name.startsWith('Unidentified')) {
        student.name = detectedName;
    } else if (sub.user?.fullName && student.name.startsWith('Unidentified')) {
        student.name = sub.user.fullName;
    }

    // Only assign score if one exists (FLAGGED might be null in some weird edge cases, though our AI always creates a score)
    if (sub.score && typeof sub.score.totalMarks === 'number') {
      student.scores[sub.workSessionId] = sub.score.totalMarks;
    }
  });

  const students = Array.from(studentMap.values());

  const workSessions = classData.workSessions.map(ws => ({
    id: ws.id,
    title: ws.title,
    totalMarks: ws.totalMarks || 100,
    includeInCalculation: ws.includeInCalculation ?? true
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between pb-6 border-b">
         <div>
            <h1 className="text-3xl font-bold tracking-tight">Master CA Matrix</h1>
            <p className="text-muted-foreground">{classData.code}: {classData.name}</p>
         </div>
      </div>
      <MasterCASpreadsheet
        workSessions={workSessions}
        students={students}
        classId={id}
      />
    </div>
  );
}
