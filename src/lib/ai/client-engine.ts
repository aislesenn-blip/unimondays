import * as pdfjsLib from 'pdfjs-dist';

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
    return Array.isArray(parsedData) ? parsedData : [parsedData];
}

// ============================================================================
// THE ULTIMATE HYBRID ARCHITECTURE (L11 Masterpiece)
// ============================================================================
export async function extractStudentExamsClient(base64Images: string[], questionsToExtract: string[], apiKey: string): Promise<Record<string, string>> {
    console.log("[CLIENT ENGINE] Initiating Ultimate Batched Sniper Extraction...");
    
    const normalizedTargets = questionsToExtract.map(id => normalizeQuestionId(id));
    const finalResultMap: Record<string, string> = {};

    const imageParts = base64Images.map(img => {
        const matches = img.match(/^data:([^;]+);base64,(.+)$/);
        return matches ? { inlineData: { mimeType: matches[1], data: matches[2] } } : null;
    }).filter(Boolean);

    // ------------------------------------------------------------------------
    // STAGE 1: THE GLOBAL MAPPER (Fast context scan)
    // ------------------------------------------------------------------------
    console.log("Stage 1: Mapping Attempted Questions...");
    const mapperPrompt = `
You are the Master Exam Mapper. Look at all pages of this handwritten exam.
TARGET IDs TO FIND: [ ${normalizedTargets.join(", ")} ]

JOB:
1. Find the student's Registration Number.
2. Identify which of the Target IDs the student actually attempted/wrote down. 
DO NOT TRANSCRIBE ANSWERS.

Output strictly in JSON:
{
  "registrationNumber": "string (or 'Not found')",
  "attemptedIds": ["id1", "id2"] // Only the IDs actually found.
}
`;

    let attemptedIds: string[] = [];
    try {
        const mapperRes = await fetch(`${API_URL}/gemini-2.5-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: mapperPrompt }, ...imageParts] }],
                generationConfig: { temperature: 0.0, responseMimeType: "application/json" } // JSON Imelazimishwa
            })
        });

        if (mapperRes.ok) {
            const mapperData = await mapperRes.json();
            const mapperJson = parseLLMJSON(mapperData.candidates?.[0]?.content?.parts?.[0]?.text || "{}");

            if (mapperJson.registrationNumber) {
                finalResultMap.registrationNumber = mapperJson.registrationNumber;
            }

            attemptedIds = Array.isArray(mapperJson.attemptedIds) ? mapperJson.attemptedIds : normalizedTargets;
            attemptedIds = attemptedIds.map((id: string) => normalizeQuestionId(id)).filter((id: string) => normalizedTargets.includes(id));
        } else {
            attemptedIds = normalizedTargets; // Fallback: Kama ikifeli, tafuta yote.
        }
    } catch (e) {
        console.warn("Mapper failed, falling back to all targets.", e);
        attemptedIds = normalizedTargets;
    }

    if (attemptedIds.length === 0) return finalResultMap;

    // ------------------------------------------------------------------------
    // STAGE 2: BATCHED SNIPER EXTRACTION (Deep focus, No JSON Cut-offs)
    // ------------------------------------------------------------------------
    console.log(`Stage 2: Batched Sniper Extraction for ${attemptedIds.length} questions...`);
    const BATCH_SIZE = 5; // Tunatafuta maswali 5 tu kwa wakati mmoja (Umakini 100%)
    
    // Tunatumia mbinu ya kutuma requests kwa makundi (Concurrency) kuokoa muda
    const batchPromises = [];

    for (let i = 0; i < attemptedIds.length; i += BATCH_SIZE) {
        const batchIds = attemptedIds.slice(i, i + BATCH_SIZE);

        const sniperPrompt = `
You are an Elite Forensic Transcriber.
Scan the entire document but HYPER-FOCUS ONLY on extracting answers for these specific Question IDs:
[ ${batchIds.map(id => `"${id}"`).join(", ")} ]

CRITICAL RULES:
1. CONTEXT: Do not confuse sub-questions. Check the page header (e.g., "Question 06") before assuming "iii)" belongs to Question 1.
2. STITCHING: If an answer starts on one page and continues on the next, combine the text seamlessly.
3. EXACT TRANSCRIPTION: Write exactly what the student wrote. Do not summarize.

Output strictly in JSON where keys are the specific Question IDs listed above:
{
  "${batchIds[0]}": "Exact text...",
  "another_id_if_found": "Exact text..."
}
`;

        const promise = fetch(`${API_URL}/gemini-2.5-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: sniperPrompt }, ...imageParts] }],
                generationConfig: { 
                    temperature: 0.0, 
                    maxOutputTokens: 8192, // Kinga ya mwisho: Haiwezi kukata JSON
                    responseMimeType: "application/json" // Kinga ya mwisho: Lazima iwe JSON valid
                }
            })
        }).then(async (res) => {
            if (res.ok) {
                const data = await res.json();
                const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
                return parseLLMJSON(rawJson);
            }
            return {};
        }).catch(err => {
            console.error(`Sniper batch failed for IDs: ${batchIds.join(", ")}`, err);
            return {};
        });

        batchPromises.push(promise);
    }

    // Subiri batches zote zimalize kisha changanya majibu pamoja
    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(batchJson => {
        Object.keys(batchJson).forEach(key => {
            const cleanKey = normalizeQuestionId(key);
            if (attemptedIds.includes(cleanKey) && batchJson[key] && batchJson[key] !== "No text extracted.") {
                finalResultMap[cleanKey] = batchJson[key];
            }
        });
    });

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
