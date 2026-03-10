import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { extractPagesMultimodal, ocrDocument } from '@/lib/ai/gemini';
import { readFile } from '@/lib/storage';
import pLimit from 'p-limit';

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

        // 2. STEP 1: PAGE SPLITTING (Isolated Array)
        console.log("[WORKER] Executing Step 1: Page Splitting...");
        const ocrPages: { page: number; text: string }[] = [];
        let fullExamTextForIdentity = ""; // Only used for fast Regex RegNo extraction

        const sortedData = (submission.extractedData as any[]).sort((a, b) => a.pages[0] - b.pages[0]);
        for (const chunk of sortedData) {
            let chunkText = "";
            try {
                const parsed = JSON.parse(chunk.text);
                chunkText = parsed.full_text || "";
            } catch {
                chunkText = chunk.text || "";
            }

            ocrPages.push({
                page: chunk.pages[0],
                text: chunkText
            });

            fullExamTextForIdentity += "\n\n" + chunkText;
        }

        // REG NO & NAME EXTRACTION (Zero-Cost Regex)
        const regNoMatch = fullExamTextForIdentity.match(/(?:REGISTRATION NUMBER|Reg No|Registration No)[\s:]*([A-Z0-9-]+)/i);
        const detectedRegNo = regNoMatch ? regNoMatch[1].trim() : "UNKNOWN";

        // 3. SEGMENT RUBRIC (HARDENED AGAINST TRUNCATION)
        const rubricParseResponse = await deepSeekClient.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: `You are an expert exam rubric parser. Parse this ENTIRE Marking Scheme into a JSON array. You MUST extract EVERY SINGLE question. DO NOT truncate. Format: { "rubric": [ { "question": "Q1", "rubric_segment": "criteria text", "max_score": 10 } ] }` },
                { role: "user", content: finalRubricText }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 8192
        });

        let parsedRubricMap: any[] = [];
        try {
            const raw = rubricParseResponse.choices[0]?.message?.content || '{"rubric":[]}';
            const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            parsedRubricMap = JSON.parse(clean).rubric || [];
        } catch (e) {
            parsedRubricMap = [{ question: "Global", rubric_segment: finalRubricText, max_score: 100 }];
        }

        const rubricOutline = parsedRubricMap.map(r => r.question).join(", ");

        // 4. PHASE 1 (THE TAGGER): Semantic Locator Mapping
        console.log(`[WORKER] Executing Phase 1: Semantic Locator for ${ocrPages.length} pages...`);
        const mapLimit = pLimit(15);

        const pageExtractionPromises = ocrPages.map(pageObj =>
            mapLimit(async () => {
                if (!pageObj.text || pageObj.text.trim() === '') return { page: pageObj.page, questions: [], text: pageObj.text };

                const taggerSystemPrompt = `You are a strict Semantic Locator.
Your ONLY job is to identify which Question IDs from the Rubric are present on this specific page.

RULES:
1. Scan the page text.
2. Determine if the student is answering any of the provided Rubric Question IDs.
3. Return ONLY a JSON array containing the Question IDs present.
4. DO NOT EXTRACT TEXT. DO NOT GRADE. DO NOT INFER.

Return ONLY this strict JSON format:
{
  "present_questions": ["Q1A", "Q2"]
}`;

                try {
                    const response = await deepSeekClient.chat.completions.create({
                        model: "deepseek-chat",
                        messages: [
                            { role: "system", content: taggerSystemPrompt },
                            { role: "user", content: `RUBRIC QUESTION IDs:\n${rubricOutline}\n\n--- PAGE ${pageObj.page} ---\n${pageObj.text}` }
                        ],
                        response_format: { type: "json_object" },
                        temperature: 0.0,
                        max_tokens: 150 // Micro output guarantees no laziness
                    });

                    const raw = response.choices[0]?.message?.content || '{"present_questions":[]}';
                    const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
                    const parsed = JSON.parse(clean);
                    return {
                        page: pageObj.page,
                        questions: Array.isArray(parsed.present_questions) ? parsed.present_questions : [],
                        text: pageObj.text
                    };
                } catch (error: any) {
                    console.warn(`[WORKER] Semantic Locator failed on page ${pageObj.page}: ${error.message}`);
                    return { page: pageObj.page, questions: [], text: pageObj.text };
                }
            })
        );

        const locatedPages = await Promise.all(pageExtractionPromises);

        // 5. PHASE 2 (THE COMPILER): Invert Map (Question ID -> Concatenated Raw Page Strings)
        console.log(`[WORKER] Executing Phase 2: Programmatic Compiler...`);
        const routedPagesMap: Record<string, string> = {};

        // Initialize with 'NONE'
        for (const rubricItem of parsedRubricMap) {
            routedPagesMap[rubricItem.question] = "NONE";
        }

        // Invert map: If page contains Q1, append the raw page text to Q1's map.
        for (const locator of locatedPages) {
            for (const qId of locator.questions) {
                // Ensure the AI didn't hallucinate a question ID not in the rubric
                if (routedPagesMap[qId] !== undefined) {
                    const pageString = `--- PAGE ${locator.page} ---\n${locator.text}\n`;
                    if (routedPagesMap[qId] === "NONE") {
                        routedPagesMap[qId] = pageString;
                    } else {
                        routedPagesMap[qId] += "\n" + pageString;
                    }
                }
            }
        }

        // 6. PHASE 3 (THE SNIPER GRADER): Atomic grading with micro-inputs
        console.log(`[WORKER] Executing Phase 3: Sniper Grader for ${parsedRubricMap.length} Questions...`);
        const gradingLimit = pLimit(10);

        const atomicGradingPromises = parsedRubricMap.map(rubricItem =>
            gradingLimit(async () => {
                const routedContext = routedPagesMap[rubricItem.question] || "NONE";

                return await withRetries(async () => {
                    const gradeSystemPrompt = `You are a world-class, perfectly fair academic professor. You are grading EXACTLY ONE specific question based on routed page context.

THE 'WORLD-CLASS WISE GRADER' DIRECTIVE (TIERED SEMANTIC EVALUATION):
1. Exact Match -> Full Marks
2. Semantic / Synonym Match -> Full/Partial Marks
3. Partial Attempt / Point Recognition -> Proportional Marks
4. Benefit of Doubt -> Minor Partial Marks
5. Missing / Out of Scope -> 0 (never hallucinate)

GLOBAL EMPATHY CAP & MATH DIRECTIVE:
- Mathematical/numerical final answers MUST be precise for full marks.
- NEVER give marks for answers not explicitly present in the provided routed page context.

MANDATORY JSON SCHEMA (ZOD-STRICT):
You must output ONLY JSON. You MUST extract the exact evidence BEFORE deciding the score.
{
  "evaluations": [
    {
      "question_id": "${rubricItem.question}",
      "raw_evidence_extracted": "1-2 sentence concise exact quote of the student's answer",
      "score": number,
      "match_status": "Exact Match | Semantic Match | Partial Match | Missing | Out of Scope",
      "feedback": "direct, concise, actionable"
    }
  ]
}`;

                    const response = await deepSeekClient.chat.completions.create({
                        model: "deepseek-chat",
                        messages: [
                            { role: "system", content: gradeSystemPrompt },
                            { role: "user", content: `QUESTION: ${rubricItem.question}\nMAX SCORE: ${rubricItem.max_score}\nRUBRIC SEGMENT:\n${rubricItem.rubric_segment}\n\nROUTED PAGE CONTEXT:\n${routedContext}` }
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

        // 6. PHASE 4: ACTIONABLE INSIGHT GENERATOR
        console.log(`[WORKER] Initiating Phase 4: Actionable Insight Generator...`);
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