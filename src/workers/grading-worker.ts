import { prisma } from '@/lib/prisma';
import { extractPagesMultimodal, ocrDocument } from '@/lib/ai/gemini';
import { gradeSubmission } from '@/lib/ai/deepseek';
import { readFile } from '@/lib/storage';

export async function handleAiGrade(job: any) {
    console.log(`[WORKER] Booting Single-Thread Sequence for Job ${job.id}`);

    let submissionIdToUpdate: string | null = null;

    try {
        const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
        submissionIdToUpdate = payload.submissionId;

        const submission = await prisma.submission.findUnique({
            where: { id: payload.submissionId },
            include: { workSession: true }
        });

        if (!submission) throw new Error("Submission not found");

        // 1. SEQUENTIAL EXTRACTION (NO PROMISE.ALL)
        console.log("[WORKER] Step 1: Loading Marking Scheme...");
        const markingSchemeText = await getOrExtractText(submission.workSession.markingScheme);

        console.log("[WORKER] Step 2: Loading Rubric...");
        const rubricContent = await getOrExtractText(submission.workSession.rubricUrl);

        console.log("[WORKER] Step 3: Extracting Student Exam (Memory Safe)...");
        if (!submission.filePath) throw new Error("Submission missing file path");

        const examBuffer = await readFile(submission.filePath, 'exam_pdfs');
        const examPages = await extractPagesMultimodal(examBuffer);
        const rawText = examPages.map(p => p.text).join('\n\n');

        // 2. HOLISTIC GRADING (DIET JSON)
        console.log("[WORKER] Step 4: Grading via DeepSeek...");
        const result = await gradeSubmission(rawText, rubricContent, markingSchemeText);

        // 3. TRANSFORM & SAVE
        console.log("[WORKER] Step 5: Saving Diet JSON to DB...");
        // Ensure result exists and has results array
        const resultsArray = result.results || [];
        const totalScore = resultsArray.reduce((acc: number, item: any) => acc + (Number(item.s) || 0), 0);

        // Convert the "Diet JSON" back into the schema structure the UI expects for `breakdown`
        const mappedBreakdown = resultsArray.map((item: any) => ({
            question: item.q,
            score: item.s,
            feedback: item.f,
            isRelevant: true,
            mappedRubricQuestion: `Q: ${item.q}`
        }));

        await prisma.score.upsert({
            where: { submissionId: submission.id },
            update: {
                totalMarks: totalScore,
                breakdown: JSON.stringify(mappedBreakdown),
                remarks: "Diet JSON Output Generated."
            },
            create: {
                submissionId: submission.id,
                totalMarks: totalScore,
                breakdown: JSON.stringify(mappedBreakdown),
                remarks: "Diet JSON Output Generated."
            }
        });

        // 4. UPDATE SUBMISSION TO COMPLETED
        await prisma.submission.update({
            where: { id: submission.id },
            data: { status: 'GRADED' }
        });

        console.log(`[WORKER] Mission Accomplished for Submission ${submission.id}`);

    } catch (fatalError: any) {
        console.error(`[WORKER] Error:`, fatalError.message);

        if (submissionIdToUpdate) {
            await prisma.submission.update({
                where: { id: submissionIdToUpdate },
                data: { status: 'FAILED', feedback: JSON.stringify({ error: fatalError.message }) }
            }).catch(e => console.error("Failed to update status to FAILED", e));
        }

        throw fatalError;
    }
}

// Helper: Keep your existing URL downloading / caching logic here
async function getOrExtractText(urlOrText: string | null): Promise<string> {
    if (!urlOrText) return "None";

    // If it's a Supabase file path
    if (urlOrText.includes('/') || urlOrText.toLowerCase().endsWith('.pdf')) {
        try {
            const buffer = await readFile(urlOrText, 'exam_pdfs');
            const mimeType = urlOrText.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';
            return await ocrDocument(buffer, mimeType);
        } catch (e) {
            console.error("Failed to extract text from URL:", e);
            return "Failed to extract.";
        }
    }

    return urlOrText; // Return as-is if it's already raw text
}