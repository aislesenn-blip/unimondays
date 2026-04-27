import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import pLimit from 'p-limit';

export const maxDuration = 300;

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || 'dummy',
  baseURL: "https://generativelanguage.googleapis.com/v1beta/",
});

// ============================================================================
// 🧱 ZOD SCHEMAS (ZERO COMPROMISE STANDARDS)
// ============================================================================

// Schema ya L9 Router: Inaamrisha AI itenganishe majibu bila kupoteza muktadha
const routerSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().describe("The exact Question ID from the Rubric (e.g., '1 A i')."),
    extractedAnswer: z.string().describe("The FULL, combined text the student wrote for this specific question. If the student explicitly left it blank or skipped it, return an empty string (''). DO NOT summarize. Extract verbatim.")
  }))
});

// Schema ya Grading imebaki vilevile bila kubadilisha koma.
const singleQuestionSchema = z.object({
  thoughtProcess: z.string().describe("Chain of thought: Search for the student's answer, compare it structurally and semantically to the rubric, and reason step-by-step before deciding the score."),
  pointsFound: z.number().optional().describe("The exact number of correct points you found that match the rubric requirements (e.g., 5)."),
  score: z.number().multipleOf(0.5).describe("The final calculated score. DO NOT use arbitrary decimals like 0.25 or 0.75. Only use whole numbers or 0.5 increments as permitted by the rubric max score."),
  feedback: z.string().describe("A brief, objective justification for the awarded score."),
  evidenceSnippet: z.string().describe("The exact direct quote from the student's text that justifies this score. Write 'None' if missing.")
});

// RegNo inatumia PRO
const regNoSchema = z.object({
  detectedRegNo: z.string().describe("The registration number/ID found in the student text, if any. Return 'UNKNOWN' if not found.")
});

export async function POST(req: NextRequest) {
    let globalSubmissionId: string | null = null;
    try {
        const authHeader = req.headers.get('authorization');
        const internalKey = process.env.INTERNAL_API_KEY;
        if (!internalKey || authHeader !== `Bearer ${internalKey}`) {
            return NextResponse.json({ error: 'Unauthorized: Invalid internal token.' }, { status: 401 });
        }

        const body = await req.json();
        // Note: The original prompt used "deliveryId", but the prisma schema uses "Submission".
        globalSubmissionId = body.submissionId || body.deliveryId;
        if (!globalSubmissionId) return NextResponse.json({ error: 'Missing submissionId.' }, { status: 400 });

        const submissionRecord = await prisma.submission.findUnique({
            where: { id: globalSubmissionId }, include: { workSession: true }
        });
        if (!submissionRecord || !submissionRecord.ocrText) return NextResponse.json({ error: 'Submission/OCR not found.' }, { status: 404 });

        let finalRubricText = submissionRecord.workSession.rubric || submissionRecord.workSession.markingScheme;
        if (!finalRubricText) return NextResponse.json({ error: 'No rubric provided.' }, { status: 400 });

        let parsedRubricItems: any[] = [];
        try {
            parsedRubricItems = JSON.parse(finalRubricText);
            if (!Array.isArray(parsedRubricItems) || parsedRubricItems.length === 0) throw new Error("Invalid Rubric Format");
            parsedRubricItems = parsedRubricItems.map(item => ({ ...item, maxScore: Number(item.maxScore) }));
        } catch (e) {
            await prisma.submission.update({ where: { id: globalSubmissionId }, data: { status: 'FAILED', feedback: 'System Error: Marking scheme is not a valid JSON array.' } });
            return NextResponse.json({ error: 'Rubric is not a verified JSON array.' }, { status: 400 });
        }

        await prisma.submission.update({ where: { id: globalSubmissionId }, data: { status: 'GRADING' } });

        const studentText = submissionRecord.ocrText;
        const rubricQuestionIds = parsedRubricItems.map(r => r.questionId).join(", ");

        // ============================================================================
        // 🧠 PHASE 1: THE L9 SEMANTIC ROUTER (USING 'PRO' MODEL ONLY)
        // ============================================================================
        console.log(`[ROUTING] Executing Cognitive Collation for 10K+ tokens. Submission: ${globalSubmissionId}`);

        const routerSystemPrompt = `You are an elite Academic Transcription Router with advanced cognitive collation abilities.
Your task is to scan the entire student's exam text and strictly map their written answers to the Expected Question IDs: [${rubricQuestionIds}].

COGNITIVE ROUTING DIRECTIVES:
1. HANDLE OCR TYPOS & MESSY HANDWRITING: Students often have terrible handwriting which causes OCR typos (e.g., 'A i)' might look like 'A :)' or '4)', 'A ii)' might look like 'A it)'). You must use contextual clues and margin numbers to map every single block of text to the correct questionId.
2. OUT-OF-ORDER ANSWERS: Students often answer questions out of order (e.g., Q6, then Q3, then Q2). Pay close attention to the visual markdown demarcations (\`=== QUESTION X ===\`) and margin notes to correctly group the text.
3. STRICT DEMARCATION: Isolate the text meant for each specific question based on visual boundaries and context. Do not allow answers to bleed into one another.
4. CONTEXT PRESERVATION: If a student scattered their answer for Q1 across multiple pages, intelligently stitch those exact parts together into a single string.
5. ZERO HALLUCINATION & NO GRADING: Do NOT correct their spelling. Do NOT grade. Your ONLY job is to extract verbatim what they wrote and route it.
6. ABSENCE HANDLING: If the student completely skipped a question, you MUST return an empty string ("") for that Question ID.`;

        const { object: routingObject } = await generateObject({
            model: google('gemini-2.5-pro'),
            system: routerSystemPrompt,
            prompt: `STUDENT FULL EXAM TEXT:\n${studentText}`,
            schema: routerSchema,
            temperature: 0.0
        });

        const studentAnswersDict: Record<string, string> = {};
        routingObject.answers.forEach(item => {
            studentAnswersDict[item.questionId] = item.extractedAnswer.trim();
        });

        // ============================================================================
        // ⚖️ PHASE 2: ATOMIC MAP-REDUCE GRADING (PARALLEL & ISOLATED)
        // ============================================================================
        console.log(`[GRADING] Commencing Isolated Parallel Grading...`);
        let finalBreakdown: any[] = [];
        let calculatedTotalScore = 0;

        const limit = pLimit(5); // Process up to 5 questions concurrently

        const gradingPromises = parsedRubricItems.map((rubricItem: any) => limit(async () => {
            const trueMax = Number(rubricItem.maxScore);
            let isolatedStudentAnswer = studentAnswersDict[rubricItem.questionId] || "";

            // SAFETY FALLBACK: If the Semantic Router missed it, but the question ID appears in the raw OCR text,
            // do not give a 0. Instead, pass the entire raw text (or a hint) to the grading engine so it can search for the answer itself.
            if (isolatedStudentAnswer === "") {
                // Extract base question number (e.g. from "3Ai" -> "3", or "1Bii" -> "1")
                const match = rubricItem.questionId.match(/^(\d+)/);
                const baseQNum = match ? match[1] : null;

                const mightHaveAnswer = (
                    studentText.includes(rubricItem.questionId) ||
                    (baseQNum && (studentText.includes(`0${baseQNum} Question`) || studentText.includes(`${baseQNum} Question`))) ||
                    studentText.includes(`=== QUESTION ${baseQNum} ===`)
                );

                if (mightHaveAnswer) {
                    console.warn(`[SAFETY FALLBACK] Semantic Router returned empty for ${rubricItem.questionId}, but text indicates it might exist. Falling back to FULL text search.`);
                    isolatedStudentAnswer = studentText; // Provide the full text as a fallback
                } else {
                    return {
                        question: rubricItem.questionId,
                        thoughtProcess: "Execution Halted: The Semantic Router confirmed the student did not attempt this question. No grading API call made.",
                        score: 0,
                        max: trueMax,
                        feedback: "No answer provided.",
                        evidenceSnippet: "None"
                    };
                }
            }

            const systemPrompt = `You are a Global Examination Evaluation Engine. Your goal is to provide a highly accurate, fair, and evidence-based score for any academic subject.

CURRENT CONTEXT:
- Target Question ID: ${rubricItem.questionId}
- Maximum Allowed Score: ${trueMax} (CRITICAL: Ignore any other score values that might be accidentally embedded in the rubric text. ${trueMax} is the ONLY valid maximum).

UNIVERSAL GRADING PROTOCOLS (STRICT ENFORCEMENT):
1. ATOMIC EVALUATION: You have been provided ONLY the exact text the student wrote for this specific question. Evaluate it exclusively against the rubric.
2. PROPORTIONAL MATH LOGIC: Read the rubric carefully. If the rubric asks for 5 points for 7.5 marks, do not invent a rule requiring 7 points. Calculate the weight of each point based on the rubric text and multiply it by the number of correct points found.
3. BINARY SCORING FOR SMALL MARKS: For questions worth 0.5 or 1.0 marks, do not give weird partial credits unless explicitly instructed by the rubric. It is either correct or incorrect.
4. SEMANTIC EVALUATION: Focus entirely on the substance and correctness of the answer based on the EXPECTED RUBRIC within the valid boundaries. Do not penalize for spelling unless it changes the scientific meaning.
5. DIAGRAMS & DRAWINGS: You cannot physically see diagrams. You must fully trust and analytically evaluate the text descriptions of diagrams provided in the OCR as if you were looking at the actual diagram.
6. ALIGNMENT OF FEEDBACK AND SCORE: Your feedback MUST match the score. If your cognitive evaluation determines that the student's answer is "perfect" or "fully correct", you MUST award the EXACT maximum score of ${trueMax}.
7. EVIDENCE REQUIREMENT: You must identify and quote the specific part of the student's text that justifies the marks awarded.

SCORING CONSTRAINTS:
- DO NOT INVENT DECIMALS. Use only whole numbers or 0.5 increments.
- Under no circumstances shall the score exceed ${trueMax}.`;

            const userPrompt = `EXPECTED RUBRIC:\n${rubricItem.rubricSegment}\n\nSTUDENT ISOLATED ANSWER:\n${isolatedStudentAnswer}`;

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

                    let safeScore = Math.max(0, Math.min(object.score, trueMax));
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
                    if (errMsg.includes('429') || errMsg.includes('timeout') || errMsg.includes('fetch failed') || errMsg.includes('Overloaded')) {
                        retries--;
                        console.warn(`[GRADING] Transient error for Q ${rubricItem.questionId}. Retries left: ${retries}.`);
                        if (retries === 0) throw err;
                        await new Promise(res => setTimeout(res, 2000));
                    } else { throw err; }
                }
            }
        }));

        const batchResults = await Promise.allSettled(gradingPromises);
        batchResults.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                finalBreakdown.push(result.value);
                calculatedTotalScore += (result.value as any).score;
            } else {
                const failedItem = parsedRubricItems[index];
                console.error(`[GRADING] Final failure grading question ${failedItem.questionId}`);
                finalBreakdown.push({ question: failedItem.questionId, thoughtProcess: "System failed to grade this specific question.", score: 0, max: Number(failedItem.maxScore) || 0, feedback: "API Error encountered.", evidenceSnippet: "" });
            }
        });

        // ============================================================================
        // 🆔 IDENTITY EXTRACTION (USING PRO MODEL)
        // ============================================================================
        let detectedRegNo = "UNKNOWN";
        try {
            const regNoResponse = await generateObject({
                model: google('gemini-2.5-pro'),
                system: "Extract the registration number from the text. Return UNKNOWN if none is found.",
                prompt: submissionRecord.ocrText,
                schema: regNoSchema,
                temperature: 0.0
            });
            detectedRegNo = regNoResponse.object.detectedRegNo;
        } catch(e) { /* ignore */ }

        const regNoToSave = detectedRegNo && detectedRegNo !== "UNKNOWN" ? detectedRegNo : submissionRecord.studentRegNo;

        await prisma.score.upsert({
            where: { submissionId: globalSubmissionId },
            update: { totalMarks: calculatedTotalScore, remarks: "Graded via L9 Semantic Router Architecture (Pure PRO Engine).", breakdown: JSON.stringify(finalBreakdown), detectedIdentity: regNoToSave },
            create: { submissionId: globalSubmissionId, totalMarks: calculatedTotalScore, remarks: "Graded via L9 Semantic Router Architecture (Pure PRO Engine).", breakdown: JSON.stringify(finalBreakdown), detectedIdentity: regNoToSave }
        });

        await prisma.submission.update({ where: { id: globalSubmissionId }, data: { status: 'GRADED', studentRegNo: regNoToSave } });

        console.log(`[GRADING] Successfully graded submission ${globalSubmissionId} with score ${calculatedTotalScore}`);
        return NextResponse.json({ success: true, score: calculatedTotalScore });

    } catch (error: any) {
        console.error("[FATAL-GRADING] Streaming API Failed:", error);
        try {
            if (globalSubmissionId) {
                await prisma.submission.update({ where: { id: globalSubmissionId }, data: { status: 'FAILED', feedback: 'System encountered an error.' } });
            }
        } catch (e) {}
        return NextResponse.json({ error: error.message || 'Grading failed.' }, { status: 500 });
    }
}
