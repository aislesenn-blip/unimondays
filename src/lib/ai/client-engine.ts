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

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// ============================================================================
// THE HYBRID V2: Map, Crop, and Extract (Anti-403 Architecture)
// ============================================================================
export async function extractStudentExamsClient(base64Images: string[], questionsToExtract: string[], apiKey: string): Promise<Record<string, string>> {
    console.log("[CLIENT ENGINE] Initiating Advanced Map & Crop Extraction...");
    const normalizedTargets = questionsToExtract.map(id => normalizeQuestionId(id));
    const finalResultMap: Record<string, string> = {};

    const examParts: any[] = [];
    base64Images.forEach((img, index) => {
        const matches = img.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
            examParts.push({ text: `\n--- IMAGE INDEX ${index} ---\n` }); // Index ni muhimu hapa
            examParts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
        }
    });

    // ------------------------------------------------------------------------
    // STAGE 1: THE LOCATOR MAP (Find WHERE each question is)
    // ------------------------------------------------------------------------
    console.log("PASS 1: Locating Questions across images...");
    const mapperPrompt = `
You are an Exam Indexer. Scan ALL provided images of this handwritten exam.
TARGET IDs: [ ${normalizedTargets.join(", ")} ]

MANDATE:
Identify which IMAGE INDEX (0 to ${base64Images.length - 1}) contains the answer for each Target ID.
If an answer spans multiple images, list all relevant indices.
Also find the Registration Number. DO NOT transcribe answers yet.

Output strictly in JSON:
{
  "registrationNumber": "string",
  "locations": [
    { "qId": "id1", "imageIndices": [0, 1] },
    { "qId": "id2", "imageIndices": [4] }
  ]
}
`;

    let questionLocations: { qId: string, imageIndices: number[] }[] = [];
    
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

            if (Array.isArray(mapperJson.locations)) {
                // Filter only valid targets and normalize IDs
                questionLocations = mapperJson.locations.map((loc: any) => ({
                    qId: normalizeQuestionId(loc.qId),
                    imageIndices: Array.isArray(loc.imageIndices) ? loc.imageIndices : []
                })).filter((loc: any) => normalizedTargets.includes(loc.qId) && loc.imageIndices.length > 0);
            }
        }
    } catch (e) {
        console.warn("Mapper failed. Cannot proceed without location map to avoid 403s.", e);
        return finalResultMap; // Tunakataa kutuma request za kipofu.
    }

    if (questionLocations.length === 0) return finalResultMap;

    // ------------------------------------------------------------------------
    // STAGE 2: TARGETED EXTRACTION (Send ONLY the required images per batch)
    // ------------------------------------------------------------------------
    console.log(`PASS 1B: Targeted Extraction for ${questionLocations.length} located questions...`);
    
    const BATCH_SIZE = 3; 

    for (let i = 0; i < questionLocations.length; i += BATCH_SIZE) {
        const batch = questionLocations.slice(i, i + BATCH_SIZE);
        const batchIds = batch.map(b => b.qId);
        
        // Kusanya Picha zinazohitajika tu kwa hii batch (Zilizotajwa kwenye imageIndices)
        const requiredIndices = new Set<number>();
        batch.forEach(b => b.imageIndices.forEach(idx => requiredIndices.add(idx)));
        
        const targetedImageParts: any[] = [];
        requiredIndices.forEach(index => {
            if (base64Images[index]) {
                const matches = base64Images[index].match(/^data:([^;]+);base64,(.+)$/);
                if (matches) {
                    targetedImageParts.push({ text: `\n--- PAGE IMAGE ---\n` });
                    targetedImageParts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
                }
            }
        });

        console.log(`Extracting Batch: ${batchIds.join(", ")} (Sending ${targetedImageParts.length / 2} specific images)`);

        const sniperPrompt = `
You are a literal forensic transcriber. 
I have provided ONLY the relevant pages where the following Question IDs are located:
[ ${batchIds.map(id => `"${id}"`).join(", ")} ]

CRITICAL MANDATE:
Extract the exact student answers for these IDs from the provided images. 
Quote their phrases, math, and steps exactly.

Output strictly in JSON:
{
  "${batchIds[0]}": "Exact student text (or 'No text extracted.')"
}
`;

        try {
            const extRes = await fetch(`${API_URL}/gemini-2.5-pro:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: sniperPrompt }, ...targetedImageParts] }],
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

        console.log("Cooling down API to prevent rate limits...");
        await delay(2000); 
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
        images.push(canvas.toDataURL('image/jpeg', 0.6)); // Tunashusha tena ubora kidogo kuwa salama zaidi
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
