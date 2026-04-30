import * as pdfjsLib from 'pdfjs-dist';

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

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

    const res = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : 'https://playbook.app',
            'X-Title': 'Playbook Grading Engine'
        },
        body: JSON.stringify({
            model: 'google/gemini-2.5-pro',
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
export async function extractStudentExamsClient(base64Images: string[], questionsToExtract: string[], apiKey: string): Promise<Record<string, string>> {
    console.log("[CLIENT ENGINE] Running Sequential Transcription with Deterministic JS Mapping...");
    
    const finalResultMap: Record<string, string> = {};
    const normalizedTargets = questionsToExtract.map(id => normalizeQuestionId(id));

    // Kuandaa Picha na Lebo zake (Page Awareness)
    const examParts: any[] = [];
    base64Images.forEach((img, index) => {
        const matches = img.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
            examParts.push({ text: `\n--- PAGE ${index + 1} ---\n` });
            examParts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
        }
    });

    // PROMPT BORA KABISA (Inayo-solve Hallucination, Unclear text, na Math)
    const extractionPrompt = `
You are a highly accurate literal transcription engine reading a student's handwritten exam script.

Read ALL pages sequentially from start to finish using the inserted page separators (--- PAGE X ---) to preserve continuity.

The student may write answers:
- out of order
- across multiple pages
- messily
- with corrections
- with repeated attempts
- using mixed numbering styles

YOUR JOB:

1. Find the student's Registration Number only if it is clearly labeled as:
   Registration Number, Reg No, Candidate Number, Index Number, or Exam Number.
Do not guess.
If uncertain, return "Not found".

2. Every time you see a question number
   (example: 1., a), iii, Q6, Question 4(b), 1 a i),
   extract the exact text, mathematics, steps, symbols, and working that follow it.

3. Preserve equations, fractions, powers, units, mathematical notation, and symbols exactly as written.
Do not simplify, rewrite, summarize, or interpret.

4. If an answer continues on another page, combine it only if the numbering clearly shows continuation.
Never merge unrelated answers.

5. If the same question is answered multiple times, keep all versions in reading order.
Do not remove duplicates.

6. Never infer missing words.
   Never guess unclear handwriting.
If text is unreadable, write exactly:
[unclear]

7. Do not try to match any specific target IDs.
Simply document EVERYTHING the student wrote next to its corresponding written number.

OUTPUT STRICTLY as valid JSON only:
{
  "registrationNumber": "found registration number or Not found",
  "extractedAnswers": [
    {
      "writtenNumber": "exact numbering exactly as written by student",
      "text": "exact literal transcription"
    }
  ]
}
`;

    // FIX: Chunk pages to avoid 8192 token output limit & add Exponential Backoff for 429
    const BATCH_SIZE = 4; // Process 4 pages at a time (each page is roughly 1-2 parts including text separators)

    // Each page in examParts uses 2 elements (text and inlineData)
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

                const res = await fetch(OPENROUTER_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : 'https://playbook.app',
                        'X-Title': 'Playbook Grading Engine'
                    },
                    body: JSON.stringify({
                        model: 'google/gemini-2.5-pro',
                        messages: [{ role: "user", content: contentArray }],
                        temperature: 0.0,
                        max_tokens: 8192,
                        response_format: { type: "json_object" }
                    })
                });

                if (!res.ok) {
                    if (res.status === 429) {
                        throw new Error(`Rate Limit Exceeded (429)`);
                    }
                    throw new Error(`OpenRouter API error: ${res.status} - ${res.statusText}`);
                }

                const data = await res.json();
                const json = parseLLMJSON(data.choices?.[0]?.message?.content || "{}");

                if (json.registrationNumber && json.registrationNumber !== "Not found" && !finalResultMap.registrationNumber) {
                    finalResultMap.registrationNumber = json.registrationNumber;
                }

                // --------------------------------------------------------------------
                // THE SMART MAPPER: Code yako inatafsiri majibu na kuziweka kwenye 'Box'
                // --------------------------------------------------------------------
                if (Array.isArray(json.extractedAnswers)) {
                    json.extractedAnswers.forEach((item: any) => {
                        if (item.writtenNumber && item.text) {
                            // 1. Safisha ID ya mwanafunzi (Mfano: "Q1(a)" inakuwa "1a")
                            const cleanWrittenId = normalizeQuestionId(item.writtenNumber);

                            // 2. Tafuta kama inafanana na ID ulizozitaka kutoka kwenye Marking Scheme
                            const matchedTargetId = normalizedTargets.find(target => {
                                return cleanWrittenId === target || cleanWrittenId.endsWith(target) || target.endsWith(cleanWrittenId);
                            });

                            // 3. Kama ipo, ihifadhi kwenye Object itakayoenda Backend
                            if (matchedTargetId) {
                                if (finalResultMap[matchedTargetId]) {
                                    // Utunzaji wa marudio (Duplicate Handling) endapo alijibu mara 2
                                    finalResultMap[matchedTargetId] += `\n\n[Additional/Continued Attempt]:\n${item.text}`;
                                } else {
                                    finalResultMap[matchedTargetId] = item.text;
                                }
                            }
                        }
                    });
                }

                success = true;

            } catch (err: any) {
                attempt++;
                console.warn(`[CLIENT ENGINE] Batch extraction failed (Attempt ${attempt}/${maxAttempts}): ${err.message}`);

                if (attempt >= maxAttempts) {
                    console.error("[CLIENT ENGINE] Max retries reached for batch. Throwing to prevent data loss.");
                    throw new Error(`Data Loss Prevention: Failed to extract exam pages after ${maxAttempts} attempts. Please check your internet connection and try again.`);
                } else {
                    // Exponential backoff
                    const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
    }

    console.log("[CLIENT ENGINE] Successfully matched IDs:", Object.keys(finalResultMap));

    return finalResultMap;
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
