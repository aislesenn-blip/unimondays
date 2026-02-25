import { PDFDocument } from 'pdf-lib';

export async function splitPdf(pdfBuffer: Buffer): Promise<Buffer[]> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    const pages: Buffer[] = [];

    for (let i = 0; i < pageCount; i++) {
      const newPdf = await PDFDocument.create();
      const [page] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(page);
      const pdfBytes = await newPdf.save();
      pages.push(Buffer.from(pdfBytes));
    }

    return pages;
  } catch (error) {
    console.error("Error splitting PDF:", error);
    throw new Error("Failed to split PDF.");
  }
}

export async function mergePdfs(pdfBuffers: Buffer[]): Promise<Buffer> {
  try {
    const mergedPdf = await PDFDocument.create();

    for (const buffer of pdfBuffers) {
      const pdf = await PDFDocument.load(buffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const pdfBytes = await mergedPdf.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("Error merging PDFs:", error);
    throw new Error("Failed to merge PDFs.");
  }
}
