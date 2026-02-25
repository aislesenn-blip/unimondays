
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Injecting dummy submission for UI verification...");

  // Get Student 1
  const student = await prisma.user.findFirst({
    where: { email: 'student1@nu.edu' }
  });

  if (!student) throw new Error("Student 1 not found");

  // Get Quiz
  const quiz = await prisma.quiz.findUnique({
    where: { code: 'FINAL24' }
  });

  if (!quiz) throw new Error("Quiz not found");

  // Create Submission
  const submission = await prisma.submission.upsert({
    where: {
      quizId_userId: {
        quizId: quiz.id,
        userId: student.id
      }
    },
    update: {
      status: 'GRADED',
      score: {
        upsert: {
          update: {
            totalMarks: 85,
            breakdown: [
              { question: "Q1", score: 85, max: 100, feedback: "Great essay on AI." }
            ],
            remarks: "Excellent work despite API limits."
          },
          create: {
            totalMarks: 85,
            breakdown: [
              { question: "Q1", score: 85, max: 100, feedback: "Great essay on AI." }
            ],
            remarks: "Excellent work despite API limits."
          }
        }
      }
    },
    create: {
      quizId: quiz.id,
      userId: student.id,
      universityId: student.universityId!,
      studentRegNo: 'STU-001',
      studentName: 'Student 1',
      status: 'GRADED',
      submittedAt: new Date(),
      score: {
        create: {
          totalMarks: 85,
          breakdown: [
            { question: "Q1", score: 85, max: 100, feedback: "Great essay on AI." }
          ],
          remarks: "Excellent work despite API limits."
        }
      }
    }
  });

  console.log(`Injected Submission ID: ${submission.id}`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
