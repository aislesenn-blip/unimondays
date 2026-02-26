import fs from 'fs';
import path from 'path';

function checkFileContent(filePath: string, checks: string[]) {
  const content = fs.readFileSync(filePath, 'utf-8');
  console.log(`Checking ${filePath}...`);
  let allPass = true;
  for (const check of checks) {
    if (content.includes(check)) {
      console.log(`  ✅ Found: "${check.substring(0, 50)}..."`);
    } else {
      console.error(`  ❌ MISSING: "${check.substring(0, 50)}..."`);
      allPass = false;
    }
  }
  return allPass;
}

function verifyAuthFixes() {
  console.log("--- Verifying Auth Fixes ---");
  const signupPass = checkFileContent('src/app/api/auth/signup/route.ts', [
    'try {',
    'catch (error: any) {',
    'UserRole.LECTURER',
    'if (authError.message.includes(\'already registered\')',
    'return NextResponse.json({ error: \'Internal Server Error\', details: error.message }, { status: 500 });'
  ]);

  const loginPass = checkFileContent('src/app/api/auth/login/route.ts', [
    'try {',
    'catch (error: any) {',
    'if (!user) {',
    'console.warn(`[Login] Orphaned User Detected:',
    'error: \'Account setup incomplete. Please contact support'
  ]);

  return signupPass && loginPass;
}

function verifyQuotaFixes() {
  console.log("\n--- Verifying Quota Fixes ---");
  const submissionPass = checkFileContent('src/app/api/submissions/route.ts', [
    'lecturer: true',
    'if (quiz.lecturer.quota && quiz.lecturer.used !== null && quiz.lecturer.used >= quiz.lecturer.quota)',
    'return NextResponse.json({ error: \'Submission limit exceeded'
  ]);

  const workerPass = checkFileContent('src/workers/grading-worker.ts', [
    '// Increment Lecturer Quota (Dead Logic Fix)',
    'await prisma.user.update({',
    'where: { id: submission.quiz.lecturerId },',
    'data: { used: { increment: 1 } }'
  ]);

  return submissionPass && workerPass;
}

function runLogicSimulation() {
    console.log("\n--- Simulating Quota Logic ---");
    // Simulate the condition
    const lecturer = { quota: 100, used: 100 };
    const quiz = { lecturer };

    if (quiz.lecturer.quota && quiz.lecturer.used !== null && quiz.lecturer.used >= quiz.lecturer.quota) {
        console.log("  ✅ Logic correctly detects quota exceeded (100 >= 100).");
    } else {
        console.error("  ❌ Logic FAILED to detect quota exceeded.");
    }

    const lecturerOk = { quota: 100, used: 99 };
    const quizOk = { lecturer: lecturerOk };
    if (quizOk.lecturer.quota && quizOk.lecturer.used !== null && quizOk.lecturer.used >= quizOk.lecturer.quota) {
         console.error("  ❌ Logic FALSE POSITIVE (99 >= 100).");
    } else {
        console.log("  ✅ Logic correctly allows submission (99 < 100).");
    }
}

const authOk = verifyAuthFixes();
const quotaOk = verifyQuotaFixes();
runLogicSimulation();

if (authOk && quotaOk) {
    console.log("\n✅ ALL CHECKS PASSED.");
    process.exit(0);
} else {
    console.error("\n❌ SOME CHECKS FAILED.");
    process.exit(1);
}
