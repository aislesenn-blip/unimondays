import OpenAI from "openai";

export const deepseek = process.env.DEEPSEEK_API_KEY
  ? new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    })
  : null;

// Initialize OpenRouter Client for Multimodal Vision (Gemini 2.5 Flash)
const openRouter = process.env.OPENROUTER_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://playbook.edu",
        "X-Title": "Playbook EdTech",
      },
    })
  : null;

export interface GradingResult {
  exam_id: string;
  rubric_version: string;
  model_version: string;
  results: Array<{
    question_id: string;
    status: "Attempted" | "Not Attempted";
    marks_awarded: number;
    max_marks: number;
    tier_used: "Tier 1" | "Tier 2" | "Tier 3" | "N/A";
    alternative_valid_concept: boolean;
    review_flag: boolean;
    confidence: number;
    justification: string;
  }>;
  total_marks_awarded: number;
  total_max_marks: number;

  // Backwards compatibility / Convenience fields (optional)
  detectedIdentity?: string | null;
  aiReasoning?: string;
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

export function buildSystemPrompt(config: GradeConfig, totalMarks: number): string {
  return `You are a Deterministic Grading Engine operating for an Elite University Examination Authority. You are NOT a tutor. You are NOT a creative AI. You are a rigid semantic evaluator bound to a locked official Marking Scheme.

🔐 IMMUTABLE RULES

The Marking Scheme is FINAL and LOCKED. You may NOT invent new marking logic.

You may NOT exceed the mark allocation for any question.

You may NOT skip any rubric item. You must evaluate ALL questions and sub-sections present in the rubric.

If a section is not attempted by the student, explicitly output it as 'Not Attempted'.

Your output MUST strictly follow the provided JSON schema. No markdown, no commentary outside JSON.

🎯 CORE RULE: MARK ALLOCATION ENFORCEMENT
For each question, you MUST read the maximum marks allocated. You CANNOT exceed this number. If allocation is 2 marks, you may award 0, 1, or 2 only. Never 3. Distribute marks only within defined rubric points.

🧠 EVALUATION PROTOCOL (STRICT 3-TIER MODEL)

TIER 1 (DIRECT OR SEMANTIC MATCH): Does the student's answer directly or semantically match a defined rubric point? If YES -> Award marks according to allocation. Set tier_used = "Tier 1".

TIER 2 (EQUIVALENT CONCEPT VALIDATION): If wording differs, evaluate whether the answer is scientifically correct, directly answers the question, demonstrates the same competency, and is within syllabus scope. If ALL are TRUE -> Award marks. Set tier_used = "Tier 2" and alternative_valid_concept = true. If your confidence is < 0.85, set review_flag = true.

TIER 3 (OUT-OF-SCOPE OR GENERIC KNOWLEDGE): If the answer is factually correct but does NOT answer the specific question or is outside the rubric objective -> Award 0 marks. Set tier_used = "Tier 3". Do NOT reward irrelevant correctness.

❗ MISSING QUESTIONS HANDLING
If a question or sub-section in the rubric has no corresponding answer in the student's script, you MUST output:
{"question_id": "[ID]", "status": "Not Attempted", "marks_awarded": 0, "max_marks": [MAX], "tier_used": "N/A", "alternative_valid_concept": false, "review_flag": false, "confidence": 1.0}

📊 CONFIDENCE SCORING & RUBRIC GAP DETECTION
Provide a confidence score (0.0 to 1.0). If you detect a recurring valid alternative concept not explicitly listed in the rubric, do NOT modify the scoring logic. Continue awarding marks via Tier 2, but set review_flag = true. Never expand the marking scheme yourself.

📦 OUTPUT FORMAT (MANDATORY STRICT JSON ONLY)
Return strictly this JSON structure:
{
"exam_id": "string",
"rubric_version": "string",
"model_version": "string",
"results": [
{
"question_id": "string",
"status": "Attempted | Not Attempted",
"marks_awarded": number,
"max_marks": number,
"tier_used": "Tier 1 | Tier 2 | Tier 3 | N/A",
"alternative_valid_concept": boolean,
"review_flag": boolean,
"confidence": number,
"justification": "string"
}
],
"total_marks_awarded": number,
"total_max_marks": number
}`;
}

export async function gradeSubmission(
  ocrText: string,
  rubric: string,
  totalMarks: number,
  config: GradeConfig = { strictness: 1.0 },
  imageBuffer?: Buffer, // NEW: Multimodal Payload
  mimeType?: string     // NEW: Multimodal Payload
): Promise<GradingResult> {
  if (!deepseek) {
    throw new Error("DEEPSEEK_API_KEY is not set. Grading service unavailable.");
  }

  // Optimize prompt: Remove excessive whitespace, focus on JSON strictness
  const systemPrompt = buildSystemPrompt(config, totalMarks);

  try {
    let completion: OpenAI.Chat.Completions.ChatCompletion;

    // BRANCH: MULTIMODAL (Visual Analysis)
    if (imageBuffer && openRouter && mimeType) {
        console.log(`[AI_ROUTER] Routing request to Gemini 2.5 Flash (Multimodal) via OpenRouter.`);
        const base64Data = imageBuffer.toString("base64");
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        completion = await openRouter.chat.completions.create({
            model: "google/gemini-2.5-flash",
            messages: [
                { role: "system", content: systemPrompt },
                {
                    role: "user",
                    content: [
                        { type: "text", text: `Marking Scheme:\n${config.markingScheme || "None"}\n\nRubric:\n${rubric}\n\nStudent Text (OCR):\n${ocrText}` },
                        {
                            type: "image_url",
                            image_url: {
                                url: dataUrl,
                                detail: "high"
                            }
                        }
                    ]
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.0,
            top_p: 0.1,
            max_tokens: 4000,
        });

    } else {
        // BRANCH: TEXT-ONLY (DeepSeek V3)
        console.log(`[AI_ROUTER] Routing request to DeepSeek V3 (Text-Only).`);
        completion = await deepseek.chat.completions.create({
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
            temperature: 0.0,
            top_p: 0.1,
            max_tokens: 4000, // Prevent infinite loops
        });
    }

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content returned from AI Service");

    // Sanitize JSON (Markdown Stripping)
    const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();

    const result = JSON.parse(cleanContent);
    return result as GradingResult;

  } catch (error: any) {
    console.error("AI Grading Error:", error);
    // Add more context to error
    if (error.status === 429 || error.status === 503 || error.message?.includes('429') || error.message?.includes('503')) {
        throw new Error("RATE_LIMIT_HIT: AI Service overloaded.");
    }
    throw new Error(`Failed to grade submission: ${error.message}`);
  }
}
