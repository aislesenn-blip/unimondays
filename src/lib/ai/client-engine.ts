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

    const res = await fetch(`${API_URL}/gemini-2.5-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: "user", parts: userParts }],
            generationConfig: { temperature: 0.0, responseMimeType: "application/json" }
        })
    });

    if (!res.ok) throw new Error(`Google API error: ${res.status}`);
    const data = await res.json();
    const parsedData = parseLLMJSON(data.candidates?.[0]?.content?.parts?.[0]?.text || "[]");
    return Array.isArray(parsedData) ? parsedData : [parsedData];
}


// ============================================================================
// WAZO LAKO: THE SEQUENTIAL TRANSCRIPTION ENGINE (Single Request)
// ============================================================================
export async function extractStudentExamsClient(base64Images: string[], questionsToExtract: string[], apiKey: string): Promise<Record<string, string>> {
    console.log("[CLIENT ENGINE] Running Sequential Transcription (Single Request)...");
    
    const finalResultMap: Record<string, string> = {};
    const normalizedTargets = questionsToExtract.map(id => normalizeQuestionId(id));

    const examParts: any[] = [];
    base64Images.forEach((img, index) => {
        const matches = img.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
            // Tunaiambia inasoma ukurasa gani ili ihusishe majibu yanayoungana
            examParts.push({ text: `\n--- PAGE ${index + 1} ---\n` });
            examParts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
        }
    });

    // PROMPT YAKO: Inamwambia asome tu kama kitabu, bila kujali mpangilio
    const extractionPrompt = `
You are a highly accurate literal transcriber reading a student's exam.
Read ALL pages sequentially from start to finish. 
The student may have written their answers out of order, messily, or randomly. 

YOUR JOB:
1. Find the student's Registration Number on the first few pages.
2. EVERY TIME you see a question number (e.g., "1.", "a)", "iii", "Question 6"), extract the text/math/steps that follow it exactly as written.
3. If an answer starts on one page and finishes on another, combine the text.
4. Do not try to match any specific IDs. Just document EVERYTHING the student wrote next to its corresponding number.

Output strictly as a JSON object:
{
  "registrationNumber": "found reg number (or 'Not found')",
  "extractedAnswers": [
    { 
      "writtenNumber": "The question number exactly as the student wrote it (e.g., '1 a i' or 'Q6(iii)')", 
      "text": "The exact transcribed answer text" 
    }
  ]
}
`;

    try {
        const res = await fetch(`${API_URL}/gemini-2.5-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: extractionPrompt }, ...examParts] }],
                generationConfig: { 
                    temperature: 0.0, 
                    maxOutputTokens: 8192, // Tumeipa Token zote 8K ihakikishe haikati maneno 
                    responseMimeType: "application/json" 
                }
            })
        });

        if (!res.ok) {
            throw new Error(`Google API error: ${res.status} - ${res.statusText}`);
        }

        const data = await res.json();
        const json = parseLLMJSON(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");

        if (json.registrationNumber) {
            finalResultMap.registrationNumber = json.registrationNumber;
        }

        // HAPA NDIO CODE YETU INAFANYA KAZI YA KUPANGA ID (Matching Engine)
        if (Array.isArray(json.extractedAnswers)) {
            json.extractedAnswers.forEach((item: any) => {
                if (item.writtenNumber && item.text) {
                    // Tunasafisha namba aliyoandika mwanafunzi (Mfano: "1 a i" inakuwa "1ai")
                    const cleanWrittenId = normalizeQuestionId(item.writtenNumber);
                    
                    // Tunatafuta kama hii ID inafanana na zile tunazotaka
                    const matchedTargetId = normalizedTargets.find(target => {
                        // Kuzuia "1ai" kuchanganyikana na "11ai" au "6ai"
                        return cleanWrittenId === target || cleanWrittenId.endsWith(target) || target.endsWith(cleanWrittenId);
                    });

                    if (matchedTargetId) {
                        // Kama swali lipo, linaingia kwenye mtambo
                        // Tunajumlisha kama mwanafunzi aliandika swali hilihili mara mbili
                        if (finalResultMap[matchedTargetId]) {
                            finalResultMap[matchedTargetId] += `\n[Continued]: ${item.text}`;
                        } else {
                            finalResultMap[matchedTargetId] = item.text;
                        }
                    }
                }
            });
        }

        console.log("[CLIENT ENGINE] Successfully matched IDs:", Object.keys(finalResultMap));

    } catch (err) {
        console.error("Single-Pass Sequential Extraction failed.", err);
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
        const viewport = page.getViewport({ scale: 1.2 }); // Size nzuri ya kuzuia 403 lakini inasomeka vizuri
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        canvas.height = viewport.height; canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        images.push(canvas.toDataURL('image/jpeg', 0.6)); // Quality nzuri kwa Single-Pass
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
