
// src/lib/ai/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set!");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// TODO: Implement actual file-to-binary conversion
function fileToGenerativePart(path: string) {
  // This is a placeholder. In a real implementation, you would read the file
  // from blob storage and convert it to a base64 string.
  return {
    inlineData: {
      data: "", // Base64 string of the file
      mimeType: "application/pdf",
    },
  };
}

export async function performOcr(filePath: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = "Extract all text content from this document. Preserve the structure and layout as best as possible.";
  const filePart = fileToGenerativePart(filePath);

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
