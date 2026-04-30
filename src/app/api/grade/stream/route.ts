import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateObject } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: process.env.GEMINI_API_KEY || ''
});
import { z } from 'zod';
import pLimit from 'p-limit';

const normalizeQuestionId = (id: string): string => {
    return (id || "").toString().toLowerCase().replace(/[^a-z0-9]/g, '');
};

export const maxDuration = 300;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const atomicGradingSchema = z.object({
    thoughtProcess: z.string(),
    scoresArray: z.array(z.number()),
    feedback: z.string(),
    evidenceSnippet: z.string()
});

export async function POST(req: NextRequest) {
    let globalSubmissionId: string = "";

    try {
        const body = await req.json();
        globalSubmissionId = body.submissionId;

        if (!globalSubmissionId) {
            return NextResponse.json({ error: "Submission ID is required" }, { status: 400 });
        }

        const submission = await prisma.submission.findUnique({
            where: { id: globalSubmissionId },
            include: { workSession: true }
        });

        if (!submission || !submission.workSession) {
            throw new Error("Submission or WorkSession not found");
        }

        const parsedRubricItems = JSON.parse(submission.workSession.rubric as string || "[]");

        const extractedMap: any[] = JSON.parse(submission.ocrText || "[]");
        const parsedStudentAnswers: Record<string, string> = extractedMap[0] || {};

        // HARDENING FIX: Since the system now processes strictly 1 student at a time globally via the queue,
        // we can safely max out the concurrent questions for this single student to process them very fast.
        const limit = pLimit(10);

        const normalizedStudentAnswers: Record<string, string> = {};
        for (const [key, val] of Object.entries(parsedStudentAnswers)) {
            normalizedStudentAnswers[normalizeQuestionId(key)] = val;
        }

        const gradingPromises = parsedRubricItems.map((rubricItem: any) => {
            return limit(async () => {
                const originalQId = rubricItem.qId || rubricItem.questionId;
                const maxScore = rubricItem.maxScore;
                const normalizedTargetId = normalizeQuestionId(originalQId);

                let studentAnswerForQ = normalizedStudentAnswers[normalizedTargetId];

                if (studentAnswerForQ === undefined) {
                    const fallbackKey = Object.keys(normalizedStudentAnswers).find(k => k.includes(normalizedTargetId) || normalizedTargetId.includes(k));
                    studentAnswerForQ = fallbackKey ? normalizedStudentAnswers[fallbackKey] : "";
                }

                if (!studentAnswerForQ.trim() || studentAnswerForQ === "No text extracted.") {
                    return { question: originalQId, score: 0, thoughtProcess: "Answer completely missing or skipped.", feedback: "No answer provided.", max: maxScore, evidenceSnippet: "None" };
                }

                const boxPrompt = `
EVALUATE THIS SPECIFIC QUESTION ONLY: ${originalQId}
MAXIMUM MARKS: ${maxScore}
ATOMIC MARKING CRITERIA: ${JSON.stringify(rubricItem.criteria || rubricItem.rubricSegment)}
STUDENT ANSWER: ${studentAnswerForQ}
`;
                let attempt = 0;
                let finalScore = 0;
                let gradingObject = { thoughtProcess: "Failed to grade.", feedback: "System error.", evidenceSnippet: "None" };

                // HARDENING FIX: Increased attempts to 5 and added exponential backoff
                const maxAttempts = 5;

                while (attempt < maxAttempts) {
                    try {
                        const { object } = await generateObject({
                            model: openrouter('google/gemini-2.5-pro'),
                            system: "You are an elite Examination Engine. Evaluate the student's answer against the ATOMIC CRITERIA.",
                            prompt: boxPrompt,
                            schema: atomicGradingSchema,
                            temperature: 0.0,
                        });

                        const rawSum = object.scoresArray.reduce((sum, val) => sum + val, 0);
                        finalScore = Math.max(0, Math.min(rawSum, maxScore));
                        gradingObject = { thoughtProcess: object.thoughtProcess, feedback: object.feedback, evidenceSnippet: object.evidenceSnippet };
                        break;
                    } catch (err: any) {
                        attempt++;
                        if (attempt >= maxAttempts) {
                            console.error(`Box ${originalQId} completely failed grading after ${maxAttempts} attempts. Error: ${err.message}`);
                            // Mark thoughtProcess so the UI and Lecturer know it failed due to AI API issues, rather than just returning 0 silently
                            gradingObject.thoughtProcess = `AI API grading failed after ${maxAttempts} retries. Please review manually.`;
                            gradingObject.feedback = "System API Error. Manual grading required.";
                        } else {
                            // Exponential backoff: 2s, 4s, 8s, 16s delay + jitter
                            const backoffDelay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                            console.warn(`[GRADE STREAM] Attempt ${attempt} failed for Q${originalQId}. Retrying in ${backoffDelay}ms. Error: ${err.message}`);
                            await delay(backoffDelay);
                        }
                    }
                }

                return { question: originalQId, score: finalScore, thoughtProcess: gradingObject.thoughtProcess, feedback: gradingObject.feedback, max: maxScore, evidenceSnippet: gradingObject.evidenceSnippet };
            });
        });

        const rawGradedQuestions = await Promise.all(gradingPromises);
        const calculatedTotalScore = rawGradedQuestions.reduce((acc, curr) => acc + curr.score, 0);

        await prisma.score.upsert({
            where: { submissionId: globalSubmissionId },
            update: { totalMarks: calculatedTotalScore, breakdown: JSON.stringify(rawGradedQuestions) },
            create: { submissionId: globalSubmissionId, totalMarks: calculatedTotalScore, breakdown: JSON.stringify(rawGradedQuestions) }
        });

        await prisma.submission.update({
            where: { id: globalSubmissionId },
            data: { status: 'GRADED' }
        });

        return NextResponse.json({ success: true, score: calculatedTotalScore });

    } catch (error: any) {
        if (globalSubmissionId) {
             await prisma.submission.update({ where: { id: globalSubmissionId }, data: { status: 'FAILED' }});
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
