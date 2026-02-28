import OpenAI from 'openai';

// Ensure we don't crash at build time if env var is missing,
// but validation logic inside functions will handle runtime checks.
// The SDK throws if initialized without apiKey, so we pass a placeholder or empty string
// if the env var is missing, but only inside a conditional check or rely on runtime check.

const apiKey = process.env.OPENROUTER_API_KEY || "dummy-key-for-build";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: apiKey,
  defaultHeaders: {
    "HTTP-Referer": "https://playbook.edu", // Required by OpenRouter
    "X-Title": "Playbook EdTech", // Required by OpenRouter
  }
});

export async function ocrDocument(buffer: Buffer, mimeType: string = "application/pdf"): Promise<string> {
  // Runtime check for real key
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set. OCR service unavailable.");
  }

  try {
    // OpenAI Vision API requires specific data URL format
    const base64Data = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    const response = await openai.chat.completions.create({
      model: "google/gemini-2.5-flash", // Explicit OpenRouter model ID
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all handwritten and printed text from this document. Return it as clean markdown." },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high" // Force high resolution for OCR accuracy
              }
            }
          ],
        },
      ],
      max_tokens: 4096, // Ensure we get the full text
    });

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error("No text returned from OpenRouter Vision API");

    return text;

  } catch (error: any) {
    console.error("OpenRouter OCR Error:", error);

    // Handle Rate Limits (OpenAI 429) & Service Unavailable (503)
    if (error.status === 429 || error.status === 503 || error.message?.includes('429') || error.message?.includes('503')) {
      throw new Error("RATE_LIMIT_HIT: OpenRouter/Gemini Service overloaded.");
    }

    throw new Error(`Failed to perform OCR on document: ${error.message}`);
  }
}

export interface PdfSplit {
  regNo: string;
  name?: string;
  startPage: number; // 1-based
  endPage: number;   // 1-based
}

export async function analyzePdfStructure(buffer: Buffer): Promise<PdfSplit[]> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set. Structure analysis service unavailable.");
  }

  try {
    const base64Data = buffer.toString("base64");
    const mime = "application/pdf"; // Assuming PDF context from function name
    const dataUrl = `data:${mime};base64,${base64Data}`;

    const prompt = `
      Analyze this document containing multiple student scripts.
      Your task is to identify the start and end page numbers for each student's script and extract their identity.

      Instructions:
      1. Scan ALL pages of a script for Registration Numbers (e.g., RegNo, Matric No) or Names. Do NOT just look at the first page. A student might write their name on page 3.
      2. Scripts are continuous (e.g., if Student A is on pages 1-3, Student B starts on page 4).
      3. If a page has no clear identity but follows a script, assume it belongs to the previous student.
      4. If a script has no visible RegNo across any of its pages, use "UNIDENTIFIED" as the regNo.
      5. Extract the Student Name if visible on any of the script's pages.

      Output Format:
      Return a STRICT JSON array of objects with keys:
      - "regNo" (string)
      - "name" (string, optional)
      - "startPage" (1-based integer)
      - "endPage" (1-based integer)

      Do not include any markdown formatting. Just the JSON.
    `;

    const response = await openai.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" }, // Gemini supports JSON mode via OpenRouter usually
    });

    const text = response.choices[0]?.message?.content?.replace(/```json/g, '').replace(/```/g, '').trim();
    if (!text) throw new Error("No content returned");

    // Handle potential wrapper object like { "splits": [...] } or direct array
    let json = JSON.parse(text);
    if (Array.isArray(json)) return json as PdfSplit[];
    if (json.splits && Array.isArray(json.splits)) return json.splits as PdfSplit[];

    // Fallback if structure is unknown but likely array-like
    if (Object.keys(json).length === 1 && Array.isArray(Object.values(json)[0])) {
        return Object.values(json)[0] as PdfSplit[];
    }

    throw new Error("Invalid JSON structure returned from AI");

  } catch (error: any) {
    console.error("OpenRouter Structure Analysis Error:", error);
    if (error.status === 429 || error.status === 503 || error.message?.includes('429') || error.message?.includes('503')) {
      throw new Error("RATE_LIMIT_HIT: OpenRouter/Gemini Service overloaded.");
    }
    throw new Error(`Failed to analyze PDF structure: ${error.message}`);
  }
}
