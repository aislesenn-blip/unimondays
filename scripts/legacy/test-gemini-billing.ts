import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY is not set in environment variables.");
    process.exit(1);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = "Respond with 'BILLING_ACTIVE' if you receive this.";

    console.log("Sending request to Gemini 2.0 Flash...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("HTTP Status: 200 OK");
    console.log("Response:", text);

    if (text.includes("BILLING_ACTIVE")) {
        console.log("SUCCESS: Billing confirmed active.");
    } else {
        console.log("WARNING: Unexpected response content.");
    }

  } catch (error: any) {
    if (error.status === 429) {
      console.error("HTTP Status: 429 Too Many Requests (Rate Limit Exceeded)");
      console.error("FAILURE: Billing upgrade not active or rate limit hit.");
    } else {
      console.error("HTTP Status:", error.status || "Unknown");
      console.error("Error Details:", error.message || error);
    }
    process.exit(1);
  }
}

main();
