import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
// NOTE: Tumeondoa supabase na function za extractPagesMultimodal kwa sababu
// hili faili sasa halihusiki tena na kusoma PDF za rubric. Linahusika na Grading TU!

export const maxDuration = 300; // 5 minutes max duration for Vercel

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || 'dummy',
  baseURL: "https://generativelanguage.googleapis.com/v1beta/",
});

// Zod schema for Single Question grading (Parallel Map-Reduce)
const singleQuestionSchema = z.object({
  thoughtProcess: z.string().describe("Chain of thought: Tafuta jibu la mwanafunzi ndani ya OCR text, linganisha na rubric, kisha amua."),
  pointsFound: z.number().optional().describe("Idadi ya pointi sahihi ulizozikuta kulingana na rubric (mfano: 5)."),
  // HAPA NDIYO TUMEWEKA KUFUNI YA HESABU. AI hairuhusiwi kutumia .25 au .75
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

        // ============================================================================
        // 🚨 THE IRON GATE: RUBRIC VALIDATION (HAKUNA KUBASHIRI HAPA)
        // Tumefuta kodi zote zilizokuwa zinaiambia AI isome PDF au kutengeneza JSON upya.
        // Kama Rubric sio JSON, tunakataa kusahihisha ili kuzuia "Garbage In, Garbage Out"
        // ============================================================================
        let parsedRubricItems: any[] = [];

        try {
            parsedRubricItems = JSON.parse(finalRubricText);
            if (!Array.isArray(parsedRubricItems) || parsedRubricItems.length === 0) {
                throw new Error("Invalid Rubric Format - Not an Array");
            }

            // Hakikisha maxScore imesimama kama namba, sio String, ili hesabu zikubali chini.
            parsedRubricItems = parsedRubricItems.map(item => ({
                ...item,
                maxScore: Number(item.maxScore)
            }));

        } catch (e) {
            console.error("[GRADING-FATAL] Rubric is not a valid JSON array.", e);
            // Tunafail early. Haturuhusu AI kuanza kutunga maksi hewa.
            await prisma.submission.update({
                where: { id: globalSubmissionId },
                data: { status: 'FAILED', feedback: 'System Error: Marking scheme is not a valid JSON array. Please recreate the rubric correctly before grading.' }
            });
            return NextResponse.json({ error: 'Rubric is not a verified JSON array.' }, { status: 400 });
        }

        // Update status to GRADING
        await prisma.submission.update({
             where: { id: globalSubmissionId },
             data: { status: 'GRADING' }
        });

        // ============================================================================
        // 🚀 PARALLEL MAP-REDUCE GRADING ENGINE
        // ============================================================================
        console.log(`[GRADING] Commencing Parallel Map-Reduce Grading for Submission: ${globalSubmissionId}`);

        const studentText = submission.ocrText;
        let finalBreakdown: any[] = [];
        let calculatedTotalScore = 0;

        // Tumeacha 3 ili Vercel na Google Rate Limits zisikate mawasiliano (Timeout)
        const CONCURRENCY_LIMIT = 3;

        for (let i = 0; i < parsedRubricItems.length; i += CONCURRENCY_LIMIT) {
            const batch = parsedRubricItems.slice(i, i + CONCURRENCY_LIMIT);

            const batchPromises = batch.map(async (rubricItem: any) => {
                const systemPrompt = `You are a Global Examination Evaluation Engine. Your goal is to provide a highly accurate, fair, and evidence-based score for any academic subject.

CURRENT CONTEXT:
- Target Question ID: ${rubricItem.questionId}
- Maximum Allowed Score: ${rubricItem.maxScore}

UNIVERSAL GRADING PROTOCOLS:
1. SCOPE OF SEARCH & FORGIVING MATCHING: You must aggressively scan the ENTIRE provided student text. Students often write answers under wrong headers, mess up numbering, or the OCR jumbles the layout. If you find a correct answer that matches this question anywhere in the text, you MUST award the marks, regardless of what question number the student labeled it under. Do not punish layout or labeling errors.
2. SEMANTIC EVALUATION: Focus entirely on the substance and correctness of the answer based on the EXPECTED RUBRIC. Do not penalize for minor handwriting transcription errors or spelling unless it changes the scientific/technical meaning.
3. DIAGRAMS & DRAWINGS: You cannot physically see diagrams. However, the student's OCR text contains detailed AI-generated descriptions of any drawings they made. You must fully trust and evaluate these text descriptions as if you were looking at the actual diagram.
4. ALIGNMENT OF FEEDBACK AND SCORE: Your feedback MUST match the score. If your feedback states that the student's answer is "perfect", "fully correct", or "matches the expected answer", you MUST award the maximum score of ${rubricItem.maxScore}. Do not arbitrarily deduct marks if the core facts are correct.
5. FULL MARK ADHERENCE: If the student's answer meets the core criteria defined in the rubric, you MUST award the maximum score. Do not deduct marks for "style" or "format".
6. EVIDENCE REQUIREMENT: You must identify and quote the specific part of the student's text that justifies the marks awarded.

SCORING CONSTRAINTS:
- No arbitrary decimals. Use only whole numbers or 0.5 increments.
- Under no circumstances shall the score exceed ${rubricItem.maxScore}.
- If the student provides no relevant information for this specific question, the score must be 0.`;

                const userPrompt = `EXPECTED RUBRIC:\n${rubricItem.rubricSegment}\n\nSTUDENT FULL TEXT:\n${studentText}`;

                // Retry logic: Imarisha ustahimilivu dhidi ya Google API Limits
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

                        // ============================================================================
                        // 🧮 DETERMINISTIC MATH ENFORCEMENT (HAKUNA KUKOSEA TENA)
                        // ============================================================================
                        const trueMax = Number(rubricItem.maxScore);

                        // 1. Hakikisha haizidi Max Score wala kuwa chini ya 0
                        let safeScore = Math.max(0, Math.min(object.score, trueMax));

                        // 2. Hakikisha ni increments za 0.5 (Inaondoa ujinga wa 6.25 kwa nguvu ya JavaScript)
                        safeScore = Math.round(safeScore * 2) / 2;

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
                        // Kama Google italeta shida ya Too Many Requests, tunasubiri na kujaribu tena
                        if (errMsg.includes('429') || errMsg.includes('Too Many Requests') || errMsg.includes('timeout') || errMsg.includes('fetch failed') || errMsg.includes('Overloaded')) {
                            retries--;
                            console.warn(`[GRADING] Transient error for Q ${rubricItem.questionId}. Retries left: ${retries}. Err: ${errMsg}`);
                            if (retries === 0) throw err;
                            await new Promise(res => setTimeout(res, 2000)); // Subiri sekunde 2
                        } else {
                            throw err; // Kama ni error nyingine, tupa nje
                        }
                    }
                }
            });

            // Tumia Promise.allSettled ili swali moja lisiharibu maswali mengine yote
            const batchResults = await Promise.allSettled(batchPromises);

            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    finalBreakdown.push(result.value);
                    calculatedTotalScore += (result.value as any).score;
                } else {
                    // Kama swali limefeli kabisa baada ya retries, tunaweka 0 ili mtihani usi-crash
                    const failedItem = batch[index];
                    const errorReason = result.status === 'rejected' ? result.reason : "Unknown evaluation failure";
                    console.error(`[GRADING] Final failure grading question ${failedItem.questionId}`, errorReason);

                    const trueMaxFallback = Number(failedItem.maxScore) || 0;
                    finalBreakdown.push({
                        question: failedItem.questionId,
                        thoughtProcess: "System failed to grade this specific question due to API limits or a persistent error.",
                        score: 0,
                        max: trueMaxFallback,
                        feedback: "Manual review required. API Error encountered.",
                        evidenceSnippet: ""
                    });
                }
            });
        }

        // ============================================================================
        // 🆔 IDENTITY EXTRACTION (Tunatumia 'flash' kwa spidi, sio 'pro')
        // ============================================================================
        let detectedRegNo = "UNKNOWN";
        try {
            const regNoResponse = await generateObject({
                model: google('gemini-2.5-flash'),
                system: "Extract the registration number from the text. Return UNKNOWN if none is found.",
                prompt: submission.ocrText,
                schema: regNoSchema,
                temperature: 0.0
            });
            detectedRegNo = regNoResponse.object.detectedRegNo;
        } catch(e) { /* ignore */ }

        // ============================================================================
        // 💾 SAVE RESULTS TO DATABASE
        // ============================================================================
        const regNoToSave = detectedRegNo && detectedRegNo !== "UNKNOWN" ? detectedRegNo : submission.studentRegNo;

        await prisma.score.upsert({
            where: { submissionId: globalSubmissionId },
            update: {
                totalMarks: calculatedTotalScore,
                remarks: "Graded via Atomic Map-Reduce (L9 Architecture).",
                breakdown: JSON.stringify(finalBreakdown),
                detectedIdentity: regNoToSave
            },
            create: {
                submissionId: globalSubmissionId,
                totalMarks: calculatedTotalScore,
                remarks: "Graded via Atomic Map-Reduce (L9 Architecture).",
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
