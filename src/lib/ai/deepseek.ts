import OpenAI from "openai";

export const deepseek = process.env.DEEPSEEK_API_KEY
  ? new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    })
  : null;

export interface GradingResult {
  totalScore: number;
  breakdown: Array<{
    question: string;
    score: number;
    max: number;
    feedback: string;
    rubricReference?: string;
  }>;
  aiReasoning: string;
  confidence: number;
  detectedIdentity?: string | null;
  strengths?: string[];
  weaknesses?: string[];
  improvement?: string;
}

export interface CalibrationSettings {
  methodology: string;
  grammar: string;
  verbosity: string;
  incomplete: string;
  custom: string;
}

export interface GradeConfig {
  strictness: number; // 0.5 (lenient) to 1.5 (strict)
  markingScheme?: string;
  lecturerNotes?: string;
  calibration?: CalibrationSettings;
  context?: string; // New Context Injection Field
}

export async function gradeSubmission(
  ocrText: string,
  rubric: string,
  totalMarks: number,
  config: GradeConfig = { strictness: 1.0 }
): Promise<GradingResult> {
  if (!deepseek) {
    throw new Error("DEEPSEEK_API_KEY is not set. Grading service unavailable.");
  }

  // Optimize prompt: Remove excessive whitespace, focus on JSON strictness
  const systemPrompt = `You are an expert academic grader. Grade the student's submission strictly based on the provided rubric and marking scheme.
Follow the "Gold Standard": objective, consistent, justifiable.

MANDATE 1: FORENSIC IDENTITY SCAVENGING
- **No Stone Unturned**: You must scan the ENTIRE document text for the Student's Registration Number or Name. It might be in the header, footer, handwritten in the margin, or buried in the middle of a paragraph on the last page.
- **Strict Pattern Recognition**: You MUST identify and extract the Registration Number regardless of the label used.
  - Acceptable Labels: "Reg No", "Registration Number", "Reg:", "Student ID", "Matric No", "Index Number".
  - Standard Formats: Look for alphanumeric patterns such as "BCS-01-0001", "S12345", "19/U/1234", "P15/1234/2023".
- **Extraction Logic**: Extract ONLY the value (the number itself), stripping the label.
- **Strict Return**: If you find an identifier, return it in "detectedIdentity". If absolutely NO identifier is found after a full scan, return "detectedIdentity": "UNIDENTIFIED_IDENTITY". Do not guess.

MANDATE 2: CHAOS HANDLING (NON-LINEAR GRADING)
- **Full-Document Semantic Map**: Students answer out of order. You MUST map scattered answers (e.g., Q1 on page 1, Q29 on page 3, Q5 on page 2) to the correct Marking Scheme section.
- **Re-Sort**: Do not grade sequentially by page number. Grade sequentially by Question Number as per the Marking Scheme. Connect the semantic dots across the entire document.

Context:
${config.context || "No specific context provided."}

Config:
- Strictness: ${config.strictness} (1.0=Neutral).
- Methodology: ${config.calibration?.methodology || "Standard"}
- Grammar: ${config.calibration?.grammar || "Ignore unless critical"}
- Verbosity: ${config.calibration?.verbosity || "Concise"}
- Incomplete: ${config.calibration?.incomplete || "Grade present work"}
- Custom: ${config.calibration?.custom || "None"}
- Notes: ${config.lecturerNotes || "None"}

Output STRICT JSON:
{
  "totalScore": number,
  "breakdown": [
    { "question": "Q1", "score": number, "max": number, "feedback": "string", "rubricReference": "string" }
  ],
  "aiReasoning": "string",
  "confidence": number,
  "detectedIdentity": "string (Extract Name/ID or 'UNIDENTIFIED_IDENTITY')",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "improvement": "string"
}
Total score max: ${totalMarks}.`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Marking Scheme:
${config.markingScheme || "None"}

Rubric:
${rubric}

Student Submission:
${ocrText}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 4000, // Prevent infinite loops
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content returned from DeepSeek");

    const result = JSON.parse(content);
    return result as GradingResult;
  } catch (error: any) {
    console.error("DeepSeek Grading Error:", error);
    // Add more context to error
    if (error.status === 429 || error.status === 503 || error.message?.includes('429') || error.message?.includes('503')) {
        throw new Error("RATE_LIMIT_HIT: DeepSeek Service overloaded.");
    }
    throw new Error(`Failed to grade submission: ${error.message}`);
  }
}
