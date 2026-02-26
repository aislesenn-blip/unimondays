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
    if (error.status === 429) {
        throw new Error("DeepSeek Rate Limit Exceeded. Please try again later.");
    }
    throw new Error(`Failed to grade submission: ${error.message}`);
  }
}
