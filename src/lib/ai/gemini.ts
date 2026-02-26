import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function ocrDocument(buffer: Buffer, mimeType: string = "application/pdf"): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set. OCR service unavailable.");
  }

  try {
    // Use gemini-2.5-flash (Aligning with Original Orchestrator Architecture)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const base64Data = buffer.toString("base64");

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
      "Extract all handwritten and printed text from this document. Return it as clean markdown.",
    ]);

    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Gemini OCR Error:", error);
    if (error.status === 429 || error.status === 503 || error.message?.includes('429') || error.message?.includes('503')) {
      throw new Error("RATE_LIMIT_HIT: Gemini Service overloaded.");
    }
    throw new Error(`Failed to perform OCR on document: ${error.message}`);
  }
}

export interface PdfSplit {
  regNo: string;
  name?: string;
  startPage: number; // 1-based
  endPage: number;   // 1-based
}

export async function analyzePdfStructure(buffer: Buffer): Promise<PdfSplit[]> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set. Structure analysis service unavailable.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const base64Data = buffer.toString("base64");

    const prompt = `
      Analyze this PDF containing multiple student scripts.
      Identify the start and end page numbers for each student's script.
      Look for Registration Numbers (RegNo) or Names at the top of the first page of a script.
      Scripts are continuous.

      Return a STRICT JSON array of objects with keys: "regNo", "startPage" (1-based integer), "endPage" (1-based integer).
      Do not include any markdown formatting. Just the JSON.
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: "application/pdf",
        },
      },
      prompt,
    ]);

    const response = await result.response;
    const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text) as PdfSplit[];
  } catch (error: any) {
    console.error("Gemini Structure Analysis Error:", error);
    if (error.status === 429 || error.status === 503 || error.message?.includes('429') || error.message?.includes('503')) {
      throw new Error("RATE_LIMIT_HIT: Gemini Service overloaded.");
    }
    throw new Error(`Failed to analyze PDF structure: ${error.message}`);
  }
}
