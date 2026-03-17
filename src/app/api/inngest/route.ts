import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import prisma from "@/lib/db/prisma";
import { generateText, generateObject } from "ai";
import { openrouter } from "@/lib/ai/openrouter";
import { z } from "zod";

const withRetries = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) throw error;
      const jitter = Math.random() * 500;
      const delay = baseDelay * Math.pow(2, attempt - 1) + jitter;
      console.error(`[AI API Error] Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms...`, error);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Unreachable");
};

const processSubmission = inngest.createFunction(
  {
    id: "process-submission",
    onFailure: async ({ event, error }) => {
      const originalEvent = event.data.event;
      if (originalEvent?.data?.submissionId) {
        await prisma.submission.update({
          where: { id: originalEvent.data.submissionId },
          data: { status: "FAILED" },
        });
      }
    }
  },
  { event: "app/submission.process" },
  async ({ event, step }) => {
    const { submissionId, pdfUrl, rubricId } = event.data;

    const rubric = await prisma.rubric.findUnique({
      where: { id: rubricId },
    });

    if (!rubric || !rubric.standardizedJson) {
      throw new Error("Rubric not found or not standardized");
    }

    // Step 1: OCR Extraction with Gemini 1.5 Flash via OpenRouter
    const rawText = await step.run("extract-text-from-pdf", async () => {
      return await withRetries(async () => {
        const res = await generateText({
          model: openrouter("google/gemini-2.5-flash"), // 2.5 per memory constraints
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract all handwritten and typed text from this document accurately.",
                },
                {
                  type: "image", // Mocking PDF ingestion as image via OpenRouter vision
                  image: pdfUrl,
                },
              ],
            },
          ],
        });
        return res.text;
      });
    });

    // Step 2: Chunk-to-Rubric Mapping with Claude 3 Haiku via OpenRouter
    const chunks = await step.run("chunk-student-answers", async () => {
      return await withRetries(async () => {
        const res = await generateObject({
          model: openrouter("anthropic/claude-3-haiku"),
          schema: z.object({
            chunks: z.array(
              z.object({
                question_number: z.string(),
                content: z.string(),
              })
            ),
          }),
          prompt: `Split the following student exam text into specific "Answer Chunks" that perfectly align with the questions in the standardized JSON Rubric.\n\nRubric:\n${JSON.stringify(
            rubric.standardizedJson
          )}\n\nStudent Text:\n${rawText}`,
        });
        return res.object.chunks;
      });
    });

    // Step 3: Deterministic Grader using DeepSeek via OpenRouter (Parallelism)
    const grades = await step.run("evaluate-chunks", async () => {
      const pLimit = (await import("p-limit")).default;
      const limit = pLimit(10);
      const parsedRubric = rubric.standardizedJson as any;

      const evaluations = await Promise.all(
        chunks.map((chunk) =>
          limit(async () => {
            const matchingRubricItem = parsedRubric.questions.find(
              (q: any) => q.question_number === chunk.question_number
            );

            if (!matchingRubricItem) return null;

            return await withRetries(async () => {
              const evaluation = await generateObject({
                model: openrouter("deepseek/deepseek-chat"),
                temperature: 0.0,
                topP: 0.1,
                schema: z.object({
                  question_title: z.string(),
                  score: z.number(),
                  max_marks: z.number(),
                  tier_applied: z.string(),
                  evidence_snippet: z.string(),
                  student_feedback: z.string(),
                  lecturer_justification: z.string(),
                  review_suggested: z.boolean(),
                }),
                prompt: `Evaluate the student's answer chunk against the specific rubric item.\n\nTier 1: Exact Match -> Full marks.\nTier 2: Equivalent Concept -> Full marks.\nTier 3: Partial match -> Partial marks.\nTier 4: Out of scope -> 0 marks.\n\nBe extremely concise. Keep feedback under 4 sentences total.\n\nRubric Item:\n${JSON.stringify(
                  matchingRubricItem
                )}\n\nStudent Answer:\n${chunk.content}`,
              });

              return evaluation.object;
            });
          })
        )
      );

      return evaluations.filter((e) => e !== null);
    });

    // Step 4: Save final score to DB
    await step.run("save-final-score", async () => {
      const totalScore = grades.reduce((acc, curr) => acc + (curr?.score || 0), 0);

      await prisma.score.create({
        data: {
          submissionId,
          totalScore: Number(totalScore.toFixed(1)), // 1 decimal place limit per memory
          breakdown: { grades },
        },
      });

      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: "GRADED" },
      });
    });

    return { success: true };
  }
);

// Create an API that serves zero-dependency routing to Inngest
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processSubmission],
});
