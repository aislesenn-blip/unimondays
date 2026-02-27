import { Job } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { saveBuffer } from '@/lib/storage';
import { PDFDocument } from 'pdf-lib';

async function fetchFileFromLink(url: string): Promise<Buffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch cloud file: ${res.statusText}`);
    return Buffer.from(await res.arrayBuffer());
}

export async function handleCloudMarking(job: Job) {
    let data: any;
    try {
       data = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
    } catch (e) {
       throw new Error("Invalid job payload JSON");
    }
    const { bulkSessionId, lecturerId } = data;

    const bulkSession = await prisma.bulkSession.findUnique({
        where: { id: bulkSessionId },
        include: { lecturer: true }
    });

    if (!bulkSession) throw new Error("Bulk Session not found");

    console.log(`[CLOUD_WORKER] Starting Bulk Session: ${bulkSession.title}`);
    await prisma.bulkSession.update({ where: { id: bulkSession.id }, data: { status: 'PROCESSING' } });

    try {
        // 1. Fetch the Cloud File
        const fileBuffer = await fetchFileFromLink(bulkSession.cloudLink);

        // 2. Load PDF
        const srcDoc = await PDFDocument.load(fileBuffer);
        const pageCount = srcDoc.getPageCount();
        console.log(`[CLOUD_WORKER] Loaded PDF with ${pageCount} pages.`);

        // Update Bulk Session with total count
        await prisma.bulkSession.update({
            where: { id: bulkSession.id },
            data: { totalFiles: pageCount }
        });

        // Ensure WorkSession container exists
        let workSession = await prisma.workSession.findFirst({
            where: { bulkSessionId: bulkSession.id }
        });

        if (!workSession) {
            workSession = await prisma.workSession.create({
                data: {
                    title: bulkSession.title,
                    workCode: `BULK-${bulkSession.id.substring(0,6).toUpperCase()}`,
                    lecturerId: bulkSession.lecturerId,
                    type: "BULK",
                    status: "PUBLISHED",
                    bulkSessionId: bulkSession.id,
                    totalMarks: bulkSession.totalMarks,
                    markingScheme: bulkSession.markingScheme,
                    goldStandardUrl: bulkSession.goldStandardUrl,
                    calibration: bulkSession.calibration,
                    releaseMode: "MANUAL"
                }
            });
        }

        // 3. Slice & Process (Batch Concurrency Control)
        const BATCH_SIZE = 5;
        let processedCount = 0;

        for (let i = 0; i < pageCount; i += BATCH_SIZE) {
            const batchPromises = [];

            // Process batch
            for (let j = i; j < Math.min(i + BATCH_SIZE, pageCount); j++) {
                batchPromises.push((async () => {
                    try {
                        // Create new document for this slice
                        const newDoc = await PDFDocument.create();
                        const [copiedPage] = await newDoc.copyPages(srcDoc, [j]);
                        newDoc.addPage(copiedPage);
                        const pdfBytes = await newDoc.save();
                        const sliceBuffer = Buffer.from(pdfBytes);

                        // Upload to Supabase
                        const slicePath = await saveBuffer(sliceBuffer, `bulk_${bulkSession.id}_p${j + 1}.pdf`, 'exam_pdfs');

                        // Create Submission
                        const submission = await prisma.submission.create({
                            data: {
                                workSessionId: workSession!.id, // Non-null assertion safe due to create above
                                userId: null,
                                studentRegNo: null,
                                filePath: slicePath,
                                status: 'PENDING',
                                submittedAt: new Date()
                            }
                        });

                        // Trigger Grading Job
                        await prisma.job.create({
                            data: {
                                type: 'AI_GRADE_SUBMISSION',
                                payload: JSON.stringify({ submissionId: submission.id }),
                                status: 'PENDING'
                            }
                        });

                        return true;
                    } catch (err) {
                        console.error(`[CLOUD_WORKER] Failed to process page ${j + 1}`, err);
                        return false;
                    }
                })());
            }

            // Await batch
            const results = await Promise.all(batchPromises);
            const successInBatch = results.filter(r => r).length;
            processedCount += successInBatch;

            // Update progress occasionally
            await prisma.bulkSession.update({
                where: { id: bulkSession.id },
                data: { processedFiles: processedCount }
            });

            console.log(`[CLOUD_WORKER] Batch ${Math.floor(i/BATCH_SIZE) + 1} complete. Total processed: ${processedCount}`);
        }

        // 4. Finalize
        await prisma.bulkSession.update({
            where: { id: bulkSession.id },
            data: { status: 'READY', processedFiles: processedCount }
        });

        console.log(`[CLOUD_WORKER] Bulk Session Complete. ${processedCount}/${pageCount} pages processed.`);

    } catch (e: any) {
        console.error("[CLOUD_WORKER] Critical Failure", e);
        await prisma.bulkSession.update({
            where: { id: bulkSession.id },
            data: { status: 'FAILED' }
        });
        throw e;
    }
}
