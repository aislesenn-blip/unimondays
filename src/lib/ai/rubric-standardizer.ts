import OpenAI from 'openai';
import { PDFDocument } from 'pdf-lib';
import * as canvas from '@napi-rs/canvas';

if (!globalThis.DOMMatrix) {
  globalThis.DOMMatrix = canvas.DOMMatrix as any;
}
if (!globalThis.DOMPoint) {
  globalThis.DOMPoint = canvas.DOMPoint as any;
}
if (!globalThis.DOMRect) {
  globalThis.DOMRect = canvas.DOMRect as any;
}

import { pdf } from 'pdf-to-img';

const apiKey = process.env.OPENROUTER_API_KEY || "dummy-key-for-build";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: apiKey,
  defaultHeaders: {
    "HTTP-Referer": "https://playbook.edu", // Required by OpenRouter
    "X-Title": "Playbook EdTech", // Required by OpenRouter
  }
});

// DeepSeek specific instance
const deepseekKey = process.env.DEEPSEEK_API_KEY || "dummy-key-for-build";
const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: deepseekKey,
});

export interface MCQOption {
    Option: string;
    Correct: boolean;
    Marks: number;
}

export interface ConceptUnit {
    ConceptID: string;
    ConceptText: string;
    Marks: number;
    PartialRule: string | null;
}

export interface EvaluationTiers {
    Tier1: string;
    Tier2: string;
    Tier3: string;
}

export interface OutOfScope {
    Description: string;
    MaxMarks: number;
}

export interface Penalty {
    Description: string;
    Deduct: number;
}

export interface RubricQuestion {
    QuestionID: string;
    QuestionText: string;
    MarksAllocated: number;
    QuestionType: string; // "Essay" | "MCQ" | "Calculation" | "Diagram"
    LearningObjective: string;
    ConceptUnits: ConceptUnit[];
    EvaluationTiers: EvaluationTiers;
    OutOfScope: OutOfScope[];
    Penalties: Penalty[];
    MCQOptions?: MCQOption[];
}

export interface StandardizedRubric {
    ExamTitle: string;
    CourseCode: string;
    ExamDate: string; // ISO DateTime
    TotalMarks: number;
    NumberOfQuestions: number;
    Questions: RubricQuestion[];
}

export async function standardizeRubric(rubricText: string, buffer?: Buffer, mimeType?: string): Promise<StandardizedRubric> {
    if (!process.env.DEEPSEEK_API_KEY && !process.env.OPENROUTER_API_KEY) {
        throw new Error("No AI API Key is set. Standardization service unavailable.");
    }

    let chunkBuffers: Buffer[] = [];

    if (buffer && mimeType === 'application/pdf') {
        const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const pageCount = srcDoc.getPageCount();

        if (pageCount > 3) {
            const CHUNK_SIZE = 3;
            for (let start = 0; start < pageCount; start += CHUNK_SIZE) {
                const end = Math.min(start + CHUNK_SIZE, pageCount);
                const chunkDoc = await PDFDocument.create();
                const pageIndices = Array.from({ length: end - start }, (_, i) => start + i);
                const copiedPages = await chunkDoc.copyPages(srcDoc, pageIndices);
                copiedPages.forEach(page => chunkDoc.addPage(page));
                const chunkBytes = await chunkDoc.save();
                chunkBuffers.push(Buffer.from(chunkBytes));
            }
        } else {
            chunkBuffers.push(buffer);
        }
    } else if (buffer) {
        chunkBuffers.push(buffer);
    }

    const systemPrompt = `
You are an L10 Enterprise Architect & Principal EdTech Engineer.
Your task is to ingest an unstructured marking scheme or rubric and convert it into a strictly formatted Standardized Rubric mapping exactly to our Deterministic State Machine architecture.
You are an exhaustive data extraction machine. You MUST extract EVERY SINGLE QUESTION and EVERY SINGLE MARKING POINT from the provided document. DO NOT summarize. DO NOT skip questions. Output the exact mark allocation as written. If the document has 100 questions, your JSON output MUST contain 100 questions. Failure to extract all pages will result in a fatal system error.

RULES:
1. You must output ONLY a strictly formatted JSON object.
2. DO NOT change the total MarksAllocated for any question or the overall Exam. You must strictly bind the allocatedMarks exactly as written on the paper. No guessing, no averaging.
3. Break the rubric down into Granular Marking Criteria with explicit PartialRules.
4. Provide standard EvaluationTiers if missing, tailored to the QuestionType.
5. All IDs (QuestionID, ConceptID) should be short alphanumeric strings (e.g., "Q1a", "C1").
6. The exact required JSON schema structure is:

{
  "ExamTitle": "String",
  "CourseCode": "String",
  "ExamDate": "ISO8601 DateTime String",
  "TotalMarks": Number,
  "NumberOfQuestions": Number,
  "Questions": [
    {
      "QuestionID": "String",
      "QuestionText": "String",
      "MarksAllocated": Number,
      "QuestionType": "Essay" | "MCQ" | "Calculation" | "Diagram",
      "LearningObjective": "String",
      "ConceptUnits": [
        {
          "ConceptID": "String",
          "ConceptText": "String",
          "Marks": Number,
          "PartialRule": "String (or null)"
        }
      ],
      "EvaluationTiers": {
        "Tier1": "String (Direct match to ConceptText → Full marks)",
        "Tier2": "String (Equivalent scientific concept → Full marks, flag as alternative valid)",
        "Tier3": "String (Factually correct but outside objective → 0 marks)"
      },
      "OutOfScope": [
        {
          "Description": "String",
          "MaxMarks": Number
        }
      ],
      "Penalties": [
        {
          "Description": "String",
          "Deduct": Number
        }
      ],
      "MCQOptions": [ // ONLY if QuestionType is "MCQ"
        { "Option": "String", "Correct": Boolean, "Marks": Number }
      ]
    }
  ]
}

If any metadata like ExamTitle, CourseCode, or ExamDate is missing from the input text, invent a plausible placeholder or use today's date.
Do not wrap your output in markdown codeblocks (no \`\`\`json). Output the raw JSON directly.
`;

    const userPrompt = `
Standardize the following unstructured marking scheme:

${rubricText}
`;

    try {
        if (chunkBuffers.length > 0 && process.env.OPENROUTER_API_KEY) {
            const chunkPromises = chunkBuffers.map(async (chunkBuf, index) => {
                let imageBuffers: Buffer[] = [];
                if (mimeType === 'application/pdf') {
                    const document = await pdf(chunkBuf, { scale: 2.0 });
                    for await (const page of document) {
                        imageBuffers.push(page);
                    }
                } else {
                    imageBuffers = [chunkBuf];
                }

                const imageContents = imageBuffers.map(imgBuf => {
                    const base64Data = imgBuf.toString("base64");
                    const dataUrl = `data:image/png;base64,${base64Data}`;
                    return {
                        type: "image_url" as const,
                        image_url: {
                            url: dataUrl,
                            detail: "low" as const
                        }
                    };
                });

                const chunkUserPrompt = chunkBuffers.length > 1
                    ? `Extract all questions/answers from THESE 3 PAGES ONLY. Maintain the sequence.\n\n${userPrompt}`
                    : userPrompt;

                let attempt = 0;
                const MAX_RETRIES = 3;
                while (attempt < MAX_RETRIES) {
                    try {
                        const completion = await openai.chat.completions.create({
                            model: "google/gemini-1.5-flash",
                            messages: [
                                { role: "system", content: systemPrompt },
                                {
                                    role: "user",
                                    content: [
                                        { type: "text", text: chunkUserPrompt },
                                        ...imageContents
                                    ]
                                }
                            ],
                            response_format: { type: "json_object" },
                            temperature: 0.0,
                            top_p: 0.1,
                        });

                        const content = completion.choices[0]?.message?.content;
                        if (!content) throw new Error("No content returned from AI Service");

                        let cleanContent = content;
                        const objectMatch = content.match(/\{[\s\S]*\}/);
                        if (objectMatch) {
                            cleanContent = objectMatch[0];
                        } else {
                            cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
                        }

                        return JSON.parse(cleanContent) as StandardizedRubric;
                    } catch (err) {
                        attempt++;
                        if (attempt >= MAX_RETRIES) throw err;
                        await new Promise(res => setTimeout(res, 1000 * attempt));
                    }
                }
                throw new Error("Failed to process chunk after max retries");
            });

            const results = await Promise.all(chunkPromises);

            if (results.length === 1) {
                return results[0];
            }

            const mergedResult: StandardizedRubric = {
                ExamTitle: results[0].ExamTitle,
                CourseCode: results[0].CourseCode,
                ExamDate: results[0].ExamDate,
                TotalMarks: results[0].TotalMarks,
                NumberOfQuestions: results[0].NumberOfQuestions,
                Questions: []
            };

            for (const res of results) {
                mergedResult.Questions.push(...res.Questions);
            }

            return mergedResult;

        } else {
            let completion;
            if (process.env.DEEPSEEK_API_KEY) {
                completion = await deepseek.chat.completions.create({
                    model: "deepseek-chat",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.0,
                    top_p: 0.1,
                });
            } else {
                completion = await openai.chat.completions.create({
                    model: "google/gemini-1.5-flash",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.0,
                    top_p: 0.1,
                });
            }

            const content = completion.choices[0]?.message?.content;
            if (!content) {
                throw new Error("No content returned from AI Service");
            }

            let cleanContent = content;
            const objectMatch = content.match(/\{[\s\S]*\}/);

            if (objectMatch) {
                cleanContent = objectMatch[0];
            } else {
                cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
            }

            return JSON.parse(cleanContent) as StandardizedRubric;
        }
    } catch (error: any) {
        console.error("Rubric Standardization Error:", error);
        throw new Error(`Failed to standardize rubric: ${error.message}`);
    }
}
