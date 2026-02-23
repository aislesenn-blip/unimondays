import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import JSZip from "jszip";
import fs from "fs/promises";

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
        status: "graded",
      },
      include: {
        score: true,
        quiz: true
      },
    });

    if (submissions.length === 0) {
      return NextResponse.json({ error: "No graded submissions found" }, { status: 404 });
    }

    const zip = new JSZip();

    for (const sub of submissions) {
      if (!sub.filePath) continue;

      try {
        // Create new PDF
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Add Cover Page
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();

        let y = height - 50;
        const fontSize = 12;
        const lineHeight = 14;

        // Header
        page.drawText(`Assessment Result`, { x: 50, y, size: 20, font: boldFont });
        y -= 30;
        page.drawText(`Student: ${sub.studentName || "Unknown"}`, { x: 50, y, size: fontSize, font });
        y -= lineHeight;
        page.drawText(`Reg No: ${sub.studentRegNo}`, { x: 50, y, size: fontSize, font });
        y -= lineHeight;
        page.drawText(`Quiz: ${sub.quiz.title}`, { x: 50, y, size: fontSize, font });
        y -= 30;

        // Score
        page.drawText(`Total Score: ${sub.score?.totalMarks || 0}`, { x: 50, y, size: 16, font: boldFont, color: rgb(0, 0.5, 0) });
        y -= 30;

        // Remarks
        page.drawText(`Remarks:`, { x: 50, y, size: 14, font: boldFont });
        y -= 20;

        const remarks = sub.score?.remarks || "No remarks.";
        // Simple text wrapping (very basic)
        const words = remarks.split(' ');
        let line = '';
        for (const word of words) {
            if ((line + word).length > 80) {
                page.drawText(line, { x: 50, y, size: fontSize, font });
                y -= lineHeight;
                line = '';
            }
            line += word + ' ';
        }
        page.drawText(line, { x: 50, y, size: fontSize, font });
        y -= 30;

        // Breakdown
        if (sub.score?.breakdown) {
            page.drawText(`Question Breakdown:`, { x: 50, y, size: 14, font: boldFont });
            y -= 20;
            try {
                const breakdown = JSON.parse(sub.score.breakdown);
                // breakdown is array of { question, marks, remarks }
                // Check if it's an array, sometimes it might be object or string
                if (Array.isArray(breakdown)) {
                     for (const q of breakdown) {
                        const qText = `${q.question || 'Q'}: ${q.marks} / ${q.max_marks || '?'} - ${q.remarks || ''}`;
                        // Wrap
                        if (qText.length > 80) {
                             page.drawText(qText.substring(0, 80) + '...', { x: 50, y, size: 10, font });
                        } else {
                             page.drawText(qText, { x: 50, y, size: 10, font });
                        }
                        y -= lineHeight;
                        if (y < 50) {
                            // New page needed
                             // Simplified: just stop drawing or create new page.
                             // For now, let's just stop.
                             break;
                        }
                     }
                }
            } catch (e) {
                // Ignore parsing error
            }
        }

        // Append Original Script
        try {
            const scriptBuffer = await fs.readFile(sub.filePath);
            const scriptPdf = await PDFDocument.load(scriptBuffer);
            const copiedPages = await pdfDoc.copyPages(scriptPdf, scriptPdf.getPageIndices());
            copiedPages.forEach((p) => pdfDoc.addPage(p));
        } catch (e) {
            console.error(`Failed to load script PDF for ${sub.studentRegNo}:`, e);
            page.drawText(`(Original script could not be loaded: ${sub.filePath})`, { x: 50, y: y - 20, size: 10, color: rgb(1, 0, 0), font });
        }

        const pdfBytes = await pdfDoc.save();
        const fileName = `${sub.studentRegNo}_${sub.studentName?.replace(/\s+/g, '_')}_Result.pdf`;
        zip.file(fileName, pdfBytes);

      } catch (e) {
        console.error(`Error generating PDF for ${sub.studentRegNo}:`, e);
      }
    }

    const zipContent = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(zipContent as any, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="Quiz_${quizId}_Results.zip"`,
      },
    });

  } catch (e: any) {
    console.error("Export Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
