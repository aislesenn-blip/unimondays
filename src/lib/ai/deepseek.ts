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
    question: string;
    score: number;
    max: number;
    feedback: string;
    rubricReference?: string;
    evidenceSnippet?: string;
    isRelevant: boolean;
    mappedRubricQuestion: string;
  }>;
  aiReasoning: string;
  confidence: number;
  detectedIdentity?: string | null;
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
Students rarely answer questions in order. A student might start with Question 6 on Page 1, then jump to Question 3. DO NOT abort or assume the exam is invalid. You MUST act like a human examiner: scan ALL pages to hunt down the student's attempt for EVERY question in the rubric. Map the semantic meaning of their answer to the correct rubric question, even if their numbering is messy.

2. MANDATE 2: MULTI-PAGE SPILLOVER (CONTEXT BLEED)
Answers often start on one page and finish on another. You have all the images. Read seamlessly across page boundaries to grade the complete thought.

3. MANDATE 3: RESTORE SEMANTIC GRADING TIERS
NEVER use exact keyword matching. You must grade based on SEMANTIC MEANING. Use the Tiered Evaluation Method:
- Tier 1 (Concept): Does the student understand the core idea? (Award partial marks).
- Tier 2 (Process/Application): Did they apply the right steps or list conceptually accurate points? (Award partial marks, even if wording differs).
- Tier 3 (Final Answer/Precision): Is the math or final conclusion correct?
If a student's answer means the same thing as the rubric (e.g., 'Poor network' vs 'Failure in network system'), they get FULL marks for that point.

4. MANDATE 4: MATH & CALCULATION GRADING
For calculation questions (like Q6), read the student's working. If their formula and final answer match the rubric's logic, award full marks. Do not ignore mathematical working. Actively interpret formulas, visual graphs, and handwritten diagrams.

5. MANDATE 5: MANDATORY EXHAUSTIVE OUTPUT (NO DROPPED QUESTIONS)
You are FORBIDDEN from dropping questions from your JSON output. You must cross-reference the Marking Scheme. If the rubric contains Q1, Q2, Q3, Q4, Q5, and Q6, your final JSON array MUST contain an object for EVERY sub-question of Q1, Q2, Q3, Q4, Q5, AND Q6. If you reach the end of your context window, you must summarize, but DO NOT drop Q6. AWARD MARKS WITH STRICT REFERENCE TO THE RUBRIC, NEVER EXCEEDING THE MAXIMUM ALLOCATED MARKS PER QUESTION.

6. MANDATE 6: SKIPPED QUESTIONS
If, and ONLY if, you have exhaustively searched all provided pages and cannot find any attempt at a specific rubric question, you must still include it in your JSON array. Give it a score of 0, and in the \`evidenceSnippet\`, explicitly write: "Student completely skipped this question." Do not ignore skipped questions in your output.

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
    { "question": "Q1", "score": number, "max": number, "feedback": "string", "rubricReference": "string", "evidenceSnippet": "string", "isRelevant": boolean, "mappedRubricQuestion": "string" }
  ],
  "aiReasoning": "string",
  "confidence": number,
  "detectedIdentity": "string (Extract Name/ID or 'UNIDENTIFIED_IDENTITY')",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "improvement": "string"
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
