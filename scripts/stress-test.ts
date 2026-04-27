import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import pLimit from "p-limit";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/",
});

// Mock Data
const MOCK_RUBRIC_JSON = `
[
  {
    "sectionName": "A",
    "questions": [
      {
        "questionId": "1a",
        "topic": "Definition",
        "maxScore": 3,
        "criteria": [
          { "id": "c1", "text": "States conversion of light energy to chemical energy", "marks": 1 },
          { "id": "c2", "text": "Explicitly writes Chlorophyll", "marks": 1 },
          { "id": "c3", "text": "Mentions Water", "marks": 1 }
        ]
      },
      {
        "questionId": "1b",
        "topic": "Diagram",
        "maxScore": 2,
        "criteria": [
          { "id": "c1", "text": "A leaf shape is clearly drawn", "marks": 1 },
          { "id": "c2", "text": "An arrow is drawn pointing into the leaf and is labeled Sunlight", "marks": 1 }
        ]
      }
    ]
  }
]
`;

const MOCK_STUDENT_OCR = `
Student Registration: 2024-001
=== QUESTION 1a ===
Photosynthesis is when plants use light energy and change it into chemical energy. They use chlorophyll in their leaves. They also need water from the soil.
=== QUESTION 1b ===
[Student drew a diagram of a leaf with an arrow pointing inwards labeled "Sunlight"]
`;

const atomicGraderSchema = z.object({
  evaluations: z.array(z.object({
    criterionId: z.string(),
    isMet: z.boolean(),
    reasoning: z.string()
  }))
});

async function runStressTest() {
  console.log("🚀 Starting L9 Engine Stress Test...");
  console.log("-------------------------------------------------");
  console.log("Step 1: Simulating OCR output reception...");

  const parsedSections = JSON.parse(MOCK_RUBRIC_JSON);
  const allQuestions: any[] = [];
  parsedSections.forEach((section: any) => {
      section.questions.forEach((q: any) => allQuestions.push(q));
  });

  console.log(`Total questions loaded: ${allQuestions.length}`);

  console.log("\nStep 2: Simulating Semantic Router output...");
  // Normally the semantic router does this, but for the unit test we mock the output
  const studentAnswersDict: Record<string, string> = {
      "1a": "Photosynthesis is when plants use light energy and change it into chemical energy. They use chlorophyll in their leaves. They also need water from the soil.",
      "1b": "[Student drew a diagram of a leaf with an arrow pointing inwards labeled \"Sunlight\"]"
  };

  console.log("\nStep 3: Commencing Isolated Parallel Grading (Limit: 10)...");

  const limit = pLimit(10);
  let finalBreakdown: any[] = [];
  let calculatedTotalScore = 0;

  const gradingPromises = allQuestions.map((questionObj: any) => limit(async () => {
      const trueMax = Number(questionObj.maxScore);
      const isolatedStudentAnswer = studentAnswersDict[questionObj.questionId] || "";

      console.log(`Evaluating Question ${questionObj.questionId}...`);

      const systemPrompt = `You are a Global Examination Evaluation Engine.
Your task is to evaluate the provided STUDENT ISOLATED ANSWER strictly against the provided ATOMIC CRITERIA.
UNIVERSAL PROTOCOLS:
1. ATOMIC EVALUATION: Evaluate EACH criterion individually. Is it met (true) or not met (false)?
2. SEMANTIC INTELLIGENCE: Accept valid synonyms or alternative phrasing that convey the exact same scientific/academic concept.
3. ZERO HALLUCINATION: Base your decision ONLY on the student's text.
4. DIAGRAMS: Trust the explicit text descriptions of diagrams provided in the OCR as if you were looking at them.`;

      const userPrompt = `ATOMIC CRITERIA FOR QUESTION ${questionObj.questionId}:\n${JSON.stringify(questionObj.criteria, null, 2)}\n\nSTUDENT ISOLATED ANSWER:\n${isolatedStudentAnswer}`;

      try {
          const { object } = await generateObject({
              model: google('gemini-2.5-pro'),
              system: systemPrompt,
              prompt: userPrompt,
              schema: atomicGraderSchema,
              temperature: 0.0,
          });

          let questionScore = 0;
          const feedbackPoints: string[] = [];

          object.evaluations.forEach(evalResult => {
              const originalCriterion = questionObj.criteria.find((c: any) => c.id === evalResult.criterionId);
              if (originalCriterion && evalResult.isMet) {
                  questionScore += Number(originalCriterion.marks);
                  feedbackPoints.push(`✓ ${originalCriterion.text}`);
              } else if (originalCriterion && !evalResult.isMet) {
                   feedbackPoints.push(`✗ Missed: ${originalCriterion.text} (${evalResult.reasoning})`);
              }
          });

          let safeScore = Math.max(0, Math.min(questionScore, trueMax));

          return {
              question: questionObj.questionId,
              score: safeScore,
              max: trueMax,
              feedback: feedbackPoints.join(" | ")
          };

      } catch (err: any) {
          console.error(`Failed Q ${questionObj.questionId}:`, err);
          return null;
      }
  }));

  const results = await Promise.all(gradingPromises);
  results.forEach(res => {
       if (res) {
           finalBreakdown.push(res);
           calculatedTotalScore += res.score;
       }
  });

  console.log("\n=================================================");
  console.log("✅ TEST COMPLETE - FINAL RESULTS");
  console.log("=================================================");
  console.log(`Total Score: ${calculatedTotalScore}`);
  console.dir(finalBreakdown, { depth: null });
}

runStressTest();
