import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { extractPagesMultimodal, ocrDocument } from '@/lib/ai/gemini';
import { readFile } from '@/lib/storage';
import pLimit from 'p-limit';

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

        // 1. MAP PHASE: Re-parse the Extracted Student Data Map
        // We assume structural JSON from OCR is cached in `extractedData` array or we parse it
        // If it's old raw text, we construct a generic map. For robust architecture, we merge it safely.
        let studentAnswersMap: Record<string, string> = {};
        try {
            const sortedData = (submission.extractedData as any[]).sort((a, b) => a.pages[0] - b.pages[0]);
            for (const chunk of sortedData) {
                try {
                    // Check if chunk.text is a JSON object itself
                    const parsed = JSON.parse(chunk.text);
                    if (typeof parsed === 'object') {
                        for (const [key, value] of Object.entries(parsed)) {
                            studentAnswersMap[key] = (studentAnswersMap[key] || '') + '\n' + String(value);
                        }
                    } else {
                         studentAnswersMap["Global"] = (studentAnswersMap["Global"] || '') + '\n' + chunk.text;
                    }
                } catch {
                     studentAnswersMap["Global"] = (studentAnswersMap["Global"] || '') + '\n' + chunk.text;
                }
            }
        } catch(e) { console.error("Failed to map student answers", e); }

        // Ensure we have fallback text
        const fullExamText = Object.entries(studentAnswersMap).map(([k,v]) => `[${k}]\n${v}`).join('\n\n');

        // 2. MAP PHASE: Parse Rubric into Atomic Questions
        // Use an LLM call to segment the monolithic rubric into an array of strictly isolated objects.
        const rubricSegmentationPrompt = `You are a parser. Parse the following monolithic Marking Scheme text into a strict JSON array of individual question criteria.
        Each object MUST have a 'question' label and the specific 'rubric_segment' text defining how to grade it.
        Return strictly JSON: { "rubric": [ { "question": "Q1", "rubric_segment": "criteria text", "max_score": 10 } ] }`;

        const rubricParseResponse = await deepSeekClient.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: rubricSegmentationPrompt },
                { role: "user", content: finalRubricText }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
        });

        let parsedRubricMap: any[] = [];
        try {
            const raw = rubricParseResponse.choices[0]?.message?.content || '{"rubric":[]}';
            const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            parsedRubricMap = JSON.parse(clean).rubric || [];
        } catch (e) {
            console.warn("Failed to parse rubric map, falling back to monolithic.", e);
            parsedRubricMap = [{ question: "Global", rubric_segment: finalRubricText, max_score: 100 }];
        }

        // 3. ATOMIC GRADING PROMPT (REDUCE PHASE)
        const atomicSystemPrompt = `You are an elite, empathetic academic professor grading a university exam.
You are evaluating ONE specific question's answer against ONE specific rubric segment.

YOUR MANDATORY DIRECTIVES:
1. THE EVIDENCE-FIRST MANDATE (CRITICAL ANTI-LAZINESS RULE):
Before you determine the \`score\` or write the \`feedback\`, you MUST fill out the \`extracted_evidence\` field. You must aggressively scan the provided student text and extract the exact quote or phrase where the student attempted to answer the concept. Forcing yourself to output the evidence FIRST guarantees you will not lazily skip a question. Only if you have scanned the text and found absolutely zero semantic match, you may write "None found" in the evidence field and grade it as [Missing].
2. TRUE SEMANTIC EQUIVALENCE (CRITICAL): You are evaluating MEANING, not exact wording. If the rubric provides specific examples but the student correctly defines the core concept using their own valid words, YOU MUST AWARD MARKS.
3. SEMANTIC TIERS: Your \`feedback\` MUST start with one of these exact NLP tags:
   - [Exact Match]: Concept perfectly aligns with the rubric.
   - [Partial Match]: Concept is touched upon but missing key rubric details.
   - [Out of Scope]: Concept is irrelevant or factually incorrect.
   - [Missing]: The concept was nowhere to be found.
4. STRICT LENGTH LIMITS: The \`feedback\` string MUST be a maximum of 3 sentences. Get straight to the point: State the tier, why they got it, and what was missing.

STRICT JSON SCHEMA MANDATE:
You must return ONLY valid JSON matching this EXACT structure.
{
  "extracted_evidence": "String (Exact quote from student or 'None found')",
  "score": Number (Marks awarded),
  "feedback": "String (Starts with Semantic Tier, max 3 sentences)"
}`;

        // 4. ATOMIC MAP-REDUCE EXECUTION WITH CONCURRENCY CONTROL
        console.log(`[ARCHITECTURE] Initiating Atomic Grading for ${parsedRubricMap.length} Questions...`);
        const limit = pLimit(10);

        const atomicGradingPromises = parsedRubricMap.map((rubricItem: any) =>
            limit(async () => {
                // Determine relevant student context
                let studentContext = studentAnswersMap[rubricItem.question] || fullExamText; // Fallback to full text if structural OCR failed to isolate

                try {
                    const response = await deepSeekClient.chat.completions.create({
                        model: "deepseek-chat",
                        messages: [
                            { role: "system", content: atomicSystemPrompt },
                            { role: "user", content: `QUESTION: ${rubricItem.question}\nMAX SCORE: ${rubricItem.max_score}\n\nRUBRIC SEGMENT:\n${rubricItem.rubric_segment}\n\nSTUDENT ANSWER SEGMENT:\n${studentContext}` }
                        ],
                        response_format: { type: "json_object" },
                        temperature: 0.1,
                    });

                    const raw = response.choices[0]?.message?.content || '{}';
                    const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
                    const result = JSON.parse(clean);

                    return {
                        question: rubricItem.question,
                        score: Number(result.score) || 0,
                        max: Number(rubricItem.max_score) || 0,
                        feedback: result.feedback || "No feedback provided.",
                        evidenceSnippet: result.extracted_evidence || "None found"
                    };
                } catch (e) {
                    console.error(`Atomic grading failed for ${rubricItem.question}`, e);
                    return {
                        question: rubricItem.question,
                        score: 0,
                        max: Number(rubricItem.max_score) || 0,
                        feedback: "[Out of Scope] Grading engine failed for this segment.",
                        evidenceSnippet: "GRADING_FAILED_API_ERROR"
                    };
                }
            })
        );

        // Wait for all atomic shards to finish
        const formattedBreakdown = await Promise.all(atomicGradingPromises);

        // 5. SYNTHESIS: Generate Overall Feedback via Fast Model
        const synthesisPrompt = `Generate an encouraging, empathetic overall summary for the student. Focus on their strengths and weaknesses. Keep it under 3 sentences. Return JSON: {"aiFeedback": "...", "overallRemarks": "..."}`;
        const synthesisResponse = await deepSeekClient.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: synthesisPrompt },
                { role: "user", content: JSON.stringify(formattedBreakdown) }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
        });

        let synthesis = { aiFeedback: "Good effort.", overallRemarks: "Keep it up!" };
        try {
             const clean = (synthesisResponse.choices[0]?.message?.content || '{}').replace(/```json/g, '').replace(/```/g, '').trim();
             synthesis = JSON.parse(clean);
        } catch(e) {}

        // 2. ABSOLUTE MATH ACCURACY: Calculate total in backend, not AI.
        const calculatedTotalScore = formattedBreakdown.reduce((sum: number, item: any) => sum + item.score, 0);

        // 3. ATOMIC DATABASE UPDATE
        await prisma.score.create({
            data: {
                submissionId: submission.id,
                totalMarks: calculatedTotalScore, // <--- Using exact Node.js math
                remarks: synthesis.overallRemarks || "No overall remarks provided.",
                breakdown: JSON.stringify(formattedBreakdown), // <--- Perfectly mapped for the UI!
                detectedIdentity: "UNKNOWN"
            }
        });

        // Add the remarks to the submission or score if your schema supports it
        await prisma.submission.update({
            where: { id: submission.id },
            data: {
                status: 'GRADED',
                feedback: synthesis.aiFeedback || "No AI feedback provided."
            }
        });

        console.log(`[PRODUCTION] Grading Complete. Calculated Score: ${calculatedTotalScore}`);
        return NextResponse.json({ success: true, regNo: "UNKNOWN" });

    } catch (error: any) {
        console.error(`[REDUCER FATAL ERROR]:`, error);
        const { submissionId } = await req.json().catch(()=>({}));
        if(submissionId) {
            await prisma.submission.update({ where: { id: submissionId }, data: { status: 'FAILED', feedback: error.message } });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}