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
  totalScore: number;
  breakdown: Array<{
    question_id: string;
    score: number;
    max: number;
    short_evidence: string;
  }>;
  aiReasoning: string;
  confidence: number;
  detectedIdentity?: string | null;
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

// Map Technical Enums to Human Instructions
const METHODOLOGY_MAP: Record<string, string> = {
    'partial_marks': 'Award partial marks for correct steps (Lenient)',
    'final_answer_only': 'Strictly grade final answer only',
    'steps_mandatory': 'Steps are mandatory for full marks',
    'Standard': 'Standard' // Fallback
};

const GRAMMAR_MAP: Record<string, string> = {
    'ignore_grammar': 'Ignore grammar, focus only on facts',
    'penalize_poor': 'Penalize poor grammar/spelling',
    'strict_language': 'Strict academic language required',
    'Ignore unless critical': 'Ignore unless critical'
};

const VERBOSITY_MAP: Record<string, string> = {
    'ignore_noise': 'Search for the fact, ignore the noise',
    'concise': 'Penalize excessive verbosity (Be concise)',
    'detailed': 'Reward detailed explanations',
    'Concise': 'Concise'
};

const INCOMPLETE_MAP: Record<string, string> = {
    'grade_available': 'Grade part A, give 0 to B',
    'zero_if_incomplete': 'Zero if section is incomplete',
    'Grade present work': 'Grade present work'
};

export function buildSystemPrompt(config: GradeConfig, totalMarks: number): string {
  // Resolve Calibration to Human Text
  const methodology = METHODOLOGY_MAP[config.calibration?.methodology || 'Standard'] || config.calibration?.methodology || "Standard";
  const grammar = GRAMMAR_MAP[config.calibration?.grammar || 'Ignore unless critical'] || config.calibration?.grammar || "Ignore unless critical";
  const verbosity = VERBOSITY_MAP[config.calibration?.verbosity || 'Concise'] || config.calibration?.verbosity || "Concise";
  const incomplete = INCOMPLETE_MAP[config.calibration?.incomplete || 'Grade present work'] || config.calibration?.incomplete || "Grade present work";
  const teacherCustomInstructions = config.calibration?.custom || "No custom instructions provided. Rely on standard marking scheme.";

  return `You are an expert, highly observant academic grader. You are provided with a complete set of exam page images and a strict Marking Scheme (Rubric). Your job is to grade the exam holistically and output a JSON array of scores.

CRITICAL EXAM BEHAVIORS YOU MUST HANDLE:
1. MANDATE 1: NON-SEQUENTIAL HUNTING (JUMBLED ANSWERS)
Students rarely answer questions in order. DO NOT abort or assume the exam is invalid. You MUST act like a human examiner: scan ALL pages to hunt down the student's attempt for EVERY question present in the provided rubric. Map the semantic meaning of their answer to the correct rubric question, even if their numbering is messy.

2. MANDATE 2: MULTI-PAGE SPILLOVER (CONTEXT BLEED)
Answers often start on one page and finish on another. You have all the images. Read seamlessly across page boundaries to grade the complete thought.

3. MANDATE 3: RESTORE SEMANTIC GRADING TIERS
NEVER use exact keyword matching. You must grade based on SEMANTIC MEANING. Use the Tiered Evaluation Method:
- Tier 1 (Concept): Does the student understand the core idea?
- Tier 2 (Process/Application): Did they apply the right steps or list conceptually accurate points? Award marks even if the vocabulary differs, provided the conceptual meaning matches the rubric exactly.
- Tier 3 (Final Answer/Precision): Is the math or final conclusion correct?

4. MANDATE 4: MATH & CALCULATION GRADING
For ANY calculation questions, read the student's working. If their formula and final answer match the rubric's logic, award full marks. Actively interpret formulas, visual graphs, and handwritten diagrams.

5. MANDATE 5: MANDATORY EXHAUSTIVE OUTPUT (DYNAMIC CHECKLIST)
You are FORBIDDEN from dropping questions. Count the total number of questions and sub-questions in the provided Marking Scheme. Your final JSON array MUST contain an evaluation object for EVERY SINGLE ONE of those questions, regardless of how the student numbered them. Do not truncate the output.

6. MANDATE 6: SKIPPED QUESTIONS
If, and ONLY if, you have exhaustively searched all provided pages and cannot find any attempt at a specific rubric question, you must still include it in your JSON array. Give it a score of 0, and in the \`evidenceSnippet\`, explicitly write: "Student completely skipped this question." Do not ignore skipped questions in your output.

7. MANDATE 7: OCR ARTIFACT TOLERANCE & LOGICAL MATH REASONING
You are evaluating text that was extracted from scanned images via OCR. Expect typographical errors, corrupted formatting, and broken symbols in both the Marking Scheme and the Student Submission (e.g., commas misread as periods, missing brackets, corrupted percentages like '%o').
- DO NOT discard or ignore any rubric question due to formatting errors.
- For math and calculations, rely on your internal mathematical reasoning to deduce the true intent of the equations. Re-calculate the logic implicitly. If the student's mathematical intent matches the rubric's intended logic, award full marks despite any OCR-induced typos.

TEACHER'S CUSTOM INSTRUCTIONS:
\`\`\`${teacherCustomInstructions}\`\`\`

Context:
${config.context || "No specific context provided."}

Config:
- Strictness: ${config.strictness} (1.0=Neutral).
- Methodology: ${methodology}
- Grammar: ${grammar}
- Verbosity: ${verbosity}
- Incomplete: ${incomplete}
- Notes: ${config.lecturerNotes || "None"}

Output STRICT JSON:
{
  "totalScore": number,
  "breakdown": [
    { "question_id": "Q1", "score": number, "max": number, "short_evidence": "string (max 15 words)" }
  ],
  "aiReasoning": "string",
  "confidence": number,
  "detectedIdentity": "string (Extract Name/ID or 'UNIDENTIFIED_IDENTITY')"
}
Total score max: ${totalMarks}.`;
}

export async function gradeSubmission(
  ocrText: string,
  rubric: string,
  totalMarks: number,
  config: GradeConfig = { strictness: 1.0 },
  imageBuffer?: Buffer, // Kept for legacy compatibility if needed
  mimeType?: string     // Kept for legacy compatibility if needed
): Promise<GradingResult> {
  if (!deepseek) {
    throw new Error("DEEPSEEK_API_KEY is not set. Grading service unavailable.");
  }

  // Optimize prompt: Remove excessive whitespace, focus on JSON strictness
  const systemPrompt = buildSystemPrompt(config, totalMarks);

  try {
    let completion: OpenAI.Chat.Completions.ChatCompletion;

    // BRANCH: TEXT-ONLY (DeepSeek V3 or Gemini Fallback)
    // We intentionally bypass images here for Holistic Text Grading
    console.log(`[AI_ROUTER] Routing request to DeepSeek V3 (Text-Only Holistic Grading).`);
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
        seed: 12345,
        max_tokens: 8192, // Prevent infinite loops
    });

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
