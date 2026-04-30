import * as pdfjsLib from 'pdfjs-dist';

// Route everything through the internal proxy to prevent OpenRouter from blocking browser requests (CORS/401)
// and to avoid leaking the paid API key to the client.
const INTERNAL_PROXY_URL = "/api/ai/proxy";

export async function getClientGeminiKey() {
    // Dynamic Key resolution: Check for lecturer specific key if needed, fallback to env
    let key = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!key) {
        try {
            // We fetch from proxy to hide the key from client if it isn't public
            const res = await fetch('/api/ai/get-key');
            if (res.ok) {
                const data = await res.json();
                if (data.key) key = data.key;
            }
        } catch(e) {
            console.error("Failed to fetch internal API key", e);
        }
    }
    return key || "dummy";
}

// Convert Gemini API parts to OpenRouter (OpenAI format) multimodal messages
function formatOpenRouterVisionMessage(parts: any[]) {
    const contentArray = [];
    for (const part of parts) {
        if (part.text) {
            contentArray.push({ type: "text", text: part.text });
        } else if (part.inlineData) {
            // OpenRouter expects base64 image URL
            contentArray.push({
                type: "image_url",
                image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` }
            });
        }
    }
    return contentArray;
}

// ----------------------------------------------------------------------------
// THE SMART ID NORMALIZER (From your Box Engine Architecture)
// ----------------------------------------------------------------------------
export const normalizeQuestionId = (id: string): string => {
    let clean = (id || "").toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    // Kama inaanza na 'q' na inafuatiwa na namba (mfano: 'q1a' au 'q6iii'), tunakata hiyo 'q'
    if (clean.startsWith('q') && /\d/.test(clean)) {
        clean = clean.substring(1);
    }
    return clean;
};

export function parseLLMJSON(content: string): any {
    if (!content || content.trim() === '') return {};
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
    const firstBrace = content.indexOf('{');
    const firstBracket = content.indexOf('[');
    let startIndex = -1;
    let isArray = false;

    if (firstBrace !== -1 && firstBracket !== -1) {
        startIndex = Math.min(firstBrace, firstBracket);
        isArray = startIndex === firstBracket;
    } else {
        startIndex = Math.max(firstBrace, firstBracket);
        isArray = startIndex === firstBracket;
    }

    if (startIndex !== -1) {
        let depth = 0, inString = false, escapeNext = false, endIndex = -1;
        const openChar = isArray ? '[' : '{';
        const closeChar = isArray ? ']' : '}';

        for (let i = startIndex; i < content.length; i++) {
            const char = content[i];
            if (escapeNext) { escapeNext = false; continue; }
            if (char === '\\') { escapeNext = true; continue; }
            if (char === '"') { inString = !inString; continue; }
            if (!inString) {
                if (char === openChar) depth++;
                else if (char === closeChar) {
                    depth--;
                    if (depth === 0) { endIndex = i; break; }
                }
            }
        }
        content = endIndex !== -1 ? content.substring(startIndex, endIndex + 1) : content.substring(startIndex);
    }

    content = content.replace(/^```json\s*/gi, '').replace(/^```\s*/gi, '').replace(/```\s*$/gi, '');
    content = content.replace(/[\n\r\t]+/g, ' ');
    content = content.replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3');
    content = content.replace(/(:\s*)'([^']+)'(\s*[,}])/g, '$1"$2"$3');
    content = content.replace(/,\s*([}\]])/g, '$1');
    content = content.replace(/\\(?!["\\/bfnrt])/g, '\\\\');

    try { return JSON.parse(content); } catch (e) { return isArray ? [] : {}; }
}

const OPTIMIZE_PROMPT = `
You are an elite educational engineer. Rewrite this raw marking scheme into the strict "Playbook Standard Format".
CRITICAL MANDATES:
1. NO DATA LOSS: Preserve every alternative answer and exact mark allocation.
2. STRICT HIERARCHY & SECTIONS: Every single question/sub-question MUST have its own block.
3. ATOMIC CRITERIA: Break down paragraph answers into explicit, atomic, true/false grading criteria.
The JSON MUST exactly match this format:
[ { "qId": "string", "maxScore": number, "criteria": [ { "id": "string", "text": "string", "marks": number } ] } ]
`;

export async function optimizeMarkingSchemeClient(base64Images: string[], apiKey: string): Promise<any[]> {
    const userParts: any[] = [{ text: OPTIMIZE_PROMPT }];
    base64Images.forEach(img => {
        const matches = img.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) userParts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
    });

    const contentArray = formatOpenRouterVisionMessage(userParts);

    const res = await fetch(INTERNAL_PROXY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: "user", content: contentArray }],
            temperature: 0.0,
            response_format: { type: "json_object" }
        })
    });

    if (!res.ok) throw new Error(`OpenRouter API error: ${res.status}`);
    const data = await res.json();
    const parsedData = parseLLMJSON(data.choices?.[0]?.message?.content || "[]");
    return Array.isArray(parsedData) ? parsedData : [parsedData];
}

// ============================================================================
// THE HYBRID MASTERPIECE: Sequential Read + Deterministic JS Mapping
// ============================================================================
// THE HYBRID MASTERPIECE: Full Transcript Extraction (No Mismatch)
// ============================================================================
export async function extractStudentExamsClient(base64Images: string[], questionsToExtract: string[], apiKey: string): Promise<Record<string, string>> {
    console.log("[CLIENT ENGINE] Running Full Literal Transcription...");
    
    // We now just return a massive string (The Transcript) and the RegNo
    let fullTranscript = "";
    let extractedRegNo = "";

    // Kuandaa Picha na Lebo zake (Page Awareness)
    const examParts: any[] = [];
    base64Images.forEach((img, index) => {
        const matches = img.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
            examParts.push({ text: `\n--- PAGE ${index + 1} ---\n` });
            examParts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
        }
    });

    // PROMPT MPYA: "God Mode" Transcription. Tunasoma kitabu kama kilivyo. Hakuna JSON mappings zinazochanganya.
    const extractionPrompt = `
You are a highly accurate literal transcription engine reading a student's handwritten exam script.

Read ALL pages sequentially from start to finish using the inserted page separators (--- PAGE X ---) to preserve continuity.

YOUR JOB:
1. Find the student's Registration Number ONLY if clearly labeled. If found, include it at the very top of your output like this: "REG_NO: [number]".
2. Transcribe EVERYTHING EXACTLY as written by the student. Do not summarize. Do not correct their grammar.
3. Preserve all equations, fractions, powers, mathematical notation, and symbols exactly as written.
4. Keep the numbering system exactly as the student wrote it (e.g., "06 Question.", "A i)", "1. a.").
5. If text is completely unreadable, write exactly: [unclear]
6. Output raw Markdown text only. NO JSON formatting.
`;

    // FIX: Chunk pages to avoid 8192 token output limit & add Exponential Backoff for 429
    const BATCH_SIZE = 4;
    const elementsPerPage = 2;
    const batchElementsSize = BATCH_SIZE * elementsPerPage;

    for (let i = 0; i < examParts.length; i += batchElementsSize) {
        const batchParts = examParts.slice(i, i + batchElementsSize);

        let attempt = 0;
        const maxAttempts = 5;
        let success = false;

        while (attempt < maxAttempts && !success) {
            try {
                const contentArray = formatOpenRouterVisionMessage([{ text: extractionPrompt }, ...batchParts]);

                const res = await fetch(INTERNAL_PROXY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'google/gemini-2.5-flash',
                        messages: [{ role: "user", content: contentArray }],
                        temperature: 0.0,
                        max_tokens: 8192,
                    })
                });

                if (!res.ok) {
                    if (res.status === 429) throw new Error(`Rate Limit Exceeded (429)`);
                    throw new Error(`Proxy API error: ${res.status} - ${res.statusText}`);
                }

                const data = await res.json();
                let rawText = data.choices?.[0]?.message?.content || "";

                // Extract Reg No if found in this batch
                const regNoMatch = rawText.match(/REG_NO(?:\s*|\s*:\s*)([A-Za-z0-9\-]+)/i);
                if (regNoMatch && !extractedRegNo) {
                    extractedRegNo = regNoMatch[1];
                }

                // Append the batch transcript to the main transcript
                fullTranscript += `\n${rawText}\n`;
                success = true;

            } catch (err: any) {
                attempt++;
                console.warn(`[CLIENT ENGINE] Batch extraction failed (Attempt ${attempt}/${maxAttempts}): ${err.message}`);

                if (attempt >= maxAttempts) {
                    console.error("[CLIENT ENGINE] Max retries reached for batch. Throwing to prevent data loss.");
                    throw new Error(`Data Loss Prevention: Failed to extract exam pages after ${maxAttempts} attempts. Please check your internet connection and try again.`);
                } else {
                    const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
    }

    console.log("[CLIENT ENGINE] Full Transcript Extraction Complete.");

    // Return a dummy mapped object where the single "FULL_TRANSCRIPT" key holds the entire string.
    // The backend grading stream will handle searching through it.
    return {
        "FULL_TRANSCRIPT": fullTranscript,
        "registrationNumber": extractedRegNo || "Not found"
    };
}

if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export async function convertPdfToImagesClient(file: File): Promise<string[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: string[] = [];
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        if (pageNum > 100) break; // Extended limit to 100 pages per user's request
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 }); // High Res for literal transcription accuracy
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        canvas.height = viewport.height; canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        images.push(canvas.toDataURL('image/jpeg', 0.8)); 
    }
    return images;
}

export async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
}
