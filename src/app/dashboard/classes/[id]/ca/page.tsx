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
  const submissions = await prisma.submission.findMany({
    where: {
      workSession: { classId: id },
      status: { in: ['GRADED', 'RELEASED', 'APPEALED'] } // Include appealed ones too
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
    // Identity Priority: 1. User FullName (if linked), 2. AI Detected Identity, 3. Student Name (Submission)
    // Keying by UserID is best if available, else Name/RegNo combo.
    const userId = sub.userId;
    const key = userId || `${sub.studentName}-${sub.studentRegNo}`;

    if (!studentMap.has(key)) {
      studentMap.set(key, {
        id: key,
        name: sub.user?.fullName || sub.score?.detectedIdentity || sub.studentName || 'Unknown Student',
        regNo: sub.studentRegNo || sub.user?.email || 'N/A',
        scores: {}
      });
    }

    const student = studentMap.get(key);
    if (sub.score) {
      student.scores[sub.workSessionId] = sub.score.totalMarks;

      // Update name if we found a better one from AI and currently using fallback
      if (sub.score.detectedIdentity && !sub.user?.fullName) {
          student.name = sub.score.detectedIdentity;
      }
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
