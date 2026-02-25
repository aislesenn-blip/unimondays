import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { splitPdfBatch } from '../src/lib/pdf-service';
import fs from 'fs/promises';
import path from 'path';
import { readFile } from '../src/lib/storage'; // Use our new storage abstraction
// src/lib/ai/gemini.ts returns a mock if no key.
// Mock: [{ regNo: "REG001", startPage: 1, endPage: 2 }, { regNo: "REG002", startPage: 3, endPage: 5 }]

async function createDummyPdf() {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // Page 1: Student 1
  const page1 = pdfDoc.addPage();
  page1.drawText('Student 1 - REG001 - Page 1', { x: 50, y: 700, size: 30, font: timesRomanFont, color: rgb(0, 0, 0) });

  // Page 2: Student 1
  const page2 = pdfDoc.addPage();
  page2.drawText('Student 1 - REG001 - Page 2', { x: 50, y: 700, size: 30, font: timesRomanFont, color: rgb(0, 0, 0) });

  // Page 3: Student 2
  const page3 = pdfDoc.addPage();
  page3.drawText('Student 2 - REG002 - Page 1', { x: 50, y: 700, size: 30, font: timesRomanFont, color: rgb(0, 0, 0) });

  // Page 4: Student 2
  const page4 = pdfDoc.addPage();
  page4.drawText('Student 2 - REG002 - Page 2', { x: 50, y: 700, size: 30, font: timesRomanFont, color: rgb(0, 0, 0) });

  // Page 5: Student 2
  const page5 = pdfDoc.addPage();
  page5.drawText('Student 2 - REG002 - Page 3', { x: 50, y: 700, size: 30, font: timesRomanFont, color: rgb(0, 0, 0) });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function main() {
  console.log("Creating dummy PDF...");
  const buffer = await createDummyPdf();

  // Ensure we don't have GEMINI_API_KEY set for this test to force mock
  // Or if we do, we need to handle real response.
  // The mock in src/lib/ai/gemini.ts matches our dummy PDF structure (REG001: 1-2, REG002: 3-5).
  // So we should unset the key if it exists in env, but env is loaded by next/dotenv usually.
  // We can just rely on the mock logic: if (!process.env.GEMINI_API_KEY) ...
  // But if I have a key in .env, it will use it.
  // I'll force the mock by temporarily modifying the function or just hoping the prompt works if key is present.
  // Actually, for unit test, mocking is better.
  // But I can't easily mock imports in this script without jest/vitest.
  // I will assume no key or the key works.
  // To be safe, I'll delete the key from process.env for this run.

  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  console.log("Splitting PDF...");
  try {
    const results = await splitPdfBatch(buffer);

    console.log("Split Results:", results);

    if (results.length !== 2) {
      throw new Error(`Expected 2 students, got ${results.length}`);
    }

    if (results[0].regNo !== 'REG001') {
      throw new Error(`Expected REG001, got ${results[0].regNo}`);
    }

    // Verify files exist
    for (const res of results) {
      // With new storage, filePath is absolute or resolvable by storage.readFile
      const buffer = await readFile(res.filePath).catch(() => null);
      if (!buffer) throw new Error(`File ${res.filePath} does not exist`);
      console.log(`Verified file: ${res.filePath}`);
    }

    console.log("Test PASSED");
  } catch (error) {
    console.error("Test FAILED:", error);
    process.exit(1);
  } finally {
    // Restore key
    if (originalKey) process.env.GEMINI_API_KEY = originalKey;
  }
}

main();
