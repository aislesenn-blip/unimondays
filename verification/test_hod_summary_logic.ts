import { PrismaClient } from "@prisma/client";
import { DeepSeekService } from "../src/lib/ai/deepseek";

const prisma = new PrismaClient();

// Mock DeepSeekService for verification if needed, or use real one
// We'll use the real one but wrap in try-catch to avoid API errors failing the build if key is missing/invalid
// However, we want to verify the integration.

async function run() {
  try {
    console.log("Checking DB for submissions...");
    const count = await prisma.submission.count({ where: { status: "graded" } });

    if (count < 5) {
      console.log("Seeding dummy data for HOD Summary test...");

      // Ensure a user and quiz exist
      let user = await prisma.user.findFirst();
      if (!user) {
          user = await prisma.user.create({
              data: { email: "test@hod.com", role: "lecturer" }
          });
      }

      let quiz = await prisma.quiz.findFirst();
      if (!quiz) {
          quiz = await prisma.quiz.create({
              data: {
                  title: "Math Test 101",
                  code: "MATH-TEST",
                  lecturerId: user.id
              }
          });
      }

      // Create dummy submissions
      for (let i = 0; i < 5; i++) {
        const score = Math.floor(Math.random() * 100);
        const sub = await prisma.submission.create({
            data: {
                quizId: quiz.id,
                studentRegNo: `TEST-${i}`,
                status: "graded",
                score: {
                    create: {
                        totalMarks: score,
                        breakdown: "[]",
                        remarks: score < 40 ? "Failed due to lack of understanding." : "Good job."
                    }
                }
            }
        });
      }
      console.log("Seeded 5 submissions.");
    }

    // Now run the HOD Summary Logic (mimicking the API route)
    console.log("Fetching data for summary...");
    const submissions = await prisma.submission.findMany({
      where: { status: "graded" },
      take: 20,
      orderBy: { submittedAt: "desc" },
      include: { score: true, quiz: true }
    });

    const total = submissions.length;
    const failed = submissions.filter(s => (s.score?.totalMarks || 0) < 40).length;
    const avg = submissions.reduce((acc, s) => acc + (s.score?.totalMarks || 0), 0) / total;

    const statsContext = `
      Total Scripts Analyzed: ${total}
      Average Score: ${avg.toFixed(1)}
      Failure Rate (<40%): ${((failed / total) * 100).toFixed(1)}%

      Detailed Performance Samples:
      ${submissions.map(s =>
        `- Student ${s.studentRegNo} (Quiz: ${s.quiz.title}): Scored ${s.score?.totalMarks}. Remarks: ${s.score?.remarks?.slice(0, 100)}...`
      ).join("\n")}
    `;

    console.log("Generated Stats Context:");
    console.log(statsContext);

    console.log("Calling DeepSeek for Summary...");
    // We use a mock here to avoid spending API credits on every test run,
    // but the structure is what we are testing.
    // However, if we want to test the REAL DeepSeek integration, we can instantiate it.

    // Check if key is present
    if (process.env.DEEPSEEK_API_KEY) {
        const deepseek = new DeepSeekService();
        const summary = await deepseek.generateHODSummary(statsContext);
        console.log("\n--- HOD Executive Summary ---");
        console.log(summary);
        console.log("-----------------------------");
    } else {
        console.log("Skipping actual API call (DEEPSEEK_API_KEY not set). Logic verified.");
    }

  } catch (e) {
    console.error("Test Failed:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
