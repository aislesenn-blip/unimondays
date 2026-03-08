import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { extractPagesMultimodal, extractStructuredMapMultimodal, ocrDocument } from '@/lib/ai/gemini';
import { gradeAtomicSegment } from '@/lib/ai/deepseek';
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

        // 1. MAP PHASE FIX: Combine all text to prevent false Missings
        let fullExamText = "";
        let detectedRegNo = "UNKNOWN";

        try {
            const sortedData = (submission.extractedData as any[]).sort((a, b) => a.pages[0] - b.pages[0]);
            for (const chunk of sortedData) {
                try {
                    const parsed = JSON.parse(chunk.text);
                    if (parsed.registration_number && parsed.registration_number !== "UNKNOWN") {
                        detectedRegNo = parsed.registration_number;
                    }
                    fullExamText += "\n\n" + (parsed.full_text || "");
                } catch {
                    fullExamText += "\n\n" + chunk.text;
                }
            }
        } catch(e) { console.error("Failed to parse OCR chunks", e); }

        if (!fullExamText.trim()) fullExamText = "No readable text extracted.";

        // --- 2. PARSE THE MARKING SCHEME (Rubric Array) ---
        console.log("[ARCHITECTURE] Parsing Marking Scheme into Question Array...");
        const parseSchemePrompt = `Parse the following Marking Scheme into a JSON object mapping each question number strictly to its individual rubric segment.
Return strictly a JSON object: {"Q1": "Rubric text for Q1...", "Q2": "Rubric text for Q2..."}`;

        const schemeParseCompletion = await deepSeekClient.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: parseSchemePrompt },
                { role: "user", content: finalRubricText }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
        });

        const parsedSchemeContent = schemeParseCompletion.choices[0]?.message?.content || "{}";
        const cleanSchemeString = parsedSchemeContent.replace(/```json/g, '').replace(/```/g, '').trim();
        let rubricMap: Record<string, string> = {};
        try {
            rubricMap = JSON.parse(cleanSchemeString);
        } catch (e) {
            console.error("[JSON PARSE ERROR] AI returned malformed Marking Scheme JSON:", e);
            throw new Error("Failed to parse Marking Scheme");
        }

        // --- 3. THE REDUCE PHASE (Atomic Grading) ---
        console.log("[ARCHITECTURE] Orchestrating Parallel Atomic Calls...");
        const limit = pLimit(10);
        const parsedRubricMap = Object.keys(rubricMap).map(k => ({ id: k, segment: rubricMap[k] }));

        const atomicPromises = parsedRubricMap.map((rubricItem: any) => {
            return limit(async () => {
                // ARCHITECTURE FIX: Feed the ENTIRE text to DeepSeek. DeepSeek will find the answer. This guarantees 0% data loss.
                const studentContext = fullExamText;
                const questionId = rubricItem.id;
                const rubricSegment = rubricItem.segment;

                try {
                    const result = await withRetries(() => gradeAtomicSegment(questionId, studentContext, rubricSegment));
                    return {
                        ...result,
                        q: result.q || questionId
                    };
                } catch (e) {
                    console.error(`[ATOMIC GRADING ERROR] Failed grading for ${questionId}:`, e);
                    // Fallback object to ensure safe failure
                    return {
                        q: questionId,
                        s: 0,
                        max: 0,
                        f: "[Error] AI grading failed for this specific segment.",
                        extracted_evidence: "GRADING_FAILED_API_ERROR"
                    };
                }
            });
        });

        const atomicResults = await Promise.all(atomicPromises);

        // --- 4. DYNAMIC RE-ASSEMBLY ---
        console.log("[ARCHITECTURE] Dynamically Re-assembling Breakdown...");

        const formattedBreakdown = atomicResults.map((item: any) => ({
            question: item.q || "Unknown",
            score: Number(item.s) || 0,
            max: Number(item.max || item.maxScore) || 0,
            feedback: item.f || "No feedback provided.",
            extracted_evidence: item.extracted_evidence || "None found",
            isRelevant: true,
            mappedRubricQuestion: `Q: ${item.q}`
        }));

        const calculatedTotalScore = formattedBreakdown.reduce((sum: number, item: any) => sum + item.score, 0);

        // Attempting to extract Registration Number & Overall remarks from full text
        let aiFeedback = "Successfully graded via Atomic Parallel Pipeline.";
        let regNo = detectedRegNo;

        try {
            const metaPrompt = `Write a 3-paragraph encouraging overall feedback for the student based on their answers. Return strictly JSON: {"aiFeedback": "..."}`;
            const metaCompletion = await deepSeekClient.chat.completions.create({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: metaPrompt },
                    { role: "user", content: fullExamText.substring(0, 4000) } // Just look at beginning
                ],
                response_format: { type: "json_object" },
                temperature: 0.1,
            });
            const metaContent = JSON.parse(metaCompletion.choices[0]?.message?.content?.replace(/```json/g, '').replace(/```/g, '').trim() || "{}");
            if (metaContent.aiFeedback) aiFeedback = metaContent.aiFeedback;
        } catch (e) {
            console.warn("[META PARSE ERROR] Could not extract global metadata.");
        }

        // --- 5. ATOMIC DATABASE UPDATE ---
        await prisma.score.create({
            data: {
                submissionId: submission.id,
                totalMarks: calculatedTotalScore,
                remarks: "Graded via Atomic Parallel Pipeline.",
                breakdown: JSON.stringify(formattedBreakdown),
                detectedIdentity: regNo
            }
        });

        await prisma.submission.update({
            where: { id: submission.id },
            data: {
                status: 'GRADED',
                feedback: aiFeedback
            }
        });

        console.log(`[PRODUCTION] Atomic Pipeline Grading Complete. Calculated Score: ${calculatedTotalScore}`);
        return NextResponse.json({ success: true, regNo: regNo });

    } catch (error: any) {
        console.error(`[REDUCER FATAL ERROR]:`, error);
        const { submissionId } = await req.json().catch(()=>({}));
        if(submissionId) {
            await prisma.submission.update({ where: { id: submissionId }, data: { status: 'FAILED', feedback: error.message } });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}