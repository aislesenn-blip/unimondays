// src/lib/ai/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY environment variable is not set!");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy-key");

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
