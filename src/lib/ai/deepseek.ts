import OpenAI from "openai";

export class DeepSeekService {
  private client: OpenAI;
  private model: string = "deepseek-chat";

  constructor(client?: OpenAI) {
    if (!client) {
        if (!process.env.DEEPSEEK_API_KEY) {
          throw new Error("DEEPSEEK_API_KEY not found in environment");
        }
        this.client = new OpenAI({
          apiKey: process.env.DEEPSEEK_API_KEY,
          baseURL: "https://api.deepseek.com",
        });
    } else {
        this.client = client;
    }
  }

  async validateContent(ocrText: string) {
    const prompt = `
      Analyze this OCR text.
      STRICTLY Determine if it is a valid academic student script/answer sheet.

      IMMEDIATELY REJECT if it appears to be:
      - A National ID card (NIDA, Nin, etc.)
      - A Birth Certificate
      - A Driver's License
      - A Random Newspaper or Magazine
      - A Medical Report
      - Any document NOT related to an academic assessment.

      Text Sample (First 2000 chars):
      ${ocrText.slice(0, 2000)}...

      Return ONLY valid JSON:
      {
          "is_valid": true/false,
          "reason": "If invalid, EXPLICITLY state what the document appears to be (e.g., 'Rejected: Found NIDA keywords')."
      }
    `;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "You are a strict document validation firewall." },
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
      You are a strict academic grader (HOD Level).

      RUBRIC:
      ${rubric}

      STUDENT SUBMISSION (OCR TEXT):
      ${ocrText}

      TASK:
      1. Grade the submission strictly against the rubric.
      2. Provide marks for each question.
      3. Provide detailed remarks.
      4. Calculate total score.
      5. Provide a CONFIDENCE SCORE (0-100) based on text legibility and answer clarity.
      6. GENERATE AN AUDIT TRAIL: A step-by-step logical reasoning for why marks were awarded or deducted.

      OUTPUT FORMAT (JSON ONLY):
      {
          "total_marks": 0.0,
          "breakdown": [
              { "question": "Q1", "marks": 0.0, "max_marks": 10, "remarks": "..." }
          ],
          "general_remarks": "...",
          "confidence_score": 95.0,
          "audit_trail": "Q1: Deducted 2 marks because... Q2: Full marks awarded because..."
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

  async generateHODSummary(statsContext: string) {
    const prompt = `
      You are the Head of Department (HOD) Assistant.
      Based on the following class performance statistics and failure reasons:

      ${statsContext}

      Generate a 3-sentence EXECUTIVE SUMMARY.
      Identify the key concept students are struggling with.
      Provide one actionable recommendation for the lecturer.

      Format: Plain Text.
    `;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
            { role: "system", content: "You are an educational analyst." },
            { role: "user", content: prompt }
        ]
      });
      return response.choices[0].message.content;
    } catch (e: any) {
      return `Unable to generate summary: ${e.message}`;
    }
  }
}
