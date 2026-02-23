import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not found in environment");
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async extractDataFromFile(filePath: string, mimeType: string) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const base64Data = fileBuffer.toString("base64");

      const prompt = `
        You are a high-accuracy OCR engine for student scripts.
        1. Extract ALL text from this document, including handwritten text and math formulas.
        2. Look for a Student Name or Registration Number (e.g., Reg No, Student ID, NIDA, Name).
        3. Return a valid JSON object ONLY, with this structure:
        {
            "text": "Full extracted text content...",
            "detected_id": true/false,
            "reg_no": "Extracted ID or null if not found",
            "student_name": "Extracted Name or null if not found",
            "is_garbage": true/false
        }
        Do not wrap in markdown code blocks. Just the raw JSON string.
      `;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
      ]);

      const response = await result.response;
      let text = response.text();

      // Clean markdown
      if (text.startsWith("```json")) text = text.slice(7);
      if (text.endsWith("```")) text = text.slice(0, -3);
      text = text.replace(/^`+|`+$/g, "").trim();

      return JSON.parse(text);
    } catch (e: any) {
      console.error("Gemini OCR Error:", e);
      return {
        text: "",
        detected_id: false,
        reg_no: null,
        student_name: null,
        is_garbage: false,
        error: e.message,
      };
    }
  }
}
