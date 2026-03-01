import OpenAI from 'openai';
import { PDFDocument } from 'pdf-lib';
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
        let allResults: StandardizedRubric[] = [];
        let isPdf = mimeType === 'application/pdf' && buffer !== undefined;
        let pdfPageCount = 0;
        let chunks: Buffer[][] = [];

        if (isPdf && buffer) {
            const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true, updateMetadata: false });
            pdfPageCount = pdfDoc.getPageCount();

            if (pdfPageCount > 3) {
                console.log(`[STANDARDIZER] PDF has ${pdfPageCount} pages. Applying Atomic Chunking Protocol...`);
                const document = await pdf(buffer, { scale: 2.0 });
                let imageBuffers: Buffer[] = [];
                for await (const page of document) {
                    imageBuffers.push(page);
                }

                // Slice into chunks of 3 pages each
                for (let i = 0; i < imageBuffers.length; i += 3) {
                    chunks.push(imageBuffers.slice(i, i + 3));
                }
            }
        }

        if (chunks.length > 0 && process.env.OPENROUTER_API_KEY) {
            console.log(`[STANDARDIZER] Processing ${chunks.length} chunks independently in parallel via google/gemini-2.0-flash-001`);

            const chunkPromises = chunks.map(async (chunkImages, index) => {
                const chunkSystemPrompt = systemPrompt + "\n\nCRITICAL INSTRUCTION: Extract all questions/answers from THESE 3 PAGES ONLY. Maintain the sequence.";
                const chunkUserPrompt = userPrompt;

                let attempt = 0;
                let maxAttempts = 3;
                while (attempt < maxAttempts) {
                    attempt++;
                    try {
                        const contentParts: any[] = [{ type: "text", text: chunkUserPrompt }];
                        for (const imgBuffer of chunkImages) {
                            const base64Data = imgBuffer.toString("base64");
                            const dataUrl = `data:image/png;base64,${base64Data}`;
                            contentParts.push({
                                type: "image_url",
                                image_url: { url: dataUrl, detail: "low" }
                            });
                        }

                        const completion = await openai.chat.completions.create({
                            model: "google/gemini-2.0-flash-001",
                            messages: [
                                { role: "system", content: chunkSystemPrompt },
                                { role: "user", content: contentParts }
                            ],
                            response_format: { type: "json_object" },
                            temperature: 0.0,
                            top_p: 0.1,
                        });

                        const contentStr = completion.choices[0]?.message?.content;
                        if (!contentStr) throw new Error("No content returned from AI Service for chunk " + index);

                        let cleanContent = contentStr;
                        const objectMatch = contentStr.match(/\{[\s\S]*\}/);
                        if (objectMatch) cleanContent = objectMatch[0];
                        else cleanContent = contentStr.replace(/```json/g, '').replace(/```/g, '').trim();

                        const parsed = JSON.parse(cleanContent) as StandardizedRubric;
                        return parsed;
                    } catch (e: any) {
                        console.error(`[STANDARDIZER] Chunk ${index} failed on attempt ${attempt}: ${e.message}`);
                        if (attempt >= maxAttempts) throw e;
                    }
                }
                throw new Error("Chunk parsing failed after " + maxAttempts + " attempts");
            });

            allResults = await Promise.all(chunkPromises);
        } else {
            // Original atomic logic for short PDFs / text
            let completion;

            if (buffer && mimeType && process.env.OPENROUTER_API_KEY) {
                console.log(`[STANDARDIZER] Using Multimodal Vision Model with image buffer of size ${buffer.length} bytes`);

                // If PDF but <=3 pages, convert to images anyway for better processing
                let contentParts: any[] = [{ type: "text", text: userPrompt }];

                if (mimeType === 'application/pdf') {
                    const document = await pdf(buffer, { scale: 2.0 });
                    for await (const page of document) {
                        const base64Data = page.toString("base64");
                        const dataUrl = `data:image/png;base64,${base64Data}`;
                        contentParts.push({
                            type: "image_url",
                            image_url: { url: dataUrl, detail: "low" }
                        });
                    }
                } else {
                    const base64Data = buffer.toString("base64");
                    const dataUrl = `data:${mimeType};base64,${base64Data}`;
                    contentParts.push({
                        type: "image_url",
                        image_url: { url: dataUrl, detail: "low" }
                    });
                }

                completion = await openai.chat.completions.create({
                    model: "google/gemini-2.0-flash-001", // Make sure to use fast model to improve Time-To-First-Token (TTFT)
                    messages: [
                        { role: "system", content: systemPrompt },
                        {
                            role: "user",
                            content: contentParts
                        }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.0,
                    top_p: 0.1,
                });
            } else if (process.env.DEEPSEEK_API_KEY) {
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
                    model: "google/gemini-2.0-flash-001",
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

            const result = JSON.parse(cleanContent) as StandardizedRubric;
            allResults = [result];
        }

        // Assembler: Merging Logic
        if (allResults.length === 1) {
            return allResults[0];
        }

        console.log(`[STANDARDIZER] Assembling ${allResults.length} chunks...`);
        let finalRubric: StandardizedRubric = {
            ExamTitle: allResults[0].ExamTitle || "Standardized Exam",
            CourseCode: allResults[0].CourseCode || "COURSE101",
            ExamDate: allResults[0].ExamDate || new Date().toISOString(),
            TotalMarks: 0,
            NumberOfQuestions: 0,
            Questions: []
        };

        let totalMarks = 0;
        let seenQuestionIds = new Set<string>();

        for (const chunkResult of allResults) {
            if (!chunkResult.Questions || !Array.isArray(chunkResult.Questions)) continue;

            for (const q of chunkResult.Questions) {
                // Ensure no data lost and keep sequence
                // Minor ID collision handling
                let qId = q.QuestionID;
                if (seenQuestionIds.has(qId)) {
                    qId = qId + "_" + Math.random().toString(36).substring(7);
                    q.QuestionID = qId;
                }
                seenQuestionIds.add(qId);

                finalRubric.Questions.push(q);
                totalMarks += (q.MarksAllocated || 0);
            }
        }

        finalRubric.TotalMarks = totalMarks;
        finalRubric.NumberOfQuestions = finalRubric.Questions.length;

        return finalRubric;

    } catch (error: any) {
        console.error("Rubric Standardization Error:", error);
        throw new Error(`Failed to standardize rubric: ${error.message}`);
    }
}
