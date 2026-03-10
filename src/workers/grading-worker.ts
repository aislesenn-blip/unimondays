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

        // 3. THE ONE-SHOT HOLISTIC GRADING ENGINE
        console.log(`[WORKER] Initiating ONE-SHOT Holistic Grading Engine...`);
        const systemPrompt = `You are an expert academic grader with 100% accuracy.
MANDATE 1: NON-SEQUENTIAL HUNTING. Find the answers regardless of page order. The document is messy OCR; scan the ENTIRE text for meaning.
MANDATE 2: THE PHOTOSYNTHESIS PROTOCOL. Grade strictly based on the marking scheme. Do not assume or use external knowledge. If the scheme says 'non-essential' and the student says 'essential', award 0.
MANDATE 3: JSON DIET (CRITICAL). You MUST output the absolute minimum text to prevent token exhaustion. Output a single JSON array with exact keys: {"results": [{"q": "QuestionID", "s": Score, "f": "Max 5 words feedback"}]}. DO NOT write long extracts.`;

        let formattedBreakdown: any[] = [];
        try {
            const gradeResponse = await deepSeekClient.chat.completions.create({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `MARKING SCHEME (RUBRIC):\n${finalRubricText}\n\n====================\n\nSTUDENT EXAM (MESSY OCR):\n${fullExamText}` }
                ],
                response_format: { type: "json_object" },
                temperature: 0.0, // KILL-HALLUCINATION
                top_p: 0.1,       // KILL-HALLUCINATION
                max_tokens: 8192
            });

            const raw = gradeResponse.choices[0]?.message?.content || '{"results":[]}';
            const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(clean);

            const results = parsed.results || [];

            formattedBreakdown = results.map((item: any) => ({
                question: item.q || "Unknown",
                score: Number(item.s) || 0,
                max: 0, // Legacy fallback, to be mapped or resolved dynamically on frontend if needed, or extracted from rubric earlier. We will set to 0 and let UI handle or refine later if exact Max is needed.
                feedback: item.f || "No feedback",
                evidenceSnippet: "See full text.", // Not required in JSON diet
                isRelevant: true
            }));
            console.log(`[WORKER] Holistic grading mapped ${formattedBreakdown.length} results.`);

        } catch (error: any) {
            console.error(`[PLAYBOOK-TRACE] [FATAL-LLM] Holistic Grading Failed: ${error.message}`);
            throw new Error(`Holistic Grading Engine Error: ${error.message}`);
        }

        // 4. ACTIONABLE INSIGHT GENERATOR
        console.log(`[WORKER] Initiating Actionable Insight Generator...`);
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