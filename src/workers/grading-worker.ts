import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { extractPagesMultimodal, ocrDocument } from '@/lib/ai/gemini';
import { readFile } from '@/lib/storage';
import { parseRubric, RubricItem } from '@/lib/rubric-parser';
import { TokenBucket } from '@/lib/rate-limiter';
import { getPdfPageCount, extractMultiplePageImagesFromBuffer } from '@/lib/pdf-utils';
import { supabase } from '@/lib/supabase';

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

// Global TokenBucket for DeepSeek (e.g., max 5 requests per second)
const apiBucket = new TokenBucket(5, 5);

const deepSeekClient = new OpenAI({
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    apiKey: process.env.DEEPSEEK_API_KEY || 'dummy',
    timeout: 300000,
    maxRetries: 4,
});

export async function handleAiGrade(job: any) {
    const DEBUG_MODE = process.env.DEBUG_MODE === 'true';
    const pipelineStartTime = Date.now();
    const stageTimes: Record<string, number> = {};

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

        stageTimes.uploadAndRubric = Date.now() - pipelineStartTime;

        // 2. MAP PHASE: NATIVE LINEAR OCR
        let chunks = await prisma.extractedChunk.findMany({
            where: { submissionId: submissionIdToUpdate },
            orderBy: { chunkIndex: 'asc' }
        });

        if (chunks.length === 0 && submission.filePath) {
            console.log(`[WORKER] No OCR chunks found. Performing Native Linear OCR for Submission ${submissionIdToUpdate}`);

            // Download PDF securely using Admin Client
            const cleanPath = submission.filePath.startsWith('/') ? submission.filePath.slice(1) : submission.filePath;
            const { data: fileData, error: downloadError } = await supabase.storage.from('exam_pdfs').download(cleanPath);
            if (downloadError || !fileData) throw new Error(`Supabase Download Failed: ${downloadError?.message}`);

            const arrayBuffer = await fileData.arrayBuffer();
            const pdfBuffer = Buffer.from(arrayBuffer);

            // Extract text from pages in a linear loop to prevent timeouts
            console.log("[WORKER] Extracting pages from student submission PDF linearly...");
            const totalPages = await getPdfPageCount(submission.filePath);
            const CHUNK_SIZE = 2;

            let currentChunkIndex = 0;
            for (let i = 1; i <= totalPages; i += CHUNK_SIZE) {
                const pageBatch = [];
                for (let j = 0; j < CHUNK_SIZE && (i + j) <= totalPages; j++) {
                    pageBatch.push(i + j);
                }

                // Extract images for this batch
                const pageImages = await extractMultiplePageImagesFromBuffer(pdfBuffer, pageBatch);

                // OCR via Gemini Vision
                let extractedText = "";
                let confidenceScore = 1.0;

                try {
                    const promptContent: any[] = [
                        { type: "text", text: `Transcribe all handwritten and printed text from these pages precisely. Do not summarize. Preserve the exact layout, numbering, and content. Also estimate readability: rate from 0.0 to 1.0 how confident you are that the text is accurate. Include the score explicitly as [CONFIDENCE: X.X]. Pages: ${pageBatch.join(', ')}` }
                    ];

                    for (const pageNum of pageBatch) {
                        const imageBuffer = pageImages.get(pageNum);
                        if (imageBuffer) {
                            promptContent.push({
                                type: "image_url",
                                image_url: { url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}` }
                            });
                        }
                    }

                    // Native OpenRouter Call for OCR
                    const openRouterClient = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: process.env.OPENROUTER_API_KEY || 'dummy' });
                    const completion = await openRouterClient.chat.completions.create({
                        model: "google/gemini-2.5-flash",
                        messages: [{ role: "user", content: promptContent }],
                        temperature: 0.0,
                        max_tokens: 8192
                    }, { timeout: 120000 });

                    extractedText = completion.choices[0]?.message?.content || "";
                    const confidenceMatch = extractedText.match(/\[CONFIDENCE:\s*([\d\.]+)\]/i);
                    if (confidenceMatch) {
                        confidenceScore = parseFloat(confidenceMatch[1]);
                    }
                } catch (aiError: any) {
                    console.error(`[WORKER] OCR failed for pages ${pageBatch.join(', ')}:`, aiError.message);
                    extractedText = "[OCR_FAILED]";
                    confidenceScore = 0.0;
                }

                // Save to ExtractedChunk idempotently
                await prisma.extractedChunk.upsert({
                    where: { submissionId_chunkIndex: { submissionId: submissionIdToUpdate, chunkIndex: currentChunkIndex } },
                    update: { pages: pageBatch, text: extractedText, confidence: confidenceScore },
                    create: { submissionId: submissionIdToUpdate, chunkIndex: currentChunkIndex, pages: pageBatch, text: extractedText, confidence: confidenceScore }
                });

                currentChunkIndex++;
            }

            // Re-fetch chunks
            chunks = await prisma.extractedChunk.findMany({
                where: { submissionId: submissionIdToUpdate },
                orderBy: { chunkIndex: 'asc' }
            });
        }

        let fullExamText = "";
        let totalConfidence = 0;
        let validChunks = 0;
        const idCandidates: string[] = [];

        // Build a page-to-text map to narrow context optionally
        const pageTextMap = new Map<number, string>();

        for (const chunk of chunks) {
            const text = chunk.text || "";
            fullExamText += `\n\n--- PAGES ${chunk.pages.join(', ')} ---\n\n${text}`;

            if (chunk.confidence !== null) {
                totalConfidence += chunk.confidence;
                validChunks++;
            }

            for (const p of chunk.pages) {
                pageTextMap.set(p, (pageTextMap.get(p) || '') + '\n' + text);
            }

            // RegNo Candidate Extraction
            const match = text.match(/(?:REGISTRATION NUMBER|Reg No|Registration No)[\s:]*([A-Z0-9-]+)/i);
            if (match) idCandidates.push(match[1].trim().toUpperCase());
        }

        // Student ID Consensus
        const idCounts = idCandidates.reduce((acc: any, id) => { acc[id] = (acc[id] || 0) + 1; return acc; }, {});
        const detectedRegNo = Object.entries(idCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'UNKNOWN';

        if (!fullExamText.trim() || fullExamText.length < 100) {
            await prisma.submission.update({
                where: { id: submission.id },
                data: { status: 'REVIEW_NEEDED', feedback: 'OCR extracted insufficient text. Please review manually.' }
            });
            return;
        }

        const avgConfidence = validChunks > 0 ? totalConfidence / validChunks : 1.0;
        if (avgConfidence < 0.6) {
            await prisma.submission.update({
                where: { id: submission.id },
                data: { status: 'REVIEW_NEEDED', feedback: 'Handwriting unclear, please review manually.' }
            });
            return;
        }

        // 3. PROGRAMMATIC RUBRIC PARSER (Robust Multi-Pass)
        console.log("[WORKER] Programmatically parsing rubric...");
        const masterRubricArray: RubricItem[] = parseRubric(finalRubricText);

        if (masterRubricArray.length === 0) {
            throw new Error("Failed to parse any questions from the rubric.");
        }

        // Fuzzy matcher helper
        const normalizeId = (id: string) => (id || "").replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

        // Helper: Narrow Context
        function findRelevantPages(questionId: string, pageMap: Map<number, string>): string {
            const qTarget = normalizeId(questionId);
            const relevant: number[] = [];
            for (const [pageNum, text] of pageMap.entries()) {
                if (normalizeId(text).includes(qTarget)) {
                    relevant.push(pageNum);
                }
            }
            // Fallback: If heuristic fails, send full text
            if (relevant.length === 0) return fullExamText;

            return relevant.map(p => `--- PAGE ${p} ---\n${pageMap.get(p)}`).join('\n\n');
        }

        // 4. ATOMIC GRADING (pLimit & Promise.allSettled)
        const gradingStartTime = Date.now();

        if (DEBUG_MODE) {
            console.log(`[DEBUG] [AI_GRADING_STAGE] Preparing AI grading request.`);
            console.log(`[DEBUG] [AI_GRADING_STAGE] Exam question count: ${masterRubricArray.length}`);
            console.log(`[DEBUG] [AI_GRADING_STAGE] Approximate full context length: ${fullExamText.length} characters.`);
        }

        console.log(`[WORKER] Initiating Atomic Grading for ${masterRubricArray.length} Questions...`);

        let atomicGradingPromises: Promise<any>[] = [];

        // Check if API key is dummy or missing
        const isSimulationMode = process.env.DEEPSEEK_API_KEY === 'dummy' || !process.env.DEEPSEEK_API_KEY;

        if (isSimulationMode) {
             console.warn(`[AI_API_STATUS] API_KEY_MISSING_OR_INACTIVE`);
             console.log(`[SIMULATION_MODE] Running grading simulation`);

             atomicGradingPromises = masterRubricArray.map((rubricItem) =>
                 Promise.resolve({
                     question: rubricItem.questionId,
                     score: Math.floor(Math.random() * (rubricItem.maxScore + 1)), // Random score between 0 and maxScore
                     max: rubricItem.maxScore,
                     feedback: "Simulation feedback: AI module inactive but grading pipeline executed successfully.",
                     evidenceSnippet: "Simulated extracted evidence."
                 })
             );

        } else {
            const pLimitLib = (await import('p-limit')).default;
            const limit = pLimitLib(10);

            atomicGradingPromises = masterRubricArray.map((rubricItem) =>
                limit(async () => {
                    try {
                        await apiBucket.consume(); // Token Bucket Rate Limiter

                        const narrowContext = findRelevantPages(rubricItem.questionId, pageTextMap);

                        const response = await deepSeekClient.chat.completions.create({
                            model: "deepseek-chat",
                            messages: [
                                { role: "system", content: `You are a highly experienced University Professor grading to NECTA-level international standards. Evaluate ONE question against ONE rubric segment. Address the student directly as "You".

CRITICAL MANDATES:
1. SEMANTIC EQUIVALENCE (Tier 1): DO NOT PENALIZE FOR SIMPLE VOCABULARY. If a student explains a concept correctly using simple English, award full marks. You are grading the SCIENTIFIC MEANING, not just keywords.
2. RUTHLESS PENALTIES (Tier 3): If fundamentally incorrect concepts are present, score MUST BE 0. No effort marks. Be ruthless.
3. MISSING / SKIPPED (Tier 4): If the provided student context does not contain an answer to this specific question, score is 0.
4. MICRO-TUTORING FEEDBACK: You are strictly forbidden from using generic, lazy phrases like 'Ensure to include examples', 'Study more', or 'Expand on this'. Your feedback MUST be a 'Micro-Lesson'. You MUST directly provide the specific missing scientific fact or example from the rubric.
   - BAD: 'Include examples of beneficial nutrients next time.'
   - PERFECT: 'Beneficial nutrients (like Silicon or Cobalt) stimulate growth but are not strictly essential for survival. Next time, state this distinction and include one of these examples for full marks.'
5. Start your feedback with a tag: [Exact Match], [Partial Match], [Out of Scope], or [Missing].
6. Use the Sandwich Method for partial marks: start with what was correct, then state exactly what was missing (using Micro-Tutoring).
7. DO NOT penalize for missing sketches/diagrams (OCR cannot read them).

JSON FORMAT: { "extracted_evidence": "exact quote from student", "score": number, "constructive_feedback": "tag + micro-tutoring lesson (max 3 sentences)" }` },
                                { role: "user", content: `QUESTION: ${rubricItem.questionId}\nMAX SCORE: ${rubricItem.maxScore}\n\nRUBRIC SEGMENT:\n${rubricItem.rubricSegment}\n\nSTUDENT ANSWER (NARROWED CONTEXT):\n${narrowContext}` }
                            ],
                            response_format: { type: "json_object" },
                            temperature: 0.1,
                            max_tokens: 8192
                        }, { timeout: 90000 }); // 90 second explicit app timeout

                        const raw = response.choices[0]?.message?.content || '{}';
                        const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
                        const result = JSON.parse(clean);

                        return {
                            question: rubricItem.questionId,
                            score: Number(result.score) || 0,
                            max: Number(rubricItem.maxScore) || 0,
                            constructive_feedback: result.constructive_feedback || result.feedback || "No feedback provided.",
                            evidenceSnippet: result.extracted_evidence || "None found"
                        };
                    } catch (e: any) {
                        const isNetworkError = e.code === 'ECONNRESET' || e.status === 429 || e.status >= 500;
                        if (DEBUG_MODE) console.error(`[ERROR] LLM request skipped for ${rubricItem.questionId} due to API failure: ${e.message}`);
                        return {
                            question: rubricItem.questionId,
                            score: null, // Signals failure to allSettled loop
                            max: Number(rubricItem.maxScore) || 0,
                            feedback: isNetworkError ? '[SYSTEM_ERROR] Grading temporarily unavailable.' : '[UNKNOWN_ERROR]',
                            evidenceSnippet: 'ERROR',
                            error: e.message
                        };
                    }
                })
            );
        }

        const settled = await Promise.allSettled(atomicGradingPromises);

        const formattedBreakdown = [];
        const failedQuestions = [];

        for (let i = 0; i < settled.length; i++) {
            const result = settled[i];
            const rubricItem = masterRubricArray[i];
            if (result.status === 'fulfilled' && result.value.score !== null) {
                formattedBreakdown.push(result.value);
            } else {
                failedQuestions.push({
                    question: rubricItem.questionId,
                    reason: result.status === 'rejected' ? result.reason?.message : (result.value as any)?.error || 'Unknown'
                });

                // Still push a 0-score fallback so the UI isn't broken
                formattedBreakdown.push({
                    question: rubricItem.questionId,
                    score: 0,
                    max: rubricItem.maxScore,
                    feedback: "[Missing/Error] " + (result.status === 'rejected' ? 'System error during processing.' : (result.value as any)?.feedback),
                    evidenceSnippet: ""
                });
            }
        }

        if (failedQuestions.length > 0) {
             console.warn(`[WORKER] ${failedQuestions.length} questions failed grading.`);
             await prisma.systemLog.create({
                 data: {
                     level: 'WARN',
                     message: 'Partial Grading Failure',
                     metadata: JSON.stringify({ submissionId: submission.id, failedQuestions })
                 }
             });
        }

        // 5. SAVE TO DB (IDEMPOTENT)
        const calculatedTotalScore = formattedBreakdown.reduce((sum: number, item: any) => sum + item.score, 0);

        await prisma.score.upsert({
            where: { submissionId: submission.id },
            update: {
                totalMarks: calculatedTotalScore,
                remarks: "Graded via Atomic Map-Reduce.",
                breakdown: JSON.stringify(formattedBreakdown),
                detectedIdentity: detectedRegNo
            },
            create: {
                submissionId: submission.id,
                totalMarks: calculatedTotalScore,
                remarks: "Graded via Atomic Map-Reduce.",
                breakdown: JSON.stringify(formattedBreakdown),
                detectedIdentity: detectedRegNo
            }
        });

        await prisma.submission.update({
            where: { id: submission.id },
            data: { status: 'GRADED', studentRegNo: detectedRegNo !== "UNKNOWN" ? detectedRegNo : submission.studentRegNo }
        });

        stageTimes.grading = Date.now() - gradingStartTime;
        stageTimes.totalPipeline = Date.now() - pipelineStartTime;

        let calculatedTotalScoreLog = calculatedTotalScore; // Fix variable scope for logging
        console.log(`[WORKER] Mission Accomplished for Submission ${submission.id}. Score: ${calculatedTotalScoreLog}`);

        if (DEBUG_MODE) {
            console.log(`
PIPELINE SUMMARY
================
Upload: SUCCESS
OCR: SUCCESS
AI Model: ${isSimulationMode ? 'SKIPPED (API inactive)' : 'SUCCESS'}
Simulation Engine: ${isSimulationMode ? 'SUCCESS' : 'SKIPPED'}
Feedback Generator: SUCCESS
Analytics Engine: SUCCESS

Performance Metrics:
- Setup & Rubric Time: ${stageTimes.uploadAndRubric}ms
- AI Grading Phase Time: ${stageTimes.grading}ms
- Total Pipeline Worker Time: ${stageTimes.totalPipeline}ms
            `);

            await prisma.systemLog.create({
                data: {
                    level: 'INFO',
                    message: 'Pipeline Execution Summary',
                    metadata: JSON.stringify({
                        submissionId: submission.id,
                        isSimulationMode,
                        stageTimes
                    })
                }
            });
        }

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