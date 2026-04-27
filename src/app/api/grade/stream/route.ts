import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { supabase } from '@/lib/supabase';
import { extractPagesMultimodal, ocrDocument } from '@/lib/ai/gemini';
import pLimit from 'p-limit';

export const maxDuration = 300; // 5 minutes max duration for Vercel

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || 'dummy',
  baseURL: "https://generativelanguage.googleapis.com/v1beta/",
});

// Zod schema for Atomic grading
const atomicGradingSchema = z.object({
  question: z.string().describe("The exact question identifier being graded."),
  thoughtProcess: z.string().describe("Chain of thought: Explain step-by-step how the student's answer maps to the specific rubric criteria. Did they hit the required atomic concepts? DO THIS BEFORE SCORING."),
  score: z.number().describe("The total awarded score based on semantic matching of the criteria and your thought process. Must not exceed the provided maxScore."),
  max: z.number().describe("The maximum possible score for this question as defined in the marking scheme."),
  feedback: z.string().describe("Specific feedback explaining the score. Keep it to 1-2 sentences."),
  evidenceSnippet: z.string().describe("The exact quote from the student's text that justifies this score. 'None' if blank or missing.")
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

        // Parse student text as JSON mapping (if possible) for routing
        let parsedStudentAnswers: Record<string, string> = {};
        try {
            parsedStudentAnswers = JSON.parse(submission.ocrText || "{}");
        } catch (e) {
            console.log(`[GRADING] Student text is not structured JSON. Falling back to whole text.`);
            parsedStudentAnswers = { "ALL": submission.ocrText || "" };
        }

        // --- ATOMIC MAP-REDUCE GRADING ---
        console.log(`[GRADING] Commencing Atomic Map-Reduce Grading...`);

        const systemPrompt = `You are an elite world-class Examination Evaluation Engine. Your task is to mark ONE specific question from a student's exam.

You must evaluate the student's answer against the provided strict ATOMIC CRITERIA.
Do NOT invent marks. Do NOT penalize correct alternative phrasing.
Ensure absolute precision.`;

        let finalBreakdown: any[] = [];
        let calculatedTotalScore = 0;

        try {
            const limit = pLimit(10); // L9 Parallel Batching Strategy

            const gradingPromises = parsedRubricItems.map(rubricItem => {
                return limit(async () => {
                    const qId = rubricItem.qId || rubricItem.questionId;
                    const maxScore = rubricItem.maxScore || 0;

                    // Route to exact answer if available, else give the whole text
                    const studentAnswerForQ = parsedStudentAnswers[qId] || parsedStudentAnswers["ALL"] || "";

                    if (!studentAnswerForQ.trim()) {
                        // Fast path: Empty answer instantly receives 0
                        return {
                            question: qId,
                            thoughtProcess: "Student provided no answer.",
                            score: 0,
                            max: maxScore,
                            feedback: "No answer provided.",
                            evidenceSnippet: "None"
                        };
                    }

                    const boxPrompt = `
EVALUATE THIS SPECIFIC QUESTION ONLY: ${qId}
MAXIMUM MARKS: ${maxScore}

ATOMIC MARKING CRITERIA:
"""
${JSON.stringify(rubricItem.criteria || rubricItem.rubricSegment, null, 2)}
"""

STUDENT ANSWER:
"""
${studentAnswerForQ}
"""
`;
                    console.log(`[GRADING] Grading Box ${qId}...`);
                    const { object } = await generateObject({
                        model: google('gemini-2.5-pro'),
                        system: systemPrompt,
                        prompt: boxPrompt,
                        schema: atomicGradingSchema,
                        temperature: 0.0,
                    });

                    // Deterministic Math clamping
                    let safeScore = typeof object.score === 'number' ? object.score : 0;
                    safeScore = Math.max(0, Math.min(safeScore, maxScore));

                    return {
                        question: qId,
                        thoughtProcess: object.thoughtProcess,
                        score: safeScore,
                        max: maxScore,
                        feedback: object.feedback,
                        evidenceSnippet: object.evidenceSnippet
                    };
                });
            });

            const rawGradedQuestions = await Promise.all(gradingPromises);

            finalBreakdown = rawGradedQuestions;
            calculatedTotalScore = rawGradedQuestions.reduce((acc, curr) => acc + curr.score, 0);

        } catch (gradingError) {
            console.error(`[GRADING] Atomic Map-Reduce Grading failed:`, gradingError);
            throw gradingError;
        }

        // Fast parallel call to extract Reg No from whole text
        let detectedRegNo = "UNKNOWN";
        try {
            const regNoTextToAnalyze = parsedStudentAnswers["REGISTRATION_NUMBER"] || submission.ocrText || "";
            if (parsedStudentAnswers["REGISTRATION_NUMBER"]) {
                 detectedRegNo = parsedStudentAnswers["REGISTRATION_NUMBER"];
            } else {
                 const regNoResponse = await generateObject({
                    model: google('gemini-2.5-pro'),
                    system: "Extract the registration number from the text. Return UNKNOWN if none is found.",
                    prompt: regNoTextToAnalyze,
                    schema: regNoSchema,
                    temperature: 0.0
                });
                detectedRegNo = regNoResponse.object.detectedRegNo;
            }
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
