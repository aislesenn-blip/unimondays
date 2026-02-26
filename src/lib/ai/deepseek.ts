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

  const systemPrompt = `
You are an expert academic grader. Your task is to grade a student's submission based STRICTLY on the provided rubric and marking scheme.
You must follow the "Gold Standard" of academic grading: objective, consistent, and justifiable.

Calibration & Persona:
- Strictness Level: ${config.strictness} (1.0 = Neutral, <1.0 = Lenient, >1.0 = Strict).
- Methodology: ${config.calibration?.methodology || "Standard"}
- Grammar/Language: ${config.calibration?.grammar || "Ignore grammar errors unless critical"}
- Verbosity: ${config.calibration?.verbosity || "Focus on facts"}
- Incomplete Sections: ${config.calibration?.incomplete || "Grade what is present"}
- Custom Expectations: ${config.calibration?.custom || "None"}
- Lecturer Notes: ${config.lecturerNotes || "None"}

You must output a valid JSON object with the following structure:
{
  "totalScore": number,
  "breakdown": [
    {
      "question": "Q1",
      "score": number,
      "max": number,
      "feedback": "string",
      "rubricReference": "quote specific rubric criteria met/missed"
    },
    ...
  ],
  "aiReasoning": "Detailed explanation of the overall grade and any specific deductions.",
  "confidence": number (0-100),
  "strengths": ["string", ...],
  "weaknesses": ["string", ...],
  "improvement": "Actionable advice for the student"
}

The total score must not exceed ${totalMarks}.
`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `
Marking Scheme:
${config.markingScheme || "Not provided"}

Rubric:
${rubric}

Student Submission (OCR):
${ocrText}
        ` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content returned from DeepSeek");

    const result = JSON.parse(content);
    return result as GradingResult;
  } catch (error) {
    console.error("DeepSeek Grading Error:", error);
    throw new Error("Failed to grade submission.");
  }
}
