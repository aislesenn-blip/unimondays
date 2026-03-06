import OpenAI from 'openai';
import pLimit from 'p-limit';

// Polyfill required for pdf-to-img in Node.js/Serverless environments
import { DOMMatrix, DOMPoint, DOMRect } from '@napi-rs/canvas';
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = DOMMatrix as any;
  globalThis.DOMPoint = DOMPoint as any;
  globalThis.DOMRect = DOMRect as any;
}
import { pdf } from 'pdf-to-img';

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
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set. OCR service unavailable.");
  }

  try {
    const base64Data = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    const response = await openai.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all handwritten and printed text from this document. Return it as clean markdown." },
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
      max_tokens: 4096,
    });

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error("No text returned from OpenRouter Vision API");

    return text;

  } catch (error: any) {
    console.error("OpenRouter OCR Error:", error);
    if (error.status === 429 || error.status === 503 || error.message?.includes('429') || error.message?.includes('503')) {
      throw new Error("RATE_LIMIT_HIT: OpenRouter/Gemini Service overloaded.");
    }
    throw new Error(`Failed to perform OCR on document: ${error.message}`);
  }
}

export interface PageData {
  pageNumber: number;
  extractedText: string;
  pageImageBase64: string;
}

export async function extractPagesMultimodal(pdfBuffer: Buffer): Promise<PageData[]> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set. Extraction service unavailable.");
  }

  console.log(`[MULTIMODAL_EXTRACT] Starting extraction. Buffer size: ${pdfBuffer.length} bytes`);

  const results: PageData[] = [];
  const BATCH_SIZE = 5;

  try {
    // 1. FIX TRUNCATION: `pdf-to-img` defaults to returning only page 1 unless configured to return all or iterated fully.
    // However, when iterating an async generator from pdf-to-img, if an internal limit was reached or if the loop
    // was capped, it would fail. We explicitly remove ANY artificial limits and process the ENTIRE document.
    const document = await pdf(pdfBuffer, { scale: 1.5 });

    let pageNum = 1;
    let currentBatch: Promise<PageData>[] = [];

    const createExtractionTask = async (currentPage: number, imageBuffer: Buffer): Promise<PageData> => {
      console.log(`[MULTIMODAL_EXTRACT] Processing Page ${currentPage}...`);
      const base64Image = imageBuffer.toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64Image}`;
      let pageText = "";

      try {
        const response = await openai.chat.completions.create({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Carefully analyze this exam page. 1) Transcribe all handwritten text. 2) Provide a detailed visual description of any diagrams, sketches, or graphs present, including labels and what they represent. Do not grade." },
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
          max_tokens: 2000,
          temperature: 0.0,
        });

        pageText = response.choices[0]?.message?.content || "BLANK_PAGE";
      } catch (error: any) {
         console.error(`[MULTIMODAL_EXTRACT] Gemini Error on Page ${currentPage}:`, error.message);
         pageText = "EXTRACTION_FAILED";
      }

      return {
        pageNumber: currentPage,
        extractedText: pageText,
        pageImageBase64: base64Image
      };
    };

    // This loop ensures EVERY single page yielded by the buffer is extracted.
    for await (const imageBuffer of document) {
      const currentPage = pageNum++;

      currentBatch.push(createExtractionTask(currentPage, imageBuffer));

      if (currentBatch.length >= BATCH_SIZE) {
        const resolvedBatch = await Promise.all(currentBatch);
        results.push(...resolvedBatch);
        currentBatch = [];
        if (global.gc) global.gc();
      }
    }

    if (currentBatch.length > 0) {
      const resolvedBatch = await Promise.all(currentBatch);
      results.push(...resolvedBatch);
      if (global.gc) global.gc();
    }

    results.sort((a, b) => a.pageNumber - b.pageNumber);
    console.log(`[MULTIMODAL_EXTRACT] Successfully extracted ${results.length} pages.`);

    return results;

  } catch (error: any) {
    console.error(`[MULTIMODAL_EXTRACT_FATAL] PDF Parsing Failed:`, error);
    throw new Error(`Failed to parse PDF pages: ${error.message}`);
  }
}

export interface PdfSplit {
  regNo: string;
  name?: string;
  startPage: number;
  endPage: number;
}

export async function analyzePdfStructure(buffer: Buffer): Promise<PdfSplit[]> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set. Structure analysis service unavailable.");
  }

  try {
    const base64Data = buffer.toString("base64");
    const mime = "application/pdf";
    const dataUrl = `data:${mime};base64,${base64Data}`;

    const prompt = `
      Analyze this document containing multiple student scripts.
      Your task is to identify the start and end page numbers for each student's script and extract their identity.

      Instructions:
      1. Look for Registration Numbers (e.g., RegNo, Matric No) or Names at the top of the first page of a script.
      2. Scripts are continuous (e.g., if Student A is on pages 1-3, Student B starts on page 4).
      3. If a page has no clear identity but follows a script, assume it belongs to the previous student.
      4. If a script has no visible RegNo, use "UNIDENTIFIED" as the regNo.
      5. Extract the Student Name if visible.

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
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content?.replace(/```json/g, '').replace(/```/g, '').trim();
    if (!text) throw new Error("No content returned");

    let json = JSON.parse(text);
    if (Array.isArray(json)) return json as PdfSplit[];
    if (json.splits && Array.isArray(json.splits)) return json.splits as PdfSplit[];

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
