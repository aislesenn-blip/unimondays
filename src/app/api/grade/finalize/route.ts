import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { extractPagesMultimodal, ocrDocument } from '@/lib/ai/gemini';
import { readFile } from '@/lib/storage';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Universal Retry Wrapper for async functions
async function withRetries<T>(fn: () => Promise<T>, retries = 3, delayMs = 3000): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            console.warn(`[NETWORK RETRY] Operation failed: ${error.message}. Retrying in ${delayMs}ms... (Attempt ${i + 1} of ${retries})`);
            if (i === retries - 1) throw error; // Throw on final failure
            await new Promise(res => setTimeout(res, delayMs)); // Wait before retry
        }
    }
    throw new Error("Unreachable");
}

// STRICT: Must be Native DeepSeek API, not OpenRouter.
const deepSeekClient = new OpenAI({
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    apiKey: process.env.DEEPSEEK_API_KEY || 'dummy',
    timeout: 300000, // FORCE 5-MINUTE SOCKET TIMEOUT (Do not drop at 60s)
    maxRetries: 4,   // WORLD-CLASS FAULT TOLERANCE: Retry up to 4 times automatically on ECONNRESET or 502s
});

export async function POST(req: NextRequest) {
    try {
        const { submissionId } = await req.json();

        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            include: { workSession: true }
        });

        if (!submission) throw new Error("Submission not found");

        let finalRubricText = submission.workSession.rubric;

        // 2. THE SELF-HEALING CACHE
        if ((!finalRubricText || finalRubricText.trim().length === 0) && submission.workSession.markingScheme) {
            console.log("[ARCHITECTURE] Missing Rubric Text. Extracting from PDF URL...");
            try {
                const urlOrText = submission.workSession.markingScheme;

                // If it's a Supabase file path
                if (urlOrText.includes('/') || urlOrText.toLowerCase().endsWith('.pdf') || urlOrText.toLowerCase().endsWith('.png')) {
                    const buffer = await withRetries(() => readFile(urlOrText, 'exam_pdfs'));
                    if (urlOrText.toLowerCase().endsWith('.pdf')) {
                        const pages = await withRetries(() => extractPagesMultimodal(buffer));
                        finalRubricText = pages.map(p => p.text).join('\n\n');
                    } else {
                        const mimeType = urlOrText.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';
                        finalRubricText = await withRetries(() => ocrDocument(buffer, mimeType));
                    }
                } else {
                    finalRubricText = urlOrText;
                }

                // PERMANENTLY CACHE IT: Save it back to the WorkSession!
                await prisma.workSession.update({
                    where: { id: submission.workSession.id },
                    data: { rubric: finalRubricText }
                });
                console.log("[ARCHITECTURE] Rubric successfully extracted and cached!");

            } catch (error) {
                console.error("[CRITICAL] Failed to extract Rubric PDF:", error);
                throw new Error("Rubric Extraction Failed");
            }
        }

        // 3. HARD STOP IF STILL EMPTY
        if (!finalRubricText || finalRubricText.trim().length === 0) {
            console.error("[CRITICAL] No Rubric or Marking Scheme found. Halting grading.");
            await prisma.submission.update({
                where: { id: submission.id },
                data: { status: 'FAILED', feedback: 'Missing Marking Scheme' }
            });
            throw new Error("Fatal: Rubric text is entirely missing. Cannot grade.");
        }

        // 1. Sort the chaotic chunks back into logical page order
        const sortedData = (submission.extractedData as any[])
            .sort((a, b) => a.pages[0] - b.pages[0]);

        const fullExamText = sortedData.map(chunk => `[PAGES ${chunk.pages.join(',')}]\n${chunk.text}`).join('\n\n');

        // 2. The Chaos Hunter Prompt (Precision Engineering)
        const systemPrompt = `You are an elite, empathetic academic professor grading a university exam.
You are evaluating a student's scanned, OCR-extracted exam against a strict Marking Scheme.

YOUR MANDATORY DIRECTIVES:
1. ANTI-LAZINESS (CRITICAL): The student's text is messy, out of order, or missing question numbers. DO NOT blindly output "Skipped question". You MUST semantically scan the ENTIRE student text for concepts, formulas, or keywords matching the rubric. Grade based on meaning, not layout.
2. THE EVIDENCE-FIRST MANDATE (CRITICAL ANTI-LAZINESS RULE):
Before you determine the \`score\` or write the \`feedback\`, you MUST fill out the \`extracted_evidence\` field. You must aggressively scan the ENTIRE student text (all pages, regardless of numbering) and extract the exact quote or phrase where the student attempted to answer the concept. Forcing yourself to output the evidence FIRST guarantees you will not lazily skip a question. Only if you have scanned the entire document and found absolutely zero semantic match, you may write "None found" in the evidence field and grade it as [Missing].
(Note: The extracted_evidence field is strictly for backend LLM reasoning. Do NOT display it on the Frontend UI. Keep the UI clean with just the question, score, and 3-line feedback).
3. TRUE SEMANTIC EQUIVALENCE (CRITICAL): You are evaluating MEANING, not exact wording. If the rubric provides specific examples (e.g., "Silicon" for beneficial nutrients) but the student correctly defines the core concept using their own valid words or different valid examples, YOU MUST AWARD MARKS. Do not lazily flag a concept as [Missing] just because the student didn't use the exact keywords or examples from the rubric. Dig into the semantics.
3. EMPATHETIC TONE: Speak directly to the student in your feedback (e.g., "You showed a great understanding of X..."). Do NOT use internal robotic language like "I graded holistically" or "mapped to rubric".
3. SEMANTIC TIERS: Every question's feedback MUST start with one of these exact NLP tags:
   - [Exact Match]: Concept perfectly aligns with the rubric.
   - [Partial Match]: Concept is touched upon but missing key rubric details.
   - [Out of Scope]: Concept is irrelevant or factually incorrect.
   - [Missing]: The concept was truly nowhere to be found in the entire exam text.
4. NO MATH: Do NOT calculate the total score. The backend system will calculate it. Just provide the individual scores.
5. OMNI-FORMAT GRADING MANDATE (CRITICAL - DO NOT SKIP):
You MUST grade EVERY question present in the Marking Scheme, regardless of its format. Do not skip a question because it looks complex in the OCR text. Apply the Semantic Tiers strictly across all formats:
- CALCULATIONS & MATH: Follow the step-by-step logic in the rubric. Grade intermediate steps, formulas, and final answers.
- DIAGRAMS & SKETCHES: The OCR has converted the student's drawings into descriptive text. You MUST read these textual descriptions of the diagrams. If the OCR text describes the shapes, labels, or processes required by the rubric diagram, award the exact marks.
- MULTIPLE CHOICE (MCQs): Scan the text for the exact option letter (e.g., A, B, C, D) OR the exact text of the chosen option.
- ESSAYS/SHORT ANSWERS: Apply standard holistic semantic matching.
If it is in the rubric, you MUST find the evidence in the text and grade it. NO EXCEPTIONS.
6. UNREADABLE OCR/HANDWRITING: If text is truly unreadable garbage, use [Out of Scope] or [Missing] and explain that the writing could not be deciphered.
7. EXTREME SCATTERED CONTEXT & NUMBERING BLINDNESS (CRITICAL):
Students often answer questions completely out of order (e.g., Question 6 on page 1, and Question 1 on page 20). They also use incomplete numbering (e.g., writing "1" at the top of the page, and then only writing "ii)", "iii)" for sub-questions).
DO NOT search the text using strict question labels like "Q1A ii". You MUST perform a semantic keyword search across the ENTIRE document for the RUBRIC CONCEPTS (e.g., "beneficial nutrients", "wicking system", "precision agriculture vs precision technologies").
If the concept, definition, or answer exists ANYWHERE in the student's text, you MUST grade it according to the rubric, regardless of the numbering or page order. ONLY use the [Missing] tag if you have exhaustively verified that the specific concept is entirely absent from all pages.

8. STRICT LENGTH LIMITS (NO WALLS OF TEXT):
  1. The \`aiFeedback\` field MUST be a maximum of 3 concise sentences summarizing the overall performance.
  2. The \`feedback\` string for EACH question in the breakdown array MUST be a maximum of 3 sentences. Get straight to the point: State the tier, why they got it, and what was missing.

STRICT JSON SCHEMA MANDATE:
You must return ONLY valid JSON matching this EXACT structure. The frontend UI crashes if you deviate.

{
  "regNo": "String (Extract student registration number, or 'UNKNOWN')",
  "aiFeedback": "String (A 3-paragraph, student-facing, encouraging summary of their strengths, weaknesses, and areas for improvement.)",
  "overallRemarks": "String (A single, highly encouraging closing sentence to the student.)",
  "breakdown": [
    {
      "question": "String (e.g., Q1A i)",
      "extracted_evidence": "String (Insert the exact quote from the student's text here. If completely absent, write 'None found'.)",
      "score": Number (Marks awarded),
      "max": Number (Maximum possible marks based on the rubric. MUST use the key 'max', NOT 'maxScore'),
      "feedback": "String (Must start with the Semantic Tier tag, followed by a detailed explanation. e.g., '[Partial Match] You correctly identified X, but missed Y.')"
    }
  ]
}`;

        // 3. Diagnostic Logs
        console.log("--- PAYLOAD SIZES ---");
        console.log("OCR Text Length:", fullExamText ? fullExamText.length : 0);
        console.log("Marking Guide Length:", finalRubricText ? finalRubricText.length : 0);

        // 4. Native DeepSeek Call
        const completion = await deepSeekClient.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `MARKING SCHEME:\n${finalRubricText}\n\nSTUDENT EXAM:\n${fullExamText}` }
            ],
            max_tokens: 8192, // <--- CRITICAL: Allow massive JSON output so it never truncates
            response_format: { type: "json_object" },
            temperature: 0.1, // Keep it deterministic
        });

        let rawContent = completion.choices[0]?.message?.content || '{}';

        // 1. Log the RAW response so we can see it in Vercel
        console.log("====== RAW AI RESPONSE START ======");
        console.log(rawContent);
        console.log("====== RAW AI RESPONSE END ======");

        const cleanJsonString = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();

        let resultData: any = {};
        try {
            const jsonMatch = cleanJsonString.match(/\{[\s\S]*\}/);
            resultData = JSON.parse(jsonMatch ? jsonMatch[0] : cleanJsonString);
        } catch (error) {
            console.error("[JSON PARSE ERROR] AI returned malformed JSON:", error);
            throw new Error("AI returned invalid JSON");
        }

        // 1. SAFEGUARD: Force UI Contract Mapping
        // If the AI stubborn outputs 'maxScore', map it to 'max' for the UI.
        const formattedBreakdown = (resultData.breakdown || []).map((item: any) => ({
            question: item.question || "Unknown",
            score: Number(item.score) || 0,
            max: Number(item.max || item.maxScore) || 0,
            feedback: item.feedback || "No feedback provided."
        }));

        // 2. ABSOLUTE MATH ACCURACY: Calculate total in backend, not AI.
        const calculatedTotalScore = formattedBreakdown.reduce((sum: number, item: any) => sum + item.score, 0);

        // 3. ATOMIC DATABASE UPDATE
        await prisma.score.create({
            data: {
                submissionId: submission.id,
                totalMarks: calculatedTotalScore, // <--- Using exact Node.js math
                remarks: resultData.overallRemarks || "No overall remarks provided.",
                breakdown: JSON.stringify(formattedBreakdown), // <--- Perfectly mapped for the UI!
                detectedIdentity: resultData.regNo || "UNKNOWN"
            }
        });

        // Add the remarks to the submission or score if your schema supports it
        await prisma.submission.update({
            where: { id: submission.id },
            data: {
                status: 'GRADED',
                feedback: resultData.aiFeedback || resultData.generalFeedback || "No AI feedback provided."
            }
        });

        console.log(`[PRODUCTION] Grading Complete. Calculated Score: ${calculatedTotalScore}`);
        return NextResponse.json({ success: true, regNo: resultData.regNo || resultData.reg_no });

    } catch (error: any) {
        console.error(`[REDUCER FATAL ERROR]:`, error);
        const { submissionId } = await req.json().catch(()=>({}));
        if(submissionId) {
            await prisma.submission.update({ where: { id: submissionId }, data: { status: 'FAILED', feedback: error.message } });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}