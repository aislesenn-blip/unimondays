import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { quizId } = await req.json();

    if (!quizId) {
        return NextResponse.json({ error: "Missing quizId" }, { status: 400 });
    }

    const submissions = await prisma.submission.findMany({
      where: { quizId: parseInt(quizId) },
      include: { score: true },
      orderBy: { studentRegNo: 'asc' }
    });

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([842, 595]); // Landscape A4
    const { width, height } = page.getSize();
    let y = height - 50;

    page.drawText(`Quiz Results Summary (ID: ${quizId})`, { x: 50, y, size: 18, font: boldFont });
    y -= 30;

    // Headers
    const headers = ["Reg No", "Student Name", "Status", "Score", "Confidence", "Remarks"];
    const colWidths = [100, 150, 80, 60, 80, 250];
    let x = 50;

    headers.forEach((h, i) => {
        page.drawText(h, { x, y, size: 10, font: boldFont });
        x += colWidths[i];
    });
    y -= 20;

    // Rows
    for (const sub of submissions) {
        if (y < 50) {
            page = pdfDoc.addPage([842, 595]);
            y = height - 50;
            // Redraw headers? Optional.
        }

        x = 50;
        const rowData = [
            sub.studentRegNo,
            sub.studentName || "-",
            sub.status,
            sub.score?.totalMarks?.toString() || "-",
            sub.score?.confidence?.toFixed(1) + "%" || "-",
            sub.score?.remarks ? sub.score.remarks.substring(0, 40) + "..." : "-"
        ];

        rowData.forEach((d, i) => {
            page.drawText(d, { x, y, size: 9, font });
            x += colWidths[i];
        });
        y -= 15;
    }

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Quiz_${quizId}_Table.pdf"`,
      },
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
