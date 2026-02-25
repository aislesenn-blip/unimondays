
import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function main() {
  const modelsToTry = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-1.5-pro",
    "gemini-1.5-pro-latest",
    "gemini-pro-vision",
    "gemini-1.0-pro-vision-latest"
  ];

  for (const m of modelsToTry) {
    console.log(`Trying model: ${m}`);
    try {
      const model = genAI.getGenerativeModel({ model: m });
      // Vision models need image, but let's try generating text from text (might fail for pure vision models)
      // gemini-1.5-flash is multimodal.
      const result = await model.generateContent("Hello");
      console.log(`SUCCESS: ${m}`);
      return;
    } catch (e: any) {
      console.log(`FAILED: ${m} - ${e.message}`);
    }
  }
}

main();
