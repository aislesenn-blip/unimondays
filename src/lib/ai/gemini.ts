import OpenAI from 'openai';
import { DOMMatrix, DOMPoint, DOMRect } from '@napi-rs/canvas';
import { pdf } from 'pdf-to-img';

if (typeof globalThis !== 'undefined') {
  (globalThis as any).DOMMatrix = DOMMatrix;
  (globalThis as any).DOMPoint = DOMPoint;
  (globalThis as any).DOMRect = DOMRect;
}

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
  const BATCH_SIZE = 3;

  try {
    // pdf-to-img returns an async iterator, loading pages lazily to prevent OOM
    const document = await pdf(pdfBuffer, { scale: 1.5 }); // scale 1.5 for good OCR balance

    let pageNum = 1;
    let currentBatch: Promise<PageData>[] = [];

    // Define the extraction task logic
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
                { type: "text", text: "Extract all handwritten and printed text, as well as descriptions of any diagrams or sketches from this page. Return it as clean markdown. If the page is blank, return 'BLANK_PAGE'." },
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
          temperature: 0.0, // Enforce determinism
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

    for await (const imageBuffer of document) {
      const currentPage = pageNum++;

      // Add the task to the current batch
      currentBatch.push(createExtractionTask(currentPage, imageBuffer));

      // If the batch reaches the maximum size, wait for it to finish before pulling more pages
      if (currentBatch.length >= BATCH_SIZE) {
        const resolvedBatch = await Promise.all(currentBatch);
        results.push(...resolvedBatch);

        // Clear the batch
        currentBatch = [];

        // Opportunistic Garbage Collection to free memory holding the 3 base64 strings
        if (global.gc) {
          global.gc();
        }
      }
    }

    // Process any remaining pages in the final batch
    if (currentBatch.length > 0) {
      const resolvedBatch = await Promise.all(currentBatch);
      results.push(...resolvedBatch);

      if (global.gc) {
          global.gc();
      }
    }

    // Ensure sequential ordering
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

export interface PageData {
  pageNumber: number;
  extractedText: string;
  pageImageBase64: string; // The visual buffer of this specific page
}

/**
 * Extracts text page-by-page from a PDF by converting each page to an image and routing it to Gemini Vision.
 * Implements strict batched concurrency to prevent Node.js OOM crashes and LLM API Rate Limits.
 */
export async function extractPagesMultimodal(pdfBuffer: Buffer): Promise<PageData[]> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set. Multimodal extraction unavailable.");
  }

  console.log(`[MULTIMODAL_SLICER] Initializing PDF processing...`);

  // 1. Initialize the lightweight PDF document
  const document = await pdf(pdfBuffer, { scale: 1.5 }); // scale: 1.5 provides good resolution without massive memory footprint
  const pageCount = document.length;
  console.log(`[MULTIMODAL_SLICER] PDF loaded. Total pages: ${pageCount}`);

  const results: PageData[] = [];
  const BATCH_SIZE = 3; // Strict concurrency limit to prevent 429s and OOM

  // 2. Process in strict sequential batches
  for (let i = 1; i <= pageCount; i += BATCH_SIZE) {
    const batchStart = i;
    const batchEnd = Math.min(i + BATCH_SIZE - 1, pageCount);
    console.log(`[MULTIMODAL_SLICER] Processing Batch: Pages ${batchStart} to ${batchEnd}...`);

    const batchPromises: Promise<PageData>[] = [];

    for (let pageNum = batchStart; pageNum <= batchEnd; pageNum++) {
      batchPromises.push((async () => {
        // Render specific page to Image Buffer (JPEG is lighter than PNG)
        const pageImageBuffer = await document.getPage(pageNum);
        const base64Data = pageImageBuffer.toString("base64");
        const dataUrl = `data:image/jpeg;base64,${base64Data}`;

        // Send strictly this page to Gemini Vision
        const response = await openai.chat.completions.create({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Extract all handwritten and printed text, tables, and diagrams from this document page. Return it as clean markdown. Do not hallucinate data." },
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
          temperature: 0.0,
          top_p: 0.1,
          seed: 12345
        });

        const text = response.choices[0]?.message?.content;
        if (!text) throw new Error(`No text returned for page ${pageNum}`);

        return {
          pageNumber: pageNum,
          extractedText: text,
          pageImageBase64: base64Data
        };
      })());
    }

    // Await the batch to finish before proceeding to the next chunk
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // 3. Memory safety: Opportunistic Garbage Collection hint & wait
    console.log(`[MULTIMODAL_SLICER] Batch completed. Clearing memory context...`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause to cool off LLM rate limits
    if (global.gc) global.gc(); // Force GC if exposed (requires node --expose-gc)
  }

  console.log(`[MULTIMODAL_SLICER] Extraction fully complete for ${pageCount} pages.`);
  return results.sort((a, b) => a.pageNumber - b.pageNumber); // Ensure sequential integrity
}
