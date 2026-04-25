import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import JSZip from 'jszip';
import { createFeedbackPage, createAnnotatedPdf, generateMasterExcel, FullSubmission } from '@/lib/export-service';
import { saveBuffer, readFile } from '@/lib/storage';
import { cookies } from 'next/headers';

export const maxDuration = 300; // Important for long exports

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth-session');

    if (!sessionCookie) {
         return NextResponse.json({ error: 'Unauthorized: No session found' }, { status: 401 });
    }

    let session;
    try {
        session = JSON.parse(sessionCookie.value);
    } catch (e) {
        return NextResponse.json({ error: 'Unauthorized: Invalid session' }, { status: 401 });
    }

    const userId = session.userId;
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    const { id: workSessionId } = await params;

    // Verify Ownership
    const workSession = await prisma.workSession.findUnique({
        where: { id: workSessionId, lecturerId: userId }
    });

    if (!workSession && session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Work Session not found or unauthorized' }, { status: 403 });
    }

    const submissions = await prisma.submission.findMany({
      where: { workSessionId },
      include: { score: true, user: true }
    });

    if (submissions.length === 0) {
        return NextResponse.json({ error: "No submissions found to export." }, { status: 400 });
    }

    const zip = new JSZip();

    // 1. Generate per-student files
    for (const sub of submissions) {
      const regNo = sub.studentRegNo || `SUB_${sub.id}`;
      const safeRegNo = regNo.replace(/[^a-zA-Z0-9]/g, '_');

      try {
        // Feedback Page
        const feedbackPdf = await createFeedbackPage(sub as FullSubmission);
        zip.file(`${safeRegNo}_Feedback.pdf`, feedbackPdf);

        // Original & Annotated
        if (sub.filePath) {
           try {
             // In text-only mode, filePath might be null or point to the originally uploaded file in Supabase
             const originalBuffer = await readFile(sub.filePath, 'exam_pdfs');
             zip.file(`${safeRegNo}_Script.pdf`, originalBuffer);

             const annotatedPdf = await createAnnotatedPdf(sub as FullSubmission, feedbackPdf);
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
    const excelBuffer = await generateMasterExcel(submissions as FullSubmission[]);
    zip.file(`Master_Grades_${workSessionId}.xlsx`, excelBuffer);

    // 3. Save ZIP
    const content = await zip.generateAsync({ type: "nodebuffer" });
    const zipPath = await saveBuffer(content, `Export_${workSessionId}.zip`, 'exports');

    return NextResponse.json({ success: true, filePath: zipPath });

  } catch (error: any) {
    console.error("Export Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
