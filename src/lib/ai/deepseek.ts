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

MANDATE: FORENSIC GRADING
1. **Full-Document Semantic Map**: Students answer out of order. You MUST read the ENTIRE document before grading. Map scattered answers (e.g., Q1 on page 1, Q2 on page 3) to the correct Marking Scheme section. Do NOT grade sequentially by page. Connect the semantic dot.
2. **Metadata Scavenging**: Look for the Student's Name or Registration Number ANYWHERE in the text (header, footer, handwritten in margin, last page). Scavenge deeply.
3. **Identity Verification**: If you find a Name/ID, put it in "detectedIdentity". If absolutely NO identifier is found, strictly return "detectedIdentity": null. Do NOT guess.

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
  "detectedIdentity": "string (Extract Student Name/ID if visible, else null)",
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
