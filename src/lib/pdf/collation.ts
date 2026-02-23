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
    let scripts: { studentId: string; filePath: string }[] = [];

    console.log(`Starting collation for ${filePath} with ${numPages} pages.`);

    // Iterate pages (Sequential processing as required)
    for (let i = 0; i < numPages; i++) {
      // Create single page PDF for OCR
      const subDoc = await PDFDocument.create();
      const [copiedPage] = await subDoc.copyPages(pdfDoc, [i]);
      subDoc.addPage(copiedPage);
      const subPdfBytes = await subDoc.save();

      const tmpPath = path.join(os.tmpdir(), `page_${i}_${Date.now()}.pdf`);
      await fs.writeFile(tmpPath, subPdfBytes);

      // OCR
      let result;
      try {
          result = await this.gemini.extractDataFromFile(tmpPath, "application/pdf");
      } catch (e) {
          console.error(`Error OCR processing page ${i}:`, e);
          result = { detected_id: false };
      }

      // Cleanup temp page file
      try {
        await fs.unlink(tmpPath);
      } catch (e) {
          console.warn("Failed to delete temp file:", tmpPath);
      }

      const detectedId = result.detected_id;
      const studentId = result.reg_no || result.student_name;

      console.log(`Page ${i}: Detected ID: ${detectedId}, ID: ${studentId}`);

      if (detectedId && studentId) {
        if (currentStudentId === "UNKNOWN_START") {
          // First detected ID, start dossier
          currentStudentId = studentId;
          currentScriptPages.push(i);
        } else if (studentId !== currentStudentId) {
          // New student detected, close previous dossier
          if (currentScriptPages.length > 0) {
            const scriptPath = await this.createStudentPdf(pdfDoc, currentScriptPages, currentStudentId);
            scripts.push({
              studentId: currentStudentId,
              filePath: scriptPath,
            });
          }
          // Start new dossier
          currentStudentId = studentId;
          currentScriptPages = [i];
        } else {
          // Same student ID detected again (maybe on page 2 header), continue
          currentScriptPages.push(i);
        }
      } else {
        // No ID detected, append to current dossier
        currentScriptPages.push(i);
      }
    }

    // Close final dossier
    if (currentScriptPages.length > 0) {
      const scriptPath = await this.createStudentPdf(pdfDoc, currentScriptPages, currentStudentId);
      scripts.push({
        studentId: currentStudentId,
        filePath: scriptPath,
      });
    }

    return scripts;
  }

  private async createStudentPdf(originalDoc: PDFDocument, pageIndices: number[], studentId: string): Promise<string> {
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(originalDoc, pageIndices);
    copiedPages.forEach((page) => newDoc.addPage(page));

    const pdfBytes = await newDoc.save();
    const safeId = studentId.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `script_${safeId}_${Date.now()}.pdf`;
    const filePath = path.join(os.tmpdir(), fileName);

    await fs.writeFile(filePath, pdfBytes);
    return filePath;
  }
}
