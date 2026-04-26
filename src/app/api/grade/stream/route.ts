import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { supabase } from '@/lib/supabase';
import { extractPagesMultimodal, ocrDocument } from '@/lib/ai/gemini';

export const maxDuration = 300; // 5 minutes max duration for Vercel

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || 'dummy',
  baseURL: "https://generativelanguage.googleapis.com/v1beta/",
});

// Zod schema for Single Question grading (Parallel Map-Reduce)
const singleQuestionSchema = z.object({
  thoughtProcess: z.string().describe("Chain of thought: Tafuta jibu la mwanafunzi ndani ya OCR text, linganisha na rubric, kisha amua."),
  score: z.number().describe("Alama ulizotoa. Lazima ziwe sahihi na zisizidi Max Score."),
  feedback: z.string().describe("Sababu fupi kwa nini umetoa alama hizo."),
  evidenceSnippet: z.string().describe("Nukuu kamili kutoka kwenye majibu ya mwanafunzi inayothibitisha.")
});

const regNoSchema = z.object({
  detectedRegNo: z.string().describe("The registration number/ID found in the student text, if any. Return 'UNKNOWN' if not found.")
});

export async function POST(req: NextRequest) {
    let globalSubmissionId: string | null = null;
    try {
        const authHeader = req.headers.get('authorization');
        const internalKey = process.env.INTERNAL_API_KEY;

        // Secure endpoint to prevent external abuse
        if (!internalKey || authHeader !== `Bearer ${internalKey}`) {
            return NextResponse.json({ error: 'Unauthorized: Invalid internal token.' }, { status: 401 });
        }

        const body = await req.json();
        globalSubmissionId = body.submissionId;

        if (!globalSubmissionId) {
            return NextResponse.json({ error: 'Missing submissionId.' }, { status: 400 });
        }

        const submission = await prisma.submission.findUnique({
            where: { id: globalSubmissionId },
            include: { workSession: true }
        });

        if (!submission) {
            return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
        }

        if (!submission.ocrText) {
             return NextResponse.json({ error: 'No extracted text found for grading. OCR failed.' }, { status: 400 });
        }

        let finalRubricText = submission.workSession.rubric || submission.workSession.markingScheme;

        if (!finalRubricText) {
             return NextResponse.json({ error: 'No rubric or marking scheme provided for this session.' }, { status: 400 });
        }

        // Fix Legacy Data: If markingScheme is a URL, extract it first.
        if (finalRubricText.includes('/') || finalRubricText.toLowerCase().endsWith('.pdf') || finalRubricText.toLowerCase().endsWith('.png') || finalRubricText.toLowerCase().endsWith('.jpg')) {
            try {
                const cleanPath = finalRubricText.startsWith('/') ? finalRubricText.slice(1) : finalRubricText;
                const { data: fileData, error: downloadError } = await supabase.storage.from('exam_pdfs').download(cleanPath);

                if (fileData && !downloadError) {
                    const arrayBuffer = await fileData.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    if (finalRubricText.toLowerCase().endsWith('.pdf')) {
                        const pages = await extractPagesMultimodal(buffer);
                        finalRubricText = pages.map(p => p.text).join('\n\n');
                    } else {
                        const mimeType = finalRubricText.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
                        finalRubricText = await ocrDocument(buffer, mimeType);
                    }

                    // Cache the extracted rubric to save future API calls
                    await prisma.workSession.update({
                        where: { id: submission.workSessionId },
                        data: { rubric: finalRubricText }
                    });
                }
            } catch (e) {
                console.error("Failed to extract legacy rubric URL", e);
            }
        }

        let parsedRubricItems: any[] = [];

        try {
            // Check if finalRubricText is a valid JSON array string (from our new parser)
            parsedRubricItems = JSON.parse(finalRubricText);
            if (!Array.isArray(parsedRubricItems)) throw new Error("Parsed rubric is not an array");
        } catch (e) {
            // Fallback for legacy plain text rubrics: we force Gemini to parse it into chunks first
            console.log(`[GRADING] Parsing legacy rubric text into JSON array...`);
            // Enforce standard string settings object via config parameter for Vercel SDK to ensure max output tokens are applied.
            // Fallback for legacy plain text rubrics: we force Gemini to parse it into chunks first
            // Fallback for legacy plain text rubrics: we force Gemini to parse it into chunks first
            const rubricStructureResponse = await generateObject({
                model: google('gemini-2.5-pro'),
                system: "You are an expert data structured parser. Extract all gradable questions from the provided Marking Scheme into a JSON array.",
                prompt: finalRubricText,
                schema: z.object({ items: z.array(z.object({ questionId: z.string(), maxScore: z.number(), rubricSegment: z.string() })) }),
                temperature: 0.0,
            });
            parsedRubricItems = (rubricStructureResponse.object as any)?.items || [];
        }

        // Update status to GRADING
        await prisma.submission.update({
             where: { id: globalSubmissionId },
             data: { status: 'GRADING' }
        });

        // --- PARALLEL MAP-REDUCE GRADING ---
        console.log(`[GRADING] Commencing Parallel Map-Reduce Grading...`);

        const studentText = submission.ocrText;

        let finalBreakdown: any[] = [];
        let calculatedTotalScore = 0;

        // Batch Processing: Ili tusizidiwe na API Rate Limits za Google
        // Tunachukua maswali 5 kwa wakati mmoja (Concurrency = 5)
        const CONCURRENCY_LIMIT = 5;

        for (let i = 0; i < parsedRubricItems.length; i += CONCURRENCY_LIMIT) {
            const batch = parsedRubricItems.slice(i, i + CONCURRENCY_LIMIT);

            const batchPromises = batch.map(async (rubricItem: any) => {
                const systemPrompt = `You are an elite world-class Examination Evaluation Engine.
Your task is to grade ONLY ONE specific question: ${rubricItem.questionId}.
Maximum marks for this question: ${rubricItem.maxScore}.

RULES:
1. SEARCH the entire student document for any answer related to ${rubricItem.questionId}. Students may answer out of order.
2. Compare the student's answer against the provided Rubric Segment.
3. Be strict but fair. Do not hallucinate marks.`;

                const userPrompt = `RUBRIC EXPECTATION FOR ${rubricItem.questionId}:\n${rubricItem.rubricSegment}\n\nENTIRE STUDENT EXAM TEXT:\n${studentText}`;

                try {
                    const { object } = await generateObject({
                        model: google('gemini-2.5-pro'),
                        system: systemPrompt,
                        prompt: userPrompt,
                        schema: singleQuestionSchema,
                        temperature: 0.0,
                    });

                    // DETERMINISTIC MATH (THE IRON GATE)
                    const trueMax = Number(rubricItem.maxScore);
                    let safeScore = Math.max(0, Math.min(object.score, trueMax));

                    return {
                        question: rubricItem.questionId,
                        thoughtProcess: object.thoughtProcess,
                        score: safeScore,
                        max: trueMax,
                        feedback: object.feedback,
                        evidenceSnippet: object.evidenceSnippet
                    };
                } catch (err) {
                    console.error(`AI Error on question ${rubricItem.questionId}`, err);
                    return {
                        question: rubricItem.questionId,
                        thoughtProcess: "AI API error during processing.",
                        score: 0,
                        max: Number(rubricItem.maxScore),
                        feedback: "System could not evaluate this question.",
                        evidenceSnippet: ""
                    };
                }
            });

            const batchResults = await Promise.all(batchPromises);

            batchResults.forEach(result => {
                finalBreakdown.push(result);
                calculatedTotalScore += result.score;
            });
        }

        // Fast parallel call to extract Reg No
        let detectedRegNo = "UNKNOWN";
        try {
            const regNoResponse = await generateObject({
                model: google('gemini-2.5-pro'),
                system: "Extract the registration number from the text. Return UNKNOWN if none is found.",
                prompt: submission.ocrText,
                schema: regNoSchema,
                temperature: 0.0
            });
            detectedRegNo = regNoResponse.object.detectedRegNo;
        } catch(e) { /* ignore */ }

        // Finalize
        const regNoToSave = detectedRegNo && detectedRegNo !== "UNKNOWN" ? detectedRegNo : submission.studentRegNo;

        await prisma.score.upsert({
            where: { submissionId: globalSubmissionId },
            update: {
                totalMarks: calculatedTotalScore,
                remarks: "Graded via Atomic Map-Reduce (Vercel Native).",
                breakdown: JSON.stringify(finalBreakdown),
                detectedIdentity: regNoToSave
            },
            create: {
                submissionId: globalSubmissionId,
                totalMarks: calculatedTotalScore,
                remarks: "Graded via Atomic Map-Reduce (Vercel Native).",
                breakdown: JSON.stringify(finalBreakdown),
                detectedIdentity: regNoToSave
            }
        });

        await prisma.submission.update({
            where: { id: globalSubmissionId },
            data: {
                status: 'GRADED',
                studentRegNo: regNoToSave
            }
        });

        console.log(`[GRADING] Successfully graded submission ${globalSubmissionId} with score ${calculatedTotalScore}`);
        return NextResponse.json({ success: true, score: calculatedTotalScore });

    } catch (error: any) {
        console.error("[FATAL-GRADING] Streaming API Failed:", error);

        // Use the globally scoped submission ID to update the database without calling req.json() again
        try {
            if (globalSubmissionId) {
                await prisma.submission.update({
                    where: { id: globalSubmissionId },
                    data: { status: 'FAILED', feedback: 'Failed to complete grading process. System encountered an error.' }
                });
            }
        } catch (e) {
            console.error("[FATAL-GRADING] Failed to update submission status to FAILED:", e);
        }

        return NextResponse.json({ error: error.message || 'Grading failed.' }, { status: 500 });
    }
}
