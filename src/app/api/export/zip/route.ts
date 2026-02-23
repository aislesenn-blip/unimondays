import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { quizId } = await req.json();

    const submissions = await prisma.submission.findMany({
      where: {
          quizId: parseInt(quizId),
          status: "graded"
      },
      include: { score: true }
    });

    if (submissions.length === 0) {
        return NextResponse.json({ error: "No graded submissions found" }, { status: 404 });
    }

    const zip = new JSZip();

    for (const sub of submissions) {
        // Create a PDF report for each student
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const { width, height } = page.getSize();

        page.drawText(`Result Report: ${sub.studentRegNo}`, { x: 50, y: height - 50, size: 20, font });
        page.drawText(`Marks: ${sub.score?.totalMarks || 0}`, { x: 50, y: height - 80, size: 15, font });
        page.drawText(`Remarks: ${sub.score?.remarks || "None"}`, { x: 50, y: height - 110, size: 12, font });

        // In real app, we would embed the scanned image here from sub.filePath

        const pdfBytes = await pdfDoc.save();
        zip.file(`${sub.studentRegNo}_Result.pdf`, pdfBytes);
    }

    const zipContent = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(zipContent as any, {
        headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="Quiz_${quizId}_Results.zip"`,
        }
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
