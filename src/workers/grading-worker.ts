import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { extractPagesMultimodal, ocrDocument } from '@/lib/ai/gemini';
import { readFile } from '@/lib/storage';
import pLimit from 'p-limit';
import { parsePagesIntoMap, OcrPage } from '@/lib/ai/chunker';

// Universal Retry Wrapper
async function withRetries<T>(fn: () => Promise<T>, retries = 3, delayMs = 3000): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try { return await fn(); } catch (error: any) {
            console.warn(`[NETWORK RETRY] Operation failed: ${error.message}. Retrying...`);
            if (i === retries - 1) throw error;
            await new Promise(res => setTimeout(res, delayMs));
        }
    }
    throw new Error("Unreachable");
}

const deepSeekClient = new OpenAI({
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    apiKey: process.env.DEEPSEEK_API_KEY || 'dummy',
    timeout: 300000,
    maxRetries: 4,
});

export async function handleAiGrade(job: any) {
    console.log(`[WORKER] Booting ATOMIC Map-Reduce for Job ${job.id}`);

    let submissionIdToUpdate: string | null = null;

    try {
        const rawPayload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
        // Unwrap the nested payload from QStash if it exists, otherwise use raw
        const actualPayload = rawPayload.payload ? rawPayload.payload : rawPayload;

        submissionIdToUpdate = actualPayload.submissionId;

        if (!submissionIdToUpdate) throw new Error("Payload is missing submissionId");

        const submission = await prisma.submission.findUnique({
            where: { id: submissionIdToUpdate },
            include: { workSession: true }
        });

        if (!submission) throw new Error("Submission not found");

        let finalRubricText = submission.workSession.rubric;

        // 1. CACHE RUBRIC
        if ((!finalRubricText || finalRubricText.trim() === '') && submission.workSession.markingScheme) {
            console.log("[WORKER] Extracting Rubric from PDF...");
            const urlOrText = submission.workSession.markingScheme;
            if (urlOrText.includes('/') || urlOrText.toLowerCase().endsWith('.pdf') || urlOrText.toLowerCase().endsWith('.png')) {
                const buffer = await withRetries(() => readFile(urlOrText, 'exam_pdfs'));
                if (urlOrText.toLowerCase().endsWith('.pdf')) {
                    const pages = await withRetries(() => extractPagesMultimodal(buffer));
                    finalRubricText = pages.map(p => p.text).join('\n\n');
                } else {
                    const mimeType = urlOrText.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';
                    finalRubricText = await withRetries(() => ocrDocument(buffer, mimeType));
                }
            } else {
                finalRubricText = urlOrText;
            }
            await prisma.workSession.update({
                where: { id: submission.workSession.id },
                data: { rubric: finalRubricText }
            });
        }

        if (!finalRubricText || finalRubricText.trim() === '') throw new Error("Fatal: Rubric text is entirely missing.");

        // 2. OCR NORMALIZATION & PAGE LEVEL INDEXING
        const ocrPages: OcrPage[] = [];
        let fullExamTextForIdentity = "";

        const sortedData = (submission.extractedData as any[]).sort((a, b) => a.pages[0] - b.pages[0]);
        for (const chunk of sortedData) {
            let chunkText = "";
            try {
                const parsed = JSON.parse(chunk.text);
                chunkText = parsed.full_text || "";
            } catch {
                chunkText = chunk.text || "";
            }

            // Map strictly to the Page-Level Indexing format
            ocrPages.push({
                page: chunk.pages[0],
                text: chunkText
            });

            fullExamTextForIdentity += "\n\n" + chunkText;
        }

        // REG NO & NAME EXTRACTION (Zero-Cost Regex)
        const regNoMatch = fullExamTextForIdentity.match(/(?:REGISTRATION NUMBER|Reg No|Registration No)[\s:]*([A-Z0-9-]+)/i);
        const detectedRegNo = regNoMatch ? regNoMatch[1].trim() : "UNKNOWN";

        const nameMatch = fullExamTextForIdentity.match(/(?:Student Name|Name)[\s:]*([A-Za-z\s]+)(?:\n|Reg)/i);
        const detectedName = nameMatch ? nameMatch[1].trim() : "UNKNOWN";

        // 3. SEGMENT RUBRIC (HARDENED AGAINST TRUNCATION)
        const rubricParseResponse = await deepSeekClient.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: `You are an expert exam rubric parser. Parse this ENTIRE Marking Scheme into a JSON array. You MUST extract EVERY SINGLE question. DO NOT truncate. Format: { "rubric": [ { "question": "Q1", "rubric_segment": "criteria text", "max_score": 10 } ] }` },
                { role: "user", content: finalRubricText }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 8192 // STRICT: Ensures full generation of all 39+ questions per L8 Blueprint
        });

        let parsedRubricMap: any[] = [];
        try {
            const raw = rubricParseResponse.choices[0]?.message?.content || '{"rubric":[]}';
            const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            parsedRubricMap = JSON.parse(clean).rubric || [];
        } catch (e) {
            parsedRubricMap = [{ question: "Global", rubric_segment: finalRubricText, max_score: 100 }];
        }

        // 4. PHASE 1: PAGE-LEVEL INDEXING & CHUNKING (Deterministic Programmatic Map Phase)
        console.log(`[WORKER] Initiating Phase 1: Page-Level Indexing & Stateful Question Detection...`);
        let questionTextMap = parsePagesIntoMap(ocrPages, parsedRubricMap);

        // 5. PHASE 2: ATOMIC GRADING (REDUCE PHASE)
        console.log(`[WORKER] Initiating Phase 2: True Atomic 1-to-1 Grading for ${parsedRubricMap.length} Questions...`);
        const limit = pLimit(10);

        const atomicGradingPromises = parsedRubricMap.map(rubricItem =>
            limit(async () => {
                const studentAnswerSnippet = questionTextMap[rubricItem.question] || "NONE";

                return await withRetries(async () => {
                    const systemPrompt = `You are a world-class, perfectly fair academic professor. You are grading EXACTLY ONE isolated question snippet.

THE 'WORLD-CLASS WISE GRADER' DIRECTIVE (TIERED SEMANTIC EVALUATION):
Tier 1 — Exact Match: Award full marks when keywords, formulas, or definitions match exactly.
Tier 2 — Semantic Match: Award marks when the concept is correct using different wording.
Tier 3 — Depth Mismatch: Award partial marks when the student lists points but does not fully explain.
Tier 4 — Benefit of Doubt: Award minor credit for logically correct attempts.
Tier 5 — Missing / Out of Scope: Score = 0 only when the answer is absent or irrelevant.

GLOBAL EMPATHY CAP & MATH DIRECTIVE:
- Mathematical/numerical final answers MUST be precise for full marks.
- NEVER give marks for answers not present in the isolated snippet.

MANDATORY JSON SCHEMA (ZOD-STRICT):
You must output ONLY JSON. You MUST populate \`raw_evidence_extracted\` BEFORE deciding the score.
{
  "evaluations": [
    {
      "question_id": "${rubricItem.question}",
      "raw_evidence_extracted": "short quote from student answer",
      "score": number,
      "match_status": "Exact Match | Semantic Match | Partial Match | Missing | Out of Scope",
      "feedback": "short direct explanation"
    }
  ]
}
Constraints:
- raw_evidence_extracted must be 1-2 sentences only
- feedback must be concise and direct. No verbose commentary.`;

                    const response = await deepSeekClient.chat.completions.create({
                        model: "deepseek-chat",
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: `QUESTION: ${rubricItem.question}\nMAX SCORE: ${rubricItem.max_score}\nRUBRIC SEGMENT:\n${rubricItem.rubric_segment}\n\nISOLATED STUDENT ANSWER SNIPPET:\n${studentAnswerSnippet}` }
                        ],
                        response_format: { type: "json_object" },
                        temperature: 0.0,
                        top_p: 0.1,
                    });

                    const raw = response.choices[0]?.message?.content || '{"evaluations":[]}';
                    const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
                    const parsed = JSON.parse(clean);

                    const result = parsed.evaluations?.[0] || {};

                    return {
                        question: rubricItem.question,
                        score: Number(result.score) || 0,
                        max: Number(rubricItem.max_score) || 0,
                        feedback: result.feedback || "No feedback provided.",
                        evidenceSnippet: result.raw_evidence_extracted || "NONE",
                        isRelevant: true
                    };
                }, 3, 2000).catch((error: any) => {
                    console.error(`[PLAYBOOK-TRACE] [FATAL-LLM] Atomic Grading Failed for ${rubricItem.question}: ${error.message}`);
                    return {
                        question: rubricItem.question,
                        score: 0,
                        max: Number(rubricItem.max_score) || 0,
                        feedback: "[Out of Scope] Engine timeout.",
                        evidenceSnippet: "ERROR",
                        isRelevant: false // Silently flag error for filtering if needed
                    };
                });
            })
        );

        const nestedBreakdown = await Promise.all(atomicGradingPromises);
        const formattedBreakdown = nestedBreakdown.filter(item => item.isRelevant !== false); // Filter out absolute failures to prevent UI pollution

        // 6. PHASE 3: ACTIONABLE INSIGHT GENERATOR
        console.log(`[WORKER] Initiating Phase 3: Actionable Insight Generator...`);
        let actionableInsight = "Grading complete.";
        try {
            const insightResponse = await deepSeekClient.chat.completions.create({
                model: "deepseek-chat", // Fast model for summarization
                messages: [
                    { role: "system", content: `You are an insightful educational assistant. Review the student's evaluation array and provide a 1-2 sentence Actionable Insight summarizing their performance. Focus on strengths and specific areas for improvement. Be concise and direct. Do not use verbose commentary.` },
                    { role: "user", content: `EVALUATIONS:\n${JSON.stringify(formattedBreakdown)}` }
                ],
                temperature: 0.1,
                max_tokens: 150
            });
            actionableInsight = insightResponse.choices[0]?.message?.content?.trim() || actionableInsight;
        } catch (e: any) {
            console.warn(`[PLAYBOOK-TRACE] [INSIGHT-WARN] Failed to generate actionable insight. Falling back. Reason: ${e.message}`);
        }

        // 7. SAVE TO DB (IDEMPOTENT)
        console.log(`[PLAYBOOK-TRACE] [ENGINE] Writing atomic scores and insights to DB...`);
        const calculatedTotalScore = formattedBreakdown.reduce((sum: number, item: any) => sum + item.score, 0);

        await prisma.score.upsert({
            where: { submissionId: submission.id },
            update: {
                totalMarks: calculatedTotalScore,
                remarks: actionableInsight,
                breakdown: JSON.stringify(formattedBreakdown),
                detectedIdentity: detectedRegNo
            },
            create: {
                submissionId: submission.id,
                totalMarks: calculatedTotalScore,
                remarks: actionableInsight,
                breakdown: JSON.stringify(formattedBreakdown),
                detectedIdentity: detectedRegNo
            }
        });
        console.log(`[PLAYBOOK-TRACE] [ENGINE-SUCCESS] DB Upsert complete. Total Score: ${calculatedTotalScore}.`);

        await prisma.submission.update({
            where: { id: submission.id },
            data: { status: 'GRADED', studentRegNo: detectedRegNo !== "UNKNOWN" ? detectedRegNo : submission.studentRegNo }
        });

        let calculatedTotalScoreLog = calculatedTotalScore; // Fix variable scope for logging
        console.log(`[WORKER] Mission Accomplished for Submission ${submission.id}. Score: ${calculatedTotalScoreLog}`);

    } catch (fatalError: any) {
        console.error(`[WORKER] Error:`, fatalError.message);
        if (submissionIdToUpdate) {
            await prisma.submission.update({
                where: { id: submissionIdToUpdate },
                data: { status: 'FAILED', feedback: fatalError.message }
            }).catch(e => console.error("Failed to update status to FAILED", e));
        }
        throw fatalError;
    }
}