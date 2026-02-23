import { PDFDocument } from "pdf-lib";
import fs from "fs/promises";
import { GeminiService } from "@/lib/ai/gemini";
import path from "path";
import os from "os";

export interface CollatedScript {
  studentId: string;
  filePath: string;
  pageCount: number;
}

export class ScriptCollator {
  private gemini: GeminiService;

  constructor(geminiService?: GeminiService) {
    this.gemini = geminiService || new GeminiService();
  }

  async collateScripts(filePath: string): Promise<CollatedScript[]> {
    const pdfBuffer = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const numPages = pdfDoc.getPageCount();

    let currentStudentId = "UNKNOWN_START";
    let currentScriptPages: number[] = [];
    const scripts: CollatedScript[] = [];

    // Helper to save script
    const saveScript = async (studentId: string, pageIndices: number[]) => {
      if (pageIndices.length === 0) return;

      const newDoc = await PDFDocument.create();
      const copiedPages = await newDoc.copyPages(pdfDoc, pageIndices);
      for (const page of copiedPages) {
        newDoc.addPage(page);
      }
      const pdfBytes = await newDoc.save();
      const fileName = `script_${studentId.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.pdf`;
      const newPath = path.join(os.tmpdir(), fileName);
      await fs.writeFile(newPath, pdfBytes);

      scripts.push({
        studentId: studentId,
        filePath: newPath,
        pageCount: pageIndices.length,
      });
    };

    for (let i = 0; i < numPages; i++) {
      // Create single page PDF for OCR to detect ID
      const subDoc = await PDFDocument.create();
      const [copiedPage] = await subDoc.copyPages(pdfDoc, [i]);
      subDoc.addPage(copiedPage);
      const subPdfBytes = await subDoc.save();

      const tmpPath = path.join(os.tmpdir(), `page_${i}_${Date.now()}.pdf`);
      await fs.writeFile(tmpPath, subPdfBytes);

      // OCR with Gemini
      let result;
      try {
          result = await this.gemini.extractDataFromFile(tmpPath, "application/pdf");
      } catch (e) {
          console.error(`OCR failed for page ${i}:`, e);
          result = { detected_id: false, reg_no: null, student_name: null };
      } finally {
          await fs.unlink(tmpPath).catch(() => {});
      }

      const detectedId = result.detected_id;
      const studentId = result.reg_no || result.student_name;

      if (detectedId && studentId) {
        if (currentStudentId === "UNKNOWN_START") {
          // Found the first student
          currentStudentId = studentId;
          currentScriptPages.push(i);
        } else if (studentId !== currentStudentId) {
          // Found a NEW student, save previous dossier
          await saveScript(currentStudentId, currentScriptPages);

          // Start new dossier
          currentStudentId = studentId;
          currentScriptPages = [i];
        } else {
          // Same student, continue
          currentScriptPages.push(i);
        }
      } else {
        // No ID found, append to current dossier
        currentScriptPages.push(i);
      }
    }

    // Save the last dossier
    if (currentScriptPages.length > 0) {
      await saveScript(currentStudentId, currentScriptPages);
    }

    return scripts;
  }
}
