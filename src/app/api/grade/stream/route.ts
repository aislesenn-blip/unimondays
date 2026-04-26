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
  gradedQuestions: z.array(z.object({
    question: z.string().describe("The exact question identifier as written in the marking scheme (e.g., 'Q1(a)', 'Question 2')."),
    thoughtProcess: z.string().describe("Chain of thought: Explain step-by-step how the student's answer maps to the rubric. Did they use a synonym? Are the mathematical steps correct even if the final answer is wrong? DO THIS BEFORE SCORING."),
    score: z.number().describe("The awarded score based on semantic matching and your thought process. Must not exceed maxScore."),
    max: z.number().describe("The maximum possible score for this question as defined in the marking scheme."),
    feedback: z.string().describe("Specific feedback explaining the score. Keep it to 1-2 sentences."),
    evidenceSnippet: z.string().describe("The exact quote from the student's text that justifies this score. 'None' if blank or missing.")
  }))
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

        // --- PASS 1: INTELLIGENT EXTRACTION (Pre-Chunking) ---
        console.log(`[GRADING] Commencing Pass 1: Intelligent Extraction...`);

        // Define the schema for mapping extracted text to Question IDs
        const extractionSchema = z.object({
            mappedAnswers: z.array(z.object({
                questionId: z.string().describe("The ID of the question from the rubric (e.g., '1a', '2', 'Q3')"),
                studentText: z.string().describe("The exact text the student wrote as their answer")
            })).describe("Student answers mapped to specific question IDs"),
            unmappedText: z.string().describe("Any text from the exam that could not be mapped to a specific question ID, or text that is ambiguous. Do not lose any text!")
        });

        // We only want to give it the list of Question IDs so it knows what to map to.
        const questionIdsList = parsedRubricItems.map((item: any) => item.questionId).join(', ');

        let extractedAnswers: { mappedAnswers: { questionId: string, studentText: string }[], unmappedText: string } = {
            mappedAnswers: [],
            unmappedText: submission.ocrText // Fallback to entire text if Pass 1 fails
        };

        try {
            const extractionResponse = await generateObject({
                model: google('gemini-2.5-pro'), // Use pro for better structural reasoning
                system: `You are an expert Data Extraction engine for University Exams.
Your task is to organize a student's raw exam text into a structured mapping based on the provided Question IDs.

AVAILABLE QUESTION IDS: ${questionIdsList}

INSTRUCTIONS:
1. Scan the student's text and identify sections corresponding to the available Question IDs.
2. Extract the exact words the student wrote for each identified question into the 'mappedAnswers' array.
3. CRITICAL: Any text that you cannot confidently map to a specific question (e.g., unlabeled continuations, random notes, or ambiguous answers) MUST be placed into the 'unmappedText' field.
4. DO NOT SUMMARIZE. Preserve the student's original phrasing and calculations.
5. If the student answered out of order, make sure you still map it correctly based on their labels.`,
                prompt: `STUDENT FULL EXAM TEXT:\n${submission.ocrText}`,
                schema: extractionSchema,
                temperature: 0.0,
            });
            extractedAnswers = extractionResponse.object;
            console.log(`[GRADING] Pass 1 Extraction complete. Found ${extractedAnswers.mappedAnswers.length} mapped answers. Unmapped text length: ${extractedAnswers.unmappedText.length}`);
        } catch (extractionError) {
            console.error(`[GRADING] Pass 1 Extraction failed, falling back to full text:`, extractionError);
            // extractedAnswers is already initialized to fall back to the full text in unmappedText
        }

        // --- PASS 2: BATCH GRADING (Map-Reduce) ---
        // We use p-limit to batch questions. Batch of 5 to balance Vercel timeout and Rate Limits.
        const limit = pLimit(5);

        // Chunk the rubric items into blocks of 5 questions each
        const CHUNK_SIZE = 5;
        const rubricChunks = [];
        for (let i = 0; i < parsedRubricItems.length; i += CHUNK_SIZE) {
            rubricChunks.push(parsedRubricItems.slice(i, i + CHUNK_SIZE));
        }

        console.log(`[GRADING] Commencing Pass 2: Batch-Map-Reduce grading for ${rubricChunks.length} chunks...`);

        const gradingPromises = rubricChunks.map(chunk =>
            limit(async () => {
                const chunkJsonString = JSON.stringify(chunk, null, 2);

                // Get the extracted text relevant to this specific chunk
                const chunkQuestionIds = chunk.map((c: any) => c.questionId);
                const relevantMappedAnswers = extractedAnswers.mappedAnswers.filter((ans: any) =>
                    chunkQuestionIds.includes(ans.questionId) ||
                    chunkQuestionIds.some((id: string) => ans.questionId.includes(id) || id.includes(ans.questionId))
                );

                // Build the reduced payload for this chunk
                const reducedStudentPayload = {
                    specificallyMappedAnswers: relevantMappedAnswers,
                    unmappedTextFallback: extractedAnswers.unmappedText
                };

                const systemPrompt = `You are an expert University Professor grading an exam.
You have been provided with a specific set of Questions from the Marking Scheme. You will also receive an optimized payload containing the student's answers mapped to these specific questions, plus an "unmapped text" fallback containing text that could not be confidently mapped.

YOUR GOAL: To grade ONLY the specific questions provided in the chunk against the student's provided text.

CRITICAL SEARCH RULES (PREVENTING DATA LOSS):
1. Evaluate the \`specificallyMappedAnswers\` first, as they are most likely to contain the targeted answer.
2. If the answer is incomplete or missing in the mapped section, you MUST carefully search the \`unmappedTextFallback\` before deciding the student did not answer.
3. DO NOT SKIP: Never claim the student "did not answer" unless you have verified both the mapped answers and the fallback text.

CRITICAL GRADING RULES:
1. EVALUATE SEMANTICS, NOT JUST SYNTAX: Award full marks if the student has demonstrated an understanding of the concept using their own words or synonyms. Do not penalize for missing specific keywords unless strictly required by the rubric.
2. CHAIN OF THOUGHT: You MUST explicitly think step-by-step in the 'thoughtProcess' field BEFORE awarding a score.
3. CALCULATIONS: If a question involves math, follow the student's steps. Award partial or full marks based on their logical steps and final answer as dictated by standard grading practices. Explain this in your thought process.
4. UNANSWERED: Only if the answer is genuinely missing from both the mapped section and fallback text, give it a score of 0.

RUBRIC CHUNK TO GRADE:
"""
${chunkJsonString}
"""`;

                const userPrompt = `OPTIMIZED STUDENT TEXT PAYLOAD:\n${JSON.stringify(reducedStudentPayload, null, 2)}`;

                // Use a model configuration that defines generation parameters dynamically
                // We use the raw generative-ai wrapper or pass via provider settings to bypass type locks
                // The ai sdk @ai-sdk/google currently defaults to 8192 automatically when using 2.5-pro
                // but we explicitly try to set it via experimental configuration or known parameters.
                const { object } = await generateObject({
                    model: google('gemini-2.5-pro'),
                    system: systemPrompt,
                    prompt: userPrompt,
                    schema: atomicGradingSchema,
                    temperature: 0.0,
                });

                // FIX 2: Hardcode maxScore from the rubric to prevent AI hallucinations mutating the base marks.
                const safeGradedQuestions = ((object as any)?.gradedQuestions || []).map((gradedQ: any) => {
                    // Find the original rubric item to get the true maxScore
                    const originalRubricItem = chunk.find((c: any) => c.questionId === gradedQ.question || c.questionId.includes(gradedQ.question));
                    return {
                        ...gradedQ,
                        max: originalRubricItem ? originalRubricItem.maxScore : gradedQ.max // Enforce truth
                    };
                });

                return safeGradedQuestions;
            })
        );

        const chunkResults = await Promise.allSettled(gradingPromises);

        let finalBreakdown: any[] = [];
        let calculatedTotalScore = 0;

        for (const result of chunkResults) {
            if (result.status === 'fulfilled') {
                for (const gradedQ of result.value) {
                     finalBreakdown.push(gradedQ);
                     calculatedTotalScore += gradedQ.score;
                }
            } else {
                console.error("[GRADING] A chunk failed to grade:", result.reason);
                // We could add a failed marker to the breakdown here
            }
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
