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

    try {
        // Tuma Request MOJA tu (Inaondoa hatari ya 429 Too Many Requests)
        const res = await fetch(`${API_URL}/gemini-2.5-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: extractionPrompt }, ...examParts] }],
                generationConfig: { 
                    temperature: 0.0, 
                    maxOutputTokens: 8192, 
                    responseMimeType: "application/json" 
                }
            })
        });

        if (!res.ok) {
            throw new Error(`Google API error: ${res.status} - ${res.statusText}`);
        }

        const data = await res.json();
        const json = parseLLMJSON(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");

        if (json.registrationNumber && json.registrationNumber !== "Not found") {
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
        // Imeondolewa limit ya page 20 kuruhusu mitihani mirefu (Worst-case scenario)
        if (pageNum > 60) break; // Limit imewekwa 60 kulinda memory ya browser (Out of Memory)
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
