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
// THE ARCHITECTURE: PASS 1 + PASS 1B (With Anti-Blindness Tricks)
// ============================================================================
export async function extractStudentExamsClient(base64Images: string[], questionsToExtract: string[], apiKey: string): Promise<Record<string, string>> {
    console.log("[CLIENT ENGINE] Initiating PASS 1 + PASS 1B Extraction...");
    const normalizedTargets = questionsToExtract.map(id => normalizeQuestionId(id));
    const finalResultMap: Record<string, string> = {};

    // TRICK #1: PAGE LABELING (Tunaiambia AI hii ni page ya ngapi)
    const examParts: any[] = [];
    base64Images.forEach((img, index) => {
        const matches = img.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
            examParts.push({ text: `\n--- START OF EXAM PAGE ${index + 1} ---\n` });
            examParts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
        }
    });

    // ------------------------------------------------------------------------
    // A. PASS 1 (The Segmentation Map)
    // ------------------------------------------------------------------------
    console.log("PASS 1: Mapping Attempted Questions...");
    const mapperPrompt = `
You are the Master Mapper. Look at ALL ${base64Images.length} pages of this handwritten exam.
TARGET IDs: [ ${normalizedTargets.join(", ")} ]

MANDATE:
Identify EVERY question from the Target IDs that the student actually attempted. 
DO NOT TRANSCRIBE THE ANSWERS YET. Just state if they attempted the question.
Also, find the student's Registration Number.

Output strictly in JSON:
{
  "registrationNumber": "string (or 'Not found')",
  "attemptedIds": ["id1", "id2"] // Only the IDs actually found anywhere in the exam.
}
`;

    let attemptedIds: string[] = [];
    try {
        const mapperRes = await fetch(`${API_URL}/gemini-2.5-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: mapperPrompt }, ...examParts] }],
                generationConfig: { temperature: 0.0, responseMimeType: "application/json" }
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
            attemptedIds = normalizedTargets;
        }
    } catch (e) {
        console.warn("Mapper failed, falling back to all targets.", e);
        attemptedIds = normalizedTargets;
    }

    if (attemptedIds.length === 0) return finalResultMap;

    // ------------------------------------------------------------------------
    // B. PASS 1B (Single Question Extraction - Snipping 3 at a time)
    // ------------------------------------------------------------------------
    console.log(`PASS 1B: Sniper Extraction for ${attemptedIds.length} questions (3 at a time)...`);
    
    const BATCH_SIZE = 3; 

    for (let i = 0; i < attemptedIds.length; i += BATCH_SIZE) {
        const batchIds = attemptedIds.slice(i, i + BATCH_SIZE);
        console.log(`Extracting Batch: ${batchIds.join(", ")}`);

        // TRICK #2: JSON CHAIN OF THOUGHT (Inalazimisha itafute kabla ya kujibu)
        const sniperPrompt = `
You MUST act as a literal forensic transcriber. 
You have been given ALL ${base64Images.length} labeled pages of an exam.
You MUST search EVERY SINGLE PAGE for these specific Question IDs:
[ ${batchIds.map(id => `"${id}"`).join(", ")} ]

CRITICAL MANDATES:
1. DO NOT STOP EARLY: You must explicitly check all pages up to Page ${base64Images.length}. 
2. CHAIN OF THOUGHT: Use the "analysis" field to explain exactly which page you found the answer on.
3. CONTEXT: Read the top of the page (e.g., "03 Question") so you don't confuse "1(iii)" with "6(iii)".
4. TRANSCRIBE: Quote their exact phrases, math, and steps.
5. STITCH: If their answer starts on one page and finishes on another, combine the text.

Output strictly in JSON format:
{
  "analysis": "I searched all ${base64Images.length} pages. I found ID 1 on Page 4 and ID 2 on Page 6...",
  "${batchIds[0]}": "Exact student text (or 'No text extracted.')",
  "another_id": "Exact student text..."
}
`;

        try {
            const extRes = await fetch(`${API_URL}/gemini-2.5-pro:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: sniperPrompt }, ...examParts] }],
                    generationConfig: { 
                        temperature: 0.0, 
                        maxOutputTokens: 8192, 
                        responseMimeType: "application/json" 
                    }
                })
            });

            if (extRes.ok) {
                const extData = await extRes.json();
                const extJson = parseLLMJSON(extData.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
                
                batchIds.forEach(id => {
                    if (extJson[id] && extJson[id] !== "No text extracted.") {
                        finalResultMap[id] = extJson[id];
                    }
                });
            } else {
                console.error(`Batch failed with status: ${extRes.status}`);
            }
        } catch (err) {
            console.error(`Extraction failed for batch ${batchIds.join(", ")}`, err);
        }
    }

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
