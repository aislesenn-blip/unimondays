import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as XLSX from 'xlsx';
import { Submission, Score, WorkSession, User } from '@prisma/client';
import { readFile } from '@/lib/storage';

export type FullSubmission = Submission & {
  score: Score | null;
  user: User | null;
};

export async function createFeedbackPage(submission: FullSubmission): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  let y = height - 50;

  // Header
  page.drawText(`Feedback Report`, { x: 50, y, size: 20, font: timesRomanFont });
  y -= 30;
  page.drawText(`Student: ${submission.studentRegNo || 'Unknown'}`, { x: 50, y, size: 14, font: timesRomanFont });
  y -= 20;
  page.drawText(`Score: ${submission.score?.totalMarks || 0}`, { x: 50, y, size: 14, font: timesRomanFont });
  y -= 40;

  // Breakdown
  if (submission.score?.breakdown) {
    try {
      const breakdown = typeof submission.score.breakdown === 'string'
          ? JSON.parse(submission.score.breakdown)
          : submission.score.breakdown;

      if (Array.isArray(breakdown)) {
          page.drawText('Breakdown:', { x: 50, y, size: 14, font: timesRomanFont });
          y -= 20;

          for (const item of breakdown) {
            if (y < 50) {
              page = pdfDoc.addPage();
              y = height - 50;
            }

            const text = `${item.question}: ${item.score}/${item.max} - ${item.feedback}`;
            const safeText = text.length > 90 ? text.substring(0, 87) + '...' : text;
            page.drawText(safeText, { x: 50, y, size: 10, font: timesRomanFont });
            y -= 15;
          }
      }
    } catch (e) {
      page.drawText('Error parsing breakdown.', { x: 50, y, size: 10, font: timesRomanFont, color: rgb(1, 0, 0) });
    }
  }

  y -= 20;
  if (submission.score?.remarks) {
    page.drawText('Overall Remarks:', { x: 50, y, size: 14, font: timesRomanFont });
    y -= 20;

    const remarks = submission.score.remarks || "";
    // Simple wrap
    let currentLine = "";
    const words = remarks.split(" ");

    for (const word of words) {
        if ((currentLine + word).length > 80) {
            page.drawText(currentLine, { x: 50, y, size: 10, font: timesRomanFont });
            y -= 15;
            currentLine = word + " ";
        } else {
            currentLine += word + " ";
        }
    }
    page.drawText(currentLine, { x: 50, y, size: 10, font: timesRomanFont });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function createAnnotatedPdf(submission: FullSubmission, feedbackBuffer: Buffer): Promise<Buffer> {
  if (!submission.filePath || !submission.filePath.endsWith('.pdf')) {
    // If original is not PDF (e.g. image), just return feedback
    return feedbackBuffer;
  }

  try {
    const originalBuffer = await readFile(submission.filePath);
    const originalPdf = await PDFDocument.load(originalBuffer);
    const feedbackPdf = await PDFDocument.load(feedbackBuffer);

    const mergedPdf = await PDFDocument.create();

    const originalPages = await mergedPdf.copyPages(originalPdf, originalPdf.getPageIndices());
    originalPages.forEach(page => mergedPdf.addPage(page));

    const feedbackPages = await mergedPdf.copyPages(feedbackPdf, feedbackPdf.getPageIndices());
    feedbackPages.forEach(page => mergedPdf.addPage(page));

    const mergedBytes = await mergedPdf.save();
    return Buffer.from(mergedBytes);
  } catch (error) {
    console.warn(`Failed to merge PDF for ${submission.id}:`, error);
    return feedbackBuffer;
  }
}

export async function generateMasterExcel(submissions: FullSubmission[]): Promise<Buffer> {
  const data = submissions.map(sub => ({
    RegNo: sub.studentRegNo,
    Name: sub.studentName || sub.user?.fullName || '',
    Score: sub.score?.totalMarks || 0,
    Status: sub.status,
    Remarks: sub.score?.remarks || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Grades");

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
