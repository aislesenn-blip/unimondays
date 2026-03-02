
// src/lib/ai/deepseek.ts
import OpenAI from 'openai';
import { safeJsonParse } from '@/lib/utils/json';

const apiKey = process.env.DEEPSEEK_API_KEY;

if (!apiKey) {
  console.error("Missing DEEPSEEK_API_KEY environment variable!");
}

export const deepseek = new OpenAI({
  apiKey: apiKey || "missing-key",
  baseURL: "https://api.deepseek.com/v1",
});

export async function gradeChunk(chunk: string, rubric: string): Promise<any> {
  const prompt = `Given the following text chunk and the grading rubric, provide a detailed breakdown of marks. The rubric is: ${rubric}`;

  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-coder", // or deepseek-chat
      messages: [
        { role: "system", content: "You are a grading assistant. You must respond with only a valid JSON object and no other text." },
        { role: "user", content: `${prompt}\n\n---\n\nText chunk to grade:\n\n${chunk}` },
      ],
      response_format: { type: "json_object" },
    });

    const aiResponse = response.choices[0].message.content || "{}";
    const parsedJson = safeJsonParse(aiResponse);

    if (parsedJson === null) {
        throw new Error(`Failed to parse valid JSON from DeepSeek response. Raw response: ${aiResponse}`);
    }

    return parsedJson;

  } catch (error) {
    console.error("Error grading chunk with DeepSeek:", error);
    throw new Error("Failed to grade text chunk.");
  }
}

export async function identifyStudent(chunk: string, classId?: string): Promise<{ studentName: string | null; studentRegNo: string | null; }> {
    const prompt = `From the text provided, identify the student's full name and their registration number. Return a JSON object with "studentName" and "studentRegNo". If not found, return null for the respective field.`;

    try {
        const response = await deepseek.chat.completions.create({
            model: "deepseek-coder",
            messages: [
                { role: "system", content: "You are a student identification assistant. You must respond with only a valid JSON object and no other text." },
                { role: "user", content: `${prompt}\n\n---\n\nText chunk:\n\n${chunk}` },
            ],
            response_format: { type: "json_object" },
        });

        const aiResponse = response.choices[0].message.content || "{}";
        const result = safeJsonParse(aiResponse);

        if (result === null) {
            console.warn(`Could not parse student identity from chunk. Raw response: ${aiResponse}`);
            return { studentName: null, studentRegNo: null };
        }

        return {
            studentName: result.studentName || null,
            studentRegNo: result.studentRegNo || null,
        };
    } catch (error) {
        console.error("Error identifying student with DeepSeek:", error);
        // In this case, we don't throw, as failing to ID a student is not a catastrophic failure for the whole process.
        // We return nulls and let the system continue grading.
        return { studentName: null, studentRegNo: null };
    }
}
