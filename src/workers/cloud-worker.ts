import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase'; // Using the server-side admin client
import { PDFDocument } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';

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

interface CloudMarkingPayload {
    bulkSessionId: string;
    bulkFilePath: string;
    lecturerId: string;
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
        console.log(`[CLOUD_WORKER] Initiating Mechanical Pipeline for BulkSession: ${bulkSessionId}`);

        // 1. Fetch the massive PDF directly from Supabase Storage (Internal Network)
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('exam_pdfs')
            .download(bulkFilePath);

        if (downloadError || !fileData) {
            throw new Error(`Failed to download bulk PDF from Supabase: ${downloadError?.message}`);
        }

        fileBuffer = Buffer.from(await fileData.arrayBuffer());
        console.log(`[CLOUD_WORKER] Downloaded monolithic PDF (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

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

        // 4. THE MECHANICAL SPLIT (Blank Page Detection Heuristic)
        console.log(`[CLOUD_WORKER] Initiating Mechanical Blank Page Detection...`);
        const blankPageIndices: number[] = []; // 0-indexed pages that are blank separators
        const pageSizes: number[] = [];

        // First Pass: Measure the approximate byte size of each page stream
        // Scanned blank pages (even with noise) are significantly smaller than pages dense with handwritten text/diagrams.
        for (let i = 0; i < totalPages; i++) {
            try {
                // A fast way to measure a single page's weight without re-saving the entire PDF:
                // We create a tiny temp document, copy just this page, and save it to memory.
                const tempDoc = await PDFDocument.create();
                const [copiedPage] = await tempDoc.copyPages(pdfDoc, [i]);
                tempDoc.addPage(copiedPage);
                const bytes = await tempDoc.save({ useObjectStreams: false });
                pageSizes.push(bytes.length);
            } catch (err) {
                console.warn(`[CLOUD_WORKER] Failed to measure page ${i}, assuming average weight.`, err);
                pageSizes.push(500000); // Assume large if error to prevent false positive blank
            }
        }

        // Calculate a dynamic threshold.
        // If a page is less than 35% of the average page size, we consider it a blank separator.
        // We use a minimum threshold (e.g., 50KB) as a floor because very compressed scans might all be small.
        const avgSize = pageSizes.reduce((a, b) => a + b, 0) / (pageSizes.length || 1);
        const dynamicThreshold = Math.max(avgSize * 0.35, 50000); // Floor at 50KB

        for (let i = 0; i < pageSizes.length; i++) {
            if (pageSizes[i] < dynamicThreshold) {
                console.log(`[CLOUD_WORKER] Blank Separator detected at page index ${i} (Size: ${(pageSizes[i]/1024).toFixed(1)}KB, Threshold: ${(dynamicThreshold/1024).toFixed(1)}KB)`);
                blankPageIndices.push(i);
            }
        }

        // If no blank pages were inserted by the teacher, we must fail safely rather than grading a 1000-page Frankenstein exam.
        if (blankPageIndices.length === 0 && totalPages > 30) {
            throw new Error(`CRITICAL ALARM: No mechanical blank separator pages detected. To protect data integrity, we will not slice this ${totalPages}-page monolithic document. Please ensure blank separator sheets are inserted between each student script and re-upload.`);
        }

        // Generate the grouping maps for individual scripts (excluding the blank pages)
        const scripts: { start: number, end: number }[] = [];
        let currentScriptStart = 0;

        for (let i = 0; i < totalPages; i++) {
            if (blankPageIndices.includes(i)) {
                // A blank page marks the END of the current script (if it has pages)
                if (currentScriptStart < i) {
                    scripts.push({ start: currentScriptStart, end: i - 1 });
                }
                // The next script will start AFTER this blank page
                currentScriptStart = i + 1;
            }
        }
        // Catch the final script if the PDF didn't end on a blank page
        if (currentScriptStart < totalPages) {
            scripts.push({ start: currentScriptStart, end: totalPages - 1 });
        }

        console.log(`[CLOUD_WORKER] Successfully mapped ${scripts.length} isolated student scripts.`);

        // Update status to Injecting
        await prisma.bulkSession.update({
            where: { id: bulkSessionId },
            data: { status: 'INJECTING' }
        });

        // 5. THE TROJAN HORSE INJECTION (Slicing & Queueing)
        console.log(`[CLOUD_WORKER] Commencing PDF Slicing and Queue Injection...`);
        let scriptsProcessed = 0;

        for (let i = 0; i < scripts.length; i++) {
            const script = scripts[i];

            try {
                // Slice the PDF using exact boundaries, discarding the blank page entirely
                const sliceDoc = await PDFDocument.create();
                const pageIndices = Array.from({ length: script.end - script.start + 1 }, (_, k) => script.start + k);
                const copiedPages = await sliceDoc.copyPages(pdfDoc, pageIndices);
                copiedPages.forEach((page) => sliceDoc.addPage(page));

                const sliceBytes = await sliceDoc.save();
                const sliceBuffer = Buffer.from(sliceBytes);

                // Upload clean, isolated slice back to Supabase
                const sliceFilename = `submissions/bulk_${bulkSessionId}/script_${i}_${uuidv4().substring(0,8)}.pdf`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('exam_pdfs')
                    .upload(sliceFilename, sliceBuffer, {
                        contentType: 'application/pdf',
                        upsert: false
                    });

                if (uploadError) throw new Error(`Slice Upload Error: ${uploadError.message}`);

                // Insert Standard Submission (Registration Number is explicitly NULL, the grading OCR will find it later)
                const submission = await prisma.submission.create({
                    data: {
                        workSessionId: workSessionId,
                        userId: null,
                        studentRegNo: null,
                        filePath: uploadData.path,
                        status: 'PENDING',
                        submittedAt: new Date()
                    }
                });

                // Insert standard Job (The Trojan Horse: AI_GRADE_SUBMISSION)
                await prisma.job.create({
                    data: {
                        type: 'AI_GRADE_SUBMISSION',
                        payload: JSON.stringify({ submissionId: submission.id }),
                        status: 'PENDING'
                    }
                });

                scriptsProcessed++;

                // Opportunistic Garbage Collection to prevent V8 heap bloat during massive monolithic slicing
                global.gc?.();

            } catch (sliceError) {
                console.error(`[CLOUD_WORKER] Failed to slice and inject script at index ${i}:`, sliceError);
                // We continue slicing the rest even if one fails
            }

            // Update progress occasionally
            if (scriptsProcessed % 5 === 0) {
                 await prisma.bulkSession.update({
                    where: { id: bulkSessionId },
                    // Safely approximate progress based on the number of scripts processed vs total pages
                    data: { processedFiles: Math.min(Math.round((scriptsProcessed / scripts.length) * totalPages), totalPages) }
                });
            }
        }

        // 6. Wake the Beast (Ping the existing Queue Processor)
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

        console.log(`[CLOUD_WORKER] Mechanical Pipeline complete for ${bulkSessionId}. Sliced ${scriptsProcessed} individual student scripts.`);

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
