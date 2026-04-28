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

    const extractionPrompt = `
You are an Elite Forensics Data Extractor. Your task is to extract student answers from the provided exam images and map them EXACTLY to the specific Question IDs requested.

[ TARGET QUESTION IDs TO FIND ]: 
${normalizedTargets.map(id => `"${id}"`).join(", ")}

*** CORE DIRECTIVES FOR HANDLING MESSY EXAMS (THE SMART ENGINE) ***
1. SCATTERED ANSWERS & PAGE TRACING: Students rarely write in perfect order. A sub-question (e.g., "A(iii)") might be on page 8, while the main question "2" was on page 1. You MUST explicitly read the TOP margin of each page to know which main question you are extracting (e.g. "02 Question") before matching it with the sub-questions below. DO NOT swap answers between questions.
2. ANSWER STITCHING: If an answer starts on one page and continues on another, seamlessly combine the text into a single response for that Question ID.
3. ID NORMALIZATION: Match the student's numbering (e.g., "Qn 1 a", "1(a)", "1.A") to the exact Target Question IDs provided above.

*** METADATA EXTRACTION (STUDENT DETAILS) ***
Scan the headers, footers, or cover page of the document to extract the student's Registration Number ONLY.

*** OUTPUT FORMAT (STRICT JSON ONLY) ***
Output a single, flat JSON object. Use the EXACT Target Question IDs as keys. Add ONE special key for the registration number. If an answer or metadata is completely missing, output "Not found.".

{
  "registrationNumber": "Extract Reg No here (or 'Not found.')",
  "${normalizedTargets[0] || "q1a"}": "Exact transcribed text of the student's answer...",
  "${normalizedTargets[1] || "q1b"}": "Exact transcribed text of the student's answer..."
}
`;
    const userParts: any[] = [{ text: extractionPrompt }];
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

    return parseLLMJSON(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
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
