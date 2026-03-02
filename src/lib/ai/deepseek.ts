
// src/lib/ai/deepseek.ts
import OpenAI from 'openai';
import { safeJsonParse } from '@/lib/utils/json';

if (!process.env.DEEPSEEK_API_KEY) {
  console.error("DEEPSEEK_API_KEY environment variable is not set! (Used for OpenRouter)");
}

export const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || "missing-key",
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://unimondays.com",
    "X-Title": "Playbook Lite",
  },
});

export async function gradeChunk(chunk: string, rubric: string): Promise<any> {
  const prompt = `Given the following text chunk and the grading rubric, provide a detailed breakdown of marks. The rubric is: ${rubric}`;

  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek/deepseek-chat",
      messages: [
        { role: "system", content: "You are a grading assistant. You must respond with only a valid JSON object and no other text." },
        { role: "user", content: `${prompt}\n\n---\n\nText chunk to grade:\n\n${chunk}` },
      ],
    });

    const aiResponse = response.choices[0].message.content || "{}";

    // Robust regex to extract JSON from DeepSeek's response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Failed to extract valid JSON from DeepSeek response. Raw response: ${aiResponse}`);
    }

    const parsedJson = safeJsonParse(jsonMatch[0]);

    if (parsedJson === null) {
        throw new Error(`Failed to parse valid JSON from DeepSeek response. Raw response: ${aiResponse}`);
    }

    return parsedJson;

  } catch (error) {
    console.error("[OPENROUTER ERROR]:", error);
    throw new Error(`Failed to grade text chunk. OpenRouter Error: ${(error as Error).message}`);
  }
}

export async function identifyStudent(chunk: string, classId?: string): Promise<{ studentName: string | null; studentRegNo: string | null; }> {
    const prompt = `From the text provided, identify the student's full name and their registration number. Return a JSON object with "studentName" and "studentRegNo". If not found, return null for the respective field.`;

    try {
        const response = await deepseek.chat.completions.create({
            model: "deepseek/deepseek-chat",
            messages: [
                { role: "system", content: "You are a student identification assistant. You must respond with only a valid JSON object and no other text." },
                { role: "user", content: `${prompt}\n\n---\n\nText chunk:\n\n${chunk}` },
            ],
        });

        const aiResponse = response.choices[0].message.content || "{}";
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        const result = jsonMatch ? safeJsonParse(jsonMatch[0]) : null;

        if (result === null) {
            console.warn(`Could not parse student identity from chunk. Raw response: ${aiResponse}`);
            return { studentName: null, studentRegNo: null };
        }

        return {
            studentName: result.studentName || null,
            studentRegNo: result.studentRegNo || null,
        };
    } catch (error) {
        console.error("[OPENROUTER ERROR]: Error identifying student with DeepSeek:", error);
        // In this case, we don't throw, as failing to ID a student is not a catastrophic failure for the whole process.
        // We return nulls and let the system continue grading.
        return { studentName: null, studentRegNo: null };
    }
}
