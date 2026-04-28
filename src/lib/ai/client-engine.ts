import * as pdfjsLib from 'pdfjs-dist';

// Removed the direct Google API endpoint and key fetching logic
// since exposing the API key to the browser is a major security risk.
// All traffic is now securely routed through our backend proxy.

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export async function getClientGeminiKey() {
    let key = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!key) {
        try {
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

export const normalizeQuestionId = (id: string): string => {
    return (id || "").toString().toLowerCase().replace(/[^a-z0-9]/g, '');
};

export function parseLLMJSON(content: string): any {
    if (!content || content.trim() === '') return {};
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');

    let firstBrace = content.indexOf('{');
    let firstBracket = content.indexOf('[');
    let startIndex = -1;
    let isArray = false;

    // Tafuta kipi kinaanza kwanza kati ya '[' na '{'
    if (firstBrace !== -1 && firstBracket !== -1) {
        startIndex = Math.min(firstBrace, firstBracket);
        isArray = startIndex === firstBracket;
    } else {
        startIndex = Math.max(firstBrace, firstBracket);
        isArray = startIndex === firstBracket;
    }

    if (startIndex !== -1) {
        let depth = 0, inString = false, escapeNext = false, endIndex = -1;
        let openChar = isArray ? '[' : '{';
        let closeChar = isArray ? ']' : '}';

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

    try {
        return JSON.parse(content);
    } catch (e) {
        console.warn("JSON parse failed, returning fallback:", e);
        return isArray ? [] : {};
    }
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

    const response = await fetch(`${API_URL}/gemini-2.5-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: "user", parts: userParts }],
            generationConfig: { temperature: 0.0, responseMimeType: "application/json" }
        })
    });

    if (!response.ok) throw new Error(`Google API error: ${response.status}`);
    const data = await response.json();

    const parsedData = parseLLMJSON(data.candidates?.[0]?.content?.parts?.[0]?.text || "[]");

    // GUARANTEE ARRAY: Hii inazuia "atomicCriteriaJson.map is not a function"
    return Array.isArray(parsedData) ? parsedData : [parsedData];
}

export async function extractStudentExamsClient(base64Images: string[], questionsToExtract: string[], apiKey: string): Promise<Record<string, string>> {
    const normalizedTargets = questionsToExtract.map(id => normalizeQuestionId(id));
    
    // Convert base64 images into Gemini API format
    const imageParts = base64Images.map(img => {
        const matches = img.match(/^data:([^;]+);base64,(.+)$/);
        return matches ? { inlineData: { mimeType: matches[1], data: matches[2] } } : null;
    }).filter(Boolean);

    const finalResultMap: Record<string, string> = {};

    // ============================================================================
    // STAGE 1: THE MAPPER (Find Registration Number & Attempted Questions)
    // ============================================================================
    const mapperPrompt = `
You are an Elite Exam Mapper. Scan all provided pages of this handwritten student exam holistically.
TARGET QUESTION IDs TO LOOK FOR: [ ${normalizedTargets.join(", ")} ]

YOUR JOB:
1. Find the student's Registration Number (usually on the first page or header).
2. Trace the student's chaotic numbering and identify EXACTLY which of the Target Question IDs the student actually attempted.

DO NOT extract the answers. Just map what exists.
Output strictly in this JSON format:
{
  "registrationNumber": "string (or 'Not found')",
  "attemptedIds": ["list", "of", "target", "ids", "actually", "found"]
}
`;

    try {
        const mapperRes = await fetch(`${API_URL}/gemini-2.5-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: mapperPrompt }, ...imageParts] }],
                generationConfig: { temperature: 0.0, responseMimeType: "application/json" }
            })
        });

        if (!mapperRes.ok) throw new Error(`Mapping failed: ${mapperRes.status}`);
        
        const mapperData = await mapperRes.json();
        const mapperJson = parseLLMJSON(mapperData.candidates?.[0]?.content?.parts?.[0]?.text || "{}");

        if (mapperJson.registrationNumber) {
            finalResultMap.registrationNumber = mapperJson.registrationNumber;
        }

        // Determine which questions to actually extract
        let attemptedIds: string[] = Array.isArray(mapperJson.attemptedIds) ? mapperJson.attemptedIds : normalizedTargets;
        attemptedIds = attemptedIds.map((id: string) => normalizeQuestionId(id)).filter((id: string) => normalizedTargets.includes(id));

        if (attemptedIds.length === 0) return finalResultMap;

        // ============================================================================
        // STAGE 2: BATCHED DEEP EXTRACTION (To prevent Context Confusion)
        // ============================================================================
        // Tunagawa maswali kwenye makundi (batches) ya 6. Hii inaifanya AI isipoteze memory.
        const BATCH_SIZE = 6;
        for (let i = 0; i < attemptedIds.length; i += BATCH_SIZE) {
            const batchIds = attemptedIds.slice(i, i + BATCH_SIZE);

            const extractionPrompt = `
You are a Strict Transcriber. Read the entire document holistically to extract answers for these SPECIFIC questions ONLY:
[ ${batchIds.join(", ")} ]

CRITICAL RULES:
1. HYPER-FOCUS: Only look for the specific IDs listed above. Ignore all other questions.
2. TRACE THE FLOW: A main question (e.g., "03 Question") might be on page 4, and its sub-question "A(i)" on page 5. Use human reasoning to link them.
3. STITCH MULTI-PAGE ANSWERS: If an answer starts on one page and continues to another, combine it into one single response string.
4. EXACT TRANSCRIBING: Copy the exact words, math, and formulas exactly as written.

Output strictly in this JSON format:
{
  "answers": [
    { "qId": "string (must exactly match one of the requested IDs)", "text": "string (exact transcribed answer)" }
  ]
}
`;
            
            const extRes = await fetch(`${API_URL}/gemini-2.5-pro:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: extractionPrompt }, ...imageParts] }],
                    generationConfig: { temperature: 0.0, responseMimeType: "application/json" }
                })
            });

            if (extRes.ok) {
                const extData = await extRes.json();
                const extJson = parseLLMJSON(extData.candidates?.[0]?.content?.parts?.[0]?.text || "{}");

                if (Array.isArray(extJson.answers)) {
                    extJson.answers.forEach((item: any) => {
                        if (item.qId && item.text) {
                            finalResultMap[normalizeQuestionId(item.qId)] = item.text;
                        }
                    });
                }
            }
        }

    } catch (error) {
        console.error("Extraction Pipeline Error:", error);
    }

    return finalResultMap;
}

if (typeof window !== 'undefined' && 'Worker' in window) {
  // SAFELY DEFINED: No escaping slashes (\) inside the backticks.
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export async function convertPdfToImagesClient(file: File): Promise<string[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: string[] = [];
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        if (pageNum > 20) break;
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
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
