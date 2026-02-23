import { ScriptCollator } from "../src/lib/pdf/collation";
import { PDFDocument, StandardFonts } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import os from "os";

// Mock Gemini Service
class MockGeminiService {
  async extractDataFromFile(filePath: string, mimeType: string) {
    // Determine page content based on filename or just simulate sequence since we process sequentially
    // But since the collator creates temp files with `page_i_timestamp.pdf`, we can't easily parse `i` unless we look at the file name logic or content.
    // However, for this test, we can use a counter or just parse the filename if possible.
    // The collator creates files like `page_${i}_${Date.now()}.pdf`.

    const match = filePath.match(/page_(\d+)_/);
    const pageIndex = match ? parseInt(match[1]) : 0;

    console.log(`Mock OCR processing page index: ${pageIndex}`);

    if (pageIndex === 0) {
      return {
        text: "Name: Adam Smith\nReg No: P101",
        detected_id: true,
        reg_no: "P101",
        student_name: "Adam Smith",
        is_garbage: false
      };
    } else if (pageIndex === 1) {
      return {
        text: "Adam's Answer to Q2",
        detected_id: false, // Continuation page
        reg_no: null,
        student_name: null,
        is_garbage: false
      };
    } else if (pageIndex === 2) {
      return {
        text: "Name: Eve Polastri\nReg No: P102",
        detected_id: true,
        reg_no: "P102",
        student_name: "Eve Polastri",
        is_garbage: false
      };
    }

    return { detected_id: false, reg_no: null, student_name: null };
  }
}

async function createDummyPDF() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Page 1: Adam
  const page1 = pdfDoc.addPage();
  page1.drawText("Name: Adam Smith", { x: 50, y: 700, size: 20, font });
  page1.drawText("Reg No: P101", { x: 50, y: 650, size: 15, font });

  // Page 2: Adam (continuation)
  const page2 = pdfDoc.addPage();
  page2.drawText("Adam's Answer to Q2", { x: 50, y: 700, size: 20, font });

  // Page 3: Eve
  const page3 = pdfDoc.addPage();
  page3.drawText("Name: Eve Polastri", { x: 50, y: 700, size: 20, font });
  page3.drawText("Reg No: P102", { x: 50, y: 650, size: 15, font });

  const pdfBytes = await pdfDoc.save();
  const filePath = path.join(os.tmpdir(), "test_collation.pdf");
  await fs.writeFile(filePath, pdfBytes);
  return filePath;
}

async function run() {
  try {
    console.log("Creating dummy PDF...");
    const filePath = await createDummyPDF();
    console.log("PDF created at:", filePath);

    console.log("Initializing Collator with Mock Service...");
    const mockGemini = new MockGeminiService();
    // @ts-ignore
    const collator = new ScriptCollator(mockGemini);

    console.log("Starting Collation...");
    const scripts = await collator.collateScripts(filePath);

    console.log("Collation Complete!");
    console.log("Scripts found:", scripts.length);

    scripts.forEach((script, idx) => {
        console.log(`Script ${idx + 1}:`);
        console.log(`  Student ID: ${script.studentId}`);
        console.log(`  File Path: ${script.filePath}`);
        console.log(`  Page Count: ${script.pageCount}`);
    });

    if (scripts.length === 2) {
        const s1 = scripts.find(s => s.studentId === "P101");
        const s2 = scripts.find(s => s.studentId === "P102");

        if (s1 && s1.pageCount === 2 && s2 && s2.pageCount === 1) {
             console.log("SUCCESS: Correct scripts and page counts found.");
        } else {
             console.error("FAILURE: Page counts incorrect.");
             console.log("S1 (P101) count:", s1?.pageCount);
             console.log("S2 (P102) count:", s2?.pageCount);
             process.exit(1);
        }
    } else {
        console.error("FAILURE: Expected 2 scripts.");
        process.exit(1);
    }

  } catch (e) {
    console.error("Test Failed:", e);
    process.exit(1);
  }
}

run();
