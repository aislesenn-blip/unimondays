import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { extractPagesMultimodal, ocrDocument } from '@/lib/ai/gemini';
import { readFile } from '@/lib/storage';
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

        // 2. CONSTRUCT HOLISTIC FULL EXAM TEXT
        console.log("[WORKER] Reconstructing complete OCR exam payload...");
        let fullExamText = "";

        const sortedData = (submission.extractedData as any[]).sort((a, b) => a.pages[0] - b.pages[0]);
        for (const chunk of sortedData) {
            let chunkText = "";
            try {
                const parsed = JSON.parse(chunk.text);
                chunkText = parsed.full_text || "";
            } catch {
                chunkText = chunk.text || "";
            }
            fullExamText += `\n\n--- PAGE ${chunk.pages[0]} ---\n\n` + chunkText;
        }

        if (!fullExamText.trim()) fullExamText = "No readable text extracted.";

        // REG NO EXTRACTION (Zero-Cost Regex)
        const regNoMatch = fullExamText.match(/(?:REGISTRATION NUMBER|Reg No|Registration No)[\s:]*([A-Z0-9-]+)/i);
        const detectedRegNo = regNoMatch ? regNoMatch[1].trim() : "UNKNOWN";

        // 3. PROGRAMMATIC RUBRIC PARSER (Fix 6/0 bug permanently)
        // Never rely on LLM to guess max scores. Extract it strictly via Regex.
        // Assuming rubric lines look like "Q1: Explain photosynthesis (5 marks) \n criteria..."
        // or a similar structured string.
        console.log("[WORKER] Programmatically extracting max scores from rubric...");
        const masterRubricArray: any[] = [];
        const rubricLines = finalRubricText.split('\n');
        let currentQ = "Global";
        let currentMax = 100;
        let currentSegment = "";

        const qRegex = /^(?:Q(?:uestion)?\s*|)(\d+[a-zA-Z]*(?:\.[a-z]+|\([a-z]+\))?)/i;
        const markRegex = /\(\s*(\d+)\s*marks?\s*\)/i; // Matches "( 5 marks )"

        for (const line of rubricLines) {
            const qMatch = line.match(qRegex);
            const markMatch = line.match(markRegex);

            if (qMatch && line.length < 100) {
                // Save previous
                if (currentSegment) {
                    masterRubricArray.push({ question: currentQ, rubric_segment: currentSegment.trim(), max_score: currentMax });
                }
                currentQ = qMatch[1].toUpperCase();
                currentMax = markMatch ? parseInt(markMatch[1]) : 0;
                currentSegment = line;
            } else {
                currentSegment += "\n" + line;
                if (markMatch && currentMax === 0) {
                    currentMax = parseInt(markMatch[1]);
                }
            }
        }
        if (currentSegment) {
            masterRubricArray.push({ question: currentQ, rubric_segment: currentSegment.trim(), max_score: currentMax });
        }

        // Fuzzy matcher helper
        const normalizeId = (id: string) => (id || "").replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

        // 4. ATOMIC PARALLEL SNIPER ARCHITECTURE (Most Stable State Reversion)
        console.log(`[WORKER] Initiating Atomic Parallel Sniper Architecture for ${masterRubricArray.length} Questions...`);
        const pLimit = (await import('p-limit')).default;
        const limit = pLimit(10);

        const atomicGradingPromises = masterRubricArray.map(rubricItem =>
            limit(async () => {
                return await withRetries(async () => {
                    const systemPrompt = `=== FULL EXAM TEXT (CACHE PREFIX) ===\n${fullExamText}\n=====================================\n
You are an Elite Enterprise Grading AI. Above is the FULL unstructured OCR text of a student's exam.

YOUR ONLY MISSION:
Find, extract, and grade the student's answer for this ONE specific question ONLY: ${rubricItem.question}

RULES:
1. Do an exhaustive semantic search across the entire document for this specific concept.
2. If the answer spans multiple pages, aggregate it internally before grading.
3. Do NOT grade any other questions.
4. Grade strictly based on the provided rubric using the Tiered Semantic logic.

THE 'WORLD-CLASS WISE GRADER' DIRECTIVES:
MANDATE 1: THE SEMANTIC EQUIVALENCE PROTOCOL. Grade based on the core meaning, not exact wording. If the student uses valid synonyms or phrases that mean the same thing as the rubric, ACCEPT IT as correct.
MANDATE 2: THE PARTIAL CREDIT RULE. If a question is worth multiple marks, and the student only correctly MENTIONS the points without fully explaining them, award PARTIAL MARKS proportionally.
MANDATE 3: NO PARTICIPATION TROPHIES (STRICT TIER 3). You are a world-class university examiner. If the student's answer is fundamentally incorrect, completely misses the core academic concept, or is a blind guess, you MUST award 0 MARKS. Do NOT award partial credit just because the student used related vocabulary (e.g. mentioning 'fertilizer' when asked about 'management'). Relevance does not equal correctness.

MANDATE 4: STRUCTURED JSON WITH ANALYTICAL FEEDBACK. You MUST output ONLY JSON.
{
  "evaluations": [
    {
      "question_id": "${rubricItem.question}",
      "score": number,
      "match_status": "Exact Match | Semantic Match | Partial Match | Missing | Out of Scope",
      "feedback": "string"
    }
  ]
}
CRITICAL RULE FOR 'f' (Feedback): Block generic phrases like 'The answer is correct' or 'Incorrect calculation'. Write exactly 1 to 2 short, concise, and highly educational insights per question explaining EXACTLY WHY the student got that score based on the rubric.`;

                    const response = await deepSeekClient.chat.completions.create({
                        model: "deepseek-chat",
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: `RUBRIC SEGMENT FOR ${rubricItem.question} (MAX SCORE: ${rubricItem.max_score}):\n${rubricItem.rubric_segment}` }
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
                        max: Number(rubricItem.max_score) || 0, // Solves the 0/0 bug natively
                        feedback: result.feedback || "No feedback provided.",
                        evidenceSnippet: "", // Redundant string removed per CTO request
                        isRelevant: true
                    };
                }, 3, 2000).catch((error: any) => {
                    console.error(`[PLAYBOOK-TRACE] [FATAL-LLM] Atomic Grading Failed for ${rubricItem.question}: ${error.message}`);
                    return {
                        question: rubricItem.question,
                        score: 0,
                        max: Number(rubricItem.max_score) || 0,
                        feedback: "[Missing] The student did not provide an answer for this question, or it could not be processed.",
                        evidenceSnippet: "",
                        isRelevant: true // Force true so it renders on the UI as a 0 instead of vanishing
                    };
                });
            })
        );

        const nestedBreakdown = await Promise.all(atomicGradingPromises);

        // Fix Missing Q4 UI Bug: Iterate over masterRubricArray to absolutely guarantee no questions vanish from the UI.
        const formattedBreakdown = masterRubricArray.map(rubricItem => {
            const foundResult = nestedBreakdown.find(item => normalizeId(item.question) === normalizeId(rubricItem.question));
            if (foundResult) {
                return foundResult;
            } else {
                return {
                    question: rubricItem.question,
                    score: 0,
                    max: Number(rubricItem.max_score) || 0,
                    feedback: "[Missing] No answer was detected or processed for this specific question.",
                    evidenceSnippet: "",
                    isRelevant: true
                };
            }
        });

        // 4. ACTIONABLE INSIGHT GENERATOR (STRICT TEXT ONLY)
        console.log(`[WORKER] Initiating Actionable Insight Generator...`);
        let actionableInsight = "Grading complete.";
        try {
            const insightSystemPrompt = `You are a strict, professional university educator speaking directly to the student.
Review the student's evaluation array and provide a 1-3 sentence Actionable Insight summarizing their performance.
Focus on strengths and specific areas for improvement.

CRITICAL RULES:
1. Speak DIRECTLY to the student (e.g. "You demonstrated strong knowledge in...").
2. DO NOT output JSON. Output ONLY plain text sentences.
3. DO NOT break the fourth wall. NEVER describe your grading process (e.g. "I graded holistically...", "Based on the array provided...").
4. Keep it premium, concise, and educational.`;

            const insightResponse = await deepSeekClient.chat.completions.create({
                model: "deepseek-chat", // Fast model for summarization
                messages: [
                    { role: "system", content: insightSystemPrompt },
                    { role: "user", content: `STUDENT EVALUATION DATA:\n${JSON.stringify(formattedBreakdown)}` }
                ],
                temperature: 0.1,
                max_tokens: 150
            });
            // Clean up any rogue formatting or markdown
            actionableInsight = insightResponse.choices[0]?.message?.content?.replace(/```json/g, '').replace(/```/g, '').trim() || actionableInsight;
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