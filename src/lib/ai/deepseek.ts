import OpenAI from "openai";

export class DeepSeekService {
  private client: OpenAI;
  private model: string = "deepseek-chat";

  constructor() {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_API_KEY not found in environment");
    }
    this.client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    });
  }

  async validateContent(ocrText: string) {
    const prompt = `
      Analyze this OCR text. Determine if it is a valid academic student script/answer sheet or GARBAGE (e.g., National ID, Birth Certificate, random newspaper, unrelated text).

      Text Start:
      ${ocrText.slice(0, 500)}...
      Text End.

      Return ONLY valid JSON:
      {
          "is_valid": true/false,
          "reason": "If invalid, explain why (e.g., 'Document appears to be a National ID card')."
      }
    `;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "You are a document validation engine." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });
      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (e: any) {
      console.error("DeepSeek Validation Error:", e);
      return { is_valid: false, reason: `Validation Error: ${e.message}` };
    }
  }

  async gradeSubmission(ocrText: string, rubric: string) {
    const prompt = `
      You are a strict academic grader.

      RUBRIC:
      ${rubric}

      STUDENT SUBMISSION (OCR TEXT):
      ${ocrText}

      TASK:
      1. Grade the submission strictly against the rubric.
      2. Provide marks for each question.
      3. Provide detailed remarks.
      4. Calculate total score.
      5. Provide a confidence score (0-100) on your grading accuracy based on text clarity.

      OUTPUT FORMAT (JSON ONLY):
      {
          "total_marks": 0.0,
          "breakdown": [
              { "question": "Q1", "marks": 0.0, "max_marks": 10, "remarks": "..." }
          ],
          "general_remarks": "...",
          "confidence_score": 95.0,
          "audit_trail": "Step-by-step reasoning for the grade..."
      }
    `;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "You are a strict academic grader." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });
      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (e: any) {
      console.error("DeepSeek Grading Error:", e);
      return { error: e.message };
    }
  }

  async chatWithContext(contextData: string, userQuery: string) {
    const systemPrompt = `
      You are the 'PLAYBOOK AI' assistant.
      You have access to the following context data (Students, Grades, Analytics):

      [DATABASE CONTEXT]
      ${contextData}
      [END CONTEXT]

      Answer the user's question accurately based on this data.
      If the answer is not in the data, say so.
      Be concise, professional, and helpful.
    `;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuery },
        ],
      });
      return response.choices[0].message.content;
    } catch (e: any) {
      return `Error connecting to AI Chat: ${e.message}`;
    }
  }
}
