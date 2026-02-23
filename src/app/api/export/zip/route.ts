import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { quizId } = await req.json();

    if (!quizId) {
        return NextResponse.json({ error: "Missing quizId" }, { status: 400 });
    }

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
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const { width, height } = page.getSize();

        // Header
        page.drawText(`Assessment Result Report`, { x: 50, y: height - 50, size: 20, font: boldFont });
        page.drawText(`Reg No: ${sub.studentRegNo}`, { x: 50, y: height - 80, size: 16, font: boldFont });
        page.drawText(`Date: ${new Date(sub.submittedAt).toLocaleDateString()}`, { x: 300, y: height - 80, size: 12, font });

        // Score
        page.drawText(`Total Marks:`, { x: 50, y: height - 120, size: 14, font: boldFont });
        page.drawText(`${sub.score?.totalMarks || 0}`, { x: 150, y: height - 120, size: 14, font });

        // Remarks
        page.drawText(`Remarks:`, { x: 50, y: height - 150, size: 12, font: boldFont });
        const remarks = sub.score?.remarks || "None";
        // Simple wrap
        const words = remarks.split(' ');
        let line = '';
        let y = height - 170;
        for (const word of words) {
            if ((line + word).length > 80) {
                page.drawText(line, { x: 50, y, size: 10, font });
                y -= 15;
                line = word + ' ';
            } else {
                line += word + ' ';
            }
        }
        page.drawText(line, { x: 50, y, size: 10, font });

        // Breakdown
        y -= 30;
        page.drawText(`Breakdown:`, { x: 50, y, size: 12, font: boldFont });
        y -= 20;

        if (sub.score?.breakdown) {
            try {
                const bd = JSON.parse(sub.score.breakdown);
                if (Array.isArray(bd)) {
                    for (const q of bd) {
                        page.drawText(`${q.question}: ${q.marks} / ${q.max_marks || '-'}`, { x: 50, y, size: 10, font });
                        y -= 15;
                    }
                }
            } catch (e) {}
        }

        // Embed Original Student Script
        if (sub.filePath) {
            try {
                // Check if file exists
                await fs.access(sub.filePath);

                const studentPdfBuffer = await fs.readFile(sub.filePath);
                const studentPdf = await PDFDocument.load(studentPdfBuffer);
                const copiedPages = await pdfDoc.copyPages(studentPdf, studentPdf.getPageIndices());

                for (const p of copiedPages) {
                    pdfDoc.addPage(p);
                }
            } catch (err) {
                console.warn(`Could not load original script for ${sub.id} at ${sub.filePath}:`, err);
                // Add a placeholder page saying script is missing
                const errPage = pdfDoc.addPage();
                errPage.drawText(`Original script not found.`, { x: 50, y: height - 50, size: 14, font: boldFont });
            }
        }

        const pdfBytes = await pdfDoc.save();
        zip.file(`${sub.studentRegNo.replace(/[^a-zA-Z0-9]/g, "_")}_Result.pdf`, pdfBytes);
    }

    const zipContent = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(zipContent as any, {
        headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="Quiz_${quizId}_Results.zip"`,
        }
    });

  } catch (e: any) {
    console.error("Export Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
