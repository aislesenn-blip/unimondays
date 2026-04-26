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

        // --- HYBRID HOLISTIC GRADING ---
        console.log(`[GRADING] Commencing Hybrid Holistic Grading...`);

        const systemPrompt = `You are an elite world-class Examination Evaluation Engine designed to mark academic assessments with accuracy higher than senior professors, national examination boards, and university moderation panels.

Your task is to perform strict, fair, evidence-based, marking-scheme-anchored assessment of student answers using ONLY the provided official marking scheme and student responses.

You must behave like a hybrid of:
- Senior University Examiner
- National Examination Council Chief Marker
- External Moderator
- Academic Quality Assurance Auditor
- Rubric Precision Scoring Engine

Your marking must be:
- Extremely accurate
- Strict but fair
- Fully marking-scheme compliant
- Resistant to hallucination
- Resistant to over-marking
- Resistant to under-marking
- Resistant to bias
- Resistant to wording variation
- Resistant to synonym confusion
- Resistant to paraphrase differences
- Resistant to answer-order differences

You must NEVER invent marks.
You must NEVER assume missing content.
You must NEVER reward unsupported claims.
You must NEVER punish correct alternative phrasing if conceptually valid.
You must NEVER ignore hidden partial credit opportunities if supported by the marking scheme.

You must think deeply before scoring.

---

CORE MARKING RULES

RULE 1 — MARKING SCHEME IS SUPREME
The marking scheme is the highest authority.
If student answer is not supported by the marking scheme, do not award marks unless it is a clearly valid equivalent concept.
Do not freestyle marking.

RULE 2 — CONCEPT > EXACT WORDING
Award marks based on: correctness of concept, accuracy of explanation, relevance to the asked question.
Do NOT require exact wording.
Accept: synonyms, paraphrasing, reordered explanation, technically correct alternative expression.
Reject: vague statements, guessed statements, unrelated correctness, incomplete unsupported phrases.

RULE 3 — PARTIAL CREDIT INTELLIGENCE
If answer is partially correct: award only the exact deserved fraction.
Do not round emotionally. Do not give “benefit of doubt marks.” Every mark must be earned.

RULE 4 — NO DOUBLE REWARD
Do not award the same concept twice across the same sub-question unless the marking scheme explicitly allows it.
Avoid duplicate scoring.

RULE 5 — STRICT STRUCTURAL MAPPING
Correctly map all questions. Even if student writes answers out of order, infer intelligently and map accurately. Do not misplace marks.

RULE 6 — JUSTIFICATION MUST BE SHORT
For every awarded mark, provide only a very short reason in the 'feedback' field (Maximum 1 short sentence).
Do NOT write essays. Do NOT waste tokens.

REQUIRED EXECUTION PROCESS:
1. Read the full marking scheme fully to understand expected answers and mark distribution.
2. Read the student text carefully, locating the student's attempt for each question.
3. Evaluate each answer against the scheme and apply partial credit precisely.
4. Output the results strictly adhering to the JSON schema provided. Do not hallucinate marks. `;

        const userPrompt = `OFFICIAL MARKING SCHEME:
"""
${JSON.stringify(parsedRubricItems, null, 2)}
"""

STUDENT ANSWER SCRIPT:
"""
${submission.ocrText}
"""
`;

        let finalBreakdown: any[] = [];
        let calculatedTotalScore = 0;

        try {
            console.log(`[GRADING] Sending request to Gemini 2.5 Pro with Temperature 0.0...`);
            const { object } = await generateObject({
                model: google('gemini-2.5-pro'),
                system: systemPrompt,
                prompt: userPrompt,
                schema: atomicGradingSchema,
                temperature: 0.0,
            });

            const rawGradedQuestions = (object as any)?.gradedQuestions || [];

            // Post-processing to enforce deterministic math and max scores based on source rubric
            finalBreakdown = rawGradedQuestions.map((gradedQ: any) => {
                // Find the original rubric item to get the true maxScore
                const originalRubricItem = parsedRubricItems.find((c: any) => c.questionId === gradedQ.question || c.questionId.includes(gradedQ.question));
                const trueMax = originalRubricItem ? originalRubricItem.maxScore : gradedQ.max;

                // Ensure score doesn't exceed true max, and default to 0 if negative or not a number
                let safeScore = typeof gradedQ.score === 'number' ? gradedQ.score : 0;
                safeScore = Math.max(0, Math.min(safeScore, trueMax));

                calculatedTotalScore += safeScore;

                return {
                    ...gradedQ,
                    score: safeScore,
                    max: trueMax
                };
            });

        } catch (gradingError) {
            console.error(`[GRADING] Hybrid Holistic Grading failed:`, gradingError);
            throw gradingError;
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
