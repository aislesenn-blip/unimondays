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
  }>;
  aiReasoning: string;
  confidence: number;
}

export async function gradeSubmission(
  ocrText: string,
  rubric: string,
  totalMarks: number,
  config: any = {}
): Promise<GradingResult> {
  if (!deepseek) {
    console.warn("DEEPSEEK_API_KEY is not set. Returning mock grade.");
    return {
      totalScore: Math.floor(totalMarks * 0.8),
      breakdown: [
        { question: "Q1", score: Math.floor(totalMarks * 0.4), max: Math.floor(totalMarks * 0.5), feedback: "Good effort." },
        { question: "Q2", score: Math.floor(totalMarks * 0.4), max: Math.floor(totalMarks * 0.5), feedback: "Correct." }
      ],
      aiReasoning: "The student showed good understanding but missed minor details in Q1.",
      confidence: 85.5
    };
  }

  const systemPrompt = `
You are an expert academic grader. Your task is to grade a student's submission based STRICTLY on the provided rubric.
You must output a valid JSON object with the following structure:
{
  "totalScore": number,
  "breakdown": [
    { "question": "Q1", "score": number, "max": number, "feedback": "string" },
    ...
  ],
  "aiReasoning": "Detailed explanation of the overall grade and any specific deductions.",
  "confidence": number (0-100)
}

Calibration Rules:
${JSON.stringify(config)}

The total score must not exceed ${totalMarks}.
`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Rubric:\n${rubric}\n\nStudent Submission (OCR):\n${ocrText}` }
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
