
// src/lib/ai/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Missing GEMINI_API_KEY environment variable!");
}

const genAI = new GoogleGenerativeAI(apiKey || "missing-key");

export async function performOcr(fileBuffer: Buffer, mimeType: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = "Extract all text content from this document. Preserve the structure and layout as best as possible.";

  const filePart = {
    inlineData: {
      data: fileBuffer.toString("base64"),
      mimeType: mimeType,
    },
  };

  try {
    const result = await model.generateContent([prompt, filePart]);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error("Error performing OCR with Gemini:", error);
    throw new Error("Failed to perform OCR on the document.");
  }
}
