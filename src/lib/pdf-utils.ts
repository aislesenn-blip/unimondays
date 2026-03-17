import { PDFDocument } from 'pdf-lib';
import { pdf } from 'pdf-to-img';
import { readFile } from './storage';

export async function getPdfPageCount(filePathOrUrl: string | null): Promise<number> {
    if (!filePathOrUrl) throw new Error("File path is missing.");

    let buffer: Buffer | null = null;
    let lastError: any = null;

    // Retry loop for eventual consistency CDN delays right after upload
    for (let i = 0; i < 4; i++) {
        try {
            buffer = await readFile(filePathOrUrl, 'exam_pdfs');
            break; // Success
        } catch (error) {
            lastError = error;
            console.warn(`[PDF-UTILS] Failed to read file ${filePathOrUrl} for page count. Attempt ${i + 1}/4. Retrying in ${2000 * Math.pow(2, i)}ms...`);
            await new Promise(res => setTimeout(res, 2000 * Math.pow(2, i))); // 2s, 4s, 8s backoff
        }
    }

    if (!buffer) {
        throw new Error(`Failed to read file after 4 retries: ${lastError?.message || 'Unknown error'}`);
    }

    // Use pdf-lib to get the page count extremely quickly
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true, updateMetadata: false });
    return pdfDoc.getPageCount();
}

export async function extractSinglePageImage(filePathOrUrl: string | null, targetPageNum: number): Promise<Buffer> {
    if (!filePathOrUrl) throw new Error("File path is missing.");

    // Retrieve file buffer
    const buffer = await readFile(filePathOrUrl, 'exam_pdfs');

    // Iterate until we find the target page using pdf-to-img
    const document = await pdf(buffer, { scale: 1.5 }); // memory-safe scale 1.5
    console.log("[PLAYBOOK-TRACE] [OCR-PREP] PDF buffer converted to images at memory-safe scale 1.5.");

    let currentPage = 1;
    for await (const imageBuffer of document) {
        if (currentPage === targetPageNum) {
            return imageBuffer;
        }
        currentPage++;
    }

    throw new Error(`Page ${targetPageNum} not found in document.`);
}

export async function extractMultiplePageImagesFromBuffer(buffer: Buffer, targetPages: number[]): Promise<Map<number, Buffer>> {
    // Iterate through the PDF once, extracting only the pages we need
    const document = await pdf(buffer, { scale: 1.5 }); // memory-safe scale 1.5
    console.log("[PLAYBOOK-TRACE] [OCR-PREP] PDF buffer converted to images at memory-safe scale 1.5.");
    const extractedImages = new Map<number, Buffer>();
    const pagesToFind = new Set(targetPages);

    let currentPage = 1;
    for await (const imageBuffer of document) {
        if (pagesToFind.has(currentPage)) {
            extractedImages.set(currentPage, imageBuffer);
            pagesToFind.delete(currentPage);
        }

        // Early exit if we found all targets
        if (pagesToFind.size === 0) break;

        currentPage++;
    }

    if (pagesToFind.size > 0) {
         console.warn(`[PDF-UTILS] Warning: Could not find pages ${Array.from(pagesToFind).join(', ')} in document.`);
    }

    return extractedImages;
}