import { PDFDocument } from 'pdf-lib';
import { analyzePdfStructure } from './ai/gemini';
import { saveBuffer } from './storage';

export async function splitPdfBatch(buffer: Buffer): Promise<{ regNo: string, filePath: string }[]> {
  // 1. Analyze structure (find start/end pages)
  const splits = await analyzePdfStructure(buffer);

  if (!splits || splits.length === 0) {
    throw new Error("No students detected in PDF.");
  }

  const srcDoc = await PDFDocument.load(buffer);
  const results = [];

  for (const split of splits) {
    // 2. Extract pages
    const subDoc = await PDFDocument.create();
    // pdf-lib uses 0-based index. Gemini returns 1-based.
    const start = split.startPage - 1;
    const end = split.endPage - 1;

    // Validate range
    if (start < 0 || end >= srcDoc.getPageCount() || start > end) {
      console.warn(`Invalid split range for ${split.regNo}: ${start}-${end}`);
      continue;
    }

    const pageIndices = [];
    for (let i = start; i <= end; i++) pageIndices.push(i);

    const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach(page => subDoc.addPage(page));

    const pdfBytes = await subDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // 3. Save file
    // Sanitize regNo for filename
    const safeRegNo = split.regNo.replace(/[^a-zA-Z0-9]/g, '_');
    const filePath = await saveBuffer(pdfBuffer, `${safeRegNo}.pdf`, 'submissions/split');

    results.push({
      regNo: split.regNo,
      filePath
    });
  }

  return results;
}
