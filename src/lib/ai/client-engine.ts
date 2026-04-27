// L9 Client-Side AI Engine (Multimodal Vision Processor)

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

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
        } catch(e) {
            console.error("Failed to fetch internal API key", e);
        }
    }

    return key || "dummy";
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

    const response = await fetch(`${API_URL}/gemini-2.5-pro:generateContent?key=${apiKey}`, {
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


export async function extractStudentExamsClient(base64Images: string[], questionsToExtract: string[], apiKey: string): Promise<Record<string, string>> {
    console.log("[CLIENT ENGINE] Single-Pass Multimodal Extraction for Student Exam...");

    const extractionPrompt = `
You are the UE Mass-Extractor for an Examination Board.
Locate and transcribe the exact answer for the following list of Question IDs from the provided student document images:
[ ${questionsToExtract.join(", ")} ]

*** STRICT INSTRUCTIONS ***
1. For each Question ID listed, find where the student answered it and transcribe their EXACT text, math, or steps. Do not summarize or correct spelling.
2. If the student did not explicitly write anything for a question, output EXACTLY "No text extracted."
3. For diagram questions, describe the drawn nodes and connection logic literally.
4. DO NOT reference the Marking Scheme or try to evaluate if the student is correct. Your job is ONLY transcription.
5. Output ONLY valid JSON mapping the Question ID to the transcribed answer string.

*** FEW-SHOT EXAMPLES ***

[INPUT IMAGE]: A student wrote "1(a) The powerhouse is the mitochonria. (b) [Blank space]"
[TARGET IDs]: ["Q1_A", "Q1_B"]

[OUTPUT JSON]
{
  "Q1_A": "The powerhouse is the mitochonria.",
  "Q1_B": "No text extracted."
}

[INPUT IMAGE]: Student crossed out their first answer for Q3 and wrote "Q3: 45 kg" next to it.
[TARGET IDs]: ["Q3"]

[OUTPUT JSON]
{
  "Q3": "45 kg"
}
`;

    const userParts: any[] = [{ text: extractionPrompt }];

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

    const response = await fetch(`${API_URL}/gemini-2.5-pro:generateContent?key=${apiKey}`, {
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
    let textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    textContent = textContent.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(textContent);
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

import * as pdfjsLib from 'pdfjs-dist';

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
