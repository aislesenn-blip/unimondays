
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Placeholder to get client

  // Note: The SDK exposes a model manager via `getGenerativeModel` but listing might be direct via fetch
  // or undocumented in this specific wrapper version.
  // However, standard Google AI HTTP API allows listing.
  // Let's try to infer or use a known working method if SDK doesn't expose listModels directly on the main class easily.
  // Actually, the error message says "Call ListModels".

  // Checking SDK documentation approach:
  // Usually, there isn't a direct `genAI.listModels()`.
  // We might have to hit the REST API directly to be absolutely sure if the SDK hides it.

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
      console.error("No API Key found");
      return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
      const response = await fetch(url);
      const data = await response.json();

      console.log("--- AVAILABLE GEMINI MODELS ---");
      if (data.models) {
          data.models.forEach((m: any) => {
              if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                  console.log(`Model: ${m.name} | Methods: ${m.supportedGenerationMethods.join(", ")}`);
              }
          });
      } else {
          console.log("No models found or error structure:", data);
      }
  } catch (e) {
      console.error("Failed to list models", e);
  }
}

listModels();
