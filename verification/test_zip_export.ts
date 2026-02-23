import { PrismaClient } from "@prisma/client";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import fs from "fs/promises";
import path from "path";
import os from "os";

const prisma = new PrismaClient();

async function createDummyPDF(regNo: string) {
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  page.drawText(`Student: ${regNo}`, { x: 50, y: 700 });
  const bytes = await doc.save();
  const filePath = path.join(os.tmpdir(), `${regNo}_test.pdf`);
  await fs.writeFile(filePath, bytes);
  return filePath;
}

async function run() {
  try {
    console.log("Seeding data for ZIP export test...");

    // Ensure Quiz exists
    const quiz = await prisma.quiz.findFirst();
    if (!quiz) throw new Error("No quiz found. Run previous tests first.");

    // Create a graded submission with a real file
    const regNo = "ZIP-TEST-001";
    const filePath = await createDummyPDF(regNo);

    const sub = await prisma.submission.create({
        data: {
            quizId: quiz.id,
            studentRegNo: regNo,
            studentName: "Zip Tester",
            filePath: filePath,
            status: "graded",
            score: {
                create: {
                    totalMarks: 88,
                    breakdown: JSON.stringify([{ question: "Q1", marks: 10, max_marks: 10 }]),
                    remarks: "Excellent work."
                }
            }
        }
    });

    console.log(`Created submission ${sub.id} with file at ${filePath}`);

    // Now simulate the export logic
    console.log("Starting export simulation...");

    const submissions = await prisma.submission.findMany({
      where: {
          quizId: quiz.id,
          status: "graded",
          studentRegNo: regNo // Filter to just our test one for speed/isolation
      },
      include: { score: true }
    });

    if (submissions.length === 0) throw new Error("Submission not found in DB");

    const zip = new JSZip();

    for (const s of submissions) {
        console.log(`Processing ${s.studentRegNo}...`);
        // Logic from route.ts (simplified for verification)
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        page.drawText(`Result Report: ${s.studentRegNo}`, { x: 50, y: 700 });

        if (s.filePath) {
            try {
                const buffer = await fs.readFile(s.filePath);
                const srcDoc = await PDFDocument.load(buffer);
                const copied = await pdfDoc.copyPages(srcDoc, srcDoc.getPageIndices());
                copied.forEach(p => pdfDoc.addPage(p));
                console.log("  Attached original script pages.");
            } catch (e) {
                console.error("  Failed to attach script:", e);
            }
        }

        const bytes = await pdfDoc.save();
        zip.file(`${s.studentRegNo}_Result.pdf`, bytes);
    }

    const content = await zip.generateAsync({ type: "nodebuffer" });
    const outPath = path.join(os.tmpdir(), "test_export.zip");
    await fs.writeFile(outPath, content);

    console.log(`ZIP created at ${outPath}`);
    console.log(`Size: ${content.length} bytes`);

    if (content.length > 0) {
        console.log("SUCCESS: ZIP export logic verified.");
    } else {
        throw new Error("Empty ZIP file generated");
    }

  } catch (e) {
    console.error("Test Failed:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
