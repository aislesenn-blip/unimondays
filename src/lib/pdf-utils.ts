import { PDFDocument } from 'pdf-lib';
import { pdf } from 'pdf-to-img';
import { readFile } from './storage';

export async function getPdfPageCount(filePathOrUrl: string | null): Promise<number> {
    if (!filePathOrUrl) throw new Error("File path is missing.");

    // Retrieve file buffer
    const buffer = await readFile(filePathOrUrl, 'exam_pdfs');

    // Use pdf-lib to get the page count extremely quickly
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true, updateMetadata: false });
    return pdfDoc.getPageCount();
}

export async function extractSinglePageImage(filePathOrUrl: string | null, targetPageNum: number): Promise<Buffer> {
    if (!filePathOrUrl) throw new Error("File path is missing.");

    // Retrieve file buffer
    const buffer = await readFile(filePathOrUrl, 'exam_pdfs');

    // Iterate until we find the target page using pdf-to-img
    const document = await pdf(buffer, { scale: 2.0 }); // Scale 2.0 for higher clarity for the OCR map phase

    let currentPage = 1;
    for await (const imageBuffer of document) {
        if (currentPage === targetPageNum) {
            return imageBuffer;
        }
        currentPage++;
    }

    throw new Error(`Page ${targetPageNum} not found in document.`);
}