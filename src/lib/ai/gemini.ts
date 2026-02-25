import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY");

export async function ocrDocument(buffer: Buffer, mimeType: string = "application/pdf"): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. Returning mock OCR text.");
    return "This is a mock OCR result because GEMINI_API_KEY is not set.\n\nStudent Answer:\nThe concept of polymorphism in object-oriented programming allows objects of different classes to be treated as objects of a common superclass.";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw new Error("Failed to perform OCR on document.");
  }
}
