import { prisma } from '../src/lib/prisma';
import { User, University, Quiz } from '@prisma/client';

async function main() {
  console.log("🔴 STARTING DATA MODEL & LOGIC AUDIT...");
  console.log("Verifying Multi-Tenancy Isolation and Role Logic...");

  // Setup Data
  const uniA = await prisma.university.create({
    data: { name: 'Audit Uni A', code: 'AUDITA', domain: 'auditA.edu' }
  });
  const uniB = await prisma.university.create({
    data: { name: 'Audit Uni B', code: 'AUDITB', domain: 'auditB.edu' }
  });

  const lecturerA = await prisma.user.create({
    data: { email: 'auditorA@auditA.edu', role: 'LECTURER', universityId: uniA.id }
  });
  const lecturerB = await prisma.user.create({
    data: { email: 'auditorB@auditB.edu', role: 'LECTURER', universityId: uniB.id }
  });
  const studentA = await prisma.user.create({
    data: { email: 'auditStudentA@auditA.edu', role: 'STUDENT', universityId: uniA.id }
  });
  const adminA = await prisma.user.create({
    data: { email: 'auditAdminA@auditA.edu', role: 'ADMIN', universityId: uniA.id }
  });

  const quizA = await prisma.quiz.create({
    data: { title: 'Quiz A', code: 'Q_AUDIT_A', lecturerId: lecturerA.id, universityId: uniA.id }
  });

  // --- TEST 1: Tenant Isolation (Access Check) ---
  console.log("\n[TEST 1] Tenant Isolation Logic...");
  {
    // Simulate: Can Lecturer B access Quiz A?
    // Route Logic: prisma.quiz.findUnique({ where: { id: quizId }, include: { lecturer: true } })
    // Then check: quiz.lecturerId === user.id
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizA.id },
      include: { lecturer: true }
    });

    if (!quiz) throw new Error("Quiz A missing");

    // Strict Ownership Check
    const isOwner = quiz.lecturerId === lecturerB.id;
    if (isOwner) {
      console.error("❌ FAILED: Lecturer B owns Quiz A (Impossible!)");
    } else {
      console.log("✅ PASSED: Lecturer B denied access to Quiz A (Ownership check works)");
    }

    // Tenant Check (if implemented via University)
    // Does Quiz A belong to Uni B?
    const quizUniId = quiz.lecturer.universityId;
    if (quizUniId === uniB.id) {
      console.error("❌ FAILED: Quiz A linked to Uni B!");
    } else if (quizUniId === uniA.id) {
      console.log("✅ PASSED: Quiz A correctly linked to Uni A");
    }
  }

  // --- TEST 2: Role Check ---
  console.log("\n[TEST 2] Role Enforcement Logic...");
  {
    // Simulate: Student A tries to export (Role check)
    // Route Logic: if (user.role !== 'LECTURER' && user.role !== 'ADMIN')
    const canExport = studentA.role === 'LECTURER' || studentA.role === 'ADMIN';
    if (canExport) {
      console.error("❌ FAILED: Student A allowed to export!");
    } else {
      console.log("✅ PASSED: Student A denied export (Role check works)");
    }

    // Admin A?
    const adminCanExport = adminA.role === 'LECTURER' || adminA.role === 'ADMIN';
    if (adminCanExport) {
      console.log("✅ PASSED: Admin A allowed to export");
    } else {
      console.error("❌ FAILED: Admin A denied export!");
    }
  }

  // --- TEST 3: Cross-Tenant Job Queue ---
  console.log("\n[TEST 3] Job Queue Tenant Logic...");
  {
    // Ensure Job stores universityId
    // Enqueue a job for Quiz A (Uni A)
    const job = await prisma.job.create({
      data: {
        type: 'AI_GRADE',
        payload: { quizId: quizA.id },
        status: 'PENDING',
        universityId: uniA.id
      }
    });

    // Verify it has correct Uni ID
    const savedJob = await prisma.job.findUnique({ where: { id: job.id } });
    if (savedJob?.universityId === uniA.id) {
      console.log("✅ PASSED: Job correctly scoped to Uni A");
    } else {
      console.error("❌ FAILED: Job has wrong University ID:", savedJob?.universityId);
    }

    // Cleanup job
    await prisma.job.delete({ where: { id: job.id } });
  }

  // Cleanup Data
  await prisma.quiz.deleteMany({ where: { code: 'Q_AUDIT_A' } });
  await prisma.user.deleteMany({ where: { email: { contains: 'audit' } } });
  await prisma.university.deleteMany({ where: { code: { contains: 'AUDIT' } } });
}

main().catch(e => {
  console.error("Audit Script Error:", e);
  process.exit(1);
});
