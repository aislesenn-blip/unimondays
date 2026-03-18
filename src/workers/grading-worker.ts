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
    // Keeping for backwards compatibility if needed temporarily,
    // but the main execution path will be handleAiGradeWorkflow below.
    throw new Error("Use handleAiGradeWorkflow for QStash Workflow execution.");
}

export async function handleAiGradeWorkflow(context: any, submissionId: string) {
    const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

    console.log(`[WORKFLOW] Booting Upstash Workflow for Submission ${submissionId}`);

    // Fetch initial submission data
    const submission = await context.run("fetch-submission", async () => {
        const sub = await prisma.submission.findUnique({
            where: { id: submissionId },
            include: { workSession: true }
        });
        if (!sub) throw new Error("Submission not found");
        return sub;
    });

    let finalRubricText = submission.workSession.rubric;

    // 1. CACHE RUBRIC
    if ((!finalRubricText || finalRubricText.trim() === '') && submission.workSession.markingScheme) {
        finalRubricText = await context.run("extract-rubric", async () => {
            console.log("[WORKER] Extracting Rubric from PDF...");
            let text = "";
            const urlOrText = submission.workSession.markingScheme;
            if (urlOrText.includes('/') || urlOrText.toLowerCase().endsWith('.pdf') || urlOrText.toLowerCase().endsWith('.png')) {
                const buffer = await withRetries(() => readFile(urlOrText, 'exam_pdfs'));
                if (urlOrText.toLowerCase().endsWith('.pdf')) {
                    const pages = await withRetries(() => extractPagesMultimodal(buffer));
                    text = pages.map(p => p.text).join('\n\n');
                } else {
                    const mimeType = urlOrText.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';
                    text = await withRetries(() => ocrDocument(buffer, mimeType));
                }
            } else {
                text = urlOrText;
            }
            await prisma.workSession.update({
                where: { id: submission.workSession.id },
                data: { rubric: text }
            });
            return text;
        });
    }

    if (!finalRubricText || finalRubricText.trim() === '') throw new Error("Fatal: Rubric text is entirely missing.");

    // 2. MAP PHASE: NATIVE LINEAR OCR (Batched by workflow step)
    let totalPages = 0;
    if (submission.filePath) {
        totalPages = await context.run("fetch-page-count", async () => {
             const cleanPath = submission.filePath.startsWith('/') ? submission.filePath.slice(1) : submission.filePath;
             const { data: fileData, error: downloadError } = await supabase.storage.from('exam_pdfs').download(cleanPath);
             if (downloadError || !fileData) throw new Error(`Supabase Download Failed: ${downloadError?.message}`);

             // We just need the page count here, unfortunately we have to download the buffer to get it reliably if we don't store it
             // A better approach would be to store totalPages during upload, but we'll fetch it.
             const arrayBuffer = await fileData.arrayBuffer();
             const pdfBuffer = Buffer.from(arrayBuffer);

             // Check if chunks exist first
             const chunksExist = await prisma.extractedChunk.count({ where: { submissionId } });
             if (chunksExist > 0) return 0; // Skip OCR steps

             return await getPdfPageCount(submission.filePath);
        });
    }

    const CHUNK_SIZE = 2;
    let currentChunkIndex = 0;

    for (let i = 1; i <= totalPages; i += CHUNK_SIZE) {
        const pageBatch: number[] = [];
        for (let j = 0; j < CHUNK_SIZE && (i + j) <= totalPages; j++) {
            pageBatch.push(i + j);
        }

        // Each OCR batch is a separate workflow step, avoiding 300s timeouts
        await context.run(`ocr-chunk-${currentChunkIndex}`, async () => {
             console.log(`[WORKFLOW] Processing OCR Chunk ${currentChunkIndex} for pages ${pageBatch.join(', ')}`);

             const cleanPath = submission.filePath.startsWith('/') ? submission.filePath.slice(1) : submission.filePath;
             const { data: fileData } = await supabase.storage.from('exam_pdfs').download(cleanPath);
             if (!fileData) throw new Error("Failed to download PDF for OCR chunk");

             const arrayBuffer = await fileData.arrayBuffer();
             const pdfBuffer = Buffer.from(arrayBuffer);
             const pageImages = await extractMultiplePageImagesFromBuffer(pdfBuffer, pageBatch);

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

             await prisma.extractedChunk.upsert({
                 where: { submissionId_chunkIndex: { submissionId, chunkIndex: currentChunkIndex } },
                 update: { pages: pageBatch, text: extractedText, confidence: confidenceScore },
                 create: { submissionId, chunkIndex: currentChunkIndex, pages: pageBatch, text: extractedText, confidence: confidenceScore }
             });
        });
        currentChunkIndex++;
    }

    const { fullExamText, detectedRegNo, validChunks, totalConfidence, pageTextMapJSON } = await context.run("aggregate-ocr", async () => {
        const chunks = await prisma.extractedChunk.findMany({
            where: { submissionId },
            orderBy: { chunkIndex: 'asc' }
        });

        let fullExamTextStr = "";
        let totalConfidenceVal = 0;
        let validChunksCount = 0;
        const idCandidates: string[] = [];
        const ptMap: Record<number, string> = {};

        for (const chunk of chunks) {
            const text = chunk.text || "";
            fullExamTextStr += `\n\n--- PAGES ${chunk.pages.join(', ')} ---\n\n${text}`;

            if (chunk.confidence !== null) {
                totalConfidenceVal += chunk.confidence;
                validChunksCount++;
            }

            for (const p of chunk.pages) {
                ptMap[p] = (ptMap[p] || '') + '\n' + text;
            }

            const match = text.match(/(?:REGISTRATION NUMBER|Reg No|Registration No)[\s:]*([A-Z0-9-]+)/i);
            if (match) idCandidates.push(match[1].trim().toUpperCase());
        }

        const idCounts = idCandidates.reduce((acc: any, id) => { acc[id] = (acc[id] || 0) + 1; return acc; }, {});
        const detRegNo = Object.entries(idCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'UNKNOWN';

        return {
            fullExamText: fullExamTextStr,
            detectedRegNo: detRegNo,
            validChunks: validChunksCount,
            totalConfidence: totalConfidenceVal,
            pageTextMapJSON: JSON.stringify(ptMap)
        };
    });

    // Check OCR Quality
    const isQualityValid = await context.run("check-ocr-quality", async () => {
        if (!fullExamText.trim() || fullExamText.length < 100) {
            await prisma.submission.update({
                where: { id: submission.id },
                data: { status: 'REVIEW_NEEDED', feedback: 'OCR extracted insufficient text. Please review manually.' }
            });
            return false;
        }

        const avgConfidence = validChunks > 0 ? totalConfidence / validChunks : 1.0;
        if (avgConfidence < 0.6) {
            await prisma.submission.update({
                where: { id: submission.id },
                data: { status: 'REVIEW_NEEDED', feedback: 'Handwriting unclear, please review manually.' }
            });
            return false;
        }
        return true;
    });

    if (!isQualityValid) return; // End workflow

    // Transition Status to GRADING so UI progresses
    await context.run("update-status-grading", async () => {
        await prisma.submission.update({
            where: { id: submission.id },
            data: { status: 'GRADING' }
        });
        console.log(`[WORKFLOW] Status updated to GRADING for Submission ${submission.id}`);
    });

    // 3. PROGRAMMATIC RUBRIC PARSER
    const masterRubricArray = await context.run("parse-rubric", async () => {
        console.log("[WORKER] Programmatically parsing rubric...");
        const arr = parseRubric(finalRubricText);
        if (arr.length === 0) throw new Error("Failed to parse any questions from the rubric.");
        return arr;
    });

    const isSimulationMode = process.env.DEEPSEEK_API_KEY === 'dummy' || !process.env.DEEPSEEK_API_KEY;

    // 4. ATOMIC GRADING
    // We break the loop into individual steps to absolutely guarantee we never hit
    // the Vercel 300s timeout. Each iteration of masterRubricArray gets its own context.run().

    const formattedBreakdown: any[] = [];
    const failedQuestions: any[] = [];

    for (let i = 0; i < masterRubricArray.length; i++) {
        const rubricItem = masterRubricArray[i];

        // This effectively turns a giant array of promises into sequential step executions per question
        const qResult = await context.run(`grade-q-${rubricItem.questionId}`, async () => {
             console.log(`[WORKFLOW] Executing isolated grading step for Question: ${rubricItem.questionId}`);
             if (isSimulationMode) {
                  return {
                      status: 'fulfilled',
                      value: {
                         question: rubricItem.questionId,
                         score: Math.floor(Math.random() * (rubricItem.maxScore + 1)),
                         max: rubricItem.maxScore,
                         feedback: "Simulation feedback: AI module inactive but grading pipeline executed successfully.",
                         evidenceSnippet: "Simulated extracted evidence."
                      }
                  };
             }

             try {
                 const normalizeId = (id: string) => (id || "").replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                 const pageTextMap = JSON.parse(pageTextMapJSON);
                 const qTarget = normalizeId(rubricItem.questionId);
                 const relevant: number[] = [];
                 for (const [pageNum, text] of Object.entries(pageTextMap)) {
                     if (normalizeId(text as string).includes(qTarget)) {
                         relevant.push(Number(pageNum));
                     }
                 }
                 let narrowContext = fullExamText;
                 if (relevant.length > 0) {
                     narrowContext = relevant.map(p => `--- PAGE ${p} ---\n${pageTextMap[p]}`).join('\n\n');
                 }

                 await apiBucket.consume(); // Assuming this is fast enough for workflow steps

                 const response = await deepSeekClient.chat.completions.create({
                     model: "deepseek-chat",
                     messages: [
                         { role: "system", content: `You are a highly experienced University Professor grading to NECTA-level international standards. Evaluate ONE question against ONE rubric segment. Address the student directly as "You".

CRITICAL MANDATES:
1. SEMANTIC EQUIVALENCE (Tier 1): DO NOT PENALIZE FOR SIMPLE VOCABULARY. If a student explains a concept correctly using simple English, award full marks. You are grading the SCIENTIFIC MEANING, not just keywords.
2. RUTHLESS PENALTIES (Tier 3): If fundamentally incorrect concepts are present, score MUST BE 0. No effort marks. Be ruthless.
3. MISSING / SKIPPED (Tier 4): If the provided student context does not contain an answer to this specific question, score is 0.
4. MICRO-TUTORING FEEDBACK: You are strictly forbidden from using generic, lazy phrases like 'Ensure to include examples', 'Study more', or 'Expand on this'. Your feedback MUST be a 'Micro-Lesson'. You MUST directly provide the specific missing scientific fact or example from the rubric.
5. Start your feedback with a tag: [Exact Match], [Partial Match], [Out of Scope], or [Missing].
6. Use the Sandwich Method for partial marks: start with what was correct, then state exactly what was missing (using Micro-Tutoring).
7. DO NOT penalize for missing sketches/diagrams (OCR cannot read them).

JSON FORMAT: { "extracted_evidence": "exact quote from student", "score": number, "constructive_feedback": "tag + micro-tutoring lesson (max 3 sentences)" }` },
                         { role: "user", content: `QUESTION: ${rubricItem.questionId}\nMAX SCORE: ${rubricItem.maxScore}\n\nRUBRIC SEGMENT:\n${rubricItem.rubricSegment}\n\nSTUDENT ANSWER (NARROWED CONTEXT):\n${narrowContext}` }
                     ],
                     response_format: { type: "json_object" },
                     temperature: 0.1,
                     max_tokens: 8192
                 }, { timeout: 90000 });

                 const raw = response.choices[0]?.message?.content || '{}';
                 const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
                 const result = JSON.parse(clean);

                 return {
                     status: 'fulfilled',
                     value: {
                         question: rubricItem.questionId,
                         score: Number(result.score) || 0,
                         max: Number(rubricItem.maxScore) || 0,
                         constructive_feedback: result.constructive_feedback || result.feedback || "No feedback provided.",
                         evidenceSnippet: result.extracted_evidence || "None found"
                     }
                 };
             } catch (e: any) {
                 const isNetworkError = e.code === 'ECONNRESET' || e.status === 429 || e.status >= 500;
                 return {
                     status: 'rejected',
                     reason: e.message,
                     value: {
                         question: rubricItem.questionId,
                         score: null,
                         max: Number(rubricItem.maxScore) || 0,
                         feedback: isNetworkError ? '[SYSTEM_ERROR] Grading temporarily unavailable.' : '[UNKNOWN_ERROR]',
                         evidenceSnippet: 'ERROR',
                         error: e.message
                     }
                 };
             }
        });

        // We do not push to a local array here because local memory doesn't persist across workflow steps.
        // Wait, context.run returns the value to the orchestrator memory!
        // qResult is correctly persisted by the workflow engine!

        if (qResult.status === 'fulfilled' && qResult.value.score !== null) {
             formattedBreakdown.push(qResult.value);
        } else {
             failedQuestions.push({
                 question: rubricItem.questionId,
                 reason: qResult.reason || qResult.value?.error || 'Unknown'
             });
             formattedBreakdown.push({
                 question: rubricItem.questionId,
                 score: 0,
                 max: rubricItem.maxScore,
                 feedback: "[Missing/Error] " + (qResult.status === 'rejected' ? 'System error during processing.' : qResult.value?.feedback),
                 evidenceSnippet: ""
             });
        }
    }

    // 5. SAVE TO DB (IDEMPOTENT)
    await context.run("finalize-grading", async () => {
        if (failedQuestions.length > 0) {
             console.warn(`[WORKFLOW] ${failedQuestions.length} questions failed grading.`);
             await prisma.systemLog.create({
                 data: {
                     level: 'WARN',
                     message: 'Partial Grading Failure',
                     metadata: JSON.stringify({ submissionId: submission.id, failedQuestions })
                 }
             });
        }

        const calculatedTotalScore = formattedBreakdown.reduce((sum: number, item: any) => sum + item.score, 0);

        await prisma.score.upsert({
            where: { submissionId: submission.id },
            update: {
                totalMarks: calculatedTotalScore,
                remarks: "Graded via Upstash Workflow.",
                breakdown: JSON.stringify(formattedBreakdown),
                detectedIdentity: detectedRegNo
            },
            create: {
                submissionId: submission.id,
                totalMarks: calculatedTotalScore,
                remarks: "Graded via Upstash Workflow.",
                breakdown: JSON.stringify(formattedBreakdown),
                detectedIdentity: detectedRegNo
            }
        });

        await prisma.submission.update({
            where: { id: submission.id },
            data: { status: 'GRADED', studentRegNo: detectedRegNo !== "UNKNOWN" ? detectedRegNo : submission.studentRegNo }
        });

        console.log(`[WORKFLOW] Mission Accomplished for Submission ${submission.id}. Score: ${calculatedTotalScore}`);
    });
}