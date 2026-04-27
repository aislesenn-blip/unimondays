// L9 Client-Side AI Engine (Multimodal Vision Processor)
import * as pdfjsLib from 'pdfjs-dist';

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// 1. SINGLE SOURCE OF TRUTH KWA IDs (Client & Server lazima zitumie hii)
export const normalizeQuestionId = (id: string): string => {
    return (id || "").toString().toLowerCase().replace(/[^a-z0-9]/g, '');
};

// 2. THE IRONCLAD JSON PARSER (Inaokoa mfumo usicrash AI ikileta Markdown)
export function parseLLMJSON(content: string): any {
    if (!content || content.trim() === '') return {};
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
    let startIndex = content.indexOf('{');
    if (startIndex !== -1) {
        let depth = 0, inString = false, escapeNext = false, endIndex = -1;
        for (let i = startIndex; i < content.length; i++) {
            const char = content[i];
            if (escapeNext) { escapeNext = false; continue; }
            if (char === '\\') { escapeNext = true; continue; }
            if (char === '"') { inString = !inString; continue; }
            if (!inString) {
                if (char === '{') depth++;
                else if (char === '}') {
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
        console.warn("JSON parse failed, returning empty map:", e);
        return {}; // Safe fallback
    }
}

// Use an environment variable or safe fallback for the browser.
// Note: In production, passing the API key to the client is risky without proxy or server limits.
// For this architecture refactor, we simulate the secure key fetching.
export async function getClientGeminiKey() {
    // Attempt to grab from public env variable first
    let key = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    // If not public, fetch it securely from our new internal endpoint
    if (!key) {
        try {
            const res = await fetch('/api/ai/get-key');
            if (res.ok) {
                const data = await res.json();
                if (data.key) {
                    key = data.key;
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
        console.warn("JSON parse failed, returning empty map:", e);
        return {}; // Safe fallback
    }
}

// Use an environment variable or safe fallback for the browser.
// Note: In production, passing the API key to the client is risky without proxy or server limits.
// For this architecture refactor, we simulate the secure key fetching.
// Helper is deprecated: We now use the secure proxy endpoint instead of exposing the key
export async function getClientGeminiKey() {
    return process.env.NEXT_PUBLIC_GEMINI_API_KEY || "dummy";
}

// Optimization Prompt for Pre-processing
const OPTIMIZE_PROMPT = `
You are an elite educational engineer. Rewrite this raw marking scheme into the strict "Playbook Standard Format".

CRITICAL MANDATES:

1. NO DATA LOSS: Preserve every alternative answer and exact mark allocation.
2. STRICT HIERARCHY & SECTIONS: Every single question/sub-question MUST have its own block. Do not merge sub-questions. If the raw text contains Section headers (e.g., Section A, Section B), you MUST precede the questions in that section with a strict section marker block: [SECTION: X]. If no sections are found, assume [SECTION: GENERAL].
3. ATOMIC CRITERIA: Break down paragraph answers into explicit, atomic, true/false grading criteria. Each criterion must represent exactly one independently gradable concept.
4. Output ONLY the structured text. No markdown block wrapping (\`\`\`json).

The JSON MUST exactly match this format:
[
  {
    "qId": "string", // Example: "1a", "2_b"
    "maxScore": number, // Example: 3
    "criteria": [
      {
         "id": "string", // Example: "c1", "c2"
         "text": "string", // Example: "States 'conversion of light energy to chemical energy'"
         "marks": number // Example: 1
      }
    ]
  }
]
`;

export async function optimizeMarkingSchemeClient(base64Images: string[], apiKey: string): Promise<any[]> {
    console.log("[CLIENT ENGINE] Optimizing Marking Scheme via Multimodal Vision...");

    const userParts: any[] = [{ text: OPTIMIZE_PROMPT }];

    base64Images.forEach(img => {
        const matches = img.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
            userParts.push({
                inlineData: {
                    mimeType: matches[1],
                    data: matches[2]
                }
            });
        }
    });

    // Route traffic through our secure backend proxy to protect the API key
    const response = await fetch('/api/ai/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: "user", parts: userParts }],
            generationConfig: {
                temperature: 0.0,
                responseMimeType: "application/json"
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google AI Studio API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    let textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    // Clean markdown if present
    textContent = textContent.replace(/```json/gi, '').replace(/```/g, '').trim();

    return JSON.parse(textContent);
}


// 1. SINGLE SOURCE OF TRUTH KWA IDs (Client & Server lazima zitumie hii)
export const normalizeQuestionId = (id: string): string => {
    return (id || "").toString().toLowerCase().replace(/[^a-z0-9]/g, '');
};

// 2. THE IRONCLAD JSON PARSER (Inaokoa mfumo usicrash AI ikileta Markdown)
export function parseLLMJSON(content: string): any {
    if (!content || content.trim() === '') return {};
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
    let startIndex = content.indexOf('{');
    if (startIndex !== -1) {
        let depth = 0, inString = false, escapeNext = false, endIndex = -1;
        for (let i = startIndex; i < content.length; i++) {
            const char = content[i];
            if (escapeNext) { escapeNext = false; continue; }
            if (char === '\\') { escapeNext = true; continue; }
            if (char === '"') { inString = !inString; continue; }
            if (!inString) {
                if (char === '{') depth++;
                else if (char === '}') {
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
        console.warn("JSON parse failed, returning empty map:", e);
        return {}; // Safe fallback
    }
}

// 3. THE EXTRACTION ENGINE YENYE FEW-SHOT PROMPT
export async function extractStudentExamsClient(base64Images: string[], targetQuestions: string[], apiKey: string): Promise<Record<string, string>> {
    console.log("[CLIENT ENGINE] Single-Pass Multimodal Extraction for Student Exam...");

    // Tunahakikisha AI inapewa Normalized IDs pekee, isije ikajitungia format zake
    const normalizedTargets = targetQuestions.map(id => normalizeQuestionId(id));

    const extractionPrompt = `
You are the Master Data Extractor for an Examination Board.
Your ONLY task is to locate and transcribe the exact answer for the specific Question IDs provided below from the student's document images.

TARGET QUESTION IDs:
[ ${normalizedTargets.map(id => `"${id}"`).join(", ")} ]

*** ABSOLUTE RULES ***
1. Use EXACTLY the TARGET QUESTION IDs provided above as your JSON keys. Do not invent, capitalize, or alter them.
2. Transcribe the student's exact text, math, or formulas for that specific question.
3. If the student left the question completely blank, output EXACTLY "No text extracted."
4. Output ONLY valid, raw JSON. No conversational text. No markdown formatting.

*** REQUIRED JSON SCHEMA EXAMPLE ***
{
  "${normalizedTargets[0] || "q1a"}": "The mitochondria is the powerhouse...",
  "${normalizedTargets[1] || "q1b"}": "No text extracted.",
  "${normalizedTargets[2] || "q2"}": "x = 45"
}
`;

    const userParts: any[] = [{ text: extractionPrompt }];
    base64Images.forEach(img => {
        const matches = img.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) userParts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
    });

    // Route traffic through our secure backend proxy to protect the API key
    const response = await fetch('/api/ai/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: "user", parts: userParts }],
            generationConfig: { temperature: 0.0, responseMimeType: "application/json" }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google API error: ${response.status} ${errorText}`);
    }
    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // Tunatumia parser yetu ya chuma badala ya JSON.parse()
    return parseLLMJSON(rawText);
}

// Convert File to Base64 for the Client Engine
export async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
}

// Inform PDF.js where the worker is (needed for client-side execution)
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

// Extract Images from PDF client-side
export async function convertPdfToImagesClient(file: File): Promise<string[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        // Render 20 pages max to prevent memory overflow in browser
        if (pageNum > 20) break;
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 }); // Good balance of quality/size

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        await page.render(renderContext).promise;
        // Convert to JPEG base64 to save size
        const base64Img = canvas.toDataURL('image/jpeg', 0.8);
        images.push(base64Img);
    }

    return images;
}
