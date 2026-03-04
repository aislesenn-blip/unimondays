import { inngest } from "./client";
import { PrismaClient } from "@prisma/client";

// Ideally initialized globally, but keeping local to function scope for serverless
const prisma = new PrismaClient();

export const processSubmission = inngest.createFunction(
  { id: "process-submission", name: "Process PDF Submission", retries: 3 },
  { event: "api/submission.uploaded" },
  async ({ event, step }) => {
    const { submissionId, fileUrl, rubricId, rubricData } = event.data;

    // STEP 1: The Extraction (The Eyes) - using Gemini 1.5 Flash
    const rawPdfText = await step.run("extract-pdf-text", async () => {
      console.log(`Extracting text from PDF at ${fileUrl}`);
      // return fetch...
      return "Mock extracted student submission text based on PDF.";
    });

    // STEP 2: The Chunk-to-Rubric Mapping (CRITICAL) - using Claude 3 Haiku
    const mappedChunks = await step.run("map-chunks-to-rubric", async () => {
      console.log(`Mapping chunks to rubric for submission ${submissionId}`);
      // return JSON.parse(await response.json().choices[0].message.content)
      return [
        {
          question_id: "q1",
          question_title: "Explain the concept of deterministic grading.",
          student_answer_chunk: "Deterministic grading ensures that the same input always yields the exact same score and feedback, removing human bias and variability."
        }
      ]; // Mocked successful chunking mapping
    });

    // STEP 3: The Deterministic Grader (The Reasoner) - Parallel Execution via DeepSeek
    const evaluatedResults = await step.run("evaluate-chunks-parallel", async () => {
      console.log(`Initiating parallel grading for ${mappedChunks.length} chunks`);

      const evaluationPromises = mappedChunks.map(async (chunk: any) => {
        const correspondingRubricItem = rubricData.questions.find((q: any) => q.id === chunk.question_id);

        const prompt = `You are a Deterministic Grader. You MUST strictly evaluate the student's answer against this rubric item.

        <RubricItem>
        ${JSON.stringify(correspondingRubricItem)}
        </RubricItem>

        <StudentAnswer>
        ${chunk.student_answer_chunk}
        </StudentAnswer>

        You MUST evaluate using this STRICT hierarchy:
        Tier 1: Exact Match to rubric -> Full marks.
        Tier 2: Equivalent Concept (different wording, same meaning) -> Full marks.
        Tier 3: Partial/Weak match -> Partial marks proportional to correctness.
        Tier 4: Out of scope or incorrect -> 0 marks.

        You MUST output ONLY a valid JSON object matching exactly this schema:
        {
          "question_id": "${chunk.question_id}",
          "question_title": "${chunk.question_title}",
          "score": number,
          "max_marks": number,
          "tier_applied": "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4",
          "evidence_snippet": "exact verbatim quote from the student answer justifying the score",
          "student_feedback": "1-2 short crisp sentences for the student",
          "lecturer_justification": "technical internal remark explaining the tier choice",
          "review_suggested": boolean
        }`;

        // In production, execute the DeepSeek chat completion
        /*
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "deepseek/deepseek-chat",
            temperature: 0.0, // Strict determinism
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
          })
        });
        return JSON.parse(await response.json().choices[0].message.content);
        */

        // Return a mocked deterministic result
        return {
          question_id: chunk.question_id,
          question_title: chunk.question_title,
          score: 10,
          max_marks: 10,
          tier_applied: "Tier 1",
          evidence_snippet: "always yields the exact same score and feedback",
          student_feedback: "Excellent understanding of determinism in grading systems.",
          lecturer_justification: "Student correctly identified the core principle of identical input yielding identical output, matching the golden rubric exactly.",
          review_suggested: false
        };
      });

      // Execute all questions simultaneously! (Do not mix contexts!)
      return await Promise.all(evaluationPromises);
    });

    // STEP 4: Save final structured JSON Score breakdown to Database
    const finalScore = await step.run("save-database-score", async () => {
      const totalMarksAllocated = evaluatedResults.reduce((acc: number, item: any) => acc + item.score, 0);

      const scoreRecord = await prisma.score.create({
        data: {
          submissionId,
          score: totalMarksAllocated,
          breakdown: evaluatedResults, // Granular JSON saved
        }
      });

      // Update the submission status
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: "GRADED" }
      });

      return scoreRecord;
    });

    return { success: true, submissionId, totalScore: finalScore.score, breakdown: finalScore.breakdown };
  }
);
