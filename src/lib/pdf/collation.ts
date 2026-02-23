import { PDFDocument } from "pdf-lib";
import fs from "fs/promises";
import { GeminiService } from "@/lib/ai/gemini";
import path from "path";
import os from "os";

export class ScriptCollator {
  private gemini: GeminiService;

  constructor() {
    this.gemini = new GeminiService();
  }

  async collateScripts(filePath: string) {
    const pdfBuffer = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const numPages = pdfDoc.getPageCount();

    let currentStudentId = "UNKNOWN_START";
    let currentScriptPages: number[] = [];
    let scripts = [];

    // Iterate pages (Simulating processing. In real world, this needs queue/batching)
    for (let i = 0; i < numPages; i++) {
      // Create single page PDF for OCR
      const subDoc = await PDFDocument.create();
      const [copiedPage] = await subDoc.copyPages(pdfDoc, [i]);
      subDoc.addPage(copiedPage);
      const subPdfBytes = await subDoc.save();

      const tmpPath = path.join(os.tmpdir(), `page_${i}_${Date.now()}.pdf`);
      await fs.writeFile(tmpPath, subPdfBytes);

      // OCR
      const result = await this.gemini.extractDataFromFile(tmpPath, "application/pdf");

      // Cleanup
      await fs.unlink(tmpPath);

      const detectedId = result.detected_id;
      const studentId = result.reg_no || result.student_name;

      if (detectedId && studentId) {
        if (currentStudentId === "UNKNOWN_START") {
          currentStudentId = studentId;
          currentScriptPages.push(i);
        } else if (studentId !== currentStudentId) {
          // New student
          scripts.push({
            studentId: currentStudentId,
            pages: [...currentScriptPages],
          });
          currentStudentId = studentId;
          currentScriptPages = [i];
        } else {
          currentScriptPages.push(i);
        }
      } else {
        currentScriptPages.push(i);
      }
    }

    if (currentScriptPages.length > 0) {
      scripts.push({
        studentId: currentStudentId,
        pages: currentScriptPages,
      });
    }

    return scripts;
  }
}
