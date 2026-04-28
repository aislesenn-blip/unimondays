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
    // Identity Priority: 1. AI Detected Identity (Top Priority per V2.3), 2. User FullName, 3. Student Name
    const userId = sub.userId;
    const key = userId || `${sub.studentName}-${sub.studentRegNo}`;

    // Priority Logic for Name Display
    const detectedName = sub.score?.detectedIdentity;
    const primaryName = detectedName || sub.user?.fullName || sub.studentName || 'Unknown Identity';

    // Secondary Info (Email or RegNo)
    const secondaryInfo = detectedName
        ? (sub.user?.email || sub.studentRegNo)
        : (sub.user?.email || sub.studentRegNo || '');

    if (!studentMap.has(key)) {
      studentMap.set(key, {
        id: key,
        name: primaryName,
        secondaryInfo: secondaryInfo,
        regNo: sub.studentRegNo || sub.user?.email || 'N/A', // Keep for compatibility if needed, but UI uses secondaryInfo now
        scores: {}
      });
    }

    const student = studentMap.get(key);

    // If we encounter a submission with a detected identity, upgrade the name if the current one is just a fallback
    // Or strictly enforce detectedIdentity if we want that to be supreme.
    // The previous logic was: if (sub.score.detectedIdentity && !sub.user?.fullName)
    // The NEW Mandate says: "PRIORITIZE the AI detectedIdentity." even over account name potentially?
    // "The primary, bold text MUST be the score.detectedIdentity... The user's account email should only be displayed as a muted, secondary subtitle"
    // This implies Detected Identity > User Full Name.
    if (detectedName) {
        student.name = detectedName;
        student.secondaryInfo = sub.user?.email || sub.studentRegNo;
    } else if (sub.user?.fullName && student.name === 'Unknown Identity') {
        student.name = sub.user.fullName;
    }

    if (sub.score) {
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
            <h1 className="text-3xl font-bold tracking-tight">Continuous Assessment Matrix</h1>
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
