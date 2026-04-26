# Deep Technical Audit: Playbook EdTech Vercel-Native AI Grading Architecture

## PHASE 1 — SYSTEM MAP

**Full grading architecture map:**
1.  **Frontend Interface (Student):** The student uploads a scanned exam/assignment PDF via `SubmissionDrawer.tsx`.
2.  **Supabase Bridge:** The file is immediately uploaded client-side directly to a Supabase bucket (`exam_pdfs`) using the `anon` role. This bypasses Vercel’s 4.5MB request body limit.
3.  **On-the-Spot OCR (Extraction):** The frontend calls `/api/ocr/extract` passing the Supabase file path. The server downloads the file from Supabase, converts it to images (if PDF) via `pdf-to-img`, and sends it to `gemini-2.5-flash` to extract structured text.
4.  **Submission Endpoint:** The frontend calls `/api/student/submit`, passing the extracted text (`ocrText`) and the `filePath`. The submission is saved to the Postgres database via Prisma, and its status is marked as `GRADING`.
5.  **Invisible Background Trigger:** `/api/student/submit` uses Vercel's `waitUntil()` utility to silently trigger a `fetch` request to `/api/grade/stream`, passing an internal `Authorization: Bearer INTERNAL_API_KEY` header.
6.  **Batch-Map-Reduce Engine:** The `/api/grade/stream` endpoint retrieves the pre-parsed Marking Scheme (JSON), breaks it into chunks of 5 questions, and uses `p-limit(5)` to concurrently query `gemini-2.5-pro` using a strictly structured Zod schema and Chain-of-Thought (CoT) prompting.
7.  **Final Aggregation & DB Update:** The grading engine aggregates the scores, extracts the Registration Number, and updates the `Score` and `Submission` tables. Status updates to `GRADED`.

**All related files and folders:**
-   `src/components/student/SubmissionDrawer.tsx` (Student UI Entry)
-   `src/components/dashboard/CreateWorkSessionSheet.tsx` & `WorkSessionControls.tsx` (Teacher UI - Rubric Upload)
-   `src/app/api/ocr/extract/route.ts` (OCR & Rubric Parsing Engine)
-   `src/app/api/student/submit/route.ts` (Submission Entry & Trigger)
-   `src/app/api/grade/stream/route.ts` (Core AI Grading Engine)
-   `src/app/api/session/regrade/route.ts` (Batch Regrading Trigger)
-   `src/app/api/work-sessions/[id]/submissions/[subId]/retry/route.ts` (Manual Retry Trigger)
-   `src/app/api/cloud-marking/[id]/convert/route.ts` (Bulk/Cloud Marking Conversion)
-   `src/lib/ai/gemini.ts` (Legacy/Helper AI functions)
-   `prisma/schema.prisma` (Database layer)

**Dependency relationships:**
-   `@vercel/functions` (`waitUntil` for serverless background persistence)
-   `ai` and `@ai-sdk/google` (Vercel AI SDK for Gemini connections and structured JSON generation)
-   `p-limit` (Concurrency throttling to prevent Vercel 504 timeouts and Google API 429 rate limits)
-   `pdf-to-img` & `@napi-rs/canvas` (Serverless PDF rasterization)
-   `zod` (Strict schema definition for AI outputs)
-   `@supabase/supabase-js` (Storage bridge)

**Data flow map:**
`User PDF -> Supabase (exam_pdfs) -> Next.js API (/api/ocr/extract) -> Gemini 2.5 Flash -> Plain Text -> Next.js API (/api/student/submit) -> Postgres DB -> Next.js API (/api/grade/stream) -> Gemini 2.5 Pro (Map-Reduce) -> Postgres DB`

---

## PHASE 2 — ENTRY POINTS

**Where grading starts:**
Grading can be initiated from three primary entry points:
1.  **New Submission:** Initiated by the student via `/api/student/submit`.
2.  **Manual Retry:** Initiated by the lecturer via `/api/work-sessions/[id]/submissions/[subId]/retry` (Triggered from the UI if a submission gets flagged or stuck).
3.  **Batch Regrade:** Initiated by the lecturer via `/api/session/regrade` (Triggered when the marking scheme is updated or recalibrated).

**Exact execution path (New Submission Example):**
1.  `SubmissionDrawer.tsx` calls `supabase.storage.upload()`.
2.  `SubmissionDrawer.tsx` calls `fetch('/api/ocr/extract', { filePath })`.
3.  `api/ocr/extract` returns `{ text: "Student answers..." }`.
4.  `SubmissionDrawer.tsx` calls `fetch('/api/student/submit', { extractedText, filePath })`.
5.  `api/student/submit` verifies the JWT session, checks the deadline, updates/creates the `Submission` row (status: `GRADING`).
6.  `api/student/submit` calls `waitUntil(fetch('/api/grade/stream', { headers: { Auth }, body: { submissionId } }))`. The UI is released.
7.  `api/grade/stream` receives the request securely, fetches the `ocrText` and the pre-parsed JSON `rubric` from the DB.
8.  It chunks the rubric into blocks of 5 and calls `gemini-2.5-pro` concurrently via `p-limit`.
9.  It aggregates scores, extracts `Reg No`, and saves the results.

---

## PHASE 3 — CORE GRADING ENGINE

**Every grading function:**
The core grading function resides entirely within the POST handler of `src/app/api/grade/stream/route.ts`. It maps over the `rubricChunks` (arrays of 5 questions each) and utilizes the `generateObject` method from the Vercel AI SDK.

**Every scoring function:**
Scoring is performed implicitly by the LLM (`gemini-2.5-pro`). The system prompt instructs the AI to evaluate semantics and math steps. The resulting score is validated and coerced by Zod (`score: z.number().describe(...)`).

**Every validation function:**
-   **Auth Validation:** Validates `process.env.INTERNAL_API_KEY` against the `Authorization: Bearer` header to block external abuse.
-   **Data Validation:** Checks if `submissionId`, `submission`, `ocrText`, and `finalRubricText` exist before proceeding.
-   **Schema Validation:** The AI SDK uses Zod (`atomicGradingSchema`) to force the LLM to output an exact structure containing `question`, `thoughtProcess`, `score`, `max`, `feedback`, and `evidenceSnippet`.

**Every comparison engine & justification generator:**
Comparison is heavily reliant on the **Chain of Thought (CoT)** prompt injected into `thoughtProcess`. Before scoring, the AI must answer: *"Explain step-by-step how the student's answer maps to the rubric. Did they use a synonym? Are the mathematical steps correct even if the final answer is wrong? DO THIS BEFORE SCORING."* This acts as the justification engine.

---

## PHASE 4 — MARKING SCHEME ENGINE

**How marking schemes are stored:**
Marking schemes are stored in the `WorkSession` model within the `rubric` column as a serialized JSON string representing an array of question objects. (Legacy systems stored them as raw strings or URLs in `markingScheme`).

**How rubrics are parsed:**
When a teacher uploads a rubric via `WorkSessionControls.tsx` or `CreateWorkSessionSheet.tsx`:
1.  The PDF is uploaded to Supabase.
2.  `/api/ocr/extract` is called with `{ isRubric: true }`.
3.  The OCR endpoint uses `gemini-2.5-flash` with a strict JSON output prompt to read the document and extract an array of `{ questionId, maxScore, rubricSegment }`.
4.  This exact JSON string is saved into the `rubric` column.
*Fallback:* If `api/grade/stream` encounters a legacy plain-text rubric, it invokes an on-the-fly parse using `gemini-2.5-pro` before grading begins.

---

## PHASE 5 — AI + LOGIC LAYER

**LLM prompts:**
1.  **OCR Extraction Prompt (Student):** *"You are an Intelligent Exam Collator... INTELLIGENT COLLATION: Students often answer questions out of order... You MUST group all parts of a single question together under a clear header... Output cleanly formatted text, do NOT summarize."*
2.  **OCR Parsing Prompt (Rubric):** *"You are an expert data structured parser... ONLY extract actual questions meant to be graded... You MUST output ONLY valid JSON..."*
3.  **Grading Engine System Prompt:**
```text
You are an expert University Professor grading an exam.
You have been provided with a specific set of Questions from the Marking Scheme and the Student's Full Exam Text.
YOUR GOAL: To grade ONLY the specific questions provided in the chunk against the student's answers. Do not grade any other questions.
CRITICAL RULES:
1. EVALUATE SEMANTICS, NOT JUST SYNTAX...
2. CHAIN OF THOUGHT: You MUST explicitly think step-by-step in the 'thoughtProcess' field BEFORE awarding a score.
3. CALCULATIONS: If a question involves math, follow the student's steps.
4. UNANSWERED: If the student did not answer a question... give it a score of 0.
```

**Semantic grading & Rule-based grading:**
The system uses purely Semantic Grading via LLM (`gemini-2.5-pro`). It does not use Vector Search, Embeddings, or Ontology mapping. The "Rule-based" logic is injected via English instructions (e.g., instructing the LLM to award partial marks for mathematical steps).

---

## PHASE 6 — DATABASE LAYER

**Tables & Schemas (Relevant to Grading):**
-   `User`: Represents the Student or Lecturer.
-   `WorkSession`: Represents the Exam/Assignment. Contains `totalMarks`, `markingScheme` (Supabase URL), `rubric` (Structured JSON string), `calibration`, and `releaseMode`.
-   `Submission`: Represents the student's attempt. Contains `ocrText` (the extracted text), `filePath` (Supabase URL for exports), `status` (`PENDING`, `GRADING`, `GRADED`, `FAILED`, `APPEALED`).
-   `Score`: Contains the results. `totalMarks` (Float), `breakdown` (JSON string of the array generated by `api/grade/stream`), `detectedIdentity`, and `isOverridden` (Boolean).
-   `SystemLog` & `AuditLog`: Currently in schema but rarely invoked directly in the streaming pipeline (primarily logs via `console.error`).

---

## PHASE 7 — FINAL SCORE CONSTRUCTION

**Score aggregation:**
Inside `/api/grade/stream/route.ts`, after `Promise.allSettled(gradingPromises)` completes the chunks:
```javascript
let calculatedTotalScore = 0;
for (const result of chunkResults) {
    if (result.status === 'fulfilled') {
        for (const gradedQ of result.value) {
            finalBreakdown.push(gradedQ);
            calculatedTotalScore += gradedQ.score;
        }
    }
}
```
The `calculatedTotalScore` is a simple arithmetic sum of the `score` attributes returned by the LLM for each question.

---

## PHASE 8 — COMPLETE CODE DUMP

*(Due to size limits, the core file `/api/grade/stream/route.ts` is dumped here as it contains 90% of the grading logic)*

**Path:** `src/app/api/grade/stream/route.ts`
**Why it matters:** This is the absolute core of the application. It replaced QStash and handles the AI interactions, map-reduce chunking, score aggregation, and database updates.

```javascript
import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { supabase } from '@/lib/supabase';
import { extractPagesMultimodal, ocrDocument } from '@/lib/ai/gemini';
import pLimit from 'p-limit';

export const maxDuration = 300;

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || 'dummy',
  baseURL: "https://generativelanguage.googleapis.com/v1beta/",
});

// Defines the strict output format required from Gemini 2.5 Pro
const atomicGradingSchema = z.object({
  gradedQuestions: z.array(z.object({
    question: z.string(),
    thoughtProcess: z.string(), // Crucial for Accuracy (CoT)
    score: z.number(),
    max: z.number(),
    feedback: z.string(),
    evidenceSnippet: z.string()
  }))
});

const regNoSchema = z.object({ detectedRegNo: z.string() });

export async function POST(req: NextRequest) {
    let globalSubmissionId: string | null = null;
    try {
        // 1. Security Check
        const authHeader = req.headers.get('authorization');
        const internalKey = process.env.INTERNAL_API_KEY;
        if (!internalKey || authHeader !== `Bearer ${internalKey}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        globalSubmissionId = body.submissionId;

        // 2. Fetch Submission & Rubric
        const submission = await prisma.submission.findUnique({
            where: { id: globalSubmissionId },
            include: { workSession: true }
        });

        let finalRubricText = submission.workSession.rubric || submission.workSession.markingScheme;

        // 3. Rubric Parsing / Pre-processing
        let parsedRubricItems: any[] = [];
        try {
            parsedRubricItems = JSON.parse(finalRubricText);
        } catch (e) {
            // Fallback for legacy plain text rubrics to convert them to JSON arrays dynamically
            const rubricStructureResponse = await generateObject({
                model: google('gemini-2.5-pro'),
                system: "Extract all gradable questions...",
                prompt: finalRubricText,
                schema: z.object({ items: z.array(...) }),
                temperature: 0.0,
            });
            parsedRubricItems = (rubricStructureResponse.object as any)?.items || [];
        }

        // 4. Batching (Map-Reduce Setup)
        const limit = pLimit(5); // Process 5 chunks concurrently max
        const CHUNK_SIZE = 5; // 5 questions per chunk
        const rubricChunks = [];
        for (let i = 0; i < parsedRubricItems.length; i += CHUNK_SIZE) {
            rubricChunks.push(parsedRubricItems.slice(i, i + CHUNK_SIZE));
        }

        // 5. Grading Execution
        const gradingPromises = rubricChunks.map(chunk =>
            limit(async () => {
                const chunkJsonString = JSON.stringify(chunk, null, 2);
                const systemPrompt = `You are an expert University Professor... (Truncated for brevity)`;
                const userPrompt = `STUDENT FULL EXAM TEXT:\n${submission.ocrText}`;

                const { object } = await generateObject({
                    model: google('gemini-2.5-pro'),
                    system: systemPrompt,
                    prompt: userPrompt,
                    schema: atomicGradingSchema,
                    temperature: 0.0,
                });
                return (object as any)?.gradedQuestions || [];
            })
        );

        const chunkResults = await Promise.allSettled(gradingPromises);

        // 6. Score Aggregation
        let finalBreakdown: any[] = [];
        let calculatedTotalScore = 0;
        for (const result of chunkResults) {
            if (result.status === 'fulfilled') {
                for (const gradedQ of result.value) {
                     finalBreakdown.push(gradedQ);
                     calculatedTotalScore += gradedQ.score;
                }
            }
        }

        // 7. Identity Extraction
        let detectedRegNo = "UNKNOWN";
        try {
            const regNoResponse = await generateObject({
                model: google('gemini-2.5-pro'),
                system: "Extract the registration number...",
                prompt: submission.ocrText,
                schema: regNoSchema,
                temperature: 0.0
            });
            detectedRegNo = regNoResponse.object.detectedRegNo;
        } catch(e) {}

        const regNoToSave = detectedRegNo !== "UNKNOWN" ? detectedRegNo : submission.studentRegNo;

        // 8. Database Persistance
        await prisma.score.upsert({
            where: { submissionId: globalSubmissionId },
            update: { totalMarks: calculatedTotalScore, breakdown: JSON.stringify(finalBreakdown) /*...*/ },
            create: { submissionId: globalSubmissionId, totalMarks: calculatedTotalScore, breakdown: JSON.stringify(finalBreakdown) /*...*/ }
        });

        await prisma.submission.update({
            where: { id: globalSubmissionId },
            data: { status: 'GRADED', studentRegNo: regNoToSave }
        });

        return NextResponse.json({ success: true, score: calculatedTotalScore });

    } catch (error: any) {
        // 9. Failure State Handler
        try {
            if (globalSubmissionId) {
                await prisma.submission.update({
                    where: { id: globalSubmissionId },
                    data: { status: 'FAILED', feedback: 'Failed to complete grading process.' }
                });
            }
        } catch (e) {}
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
```

---

## PHASE 9 — WEAKNESSES + BOTTLENECKS

1.  **Vercel `maxDuration` Hard Limit (Scalability Risk):** The `api/grade/stream` endpoint relies on Vercel's 300s timeout limit (Pro plan). Even with `p-limit` and concurrent chunking, if an exam is 200 questions long, 300 seconds will not be enough time for `gemini-2.5-pro` to process all chunks. The function will die silently at 300s.
2.  **No Retry Mechanism on Sub-Chunk Failures:** If `Promise.allSettled` runs 10 chunks, and 1 chunk fails (e.g., Google Rate Limit `429`), the code currently just logs `console.error` and aggregates the 9 successful chunks. The student will get `0` for the failed chunk's questions instead of the system retrying the failed chunk.
3.  **Prompt Size Limits (Hallucination Risk):** Providing `STUDENT FULL EXAM TEXT:\n${submission.ocrText}` for *every single chunk* means Gemini 2.5 Pro reads the entire 20-page exam over and over again for every chunk. While Gemini has a 2M token context window, this is incredibly inefficient financially and increases the "Lost in the Middle" risk because the AI has to hunt for the specific 5 questions inside a massive block of text every time.
4.  **Coupling OCR with Submissions:** If `/api/ocr/extract` takes 25 seconds (because the student uploaded a 30-page PDF), the student is left staring at an "Analyzing & Submitting" button. If their mobile internet disconnects during those 25 seconds, the upload drops and they have to restart.

---

## PHASE 10 — IMPROVEMENT OPPORTUNITIES

**Where grading can become faster & more accurate:**
1.  **Pre-Chunking Student Answers:** Instead of asking Gemini to search the *full exam text* during grading, add an intermediate step that Maps Student Answers to Questions.
    `{ "Q1": "Student text for Q1...", "Q2": "Student text for Q2..." }`
    Then, pass *only* the specific student text to the specific grading chunk. This will reduce tokens by 95%, speed up grading massively, and eliminate "Lost in the Middle" hallucinations completely.
2.  **Robust In-Memory Retries:** Wrap the `generateObject` call inside the `p-limit` loop with an exponential backoff function (e.g., try 3 times if it fails) to ensure network blips don't result in 0 scores.
3.  **Asynchronous Message Queues (e.g., Inngest or AWS CloudTasks):** The transition away from QStash to Vercel native `waitUntil` is great for hobby/small-scale, but for true Enterprise reliability, a queue system is mandatory to pause, resume, retry, and view dead-letter logs of failed grading jobs without hitting the 300s Vercel limit.

**Where examiner trust can be improved:**
1.  **Exposing `thoughtProcess` in the UI:** Currently, the `thoughtProcess` (Chain of Thought) is generated and saved in the JSON breakdown, but the UI (`SubmissionDrawer.tsx`) only shows the `feedback`. Showing the teacher exactly *how* the AI reasoned the math steps will instantly build trust.