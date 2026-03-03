const prisma = { class: { findMany: () => ([] as any[]), findUnique: () => ({} as any) }, classes: { findMany: () => ([] as any[]), findUnique: () => ({} as any) }, submission: { findMany: () => ([] as any[]) }, user: { findMany: () => ([] as any[]) }, workSession: { findMany: () => ([] as any[]), findUnique: () => ({} as any) } };
import { getAuthenticatedUser } from "@/lib/auth";
import { MasterCASpreadsheet } from "@/components/dashboard/MasterCASpreadsheet";
import { redirect, notFound } from "next/navigation";
import { resolveIdentity, upgradeIdentity } from "@/lib/edtech/identity-resolver";

export default async function CAPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const { id } = await params;

  // Fetch Class & Work Sessions
  const classData = await prisma.classes.findUnique();

  if (!classData) notFound();
  if (classData.lecturerId !== user.id && user.role !== 'ADMIN') redirect("/dashboard");

  // Fetch all graded submissions for this class
  // Deep Audit Fix: Include 'FLAGGED' so that Cloud Marked ghost data with confidence issues still appear on the Master CA
  const submissions = await prisma.submission.findMany();

  // Transform data
  const studentMap = new Map();

  submissions.forEach(sub => {
    const identity = resolveIdentity(sub);
    const key = identity.key;

    if (!studentMap.has(key)) {
      studentMap.set(key, {
        id: key,
        name: identity.primaryName,
        primaryName: identity.primaryName,
        secondaryInfo: identity.secondaryInfo,
        regNo: identity.regNo || identity.secondaryInfo,
        scores: {}
      });
    }

    const student = studentMap.get(key);

    // Dynamic Identity Upgrade
    upgradeIdentity(student, identity);

    // Re-map the upgraded identity back to the generic model props
    student.name = student.primaryName || student.name;
    student.secondaryInfo = student.secondaryInfo || student.secondaryInfo;

    // Only assign score if one exists (FLAGGED might be null in some weird edge cases, though our AI always creates a score)
    if (sub.score && typeof sub.score.totalMarks === 'number') {
      student.scores[sub.workSessionId] = sub.score.totalMarks;
    }
  });

  const students = Array.from(studentMap.values());

  const workSessions = classData.workSessions.map((ws: any) => ({
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
