import OpenAI from 'openai';
import { pdf } from 'pdf-to-img';

// Polyfill required for pdf-to-img in Node.js/Serverless environments
import { DOMMatrix, DOMPoint, DOMRect } from '@napi-rs/canvas';
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = DOMMatrix as any;
  globalThis.DOMPoint = DOMPoint as any;
  globalThis.DOMRect = DOMRect as any;
}

const apiKey = process.env.OPENROUTER_API_KEY || "dummy-key-for-build";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: apiKey,
  defaultHeaders: {
    "HTTP-Referer": "https://playbook.edu",
    "X-Title": "Playbook EdTech",
  }
});

// Helper: Existing OpenRouter/Gemini fetch logic
async function callGeminiVisionAPI(imageBuffer: Buffer, isStructuralOcr: boolean = false) {
    const base64Data = imageBuffer.toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64Data}`;

    // ARCHITECTURE FIX: Extract Reg No and FULL RAW TEXT. Do not attempt to map questions here to prevent data loss.
    const textPrompt = isStructuralOcr
        ? "Extract all handwritten and printed text. You MUST find the Registration Number at the top. Return STRICTLY this JSON format: {\"registration_number\": \"...\", \"full_text\": \"...all extracted text from the page...\"}."
        : "Extract all handwritten and printed text from this document. Return it as clean markdown.";

    const response = await openai.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: textPrompt },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high"
              }
            }
          ],
        },
      ],
      response_format: isStructuralOcr ? { type: "json_object" } : undefined,
      max_tokens: 8192,
    });

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error("No text returned from OpenRouter Vision API");
    return text;
}

// Single Image OCR (for rubrics)
export async function ocrDocument(buffer: Buffer, mimeType: string = "application/pdf"): Promise<string> {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is not set. OCR service unavailable.");
    }
    return callGeminiVisionAPI(buffer);
}

export async function extractStructuredMapMultimodal(pdfBuffer: Buffer): Promise<Record<string, string>> {
    console.log("[GEMINI] Starting Structural OCR Map Phase...");
    const document = await pdf(pdfBuffer, { scale: 1.0 });

    let combinedMap: Record<string, string> = {};
    let pageNum = 1;

    for await (const imageBuffer of document) {
        console.log(`[GEMINI] Processing Page ${pageNum} for Structured Map...`);
        const base64Data = imageBuffer.toString("base64");
        const dataUrl = `data:image/jpeg;base64,${base64Data}`;

        const response = await openai.chat.completions.create({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Extract the student's text and categorize it by question numbers (Q1, Q2, Q3...). If a student answers a question across multiple pages, concatenate them. Return strictly a JSON: {\"Q1\": \"text...\", \"Q2\": \"text...\"}. Do not lose a single word of the student's response." },
                {
                  type: "image_url",
                  image_url: {
                    url: dataUrl,
                    detail: "high"
                  }
                }
              ],
            },
          ],
          max_tokens: 8192,
          response_format: { type: "json_object" },
        });

        const text = response.choices[0]?.message?.content || "{}";
        try {
            const cleanString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const pageMap = JSON.parse(cleanString);
            for (const key in pageMap) {
                if (combinedMap[key]) {
                    combinedMap[key] += "\n" + pageMap[key];
                } else {
                    combinedMap[key] = pageMap[key];
                }
            }
        } catch (e) {
            console.error(`[GEMINI] Failed to parse JSON for page ${pageNum}:`, e);
        }
        pageNum++;
    }

    console.log("[GEMINI] Structural OCR Map Phase Complete.");
    return combinedMap;
}

// Memory-Safe Sequential PDF Extraction
export interface PageData {
  pageNumber: number;
  text: string;
  extractedText?: string;
  pageImageBase64?: string;
}

export interface PdfSplit {
  startPage: number;
  endPage: number;
  reasoning: string;
  regNo?: string;
  isFirstPageCover?: boolean;
  name?: string;
}

export async function analyzePdfStructure(pdfBuffer: Buffer): Promise<PdfSplit[]> {
    // Stub for analyzePdfStructure if needed. Currently returning a dummy empty array.
    return [];
}

export async function extractPagesMultimodal(pdfBuffer: Buffer): Promise<PageData[]> {
    console.log("[GEMINI] Starting Memory-Safe PDF Extraction...");
    const pagesData = [];

    // SCALE 1.0 saves massive amounts of RAM while keeping handwriting legible
    const document = await pdf(pdfBuffer, { scale: 1.0 });

    let pageNum = 1;
    // SEQUENTIAL LOOP (CRITICAL): Do not use Promise.all here. Process one by one.
    for await (const imageBuffer of document) {
        console.log(`[GEMINI] Processing Page ${pageNum}...`);

        // Use existing OpenRouter Gemini Vision API call logic
        const extractedText = await callGeminiVisionAPI(imageBuffer);

        pagesData.push({
            pageNumber: pageNum,
            text: extractedText,
            extractedText: extractedText,
            pageImageBase64: imageBuffer.toString("base64")
        });
        pageNum++;
    }

    console.log("[GEMINI] PDF Extraction Complete. Zero RAM Spikes.");
    return pagesData;
}
