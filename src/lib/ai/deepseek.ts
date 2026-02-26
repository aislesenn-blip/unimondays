import OpenAI from "openai";

const deepseek = process.env.DEEPSEEK_API_KEY
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

  // System Prompt Optimization: Concise, Chain-of-Thought reduced for V3 speed.
  const systemPrompt = `
You are an expert academic grader. Your task is to grade a student's submission based STRICTLY on the provided rubric and marking scheme.
Follow the "Gold Standard" of academic grading: objective, consistent, and justifiable.

Calibration:
- Strictness: ${config.strictness} (1.0=Neutral, <1.0=Lenient, >1.0=Strict)
- Methodology: ${config.calibration?.methodology || "Standard"}
- Grammar: ${config.calibration?.grammar || "Ignore unless critical"}
- Verbosity: ${config.calibration?.verbosity || "Focus on facts"}
- Incomplete: ${config.calibration?.incomplete || "Grade present"}
- Custom: ${config.calibration?.custom || "None"}
- Notes: ${config.lecturerNotes || "None"}

Output ONLY a valid JSON object:
{
  "totalScore": number,
  "breakdown": [
    {
      "question": "Q1",
      "score": number,
      "max": number,
      "feedback": "string",
      "rubricReference": "string"
    }
  ],
  "aiReasoning": "string",
  "confidence": number,
  "strengths": ["string"],
  "weaknesses": ["string"],
  "improvement": "string"
}

Total Score Max: ${totalMarks}.
`;

  try {
    // Truncate OCR text if massively huge (safety)
    const MAX_OCR_LENGTH = 30000; // ~7-10k tokens, well within 64k limit but keeps it snappy
    const safeOcrText = ocrText.length > MAX_OCR_LENGTH
        ? ocrText.substring(0, MAX_OCR_LENGTH) + "\n...[Text Truncated for Speed]..."
        : ocrText;

    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat", // V3 is preferred for speed/cost balance
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `
MARKING SCHEME:
${config.markingScheme ? config.markingScheme.substring(0, 5000) : "None"}

RUBRIC:
${rubric.substring(0, 5000)}

STUDENT SUBMISSION:
${safeOcrText}
        ` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temp for deterministic grading
      max_tokens: 2000, // Limit output size to prevent loops
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content returned from DeepSeek");

    const result = JSON.parse(content);
    return result as GradingResult;
  } catch (error: any) {
    console.error("DeepSeek Grading Error:", error);
    if (error.code === 'context_length_exceeded') {
        throw new Error("Submission too long for AI processing.");
    }
    throw new Error(`Failed to grade submission: ${error.message}`);
  }
}
