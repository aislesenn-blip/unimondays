import { Job } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { saveBuffer, deleteFile } from '@/lib/storage';
import { PDFDocument } from 'pdf-lib';
import { analyzePdfStructure, PdfSplit } from '@/lib/ai/gemini';
import { v4 as uuidv4 } from 'uuid';

async function resolveGDriveLink(url: string): Promise<Buffer> {
    const fileIdMatch = url.match(/[-\w]{25,}/);
    if (!fileIdMatch) {
        throw new Error("Could not extract Google Drive File ID. Please use a direct link.");
    }
    const fileId = fileIdMatch[0];
    const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    let res = await fetch(directUrl);

    // Check for "Virus Scan" warning (Google returns 200 OK with HTML)
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
        const html = await res.text();

        // Extract confirm token: href="/uc?export=download&id=...&confirm=XXXX"
        // Regex looks for &confirm=([a-zA-Z0-9_-]+)
        const confirmMatch = html.match(/confirm=([a-zA-Z0-9_-]+)/);

        if (confirmMatch) {
            const confirmToken = confirmMatch[1];
            const bypassUrl = `${directUrl}&confirm=${confirmToken}`;
            res = await fetch(bypassUrl);
        } else {
             // If we can't find a token but it's Drive HTML, fail gracefully
             throw new Error("Google Drive blocked the download (Virus Scan). Please use a direct Dropbox link or upload manually.");
        }
    }

    if (!res.ok) throw new Error(`Failed to fetch from Google Drive: ${res.statusText}`);
    return Buffer.from(await res.arrayBuffer());
}

async function fetchFileFromLink(url: string): Promise<Buffer> {
    if (url.includes('drive.google.com')) {
        return resolveGDriveLink(url);
    }

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

    // Track created files for cleanup on failure
    const createdSlicePaths: string[] = [];

    try {
        // 1. Fetch the Cloud File
        const fileBuffer = await fetchFileFromLink(bulkSession.cloudLink);

        // MANDATE 3: Smart File Inspection (Anti-Garbage)
        // Check Magic Bytes for PDF (%PDF-)
        const isPdf = fileBuffer.length > 4 &&
                      fileBuffer[0] === 0x25 &&
                      fileBuffer[1] === 0x50 &&
                      fileBuffer[2] === 0x44 &&
                      fileBuffer[3] === 0x46;

        if (!isPdf) {
            // Dynamic MIME Detection
            let detectedType = "application/octet-stream";
            if (fileBuffer.length > 3 && fileBuffer[0] === 0xFF && fileBuffer[1] === 0xD8 && fileBuffer[2] === 0xFF) {
                detectedType = "image/jpeg";
            } else if (fileBuffer.length > 8 && fileBuffer[0] === 0x89 && fileBuffer[1] === 0x50 && fileBuffer[2] === 0x4E && fileBuffer[3] === 0x47) {
                detectedType = "image/png";
            } else if (fileBuffer.toString('utf8', 0, 5).toLowerCase().includes('html') || fileBuffer.toString('utf8', 0, 15).toLowerCase().includes('<!doctype html>')) {
                detectedType = "text/html";
            } else if (fileBuffer.toString('utf8', 0, 4).toLowerCase() === 'zip' || (fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4B)) {
                detectedType = "application/zip";
            }

            const errorMessage = `Invalid file type. Expected application/pdf, but received ${detectedType}.`;
            console.error(`[CLOUD_WORKER] ${errorMessage} for BulkSession ${bulkSession.id}`);

            await prisma.bulkSession.update({
                where: { id: bulkSession.id },
                data: {
                    status: 'FAILED',
                    errorMessage: errorMessage
                }
            });
            throw new Error(errorMessage);
        }

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

        // MANDATE 1: Smart Collation
        let splits: PdfSplit[] = [];
        try {
            console.log(`[CLOUD_WORKER] Analyzing PDF Structure...`);
            // Deep Audit Fix: Stream-based chunking for large PDFs to prevent OOM / Vercel timeouts.
            if (pageCount <= 50) {
                splits = await analyzePdfStructure(fileBuffer);
                console.log(`[CLOUD_WORKER] Smart Collation found ${splits.length} scripts.`);
            } else {
                console.log(`[CLOUD_WORKER] PDF too large for single-pass analysis (${pageCount} pages). Chunking analysis...`);
                // Split analysis into manageable chunks of 50 pages to prevent memory spikes
                const CHUNK_SIZE = 50;
                for (let start = 0; start < pageCount; start += CHUNK_SIZE) {
                    const end = Math.min(start + CHUNK_SIZE, pageCount);
                    console.log(`[CLOUD_WORKER] Analyzing chunk pages ${start + 1} to ${end}...`);

                    const chunkDoc = await PDFDocument.create();
                    const pageIndices = Array.from({ length: end - start }, (_, i) => start + i);
                    const copiedPages = await chunkDoc.copyPages(srcDoc, pageIndices);
                    copiedPages.forEach(page => chunkDoc.addPage(page));
                    const chunkBytes = await chunkDoc.save();

                    const chunkSplits = await analyzePdfStructure(Buffer.from(chunkBytes));

                    // Adjust page indices to absolute document pages
                    const adjustedSplits = chunkSplits.map(s => ({
                        ...s,
                        startPage: s.startPage + start,
                        endPage: s.endPage + start
                    }));
                    splits.push(...adjustedSplits);

                    // Rate Limit Armor: Delay between chunk analysis to prevent 429 errors from Gemini
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                console.log(`[CLOUD_WORKER] Chunked Smart Collation complete. Found ${splits.length} scripts total.`);
            }
        } catch (structureError) {
            console.warn(`[CLOUD_WORKER] Smart Collation failed, falling back to default page-by-page slicing.`, structureError);
            splits = []; // Ensure fallback happens cleanly
        }

        // Deep Audit Fix: Validate contiguous page boundaries. If a student forgot their name on page 2,
        // it might be orphaned. If there's a gap between endPage of script N and startPage of N+1,
        // we conservatively merge the orphaned pages to the preceding script to prevent data loss.
        if (splits.length > 0) {
            splits.sort((a, b) => a.startPage - b.startPage);
            for (let i = 0; i < splits.length - 1; i++) {
                if (splits[i].endPage < splits[i+1].startPage - 1) {
                    // Gap detected. Merge forward.
                    splits[i].endPage = splits[i+1].startPage - 1;
                }
            }
            // Ensure last split reaches the end of the document if there are trailing pages
            if (splits[splits.length - 1].endPage < pageCount) {
                splits[splits.length - 1].endPage = pageCount;
            }
        }

        let processedCount = 0;
        // Deep Audit Fix: Concurrency Tuning. Reduce BATCH_SIZE to 3 to prevent memory spikes and API rate limits during mass submission creation.
        const BATCH_SIZE = 3;

        // BRANCH A: Smart Collation (Splits Found)
        if (splits.length > 0) {
            for (let i = 0; i < splits.length; i += BATCH_SIZE) {
                const batchSplits = splits.slice(i, i + BATCH_SIZE);
                const batchPromises = batchSplits.map(async (split) => {
                    try {
                         // Validate range
                         if (split.startPage < 1 || split.endPage > pageCount) return 0; // Return 0 for invalid ranges

                         // Create new document for this split
                        const newDoc = await PDFDocument.create();

                        // Copy pages (0-based index)
                        const pageIndices = [];
                        for (let p = split.startPage; p <= split.endPage; p++) {
                            pageIndices.push(p - 1);
                        }
                        const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
                        copiedPages.forEach(page => newDoc.addPage(page));

                        const pdfBytes = await newDoc.save();
                        const sliceBuffer = Buffer.from(pdfBytes);

                        // Identity (sanitize)
                        const safeRegNo = split.regNo?.replace(/[^a-zA-Z0-9\-\/]/g, '') || 'UNIDENTIFIED';
                        const uniqueSuffix = uuidv4().substring(0, 8); // Prevent collisions
                        const fileName = `bulk_${bulkSession.id}_${safeRegNo}_${uniqueSuffix}.pdf`;

                        // Upload to Supabase
                        const slicePath = await saveBuffer(sliceBuffer, fileName, 'exam_pdfs');
                        createdSlicePaths.push(slicePath);

                        // Create Submission (with Pre-filled Identity)
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

                        // Trigger Grading Job
                        await prisma.job.create({
                            data: {
                                type: 'AI_GRADE_SUBMISSION',
                                payload: JSON.stringify({ submissionId: submission.id }),
                                status: 'PENDING'
                            }
                        });

                        return pageIndices.length; // Return number of pages processed
                    } catch (err) {
                        console.error(`[CLOUD_WORKER] Failed to process split for ${split.regNo}`, err);
                        return 0; // Return 0 on error
                    }
                });

                const results = await Promise.all(batchPromises);
                // Safe reduce for TS (although logic guarantees numbers now, defensive programming helps)
                const pagesProcessedInBatch = results.reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
                processedCount += pagesProcessedInBatch;

                 // Update progress
                await prisma.bulkSession.update({
                    where: { id: bulkSession.id },
                    data: { processedFiles: processedCount }
                });

                // Deep Audit Fix: Concurrency rate limit pause between database/storage writes
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

        } else {
            // BRANCH B: Fallback (Page-by-Page)
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

                            // Generate unique filename for page fallback
                            const uniqueSuffix = uuidv4().substring(0, 8);
                            const fileName = `bulk_${bulkSession.id}_p${j + 1}_${uniqueSuffix}.pdf`;

                            // Upload to Supabase
                            const slicePath = await saveBuffer(sliceBuffer, fileName, 'exam_pdfs');
                            createdSlicePaths.push(slicePath);

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

                // Deep Audit Fix: Rate limit pause for fallback processing
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // 4. Finalize
        await prisma.bulkSession.update({
            where: { id: bulkSession.id },
            data: { status: 'READY', processedFiles: processedCount }
        });

        console.log(`[CLOUD_WORKER] Bulk Session Complete. ${processedCount}/${pageCount} pages processed.`);

    } catch (e: any) {
        console.error("[CLOUD_WORKER] Critical Failure", e);

        // Cleanup: Delete orphaned slices
        if (createdSlicePaths.length > 0) {
            console.log(`[CLOUD_WORKER] Cleaning up ${createdSlicePaths.length} orphaned slices...`);
            Promise.all(createdSlicePaths.map(path => deleteFile(path))).catch(err =>
                console.error("[CLOUD_WORKER] Cleanup failed", err)
            );
        }

        // Only update to FAILED if not already marked (avoid overwriting specific error messages)
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
        throw e;
    }
}
