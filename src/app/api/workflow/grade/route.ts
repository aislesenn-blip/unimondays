import { serve } from "@upstash/workflow/nextjs";
import { prisma } from "@/lib/prisma";
import { readFile } from "@/lib/storage";
import { ocrDocument, extractStructuredMapMultimodal } from "@/lib/ai/gemini";
import { parseRubric } from "@/lib/rubric-parser";
import OpenAI from "openai";

// Export standard Vercel timeout max duration for any single execution step.
// Because of the workflow pattern, 300s is per-step, completely eradicating the Vercel Blackhole timeout.
export const maxDuration = 300;

export const { POST } = serve(
  async (context) => {
    const payload = context.requestPayload as { submissionId: string };
    const { submissionId } = payload;

    if (!submissionId) {
      throw new Error("Missing submissionId in workflow payload");
    }

    // Step 1: Initialize Database State and Fetch Configuration
    const { submission, finalRubricText } = await context.run("init-grading-session", async () => {
      const sub = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: { workSession: true }
      });

      if (!sub) throw new Error(`Submission ${submissionId} not found.`);

      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: 'PROCESSING', totalChunks: 0, processedChunks: 0 }
      });

      return { submission: sub, finalRubricText: sub.workSession.rubric };
    });

    // Step 2: Rubric Extraction & Caching
    const validatedRubricText = await context.run("ensure-rubric-cache", async () => {
      let text = finalRubricText;
      if ((!text || text.trim() === '') && submission.workSession.markingScheme) {
        console.log(`[WORKFLOW] Extracting new Rubric PDF...`);
        const urlOrText = submission.workSession.markingScheme;

        if (urlOrText.includes('/') || urlOrText.toLowerCase().endsWith('.pdf') || urlOrText.toLowerCase().endsWith('.png')) {
            const buffer = await readFile(urlOrText, 'exam_pdfs');
            const mimeType = urlOrText.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';
            text = await ocrDocument(buffer, mimeType);
        } else {
            text = urlOrText;
        }

        // Cache the parsed rubric in DB for subsequent submissions
        await prisma.workSession.update({
            where: { id: submission.workSession.id },
            data: { rubric: text }
        });
      }

      if (!text || text.trim() === '') {
        throw new Error("Fatal: Rubric text could not be extracted.");
      }
      return text;
    });

    // Step 3: Student PDF Map Phase (Fix Token Hemorrhage & Fuzzy Matcher Dead Code)
    // Extract directly into an explicit { "Q1": "text" } structured map.
    const structuredMap = await context.run("map-phase-student-ocr", async () => {
        if (!submission.filePath) throw new Error("Student file path missing.");

        console.log(`[WORKFLOW] Performing Map-Phase Structured OCR...`);
        const buffer = await readFile(submission.filePath, 'exam_pdfs');

        // This leverages the previously dead code from gemini.ts that strictly maps questions
        const result = await extractStructuredMapMultimodal(buffer);

        if (Object.keys(result).length === 0) {
            await prisma.submission.update({
                where: { id: submissionId },
                data: { status: 'REVIEW_NEEDED', feedback: 'OCR was unable to extract or map any student handwriting.' }
            });
            throw new Error("Empty OCR Structured Map");
        }

        return result;
    });

    // Step 4: Advance UI Status
    await context.run("set-ui-grading", async () => {
        await prisma.submission.update({
            where: { id: submissionId },
            data: { status: 'GRADING' }
        });
    });

    // Step 5: The Reduce Phase (Atomic Loop Over Each Question)
    // Vercel Timeout Buster: Each loop execution is its own persistent 'context.run'
    const masterRubricArray = parseRubric(validatedRubricText);
    const formattedBreakdown: any[] = [];
    const failedQuestions: any[] = [];

    // Check if API key is missing (Simulation Mode)
    const isSimulationMode = process.env.DEEPSEEK_API_KEY === 'dummy' || !process.env.DEEPSEEK_API_KEY;

    for (const rubricItem of masterRubricArray) {
        const questionId = rubricItem.questionId;
        const normalizedQ = questionId.trim().toUpperCase().replace(/\s+/g, '');

        // Fetch mapped text from Step 3 instead of massive fullExamText fuzzy matching
        const studentAnswer = structuredMap[normalizedQ] || "No answer found or illegible for this specific question.";

        // Isolate each API call into its own workflow step to prevent the 300s timeout collapse
        const evaluation = await context.run(`grade-question-${normalizedQ}`, async () => {
            console.log(`[WORKFLOW] Evaluating Question ${normalizedQ}...`);

            if (isSimulationMode) {
                 return {
                     question: rubricItem.questionId,
                     score: Math.floor(Math.random() * (rubricItem.maxScore + 1)),
                     max: rubricItem.maxScore,
                     feedback: "Simulation feedback: API inactive but workflow executed successfully.",
                     evidenceSnippet: "Simulated evidence."
                 };
            }

            try {
                const deepSeekClient = new OpenAI({
                    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
                    apiKey: process.env.DEEPSEEK_API_KEY!,
                    timeout: 60000,
                    maxRetries: 0, // Let Upstash handle retries, not the SDK
                });

                const response = await deepSeekClient.chat.completions.create({
                    model: "deepseek-chat",
                    messages: [
                        { role: "system", content: `You are a highly experienced University Professor grading to NECTA-level international standards. Evaluate ONE question against ONE rubric segment. Address the student directly as "You".

CRITICAL MANDATES:
1. SEMANTIC EQUIVALENCE (Tier 1): DO NOT PENALIZE FOR SIMPLE VOCABULARY. If a student explains a concept correctly using simple English, award full marks. You are grading the SCIENTIFIC MEANING, not just keywords.
2. RUTHLESS PENALTIES (Tier 3): If fundamentally incorrect concepts are present, score MUST BE 0. No effort marks. Be ruthless.
3. MISSING / SKIPPED (Tier 4): If the provided student context does not contain an answer to this specific question, score is 0.
4. MICRO-TUTORING FEEDBACK: You are strictly forbidden from using generic, lazy phrases like 'Ensure to include examples', 'Study more', or 'Expand on this'. Your feedback MUST be a 'Micro-Lesson'. You MUST directly provide the specific missing scientific fact or example from the rubric.
   - BAD: 'Include examples of beneficial nutrients next time.'
   - PERFECT: 'Beneficial nutrients (like Silicon or Cobalt) stimulate growth but are not strictly essential for survival. Next time, state this distinction and include one of these examples for full marks.'
5. Start your feedback with a tag: [Exact Match], [Partial Match], [Out of Scope], or [Missing].
6. Use the Sandwich Method for partial marks: start with what was correct, then state exactly what was missing (using Micro-Tutoring).
7. DO NOT penalize for missing sketches/diagrams (OCR cannot read them).

JSON FORMAT: { "extracted_evidence": "exact quote from student", "score": number, "feedback": "tag + micro-tutoring lesson (max 3 sentences)" }` },
                        { role: "user", content: `QUESTION: ${rubricItem.questionId}\nMAX SCORE: ${rubricItem.maxScore}\n\nRUBRIC SEGMENT:\n${rubricItem.rubricSegment}\n\nSTUDENT ANSWER (MAPPED CONTEXT):\n${studentAnswer}` }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.1,
                    max_tokens: 8192
                });

                const raw = response.choices[0]?.message?.content || '{}';
                const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
                const result = JSON.parse(clean);

                return {
                    question: rubricItem.questionId,
                    score: Number(result.score) || 0,
                    max: Number(rubricItem.maxScore) || 0,
                    feedback: result.feedback || "No feedback provided.",
                    evidenceSnippet: result.extracted_evidence || "None found"
                };
            } catch (e: any) {
                // FIX: Silent Zero Bug.
                // Do NOT return a 0 score and pretend grading succeeded.
                // Throw an explicit error. Upstash will retry this specific step.
                // If it fails after all retries, the workflow will fail the submission.
                console.error(`[WORKFLOW] API Failure on Q${normalizedQ}:`, e.message);
                throw new Error(`AI API failed for Question ${normalizedQ}: ${e.message}`);
            }
        });

        formattedBreakdown.push(evaluation);
    }

    // Step 6: Aggregate and Save
    await context.run("aggregate-and-save", async () => {
        const calculatedTotalScore = formattedBreakdown.reduce((sum: number, item: any) => sum + item.score, 0);

        // Identity Extraction fallback from structured map
        const regNoMatch = structuredMap["GLOBAL_METADATA"] || "UNKNOWN";

        await prisma.score.upsert({
            where: { submissionId: submission.id },
            update: {
                totalMarks: calculatedTotalScore,
                remarks: "Graded via Durable Workflow.",
                breakdown: JSON.stringify(formattedBreakdown),
                detectedIdentity: regNoMatch
            },
            create: {
                submissionId: submission.id,
                totalMarks: calculatedTotalScore,
                remarks: "Graded via Durable Workflow.",
                breakdown: JSON.stringify(formattedBreakdown),
                detectedIdentity: regNoMatch
            }
        });

        await prisma.submission.update({
            where: { id: submission.id },
            data: {
                status: 'GRADED',
                studentRegNo: regNoMatch !== "UNKNOWN" ? regNoMatch : submission.studentRegNo
            }
        });

        if (process.env.DEBUG_MODE === 'true') {
            await prisma.systemLog.create({
                data: {
                    level: 'INFO',
                    message: 'Upstash Workflow Execution Complete',
                    metadata: JSON.stringify({
                        submissionId: submission.id,
                        totalScore: calculatedTotalScore,
                        questionsGraded: formattedBreakdown.length
                    })
                }
            });
        }
    });
  },
  {
      failureUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://playbook.edu'}/api/workflow/failure`
  } as any
);