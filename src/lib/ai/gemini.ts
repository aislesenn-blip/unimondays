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

    // MANDATORY FIX: Enforce Registration Number extraction and an "Unlabelled" bucket for loose text.
    const textPrompt = isStructuralOcr
        ? "Extract the student's text. You MUST extract the Registration Number or Name at the top of the page. Then, categorize the answers by question numbers (e.g., Q1A, Q2, etc.). If you find text but cannot explicitly determine the question number, put it in the 'UNLABELLED' key. Return STRICTLY this JSON format: {\"registration_number\": \"...\", \"answers\": {\"Q1A\": \"...\", \"UNLABELLED\": \"...\"}}."
        : "Extract all handwritten and printed text from this document. Return it as clean markdown.";

    const response = await openai.chat.completions.create({
      model: "google/gemini-2.5-flash", // Use Flash for maximum mapping speed
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: textPrompt },
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "high" }
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
    return callGeminiVisionAPI(buffer, false);
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

export async function extractPagesMultimodal(pdfBuffer: Buffer, isStructuralOcr: boolean = false): Promise<PageData[]> {
    console.log("[GEMINI] Starting Memory-Safe PDF Extraction...");
    const pagesData = [];

    // SCALE 1.0 saves massive amounts of RAM while keeping handwriting legible
    const document = await pdf(pdfBuffer, { scale: 1.0 });

    let pageNum = 1;
    // SEQUENTIAL LOOP (CRITICAL): Do not use Promise.all here. Process one by one.
    for await (const imageBuffer of document) {
        console.log(`[GEMINI] Processing Page ${pageNum}...`);

        // Use existing OpenRouter Gemini Vision API call logic
        const extractedText = await callGeminiVisionAPI(imageBuffer, isStructuralOcr);

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
