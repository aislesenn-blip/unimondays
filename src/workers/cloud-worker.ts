import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase'; // Using the server-side admin client
import { PDFDocument } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';

// We need a lightweight Vision model to heuristically find cover pages
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

interface CloudMarkingPayload {
    bulkSessionId: string;
    bulkFilePath: string;
    lecturerId: string;
}

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Polyfill for Next.js Serverless execution
if (typeof Promise.withResolvers === 'undefined') {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

export async function handleCloudMarking(payload: CloudMarkingPayload | any) {
    // Check if called directly with payload, or unwrapped from Job
    let parsedPayload: CloudMarkingPayload;
    if (payload.id && payload.type === 'CLOUD_MARKING' && payload.payload) {
        parsedPayload = typeof payload.payload === 'string' ? JSON.parse(payload.payload) : payload.payload;
    } else {
        parsedPayload = payload as CloudMarkingPayload;
    }

    const { bulkSessionId, bulkFilePath, lecturerId } = parsedPayload;
    let fileBuffer: Buffer | null = null;
    let pdfDoc: PDFDocument | null = null;
    let workSessionId: string | null = null;

    try {
        console.log(`[CLOUD_WORKER] Initiating pipeline for BulkSession: ${bulkSessionId}`);

        // 1. Fetch the massive PDF directly from Supabase Storage (Internal Network)
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('exam_pdfs')
            .download(bulkFilePath);

        if (downloadError || !fileData) {
            throw new Error(`Failed to download bulk PDF from Supabase: ${downloadError?.message}`);
        }

        fileBuffer = Buffer.from(await fileData.arrayBuffer());
        console.log(`[CLOUD_WORKER] Downloaded massive PDF (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

        // Update status to Slicing
        await prisma.bulkSession.update({
            where: { id: bulkSessionId },
            data: { status: 'SLICING' }
        });

        const bulkSession = await prisma.bulkSession.findUnique({
            where: { id: bulkSessionId }
        });
        if (!bulkSession) throw new Error("BulkSession record missing.");

        // 2. Memory-Safe PDF Loading (Lazy AST parsing)
        console.log(`[CLOUD_WORKER] Loading PDF AST (Lazy Mode)...`);
        pdfDoc = await PDFDocument.load(fileBuffer, {
            ignoreEncryption: true,
            updateMetadata: false
        });

        const totalPages = pdfDoc.getPageCount();
        console.log(`[CLOUD_WORKER] Monolithic PDF contains ${totalPages} pages.`);

        await prisma.bulkSession.update({
            where: { id: bulkSessionId },
            data: { totalFiles: totalPages, processedFiles: 0 }
        });

        // 3. Create the underlying WorkSession Container
        const workSession = await prisma.workSession.create({
            data: {
                title: bulkSession.title,
                workCode: `BULK-${bulkSessionId.substring(0,6).toUpperCase()}`,
                lecturerId: lecturerId,
                type: "BULK",
                status: "PUBLISHED", // Auto-publish for student access later
                bulkSessionId: bulkSessionId,
                totalMarks: bulkSession.totalMarks,
                markingScheme: bulkSession.markingScheme,
                goldStandardUrl: bulkSession.goldStandardUrl,
                calibration: bulkSession.calibration,
                releaseMode: "MANUAL"
            }
        });
        workSessionId = workSession.id;

        // 4. The AI Heuristic Router (Cover Page Detection via Fast Text Extraction)
        console.log(`[CLOUD_WORKER] Initiating Heuristic Boundary Scan via pdfjs-dist...`);
        const splitBoundaries: number[] = [0]; // Page 0 is always a boundary

        // To prevent token exhaustion and rate limits, we use pdfjs-dist to rapidly extract text
        // from each page. We scan for the Registration Number Regex boundary to determine where
        // a new student's script begins.
        const regNoRegex = /(?:REGISTRATION NUMBER|REG NO|STUDENT ID)[\s:]*([A-Za-z0-9\-]+)/i;

        try {
            // Load a lightweight text-only instance of the PDF for rapid scanning
            const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(fileBuffer) });
            const textPdf = await loadingTask.promise;

            // Start from page 2 (index 1) since page 1 is inherently the start of the first script
            for (let i = 1; i < totalPages; i++) {
                try {
                    const page = await textPdf.getPage(i + 1); // pdfjs is 1-indexed
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item: any) => item.str).join(' ');

                    if (regNoRegex.test(pageText)) {
                        console.log(`[CLOUD_WORKER] Boundary detected at page ${i} (Regex Match).`);
                        splitBoundaries.push(i);
                    }
                } catch (pageErr) {
                    console.warn(`[CLOUD_WORKER] Failed to extract text from page ${i + 1}, skipping heuristic check.`);
                }
            }

            // Clean up the text extraction instance
            await textPdf.destroy();
            global.gc?.();
        } catch (textExtractErr) {
            console.error(`[CLOUD_WORKER] Text extraction heuristic failed. Proceeding with fallback behavior.`, textExtractErr);
        }

        // Fallback or Safety Caps
        if (splitBoundaries.length === 1) {
             console.log(`[CLOUD_WORKER] No internal boundaries detected. Assuming monolithic single script or fallback standard size.`);
             // If we found nothing, we either slice into standard chunks or assume it's one script.
             // Given the context of a "Massive Bulk Drop", assuming it's one script is risky.
             // We fallback to standard chunking if no explicit reg numbers found.
             const ESTIMATED_SCRIPT_LENGTH = 5;
             for (let i = ESTIMATED_SCRIPT_LENGTH; i < totalPages; i += ESTIMATED_SCRIPT_LENGTH) {
                  splitBoundaries.push(i);
             }
        }

        splitBoundaries.push(totalPages); // Cap the end

        console.log(`[CLOUD_WORKER] Final determined boundaries at pages:`, splitBoundaries);

        // Update status to Injecting
        await prisma.bulkSession.update({
            where: { id: bulkSessionId },
            data: { status: 'INJECTING' }
        });

        // 5. The Slicer & Injection Loop
        console.log(`[CLOUD_WORKER] Commencing PDF Slicing and Queue Injection...`);
        let scriptsProcessed = 0;

        for (let i = 0; i < splitBoundaries.length - 1; i++) {
            const startPage = splitBoundaries[i];
            const endPage = splitBoundaries[i+1] - 1;

            if (startPage > endPage) continue;

            try {
                // Slice the PDF
                const sliceDoc = await PDFDocument.create();
                const pageIndices = Array.from({ length: endPage - startPage + 1 }, (_, k) => startPage + k);
                const copiedPages = await sliceDoc.copyPages(pdfDoc, pageIndices);
                copiedPages.forEach((page) => sliceDoc.addPage(page));

                const sliceBytes = await sliceDoc.save();
                const sliceBuffer = Buffer.from(sliceBytes);

                // Upload slice back to Supabase
                const sliceFilename = `submissions/bulk_${bulkSessionId}/script_${i}_${uuidv4().substring(0,8)}.pdf`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('exam_pdfs')
                    .upload(sliceFilename, sliceBuffer, {
                        contentType: 'application/pdf',
                        upsert: false
                    });

                if (uploadError) throw new Error(`Slice Upload Error: ${uploadError.message}`);

                // Insert Standard Submission
                const submission = await prisma.submission.create({
                    data: {
                        workSessionId: workSessionId,
                        userId: null,
                        studentRegNo: null, // Let the grading Map-Reduce worker extract this
                        filePath: uploadData.path,
                        status: 'PENDING',
                        submittedAt: new Date()
                    }
                });

                // Insert Job (The Trojan Horse)
                await prisma.job.create({
                    data: {
                        type: 'AI_GRADE_SUBMISSION',
                        payload: JSON.stringify({ submissionId: submission.id }),
                        status: 'PENDING'
                    }
                });

                scriptsProcessed++;

                // Opportunistic Garbage Collection to prevent V8 heap bloat
                global.gc?.();

            } catch (sliceError) {
                console.error(`[CLOUD_WORKER] Failed to slice script at index ${i}:`, sliceError);
                // We continue slicing the rest even if one fails
            }

            // Update progress occasionally
            if (scriptsProcessed % 5 === 0) {
                 await prisma.bulkSession.update({
                    where: { id: bulkSessionId },
                    // Safely approximate progress if chunk size isn't static
                    data: { processedFiles: Math.min(scriptsProcessed * 5, totalPages) }
                });
            }
        }

        // 6. Wake the Beast
        console.log(`[CLOUD_WORKER] Successfully injected ${scriptsProcessed} jobs. Waking the queue...`);
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/queue/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trigger: 'bulk_injection' })
        }).catch(e => console.error("[CLOUD_WORKER] Queue ping failed (safe to ignore if polling):", e.message));

        // 7. Finalize Bulk Session
        await prisma.bulkSession.update({
            where: { id: bulkSessionId },
            data: {
                status: 'READY',
                processedFiles: totalPages
            }
        });

        console.log(`[CLOUD_WORKER] Pipeline complete for ${bulkSessionId}.`);

    } catch (fatalError: any) {
        console.error(`[CLOUD_WORKER] FATAL ERROR for BulkSession ${bulkSessionId}:`, fatalError);

        await prisma.bulkSession.update({
            where: { id: bulkSessionId },
            data: {
                status: 'FAILED',
                errorMessage: fatalError.message || 'Unknown fatal error during slicing.'
            }
        });

        // Cleanup empty worksession if we failed before inserting submissions
        if (workSessionId) {
            const subCount = await prisma.submission.count({ where: { workSessionId } });
            if (subCount === 0) {
                await prisma.workSession.delete({ where: { id: workSessionId } }).catch(() => {});
            }
        }

        throw fatalError;
    } finally {
        // Destroy massive references
        fileBuffer = null;
        pdfDoc = null;
        global.gc?.();
    }
}
