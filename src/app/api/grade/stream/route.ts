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

// Phase 1: Router Schema (To map student text to Qn IDs)
const routerSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().describe("The exact normalized Question ID (e.g., '1a')."),
    extractedAnswer: z.string().describe("The FULL, combined text the student wrote for this specific question. If skipped, return empty string ''.")
  }))
});

// Phase 2: Atomic Grader Schema (For evaluating isolated boxes)
const atomicGraderSchema = z.object({
  evaluations: z.array(z.object({
    criterionId: z.string().describe("The unique ID of the criterion being evaluated (e.g., 'c1')."),
    isMet: z.boolean().describe("True if the student's answer fulfills this specific criterion, False otherwise."),
    reasoning: z.string().describe("1 sentence explaining why this specific criterion was met or not met based on the student's text.")
  }))
});

const regNoSchema = z.object({
  detectedRegNo: z.string().describe("The student's registration number/ID. 'UNKNOWN' if not found.")
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
        globalSubmissionId = body.submissionId;

        if (!globalSubmissionId) return NextResponse.json({ error: 'Missing submissionId.' }, { status: 400 });

        const submission = await prisma.submission.findUnique({
            where: { id: globalSubmissionId },
            include: { workSession: true }
        });

        if (!submission || !submission.ocrText) {
             return NextResponse.json({ error: 'Submission/OCR not found.' }, { status: 404 });
        }

        // Final Rubric Text should now be our structured Playbook Standard JSON (from the OCR step)
        let finalRubricText = submission.workSession.rubric;
        if (!finalRubricText) return NextResponse.json({ error: 'No rubric provided.' }, { status: 400 });

        let parsedSections: any[] = [];
        try {
            parsedSections = JSON.parse(finalRubricText);
            if (!Array.isArray(parsedSections)) throw new Error("Invalid format");
        } catch (e) {
             // Fallback handling or error out. For L9, we expect it to be correct from OCR.
             await prisma.submission.update({ where: { id: globalSubmissionId }, data: { status: 'FAILED', feedback: 'System Error: Rubric is not valid Playbook Standard JSON.' } });
             return NextResponse.json({ error: 'Rubric formatting error.' }, { status: 400 });
        }

        await prisma.submission.update({ where: { id: globalSubmissionId }, data: { status: 'GRADING' } });

        // Flatten rubric into a list of questions for routing
        const allQuestions: any[] = [];
        parsedSections.forEach(section => {
             section.questions?.forEach((q: any) => {
                 allQuestions.push(q);
             });
        });

        const rubricQuestionIds = allQuestions.map(q => q.questionId).join(", ");
        const studentText = submission.ocrText;

        // ============================================================================
        // 🧠 PHASE 1: SEMANTIC ROUTER
        // ============================================================================
        console.log(`[ROUTING] Executing Cognitive Collation for Submission: ${globalSubmissionId}`);
        const routerSystemPrompt = `You are an elite Academic Transcription Router.
Scan the entire student's exam text and strictly map their written answers to these expected normalized Question IDs: [${rubricQuestionIds}].

DIRECTIVES:
1. STRICT DEMARCATION: Isolate the text meant for each specific question.
2. CONTEXT PRESERVATION: Intelligently stitch scattered parts together if the student answered a question across multiple areas.
3. ZERO HALLUCINATION: Extract verbatim. Do NOT correct spelling. Do NOT grade.
4. ABSENCE HANDLING: If skipped, return an empty string ("").`;

        const { object: routingObject } = await generateObject({
            model: google('gemini-2.5-pro'),
            system: routerSystemPrompt,
            prompt: `STUDENT EXAM TEXT:\n${studentText}`,
            schema: routerSchema,
            temperature: 0.0
        });

        const studentAnswersDict: Record<string, string> = {};
        routingObject.answers.forEach(item => {
            studentAnswersDict[item.questionId] = item.extractedAnswer.trim();
        });

        // ============================================================================
        // ⚖️ PHASE 2: ATOMIC PARALLEL GRADING (p-limit)
        // ============================================================================
        console.log(`[GRADING] Commencing Isolated Parallel Grading (Limit: 10)...`);

        const limit = pLimit(10); // L9 Limit Concurrency to 10
        let finalBreakdown: any[] = [];
        let calculatedTotalScore = 0;

        const gradingPromises = allQuestions.map((questionObj: any) => limit(async () => {
            const trueMax = Number(questionObj.maxScore);
            const isolatedStudentAnswer = studentAnswersDict[questionObj.questionId] || "";

            // If empty box, short-circuit
            if (isolatedStudentAnswer === "") {
                return {
                    question: questionObj.questionId,
                    topic: questionObj.topic,
                    thoughtProcess: "Semantic Router confirmed no answer provided.",
                    score: 0,
                    max: trueMax,
                    feedback: "No answer provided.",
                    evidenceSnippet: "None"
                };
            }

            const systemPrompt = `You are a Global Examination Evaluation Engine.
Your task is to evaluate the provided STUDENT ISOLATED ANSWER strictly against the provided ATOMIC CRITERIA.

UNIVERSAL PROTOCOLS:
1. ATOMIC EVALUATION: Evaluate EACH criterion individually. Is it met (true) or not met (false)?
2. SEMANTIC INTELLIGENCE: Accept valid synonyms or alternative phrasing that convey the exact same scientific/academic concept.
3. ZERO HALLUCINATION: Base your decision ONLY on the student's text.
4. DIAGRAMS: Trust the explicit text descriptions of diagrams provided in the OCR as if you were looking at them.`;

            const userPrompt = `ATOMIC CRITERIA FOR QUESTION ${questionObj.questionId}:\n${JSON.stringify(questionObj.criteria, null, 2)}\n\nSTUDENT ISOLATED ANSWER:\n${isolatedStudentAnswer}`;

            let retries = 2;
            while (retries > 0) {
                try {
                    const { object } = await generateObject({
                        model: google('gemini-2.5-pro'),
                        system: systemPrompt,
                        prompt: userPrompt,
                        schema: atomicGraderSchema,
                        temperature: 0.0,
                    });

                    // 🧮 JAVASCRIPT MATH: Calculate score deterministically
                    let questionScore = 0;
                    const feedbackPoints: string[] = [];

                    object.evaluations.forEach(evalResult => {
                        const originalCriterion = questionObj.criteria.find((c: any) => c.id === evalResult.criterionId);
                        if (originalCriterion && evalResult.isMet) {
                            questionScore += Number(originalCriterion.marks);
                            feedbackPoints.push(`✓ ${originalCriterion.text}`);
                        } else if (originalCriterion && !evalResult.isMet) {
                             feedbackPoints.push(`✗ Missed: ${originalCriterion.text} (${evalResult.reasoning})`);
                        }
                    });

                    // Enforce Max Score bounds
                    let safeScore = Math.max(0, Math.min(questionScore, trueMax));

                    return {
                        question: questionObj.questionId,
                        topic: questionObj.topic,
                        thoughtProcess: "Evaluated atomic criteria deterministically.",
                        score: safeScore,
                        max: trueMax,
                        feedback: feedbackPoints.length > 0 ? feedbackPoints.join(" | ") : "Evaluated.",
                        evidenceSnippet: "See reasoning."
                    };

                } catch (err: any) {
                    retries--;
                    if (retries === 0) {
                        console.error(`[GRADING] Failed Q ${questionObj.questionId}:`, err);
                        return { question: questionObj.questionId, thoughtProcess: "API Error", score: 0, max: trueMax, feedback: "Error evaluating criteria", evidenceSnippet: "" };
                    }
                    await new Promise(res => setTimeout(res, 2000));
                }
            }
        }));

        const results = await Promise.all(gradingPromises);
        results.forEach(res => {
             if (res) {
                 finalBreakdown.push(res);
                 calculatedTotalScore += res.score;
             }
        });

        // ============================================================================
        // 🆔 IDENTITY EXTRACTION
        // ============================================================================
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
        } catch(e) { }

        const regNoToSave = detectedRegNo && detectedRegNo !== "UNKNOWN" ? detectedRegNo : submission.studentRegNo;

        await prisma.score.upsert({
            where: { submissionId: globalSubmissionId },
            update: { totalMarks: calculatedTotalScore, remarks: "Graded via L9 Atomic Map-Reduce.", breakdown: JSON.stringify(finalBreakdown), detectedIdentity: regNoToSave },
            create: { submissionId: globalSubmissionId, totalMarks: calculatedTotalScore, remarks: "Graded via L9 Atomic Map-Reduce.", breakdown: JSON.stringify(finalBreakdown), detectedIdentity: regNoToSave }
        });

        await prisma.submission.update({ where: { id: globalSubmissionId }, data: { status: 'GRADED', studentRegNo: regNoToSave } });

        console.log(`[GRADING] Successfully graded submission ${globalSubmissionId} with score ${calculatedTotalScore}`);
        return NextResponse.json({ success: true, score: calculatedTotalScore });

    } catch (error: any) {
        console.error("[FATAL-GRADING] Streaming API Failed:", error);
        try {
            if (globalSubmissionId) {
                await prisma.submission.update({ where: { id: globalSubmissionId }, data: { status: 'FAILED', feedback: 'System encountered a fatal error.' } });
            }
        } catch (e) { }
        return NextResponse.json({ error: error.message || 'Grading failed.' }, { status: 500 });
    }
}