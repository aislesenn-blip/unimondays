import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const submissions = await prisma.submission.findMany({
        where: { status: "graded" },
        include: { score: true },
        orderBy: { studentRegNo: "asc" }
    });

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Landscape A4
    let page = pdfDoc.addPage([842, 595]);
    let { width, height } = page.getSize();
    let y = height - 50;

    // Header
    page.drawText("Assessment Results Report", { x: 50, y, size: 24, font: boldFont });
    y -= 30;
    page.drawText(`Generated: ${new Date().toLocaleDateString()}`, { x: 50, y, size: 12, font });
    y -= 40;

    // Table Header
    const headers = ["Reg No", "Marks", "Status", "Remarks"];
    const xPositions = [50, 150, 250, 400];

    headers.forEach((h, i) => {
        page.drawText(h, { x: xPositions[i], y, size: 12, font: boldFont });
    });

    y -= 5;
    page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0, 0, 0) });
    y -= 20;

    // Rows
    for (const sub of submissions) {
        if (y < 50) {
            page = pdfDoc.addPage([842, 595]);
            y = height - 50;
            // Redraw Header
             headers.forEach((h, i) => {
                page.drawText(h, { x: xPositions[i], y, size: 12, font: boldFont });
            });
            y -= 25;
        }

        const remarks = sub.score?.remarks || "-";
        // Simple word wrap or truncation for remarks
        const truncatedRemarks = remarks.length > 80 ? remarks.slice(0, 80) + "..." : remarks;

        page.drawText(sub.studentRegNo, { x: xPositions[0], y, size: 10, font });
        page.drawText((sub.score?.totalMarks || 0).toString(), { x: xPositions[1], y, size: 10, font });
        page.drawText(sub.status, { x: xPositions[2], y, size: 10, font });
        page.drawText(truncatedRemarks, { x: xPositions[3], y, size: 10, font });

        y -= 20;
    }

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes as any, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="results_report.pdf"',
        }
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
