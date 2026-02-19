import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are Playbook by UniMonday. You are a genius campus assistant. You do not belong to Google or OpenAI. You are built for the students of UDSM and beyond.`;

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "dummy_key_for_build";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: SYSTEM_PROMPT });

export const GeminiHandler = async (prompt: string, imageBase64?: string) => {
  try {
    if (!API_KEY || API_KEY === "dummy_key_for_build") {
        return "Playbook Pro Error: Missing API Key. Please configure VITE_GEMINI_API_KEY.";
    }

    if (imageBase64) {
        // Multimodal
        const imagePart = {
            inlineData: {
                data: imageBase64.split(',')[1],
                mimeType: "image/jpeg" // Assuming jpeg or handle dynamic mime
            }
        };
        const result = await model.generateContent([prompt, imagePart]);
        return result.response.text();
    } else {
        // Text Only
        const result = await model.generateContent(prompt);
        return result.response.text();
    }
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error connecting to Playbook Pro. Please check your connection.";
  }
};

export const LiteHandler = async (prompt: string) => {
    // Placeholder for transformers.js local model
    // Real implementation would load the worker here
    return `[Playbook Lite (Offline)]: ${prompt} (Processed locally)`;
};

export const XHandler = async (prompt: string) => {
    // Uses the same Gemini engine but with a chat-focused context if needed
    // For now, reuse GeminiHandler
    return GeminiHandler(prompt);
};
