import * as pdfjsLib from 'pdfjs-dist';

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// 1. NORMALIZER: Inahakikisha "1(a)" au "Q1a" zote zinakuwa "1a"
export const normalizeQuestionId = (id: string): string => {
    return (id || "").toString().toLowerCase().replace(/[^a-z0-9]/g, '');
};

// 2. IRONCLAD PARSER: Inazuia mfumo usife hata AI ikileta Markdown au JSON mbovu
export function parseLLMJSON(content: string): any {
    if (!content || content.trim() === '') return {};
    
    // Ondoa <think> tags kama zipo
    let cleanContent = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
    
    // Tafuta mwanzo na mwisho wa JSON object
    let startIndex = cleanContent.indexOf('{');
    if (startIndex !== -1) {
        let depth = 0, inString = false, escapeNext = false, endIndex = -1;
        for (let i = startIndex; i < cleanContent.length; i++) {
            const char = cleanContent[i];
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
        cleanContent = endIndex !== -1 ? cleanContent.substring(startIndex, endIndex + 1) : cleanContent.substring(startIndex);
    }

    // Safisha Markdown na herufi haramu
    cleanContent = cleanContent.replace(/^```json\s*/gi, '').replace(/^```\s*/gi, '').replace(/```\s*$/gi, '');
    cleanContent = cleanContent.replace(/[\n\r\t]+/g, ' ');
    cleanContent = cleanContent.replace(/\\(?!["\\/bfnrt])/g, '\\\\');

    try {
        return JSON.parse(cleanContent);
    } catch (e) {
        console.error("JSON Repair failed:", e);
        return {}; 
    }
}

// 3. EXTRACTION ENGINE: Inatoa majibu ya mwanafunzi kwa usahihi
export async function extractStudentExamsClient(
    base64Images: string[], 
    targetQuestions: string[], 
    apiKey: string
): Promise<Record<string, string>> {
    const normalizedTargets = targetQuestions.map(id => normalizeQuestionId(id));
    
    const extractionPrompt = `
You are a High-Precision Data Extractor. 
Locate and transcribe the student's answer for EXACTLY these Question IDs:
[ ${normalizedTargets.join(", ")} ]

*** RULES ***
1. Use the EXACT IDs above as your JSON keys.
2. Transcribe the literal text/math from the images.
3. If blank, output "No text extracted."
4. Output ONLY raw JSON.

*** EXAMPLE ***
{ "${normalizedTargets[0]}": "Student's jibu..." }
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

    if (!response.ok) throw new Error(`Google API: ${response.status}`);
    const data = await response.json();
    return parseLLMJSON(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
}
