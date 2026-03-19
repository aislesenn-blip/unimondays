import { PDFDocument } from 'pdf-lib';
import { pdf } from 'pdf-to-img';
import { readFile } from './storage';

export async function getPdfPageCount(filePathOrUrl: string | null): Promise<number> {
    if (!filePathOrUrl) throw new Error("File path is missing.");
    const buffer = await readFile(filePathOrUrl, 'exam_pdfs');
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true, updateMetadata: false });
    return pdfDoc.getPageCount();
}

export async function extractSinglePageImage(filePathOrUrl: string | null, targetPageNum: number): Promise<Buffer> {
    if (!filePathOrUrl) throw new Error("File path is missing.");
    const buffer = await readFile(filePathOrUrl, 'exam_pdfs');

    // L8 MANDATE: Scale 0.6 prevents Vercel 1024MB RAM OOM Crashes permanently
    const document = await pdf(buffer, { scale: 0.6 });
    console.log("[PLAYBOOK-TRACE] [OCR-PREP] PDF buffer converted to images at memory-safe scale 0.6.");

    let currentPage = 1;
    for await (const imageBuffer of document) {
        if (currentPage === targetPageNum) return imageBuffer;
        currentPage++;
    }
    throw new Error(`Page ${targetPageNum} not found in document.`);
}

export async function extractMultiplePageImagesFromBuffer(buffer: Buffer, targetPages: number[]): Promise<Map<number, Buffer>> {
    // L8 MANDATE: Scale 0.6 prevents Vercel 1024MB RAM OOM Crashes permanently
    const document = await pdf(buffer, { scale: 0.6 });
    console.log("[PLAYBOOK-TRACE] [OCR-PREP] PDF buffer converted to images at memory-safe scale 0.6.");

    const extractedImages = new Map<number, Buffer>();
    const pagesToFind = new Set(targetPages);

    let currentPage = 1;
    for await (const imageBuffer of document) {
        if (pagesToFind.has(currentPage)) {
            extractedImages.set(currentPage, imageBuffer);
            pagesToFind.delete(currentPage);
        }
        if (pagesToFind.size === 0) break;
        currentPage++;
    }
    return extractedImages;
}