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

        // 2. CONSTRUCT HOLISTIC FULL EXAM TEXT (Universal Grader)
        console.log("[WORKER] Reconstructing complete OCR exam payload...");
        let fullExamText = "";

        const sortedData = (submission.extractedData as any[]).sort((a, b) => a.pages[0] - b.pages[0]);
        for (const chunk of sortedData) {
            let chunkText = chunk.text || "";
            // Safely parse old JSON chunks if they somehow made it in
            try {
                const parsed = JSON.parse(chunk.text);
                // Extract only string values from the parsed JSON object to avoid stringifying nested objects
                const stringValues = Object.values(parsed).filter(val => typeof val === 'string');
                if (stringValues.length > 0) {
                     chunkText = stringValues.join("\n");
                }
            } catch (e) {
                // It is already raw text from the new OCR pipeline, which is perfect.
            }

            // Explicitly join all pages in this chunk to prevent dropping data if the worker processed 2 pages
            const pagesLabel = Array.isArray(chunk.pages) ? chunk.pages.join(', ') : chunk.pages;
            fullExamText += `\n\n--- PAGES ${pagesLabel || 'Unknown'} ---\n\n${chunkText.trim()}`;
        }

        if (!fullExamText.trim()) fullExamText = "No readable text extracted.";

        // REG NO EXTRACTION (Zero-Cost Regex)
        const regNoMatch = fullExamText.match(/(?:REGISTRATION NUMBER|Reg No|Registration No)[\s:]*([A-Z0-9-]+)/i);
        const detectedRegNo = regNoMatch ? regNoMatch[1].trim() : "UNKNOWN";

        // 3. DYNAMIC RUBRIC STANDARDIZATION (The Universal Parser)
        // We use the LLM ONCE per WorkSession to intelligently parse the unstructured text
        // into a strict JSON array regardless of the exam format globally (Harvard, National, etc.).
        console.log("[WORKER] Dynamically parsing unstructured rubric into Universal JSON Array...");

        let masterRubricArray: any[] = [];
        try {
            // First check if the rubric is ALREADY a structured JSON array (from previous cache or Standardized Rubric flow)
            masterRubricArray = JSON.parse(finalRubricText);
            if (!Array.isArray(masterRubricArray)) throw new Error("Not a master array");
        } catch (e) {
            // If it's raw text, we must structure it intelligently
            console.log("[WORKER] Rubric is raw text. Extracting structure universally...");

            const rubricSystemPrompt = `You are a Universal Exam Parsing Engine. Your job is to read unstructured marking scheme text from ANY university or national exam globally and convert it into a strict, structured JSON array.

You must identify EVERY question, no matter how it is formatted (e.g., '1', '1a', '1(b)(ii)', 'Section A', 'Question 4').

CRITICAL RULES:
1. Extract the EXACT max score for each question. Look for things like '(5 marks)', '[10 points]', 'Total: 20'. If you absolutely cannot find a score, default to 0.
2. The 'rubric_segment' must contain the full text and criteria for that specific question so the grader knows exactly what to look for.
3. You MUST extract EVERY SINGLE question. DO NOT truncate.

OUTPUT FORMAT (STRICT JSON):
{
  "rubric": [
    {
      "question": "The exact question identifier (e.g. '1(a)')",
      "rubric_segment": "The full marking criteria text for this question",
      "max_score": number
    }
  ]
}`;

            const rubricResponse = await deepSeekClient.chat.completions.create({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: rubricSystemPrompt },
                    { role: "user", content: `UNSTRUCTURED RUBRIC TEXT:\n\n${finalRubricText}` }
                ],
                response_format: { type: "json_object" },
                temperature: 0.0,
                max_tokens: 8192
            });

            const raw = rubricResponse.choices[0]?.message?.content || '{"rubric":[]}';
            const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(clean);
            masterRubricArray = parsed.rubric || [];

            if (masterRubricArray.length > 0) {
                 // Cache the structured JSON array in the WorkSession so we NEVER have to parse it again for subsequent submissions!
                 // This fixes the N+1 latency bottleneck.
                 await prisma.workSession.update({
                     where: { id: submission.workSession.id },
                     data: { rubric: JSON.stringify(masterRubricArray) }
                 });
                 console.log(`[WORKER] Successfully structured and cached ${masterRubricArray.length} rubric items.`);
            }
        }

        if (!masterRubricArray || masterRubricArray.length === 0) {
            throw new Error("Fatal: Failed to dynamically parse the rubric into a structured array.");
        }

        // Fuzzy matcher helper
        const normalizeId = (id: string) => (id || "").replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

        // 4. ATOMIC PARALLEL SNIPER ARCHITECTURE (The Universal Grader)
        console.log(`[WORKER] Initiating Atomic Parallel Sniper Architecture for ${masterRubricArray.length} Questions...`);
        const pLimit = (await import('p-limit')).default;
        const limit = pLimit(10);

        const atomicGradingPromises = masterRubricArray.map(rubricItem =>
            limit(async () => {
                return await withRetries(async () => {
                    const systemPrompt = `=== FULL EXAM TEXT (CACHE PREFIX) ===\n${fullExamText}\n=====================================\n
You are an Elite Enterprise Grading AI. Above is the FULL unstructured OCR text of a student's exam.

YOUR ONLY MISSION:
You must search this entire text to find the student's answer for this ONE specific question: ${rubricItem.question}. They may have messy handwriting, poor formatting, or missing labels. Find it, extract it, and grade it against this rubric.

ANTI-LAZINESS MANDATE:
Do NOT prematurely return "Missing". The student's answer might be buried on page 10. You must chronologically read the ENTIRE document from start to finish. If you cannot find the exact number label, you MUST search for the semantic meaning of the rubric question and grade that text.

RULES:
1. Do an exhaustive semantic search across the entire document for this specific question and its concepts.
2. If the student forgot to label the question, but the semantic meaning clearly answers it, GRADE IT.
3. If the answer spans multiple pages, aggregate it internally before grading.
4. Do NOT grade any other questions. Focus strictly on ${rubricItem.question}.
5. Grade strictly based on the provided rubric using the Tiered Semantic logic.
6. DIAGRAM/SKETCH RULE: If the rubric requires a diagram/sketch, the text OCR might only capture the student's *description* or *labels* of the drawing. Grade fairly based on the descriptive text present. If there is absolutely no text describing the sketch, award 0 for that specific drawing component.

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
      "feedback": "string",
      "extracted_evidence": "string"
    }
  ]
}
CRITICAL RULE FOR FEEDBACK VERBOSITY: Your 'feedback' string MUST NOT exceed 3 sentences. Be incredibly concise and get straight to the point. If you write a long paragraph, you fail. Explain EXACTLY WHY the student got that score based on the rubric in 3 sentences maximum.`;

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
                        evidenceSnippet: result.extracted_evidence || "No specific evidence extracted.",
                        isRelevant: true
                    };
                }, 3, 2000).catch((error: any) => {
                    console.error(`[PLAYBOOK-TRACE] [FATAL-LLM] Atomic Grading Failed for ${rubricItem.question}: ${error.message}`);
                    return {
                        question: rubricItem.question,
                        score: 0,
                        max: Number(rubricItem.max_score) || 0,
                        feedback: "[Missing] The student did not provide an answer for this question, or it could not be processed.",
                        evidenceSnippet: "GRADING_FAILED_API_ERROR",
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
                    evidenceSnippet: "No explicit answer found within the document context.",
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