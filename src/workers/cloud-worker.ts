import { Job } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { saveBuffer, deleteFile, readFile } from '@/lib/storage';
import { PDFDocument } from 'pdf-lib';
import { analyzePdfStructure, PdfSplit } from '@/lib/ai/gemini';
import { v4 as uuidv4 } from 'uuid';

async function fetchFileFromLink(url: string): Promise<Buffer> {
    // Determine if it is a Supabase path or a full URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch cloud file: ${res.statusText}`);
        return Buffer.from(await res.arrayBuffer());
    }

    // Treat as Supabase storage path from the 'exam_pdfs' bucket
    return await readFile(url, 'exam_pdfs');
}

export async function handleCloudMarking(job: Job) {
    let data: any;
    try {
       data = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
    } catch (e) {
       throw new Error("Invalid job payload JSON");
    }
    const { bulkSessionId, lecturerId, phase = "COLLATION", splits = [], processedCount = 0, lastProcessedIndex = 0 } = data;

    const bulkSession = await prisma.bulkSession.findUnique({
        where: { id: bulkSessionId },
        include: { lecturer: true }
    });

    if (!bulkSession) throw new Error("Bulk Session not found");

    if (phase === "COLLATION") {
        console.log(`[CLOUD_WORKER] Phase: COLLATION for Session: ${bulkSession.title}`);
        await prisma.bulkSession.update({ where: { id: bulkSession.id }, data: { status: 'PROCESSING' } });
    } else {
        console.log(`[CLOUD_WORKER] Phase: PROCESSING (Batch ${lastProcessedIndex}) for Session: ${bulkSession.title}`);
    }

    const createdSlicePaths: string[] = [];

    try {
        // 1. Fetch the Cloud File (Cached by OS/Node in memory if frequent, but ideally we'd pass a persistent storage path. For now, fetch is fast enough for L8 fix without breaking S3 architecture)
        const fileBuffer = await fetchFileFromLink(bulkSession.cloudLink);

        // Check Magic Bytes for PDF
        const isPdf = fileBuffer.length > 4 &&
                      fileBuffer[0] === 0x25 &&
                      fileBuffer[1] === 0x50 &&
                      fileBuffer[2] === 0x44 &&
                      fileBuffer[3] === 0x46;

        if (!isPdf) {
            const errorMessage = "Invalid file type. Expected application/pdf.";
            await prisma.bulkSession.update({ where: { id: bulkSession.id }, data: { status: 'FAILED', errorMessage } });
            throw new Error(errorMessage);
        }

        const srcDoc = await PDFDocument.load(fileBuffer);
        const pageCount = srcDoc.getPageCount();

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
                    questionPaperUrl: bulkSession.questionPaperUrl,
                    calibration: bulkSession.calibration,
                    releaseMode: "MANUAL"
                }
            });
        }

        let currentSplits: PdfSplit[] = splits;

        // ==========================================
        // PHASE 1: COLLATION (Structure Analysis)
        // ==========================================
        if (phase === "COLLATION") {
            await prisma.bulkSession.update({
                where: { id: bulkSession.id },
                data: { totalFiles: pageCount }
            });

            try {
                if (pageCount <= 50) {
                    currentSplits = await analyzePdfStructure(fileBuffer);
                } else {
                    const CHUNK_SIZE = 50;
                    for (let start = 0; start < pageCount; start += CHUNK_SIZE) {
                        const end = Math.min(start + CHUNK_SIZE, pageCount);

                        const chunkDoc = await PDFDocument.create();
                        const pageIndices = Array.from({ length: end - start }, (_, i) => start + i);
                        const copiedPages = await chunkDoc.copyPages(srcDoc, pageIndices);
                        copiedPages.forEach(page => chunkDoc.addPage(page));
                        const chunkBytes = await chunkDoc.save();

                        const chunkSplits = await analyzePdfStructure(Buffer.from(chunkBytes));

                        const adjustedSplits = chunkSplits.map(s => ({
                            ...s,
                            startPage: s.startPage + start,
                            endPage: s.endPage + start
                        }));
                        currentSplits.push(...adjustedSplits);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            } catch (structureError: any) {
                console.error(`[CLOUD_WORKER FATAL ERROR] Smart Collation failed: ${structureError.message}. Aborting job.`, structureError);
                throw structureError;
            }

            // Deep Audit Fix: Validate contiguous page boundaries mathematically.
            if (currentSplits.length > 0) {
                currentSplits.sort((a, b) => a.startPage - b.startPage);
                if (currentSplits[0].startPage > 1) currentSplits[0].startPage = 1;

                for (let i = 0; i < currentSplits.length - 1; i++) {
                    const current = currentSplits[i];
                    const next = currentSplits[i+1];
                    if (current.endPage !== next.startPage - 1) {
                        current.endPage = next.startPage - 1;
                    }
                }

                if (currentSplits[currentSplits.length - 1].endPage !== pageCount) {
                    currentSplits[currentSplits.length - 1].endPage = pageCount;
                }
                currentSplits = currentSplits.filter(s => s.startPage <= s.endPage);
            }

            // If we generated splits, return a continuation job to process them
            if (currentSplits.length > 0) {
                return {
                    continuation: true,
                    nextPayload: {
                        bulkSessionId,
                        lecturerId,
                        phase: "PROCESSING",
                        splits: currentSplits,
                        processedCount: 0,
                        lastProcessedIndex: 0
                    }
                };
            } else {
                // Fallback Phase
                return {
                    continuation: true,
                    nextPayload: {
                        bulkSessionId,
                        lecturerId,
                        phase: "FALLBACK_PROCESSING",
                        splits: [],
                        processedCount: 0,
                        lastProcessedIndex: 0
                    }
                };
            }
        }

        // ==========================================
        // PHASE 2: PROCESSING (Chunked Slicing)
        // ==========================================
        let currentProcessedCount = processedCount;

        if (phase === "PROCESSING" && currentSplits.length > 0) {
            // Process a chunk of 5 splits to avoid Vercel timeouts (Max Duration)
            const PROCESS_BATCH_SIZE = 5;
            const endIndex = Math.min(lastProcessedIndex + PROCESS_BATCH_SIZE, currentSplits.length);
            const batchSplits = currentSplits.slice(lastProcessedIndex, endIndex);

            const batchPromises = batchSplits.map(async (split) => {
                try {
                    if (split.startPage < 1 || split.endPage > pageCount) return 0;

                    const newDoc = await PDFDocument.create();
                    const pageIndices = [];
                    for (let p = split.startPage; p <= split.endPage; p++) {
                        pageIndices.push(p - 1);
                    }
                    const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
                    copiedPages.forEach(page => newDoc.addPage(page));

                    const pdfBytes = await newDoc.save();
                    const sliceBuffer = Buffer.from(pdfBytes);

                    const safeRegNo = split.regNo?.replace(/[^a-zA-Z0-9\-\/]/g, '') || 'UNIDENTIFIED';
                    const uniqueSuffix = uuidv4().substring(0, 8);
                    const fileName = `bulk_${bulkSession.id}_${safeRegNo}_${uniqueSuffix}.pdf`;

                    const slicePath = await saveBuffer(sliceBuffer, fileName, 'exam_pdfs');
                    createdSlicePaths.push(slicePath);

                    const submission = await prisma.submission.create({
                        data: {
                            workSessionId: workSession!.id,
                            userId: null,
                            studentRegNo: split.regNo === 'UNIDENTIFIED' ? null : split.regNo,
                            studentName: split.name,
                            filePath: slicePath,
                            status: 'PENDING',
                            submittedAt: new Date()
                        }
                    });

                    await prisma.job.create({
                        data: {
                            type: 'AI_GRADE_SUBMISSION',
                            payload: JSON.stringify({ submissionId: submission.id }),
                            status: 'PENDING'
                        }
                    });

                    return pageIndices.length;
                } catch (err) {
                    console.error(`[CLOUD_WORKER] Failed to process split for ${split.regNo}`, err);
                    return 0;
                }
            });

            const results = await Promise.all(batchPromises);
            const pagesProcessedInBatch = results.reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
            currentProcessedCount += pagesProcessedInBatch;

            await prisma.bulkSession.update({
                where: { id: bulkSession.id },
                data: { processedFiles: currentProcessedCount }
            });

            if (endIndex < currentSplits.length) {
                // Return Continuation for the next batch
                return {
                    continuation: true,
                    nextPayload: {
                        bulkSessionId,
                        lecturerId,
                        phase: "PROCESSING",
                        splits: currentSplits,
                        processedCount: currentProcessedCount,
                        lastProcessedIndex: endIndex
                    }
                };
            }
        }

        // ==========================================
        // PHASE 3: FALLBACK PROCESSING (Chunked Slicing)
        // ==========================================
        if (phase === "FALLBACK_PROCESSING") {
            const FALLBACK_BATCH_SIZE = 10;
            const endIndex = Math.min(lastProcessedIndex + FALLBACK_BATCH_SIZE, pageCount);

            const batchPromises = [];
            for (let j = lastProcessedIndex; j < endIndex; j++) {
                batchPromises.push((async () => {
                    try {
                        const newDoc = await PDFDocument.create();
                        const [copiedPage] = await newDoc.copyPages(srcDoc, [j]);
                        newDoc.addPage(copiedPage);
                        const pdfBytes = await newDoc.save();
                        const sliceBuffer = Buffer.from(pdfBytes);

                        const uniqueSuffix = uuidv4().substring(0, 8);
                        const fileName = `bulk_${bulkSession.id}_p${j + 1}_${uniqueSuffix}.pdf`;

                        const slicePath = await saveBuffer(sliceBuffer, fileName, 'exam_pdfs');
                        createdSlicePaths.push(slicePath);

                        const submission = await prisma.submission.create({
                            data: {
                                workSessionId: workSession!.id,
                                userId: null,
                                studentRegNo: null,
                                filePath: slicePath,
                                status: 'PENDING',
                                submittedAt: new Date()
                            }
                        });

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

            const results = await Promise.all(batchPromises);
            const successInBatch = results.filter(r => r).length;
            currentProcessedCount += successInBatch;

            await prisma.bulkSession.update({
                where: { id: bulkSession.id },
                data: { processedFiles: currentProcessedCount }
            });

            if (endIndex < pageCount) {
                return {
                    continuation: true,
                    nextPayload: {
                        bulkSessionId,
                        lecturerId,
                        phase: "FALLBACK_PROCESSING",
                        splits: [],
                        processedCount: currentProcessedCount,
                        lastProcessedIndex: endIndex
                    }
                };
            }
        }

        // 4. Finalize
        await prisma.bulkSession.update({
            where: { id: bulkSession.id },
            data: { status: 'READY', processedFiles: currentProcessedCount }
        });

        console.log(`[CLOUD_WORKER] Bulk Session Complete. ${currentProcessedCount}/${pageCount} pages processed.`);
        return { continuation: false };

    } catch (e: any) {
        console.error(`[CLOUD_WORKER FATAL ERROR] Bulk Session ${bulkSession.id} failed:`, e);

        if (createdSlicePaths.length > 0) {
            Promise.all(createdSlicePaths.map(path => deleteFile(path))).catch(err =>
                console.error("[CLOUD_WORKER] Cleanup failed", err)
            );
        }

        try {
            const currentStatus = await prisma.bulkSession.findUnique({
                where: { id: bulkSession.id },
                select: { status: true }
            });

            if (currentStatus?.status !== 'FAILED') {
                 await prisma.bulkSession.update({
                    where: { id: bulkSession.id },
                    data: { status: 'FAILED', errorMessage: e.message || "Unknown error during processing" }
                });
            }
        } catch (dbError) {
             console.error(`[CLOUD_WORKER FATAL ERROR] Failed to update BulkSession status to FAILED:`, dbError);
        }

        throw e;
    }
}
