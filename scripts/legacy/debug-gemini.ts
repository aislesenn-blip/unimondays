
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function main() {
  /*
  // ListModels is not directly exposed on genAI instance in some versions,
  // but let's try to just hit a known model or use the model manager if available.
  // Actually, let's just try to generate content with 'gemini-1.5-flash' and see.
  */

  const modelsToTry = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-1.5-pro",
    "gemini-pro",
    "gemini-1.0-pro"
  ];

  for (const m of modelsToTry) {
    console.log(`Trying model: ${m}`);
    try {
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent("Hello");
      console.log(`SUCCESS: ${m}`);
      return;
    } catch (e: any) {
      console.log(`FAILED: ${m} - ${e.message}`);
    }
  }
}

main();
