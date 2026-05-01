import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
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
            include: {
                workSession: {
                    include: { lecturer: true }
                }
            }
        });

        if (!submission || !submission.workSession) {
            throw new Error("Submission or WorkSession not found");
        }

        // Setup OpenRouter provider with BYOK fallback
        const lecturerKey = submission.workSession.lecturer?.calibrationSettings; // Future: openRouterKey from DB. Reusing calibrationSettings temporarily or assuming it's available.
        // Actually, we should query DB or use process.env if not available yet.
        // To be perfectly safe, we'll map this to `openRouterKey` once we update Prisma.
        // For now, if the model has `openRouterKey` it will use it, otherwise fallback.
        const apiKey = (submission.workSession.lecturer as any)?.openRouterKey || process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;

        const openrouter = createOpenAI({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey: apiKey,
            headers: {
                'HTTP-Referer': 'https://playbook.app',
                'X-Title': 'Playbook Grading Engine'
            }
        });

        const parsedRubricItems = JSON.parse(submission.workSession.rubric as string || "[]");

        const extractedMap: any[] = JSON.parse(submission.ocrText || "[]");
        const parsedStudentAnswers: Record<string, string> = extractedMap[0] || {};

        // Use the FULL TRANSCRIPT if available from the new extraction engine,
        // otherwise fallback to the legacy mapped structure for older submissions.
        const fullTranscriptText = parsedStudentAnswers["FULL_TRANSCRIPT"];

        // HARDENING FIX: Since the system now processes strictly 1 student at a time globally via the queue,
        // we can safely max out the concurrent questions for this single student to process them very fast.
        const limit = pLimit(10);

        const normalizedStudentAnswers: Record<string, string> = {};
        if (!fullTranscriptText) {
            for (const [key, val] of Object.entries(parsedStudentAnswers)) {
                normalizedStudentAnswers[normalizeQuestionId(key)] = val;
            }
        }

        // CACHING FIX: Pre-compute the deterministic System Prompt for the entire assignment
        // OpenRouter (and Google underneath) will automatically cache this system prompt for all
        // 1000 students taking this specific WorkSession, saving massive token costs and time.
        const cachedSystemPrompt = `You are an elite Examination Engine.
You are grading an exam for WorkSession: ${submission.workSessionId}.
Evaluate the student's answer against the ATOMIC CRITERIA exactly as written.

FULL MARKING SCHEME CONTEXT (CACHED):
${JSON.stringify(parsedRubricItems)}

${fullTranscriptText ? `
STUDENT EXAM TRANSCRIPT (CACHED FOR THIS SUBMISSION):
The student wrote their entire exam out below. Some answers may be out of order, mislabeled, or span across multiple pages.
It is your job to find the relevant answer for the specific question being evaluated.
--- START OF TRANSCRIPT ---
${fullTranscriptText}
--- END OF TRANSCRIPT ---
` : ''}
`;

        const gradingPromises = parsedRubricItems.map((rubricItem: any) => {
            return limit(async () => {
                const originalQId = rubricItem.qId || rubricItem.questionId;
                const maxScore = rubricItem.maxScore;
                const normalizedTargetId = normalizeQuestionId(originalQId);

                let boxPrompt = "";

                if (fullTranscriptText) {
                    boxPrompt = `
EVALUATE THIS SPECIFIC QUESTION ONLY: ${originalQId}
MAXIMUM MARKS: ${maxScore}
ATOMIC MARKING CRITERIA FOR THIS QUESTION: ${JSON.stringify(rubricItem.criteria || rubricItem.rubricSegment)}

INSTRUCTIONS:
1. Search the "STUDENT EXAM TRANSCRIPT" provided in the System Prompt for the answer to question "${originalQId}".
2. Pay close attention to the numbering used by the student (e.g. 1.a.i, Q1A, etc) and look for context clues if the numbering is messy.
3. If the student completely skipped or did not write an answer for this specific question, set score to 0 and explicitly state "Answer completely missing or skipped" in the thoughtProcess.
`;
                } else {
                    let studentAnswerForQ = normalizedStudentAnswers[normalizedTargetId];

                    if (studentAnswerForQ === undefined) {
                        const fallbackKey = Object.keys(normalizedStudentAnswers).find(k => k.includes(normalizedTargetId) || normalizedTargetId.includes(k));
                        studentAnswerForQ = fallbackKey ? normalizedStudentAnswers[fallbackKey] : "";
                    }

                    if (!studentAnswerForQ.trim() || studentAnswerForQ === "No text extracted.") {
                        return { question: originalQId, score: 0, thoughtProcess: "Answer completely missing or skipped.", feedback: "No answer provided.", max: maxScore, evidenceSnippet: "None" };
                    }

                    boxPrompt = `
EVALUATE THIS SPECIFIC QUESTION ONLY: ${originalQId}
MAXIMUM MARKS: ${maxScore}
ATOMIC MARKING CRITERIA FOR THIS QUESTION: ${JSON.stringify(rubricItem.criteria || rubricItem.rubricSegment)}

STUDENT ANSWER:
${studentAnswerForQ}
`;
                }
                let attempt = 0;
                let finalScore = 0;
                let gradingObject = { thoughtProcess: "Failed to grade.", feedback: "System error.", evidenceSnippet: "None" };

                // HARDENING FIX: Increased attempts to 5 and added exponential backoff
                const maxAttempts = 5;

                while (attempt < maxAttempts) {
                    try {
                        // User explicitly requested to use Gemini globally for best performance
                        const { object } = await generateObject({
                            model: openrouter('deepseek/deepseek-v4-pro'),
                            system: cachedSystemPrompt,
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
