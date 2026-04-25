import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { extractPagesMultimodal, ocrDocument } from '@/lib/ai/gemini';
import { readFile } from '@/lib/storage';
import { parseRubric, RubricItem } from '@/lib/rubric-parser';
import { TokenBucket } from '@/lib/rate-limiter';

async function withRetries<T>(fn: () => Promise<T>, retries = 3, delayMs = 3000): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try { return await fn(); } catch (error: any) {
            if (i === retries - 1) throw error;
            await new Promise(res => setTimeout(res, delayMs));
        }
    }
    throw new Error("Unreachable");
}

const apiBucket = new TokenBucket(5, 5);
const geminiClient = new OpenAI({
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    apiKey: process.env.GEMINI_API_KEY || 'dummy',
    timeout: 300000,
    maxRetries: 4,
});

export async function handleAiGrade(job: any) {
    let submissionIdToUpdate: string | null = null;
    try {
        const rawPayload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
        const actualPayload = rawPayload.payload ? rawPayload.payload : rawPayload;
        submissionIdToUpdate = actualPayload.submissionId;

        if (!submissionIdToUpdate) throw new Error("Payload is missing submissionId");

        const submission = await prisma.submission.findUnique({
            where: { id: submissionIdToUpdate },
            include: { workSession: true }
        });
        if (!submission) throw new Error("Submission not found");

        let finalRubricText = submission.workSession.rubric;

        if ((!finalRubricText || finalRubricText.trim() === '') && submission.workSession.markingScheme) {
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
            await prisma.workSession.update({ where: { id: submission.workSession.id }, data: { rubric: finalRubricText } });
        }

        if (!finalRubricText || finalRubricText.trim() === '') throw new Error("Fatal: Rubric text missing.");

        const chunks = await prisma.extractedChunk.findMany({ where: { submissionId: submissionIdToUpdate }, orderBy: { chunkIndex: 'asc' } });

        let fullExamText = "";
        let totalConfidence = 0;
        let validChunks = 0;
        const idCandidates: string[] = [];
        const pageTextMap = new Map<number, string>();

        for (const chunk of chunks) {
            const text = chunk.text || "";
            fullExamText += `\n\n--- PAGES ${chunk.pages.join(', ')} ---\n\n${text}`;
            if (chunk.confidence !== null) { totalConfidence += chunk.confidence; validChunks++; }
            for (const p of chunk.pages) pageTextMap.set(p, (pageTextMap.get(p) || '') + '\n' + text);
            const match = text.match(/(?:REGISTRATION NUMBER|Reg No|Registration No)[\s:]*([A-Z0-9-]+)/i);
            if (match) idCandidates.push(match[1].trim().toUpperCase());
        }

        const idCounts = idCandidates.reduce((acc: any, id) => { acc[id] = (acc[id] || 0) + 1; return acc; }, {});
        const detectedRegNo = Object.entries(idCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'UNKNOWN';

        if (!fullExamText.trim() || fullExamText.length < 100) {
            await prisma.submission.update({ where: { id: submission.id }, data: { status: 'REVIEW_NEEDED', feedback: 'OCR extracted insufficient text.' } });
            return;
        }

        const masterRubricArray: RubricItem[] = parseRubric(finalRubricText);
        if (masterRubricArray.length === 0) throw new Error("Failed to parse questions.");

        const normalizeId = (id: string) => (id || "").replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        function findRelevantPages(questionId: string, pageMap: Map<number, string>): string {
            const qTarget = normalizeId(questionId);
            const relevant: number[] = [];
            for (const [pageNum, text] of pageMap.entries()) if (normalizeId(text).includes(qTarget)) relevant.push(pageNum);
            if (relevant.length === 0) return fullExamText;
            return relevant.map(p => `--- PAGE ${p} ---\n${pageMap.get(p)}`).join('\n\n');
        }

        let atomicGradingPromises: Promise<any>[] = [];

        const pLimitLib = (await import('p-limit')).default;
        const limit = pLimitLib(15); // Gemini can handle higher concurrency

        atomicGradingPromises = masterRubricArray.map((rubricItem) =>
            limit(async () => {
                try {
                    await apiBucket.consume();
                    // Using fullExamText directly to leverage Gemini's massive context window
                    // bypassing the brittle findRelevantPages logic
                    const response = await geminiClient.chat.completions.create({
                        model: "gemini-1.5-flash",
                        messages: [
                            { role: "system", content: `Evaluate ONE question against ONE rubric segment. JSON FORMAT: { "extracted_evidence": "exact quote from student", "score": number, "feedback": "tag + micro-tutoring lesson (max 3 sentences)" }` },
                            { role: "user", content: `QUESTION: ${rubricItem.questionId}\nMAX SCORE: ${rubricItem.maxScore}\n\nRUBRIC SEGMENT:\n${rubricItem.rubricSegment}\n\nFULL STUDENT EXAM TEXT:\n${fullExamText}` }
                        ],
                        response_format: { type: "json_object" },
                        temperature: 0.1,
                        max_tokens: 8192
                    }, { timeout: 90000 });

                    const raw = response.choices[0]?.message?.content || '{}';
                    const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
                    const result = JSON.parse(clean);
                    return { question: rubricItem.questionId, score: Number(result.score) || 0, max: Number(rubricItem.maxScore) || 0, feedback: result.feedback || "No feedback.", evidenceSnippet: result.extracted_evidence || "None" };
                } catch (e: any) {
                    return { question: rubricItem.questionId, score: null, max: Number(rubricItem.maxScore) || 0, feedback: '[SYSTEM_ERROR] Grading failed.', evidenceSnippet: 'ERROR', error: e.message };
                }
            })
        );

        const settled = await Promise.allSettled(atomicGradingPromises);
        const formattedBreakdown = [];

        for (let i = 0; i < settled.length; i++) {
            const result = settled[i];
            const rubricItem = masterRubricArray[i];
            if (result.status === 'fulfilled' && result.value.score !== null) formattedBreakdown.push(result.value);
            else formattedBreakdown.push({ question: rubricItem.questionId, score: 0, max: rubricItem.maxScore, feedback: "[Missing/Error] System error.", evidenceSnippet: "" });
        }

        const calculatedTotalScore = formattedBreakdown.reduce((sum: number, item: any) => sum + item.score, 0);

        await prisma.score.upsert({
            where: { submissionId: submission.id },
            update: { totalMarks: calculatedTotalScore, remarks: "Graded via Atomic Map-Reduce.", breakdown: JSON.stringify(formattedBreakdown), detectedIdentity: detectedRegNo },
            create: { submissionId: submission.id, totalMarks: calculatedTotalScore, remarks: "Graded via Atomic Map-Reduce.", breakdown: JSON.stringify(formattedBreakdown), detectedIdentity: detectedRegNo }
        });

        await prisma.submission.update({
            where: { id: submission.id },
            data: { status: 'GRADED', studentRegNo: detectedRegNo !== "UNKNOWN" ? detectedRegNo : submission.studentRegNo }
        });

    } catch (fatalError: any) {
        if (submissionIdToUpdate) {
            await prisma.submission.update({ where: { id: submissionIdToUpdate }, data: { status: 'FAILED', feedback: fatalError.message } }).catch(()=>null);
        }
        throw fatalError;
    }
}