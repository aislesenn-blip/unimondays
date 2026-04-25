import { NextRequest, NextResponse } from 'next/server';
import { streamObject } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { parseRubric, RubricItem } from '@/lib/rubric-parser';
import { supabase } from '@/lib/supabase';
import { extractPagesMultimodal, ocrDocument } from '@/lib/ai/gemini';

export const maxDuration = 300; // 5 minutes max duration for Vercel

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || 'dummy',
  baseURL: "https://generativelanguage.googleapis.com/v1beta/",
});

// Zod schema for strictly typing the AI response
const gradingResultSchema = z.object({
  breakdown: z.array(z.object({
    question: z.string().describe("The exact question ID as per the rubric (e.g., '1a', '2')."),
    score: z.number().describe("The awarded score. Must not exceed maxScore."),
    max: z.number().describe("The maximum possible score for this question."),
    feedback: z.string().describe("Specific feedback explaining the score. 1-3 sentences max."),
    evidenceSnippet: z.string().describe("The exact quote from the student's text that justifies this score. 'None' if blank or incorrect.")
  })),
  detectedRegNo: z.string().describe("The registration number found in the student text, if any. Return 'UNKNOWN' if not found."),
  calculatedTotalScore: z.number().describe("The sum of all awarded scores.")
});

export async function POST(req: NextRequest) {
    try {
        const { submissionId } = await req.json();

        if (!submissionId) {
            return NextResponse.json({ error: 'Missing submissionId.' }, { status: 400 });
        }

        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
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

        const masterRubricArray: RubricItem[] = parseRubric(finalRubricText);

        if (masterRubricArray.length === 0) {
            // Fallback if parsing fails, we pass the raw text and let Gemini figure it out
        }

        // Construct a highly prescriptive system prompt
        const systemPrompt = `You are an expert, strict academic grader.
Your task is to evaluate a student's exam text against the provided marking scheme/rubric.
You MUST follow these rules:
1. DO NOT SKIP ANY QUESTIONS listed in the rubric.
2. Grade ONLY based on the student's extracted text. If they didn't write it, score is 0.
3. Be objective and strictly adhere to the rubric points.
4. If a question is unanswered or completely wrong, give it a score of 0, but you must still include it in the breakdown.
5. Extract the student's Registration Number if present.

RUBRIC / MARKING SCHEME:
${JSON.stringify(masterRubricArray.length > 0 ? masterRubricArray : finalRubricText, null, 2)}
`;

        const userPrompt = `STUDENT EXAM TEXT:\n${submission.ocrText}`;

        // Update status to GRADING
        await prisma.submission.update({
             where: { id: submission.id },
             data: { status: 'GRADING' }
        });

        const result = await streamObject({
            model: google('gemini-2.5-flash'),
            system: systemPrompt,
            prompt: userPrompt,
            schema: gradingResultSchema,
            temperature: 0.0,
            onFinish: async ({ object }) => {
                try {
                    if (object) {
                         const { breakdown, detectedRegNo, calculatedTotalScore } = object;

                         // Fix up student RegNo if found
                         const regNoToSave = detectedRegNo && detectedRegNo !== "UNKNOWN" ? detectedRegNo : submission.studentRegNo;

                         await prisma.score.upsert({
                            where: { submissionId: submission.id },
                            update: {
                                totalMarks: calculatedTotalScore,
                                remarks: "Graded via Streaming Vercel API.",
                                breakdown: JSON.stringify(breakdown),
                                detectedIdentity: regNoToSave
                            },
                            create: {
                                submissionId: submission.id,
                                totalMarks: calculatedTotalScore,
                                remarks: "Graded via Streaming Vercel API.",
                                breakdown: JSON.stringify(breakdown),
                                detectedIdentity: regNoToSave
                            }
                        });

                        await prisma.submission.update({
                            where: { id: submission.id },
                            data: {
                                status: 'GRADED',
                                studentRegNo: regNoToSave
                            }
                        });
                        console.log(`[GRADING] Successfully graded submission ${submissionId}`);
                    } else {
                         throw new Error("No object returned from AI stream.");
                    }
                } catch (e: any) {
                     console.error("[GRADING] Failed to save streaming result:", e);
                     await prisma.submission.update({
                         where: { id: submission.id },
                         data: { status: 'FAILED', feedback: 'Failed to save grading results.' }
                     });
                }
            }
        });

        return result.toTextStreamResponse();

    } catch (error: any) {
        console.error("[FATAL-GRADING] Streaming API Failed:", error);
        return NextResponse.json({ error: error.message || 'Grading failed.' }, { status: 500 });
    }
}
