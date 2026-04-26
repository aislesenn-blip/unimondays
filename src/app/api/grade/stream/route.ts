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
  pointsFound: z.number().optional().describe("Idadi ya pointi sahihi ulizozikuta kulingana na rubric (mfano: 5)."),
  score: z.number().multipleOf(0.5).describe("Maksi halisi. Usitumie desimali za ajabu kama 0.25 au 0.75. Tumia namba kamili au nusu tu kama Rubric inaruhusu."),
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
            parsedRubricItems = JSON.parse(finalRubricText);
            if (!Array.isArray(parsedRubricItems) || parsedRubricItems.length === 0) {
                throw new Error("Invalid Rubric Format");
            }
        } catch (e) {
            console.error("[GRADING] Rubric is not a valid JSON array.", e);
            // We fail early here. The frontend/upload phase must ensure the rubric is a perfect JSON array before grading starts.
            await prisma.submission.update({
                where: { id: globalSubmissionId },
                data: { status: 'FAILED', feedback: 'Rubric is not a verified JSON array. Please re-upload and verify the marking scheme.' }
            });
            return NextResponse.json({ error: 'Rubric is not a verified JSON array.' }, { status: 400 });
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
        const CONCURRENCY_LIMIT = 3; // Salama zaidi kwa Vercel na Gemini Rate Limits

        for (let i = 0; i < parsedRubricItems.length; i += CONCURRENCY_LIMIT) {
            const batch = parsedRubricItems.slice(i, i + CONCURRENCY_LIMIT);

            const batchPromises = batch.map(async (rubricItem: any) => {
                const systemPrompt = `You are a strict Examination Evaluator.
Question: ${rubricItem.questionId}
Max Marks: ${rubricItem.maxScore}
Task: Grade ONLY this question based on the student's text. Be extremely strict about partial credits.

SCORING MATH RULES:
DO NOT INVENT DECIMALS.
Count the valid points mathematically based on the rubric and assign the exact matching score.`;

                const userPrompt = `EXPECTED RUBRIC:\n${rubricItem.rubricSegment}\n\nSTUDENT FULL TEXT:\n${studentText}`;

                // Retry logic: Jaribu mara 2 ikiwa API italeta "Too Many Requests" au "Timeout"
                let retries = 2;
                while (retries > 0) {
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
                    } catch (err: any) {
                        const errMsg = err?.message || String(err);
                        if (errMsg.includes('429') || errMsg.includes('Too Many Requests') || errMsg.includes('timeout') || errMsg.includes('fetch failed')) {
                            retries--;
                            console.warn(`[GRADING] Transient error for Q ${rubricItem.questionId}. Retries left: ${retries}. Err: ${errMsg}`);
                            if (retries === 0) throw err;
                            await new Promise(res => setTimeout(res, 2000)); // Subiri sekunde 2 kisha jaribu tena
                        } else {
                            throw err; // Sio rate limit, ni error nyingine
                        }
                    }
                }
            });

            // Tumia Promise.allSettled ili swali moja lisiharibu yote
            const batchResults = await Promise.allSettled(batchPromises);

            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    finalBreakdown.push(result.value);
                    calculatedTotalScore += (result.value as any).score;
                } else {
                    // Swali limefeli hata baada ya retries
                    const failedItem = batch[index];
                    console.error(`[GRADING] Final failure grading question ${failedItem.questionId}`, result.reason);
                    finalBreakdown.push({
                        question: failedItem.questionId,
                        thoughtProcess: "System failed to grade this specific question due to API limits or a persistent error.",
                        score: 0,
                        max: Number(failedItem.maxScore),
                        feedback: "Manual review required.",
                        evidenceSnippet: ""
                    });
                }
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
