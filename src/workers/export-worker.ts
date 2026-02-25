import JSZip from 'jszip';
import { Job } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createFeedbackPage, createAnnotatedPdf, generateMasterExcel } from '@/lib/export-service';
import { saveBuffer, readFile } from '@/lib/storage';

export async function handleExportZip(job: Job) {
  const data = JSON.parse(job.data);
  const { quizId } = data;

  if (!quizId) throw new Error("Missing quizId");

  const submissions = await prisma.submission.findMany({
    where: { quizId },
    include: { score: true, user: true }
  });

  const zip = new JSZip();

  // 1. Generate per-student files
  for (const sub of submissions) {
    const regNo = sub.studentRegNo || `SUB_${sub.id}`;
    const safeRegNo = regNo.replace(/[^a-zA-Z0-9]/g, '_');

    try {
      // Feedback Page
      const feedbackPdf = await createFeedbackPage(sub);
      zip.file(`${safeRegNo}_Feedback.pdf`, feedbackPdf);

      // Original & Annotated
      if (sub.filePath) {
         try {
           const originalBuffer = await readFile(sub.filePath);
           zip.file(`${safeRegNo}_Script.pdf`, originalBuffer);

           const annotatedPdf = await createAnnotatedPdf(sub, feedbackPdf);
           zip.file(`${safeRegNo}_Annotated.pdf`, annotatedPdf);
         } catch (e) {
           console.warn(`Could not read/process file for ${regNo}`, e);
         }
      }
    } catch (e) {
      console.error(`Error processing submission ${sub.id}`, e);
    }
  }

  // 2. Master Excel
  const excelBuffer = await generateMasterExcel(submissions);
  zip.file(`Master_Grades_${quizId}.xlsx`, excelBuffer);

  // 3. Save ZIP
  const content = await zip.generateAsync({ type: "nodebuffer" });
  const zipPath = await saveBuffer(content, `Export_${quizId}.zip`, 'exports');

  return { filePath: zipPath };
}
