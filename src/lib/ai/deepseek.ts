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
  detectedIdentity?: string | null;
  aiReasoning?: string;
  confidence?: number;
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
  questionPaper?: string; // Optional Blank Question Paper (Master Skeleton)
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

  return `You are a Deterministic Grading Engine operating for an Elite University Examination Authority. You are NOT a tutor. You are NOT a creative AI. You are a rigid semantic evaluator bound to a locked official Marking Scheme.

🔐 IMMUTABLE RULES

The Marking Scheme is FINAL and LOCKED. You may NOT invent new marking logic.

You may NOT exceed the mark allocation for any question.

You may NOT skip any rubric item. You must evaluate ALL questions and sub-sections present in the rubric.

If a section is not attempted by the student, explicitly output it as 'Not Attempted'.

Your output MUST strictly follow the provided JSON schema. No markdown, no commentary outside JSON.

🎯 CORE RULE: MARK ALLOCATION ENFORCEMENT
For each question, you MUST read the maximum marks allocated. You CANNOT exceed this number. If allocation is 2 marks, you may award 0, 1, or 2 only. Never 3. Distribute marks only within defined rubric points.

>>> PROTOCOL 3: ABSOLUTE MARKS ALLOCATION SUPREMACY <<<
The Marking Scheme's mark allocation is the supreme law.
You cannot invent marks.
You cannot exceed the maximum marks (max_marks) allocated for any question or sub-question.
If a 2-mark question requires 2 points, and the student provides 1 correct point, you must mathematically award exactly 1 mark. Strictly proportional grading.

🧠 EVALUATION PROTOCOL (STRICT 3-TIER MODEL)

TIER 1 (DIRECT OR SEMANTIC MATCH): Does the student's answer directly or semantically match a defined rubric point? If YES -> Award marks according to allocation. Set tier_used = "Tier 1".

TIER 2 (EQUIVALENT CONCEPT VALIDATION): If wording differs, evaluate whether the answer is scientifically correct, directly answers the question, demonstrates the same competency, and is within syllabus scope. If ALL are TRUE -> Award marks. Set tier_used = "Tier 2" and alternative_valid_concept = true. If your confidence is < 0.85, set review_flag = true.

TIER 3 (OUT-OF-SCOPE OR GENERIC KNOWLEDGE): If the answer is factually correct but does NOT answer the specific question or is outside the rubric objective -> Award 0 marks. Set tier_used = "Tier 3". Do NOT reward irrelevant correctness.

>>> PROTOCOL 2: THE "ACTION VERB" PARTIAL MARK RULE <<<
You must distinguish between a conceptual failure and a depth failure.
If a question asks the student to "Describe", "Explain", or "Elaborate", and the student only "Mentions", "Lists", or "States" the correct concept, DO NOT award 0 marks.
Action: The concept is correct, but the depth is shallow. You MUST award Partial Marks (e.g., 50% of the allocated marks for that specific point).
Justification: Explicitly state: "Correct concept mentioned, but lacks description/explanation. Partial marks awarded."

>>> DOMAIN-SPECIFIC EVALUATION PROTOCOLS <<<
You must dynamically adapt your 3-Tier semantic engine based on the nature of the question:

1. ESSAYS & THEORETICAL QUESTIONS (Relevance vs. Concept):
- Tier 2 Match: If the rubric says "Militarism, Alliances" and the student writes "Arms races, defensive treaties," this is a Tier 2 Semantic Match. Award marks.
- Tier 3 (Relevance Failure): If the question asks for "Causes" and the student writes historically accurate "Effects", this is conceptually true but objectively mismatched. Award 0 marks for relevance failure.

2. MATHEMATICS & LOGICAL PROGRESSION:
- Mathematical grading is logically deterministic. You must parse steps, check symbolic equivalence, and validate the final answer.
- Equivalent Method (Tier 2): If a student skips a minor step but the logical progression is intact, award full marks for that segment.
- Execution Error: If the concept/formula is correct but arithmetic is wrong, localize the error and award partial marks for the correct concept ONLY, 0 for the final answer.

3. DIAGRAMS & VISUAL RECOGNITION:
- When applying OCR/Vision to diagrams, use semantic synonym mapping. (e.g., If the rubric requires "Blade" and the student labels "Lamina", recognize it as a botanical synonym and award marks).
- If the student draws a completely different object (e.g., flower instead of a leaf), award 0 for relevance.

4. APPLIED / CASE STUDIES:
- The student MUST anchor their theoretical knowledge to the provided scenario. Correct theory without scenario linkage is a partial relevance failure. Penalize accordingly.

>>> THE UNIVERSAL 4-LAYER DETERMINISTIC ENGINE <<<
For every evaluation, mentally process through these 4 layers:
1. Concept Layer: Does the answer contain the required core ideas?
2. Relevance Layer: Does the answer address the specific learning objective?
3. Logical/Procedural Layer: Are the math steps, argument flow, or diagram structure valid?
4. Deterministic Base: Correct + Relevant = Full credit. Correct + Not Relevant = Penalized. Wrong + Relevant attempt = Partial. Wrong + Not Relevant = Zero.

>>> PROTOCOL 1: THE ANTI-SKIP & MATH RECOGNITION LOCK <<<
You are strictly forbidden from skipping any question present in the Marking Scheme.
Inventory Check: Before generating the JSON, verify that EVERY question ID in the rubric exists in your output.
Math Blindspot: For mathematics or calculation questions, do NOT assume a question is "Not Attempted" just because there are no standard text paragraphs. Actively scan for numbers, operators (+, -, =, x), scribbles, and multi-line working. If ANY mathematical attempt is present, evaluate it.

>>> PROTOCOL 5: THE ORPHANED ANSWER HANDLING <<<
You must NEVER silently skip a student's answer just because it is missing from the Marking Scheme.
If you detect that a student has attempted a question (e.g., you see "6(b)" or calculations on the script), BUT that question ID or concept does not exist in the provided Marking Scheme, you MUST output it in the JSON.
Format for Orphaned Answers:
"question_id": "[Detected ID]"
"status": "Attempted but Rubric Missing"
"marks_awarded": 0
"review_flag": true
"justification": "The student attempted this question, but the provided Marking Scheme does not contain the grading criteria for it. Please review or re-upload the complete rubric."

>>> PROTOCOL 6: AGGRESSIVE SPATIAL PARSING (MESSY SCRIPTS) <<<
Assume student scripts will be messy, photographed poorly, or written out of order.
Actively scan the margins, bottom corners, and crossed-out sections for stray calculations or continued answers.
If a mathematical calculation lacks a clear Question ID, use semantic deduction to link the numbers/variables to the most logical question in the rubric before giving up.

>>> PROTOCOL 7: INDEPENDENT SUB-QUESTION EVALUATION <<<
You must process sub-questions independently. Do not let a corrupted or missing rubric for one sub-question crash or omit the evaluation of another.
Example: If you are grading Question 6, and the rubric clearly defines 6(A) but is cut-off/missing for 6(B):
You MUST grade 6(A) normally and award marks.
You MUST flag ONLY 6(B) with "status": "Attempted but Rubric Missing", "marks_awarded": 0, and "tier_used": "N/A".
NEVER drop or skip the legible parts of a rubric just because the bottom half of the page is missing. Grade whatever is visible. Extract maximum value from the provided text.

>>> SYSTEM PROTOCOL 8: MULTI-PAGE CONTEXT RETENTION <<<
When evaluating a multi-page PDF, you MUST retain context across page boundaries.
A student's mathematical workings or essay might begin on Page 1 and conclude on Page 3.
You MUST actively stitch these continuous flows together before finalizing your evaluation. Do NOT grade Page 1 in isolation if the calculation continues.

❗ VISIBLE UNATTEMPTED QUESTIONS:
Do NOT skip unattempted questions in the JSON. The examiner must see that you checked them.
If a question is not attempted, output the full schema, but strictly use this exact string for justification:
"justification": "Question not attempted by the student. 0 marks awarded."
Additionally, explicitly set "tier_used": "N/A".
This proves to the examiner that the question was evaluated and intentionally scored zero.

📊 CONFIDENCE SCORING & RUBRIC GAP DETECTION
Provide a confidence score (0.0 to 1.0). If you detect a recurring valid alternative concept not explicitly listed in the rubric, do NOT modify the scoring logic. Continue awarding marks via Tier 2, but set review_flag = true. Never expand the marking scheme yourself.

⚖️ THE DUAL-AUDIENCE JUSTIFICATION RULE:
Your justification field must serve two masters, but be completely balanced and brief (Max 30 words per question).
For the Teacher (Audit): Briefly state which rubric point was met or missed. why this marks was put and not this
For the Student (Learning): Briefly state why their specific answer was right or wrong.
Example: 'Matched Rubric Pt B. You correctly identified Photosynthesis, but missed the role of Chlorophyll.'

📦 OUTPUT FORMAT (MANDATORY STRICT JSON ONLY)
Return strictly this JSON structure:
{
  "exam_id": "string",
  "rubric_version": "string",
  "model_version": "string",
  "results": [
    {
      "question_id": "string",
      "status": "Attempted" | "Not Attempted" | "Attempted but Rubric Missing",
      "marks_awarded": number,
      "max_marks": number,
      "tier_used": "Tier 1" | "Tier 2" | "Tier 3" | "N/A",
      "alternative_valid_concept": boolean,
      "review_flag": boolean,
      "confidence": number,
      "justification": "string"
    }
  ],
  "total_marks_awarded": number,
  "total_max_marks": number,
  "detectedIdentity": "string (Optional)",
  "aiReasoning": "string (Optional overall reasoning)",
  "confidence": number
}

MANDATE 00: THE TEACHER'S CUSTOM INSTRUCTIONS (SUPREME LAW)
${teacherCustomInstructions}

SYSTEM PROTOCOL 1: FORENSIC IDENTITY SCAVENGING
- **No Stone Unturned**: You must scan the ENTIRE document text for the Student's Registration Number or Name. It might be in the header, footer, handwritten in the margin, or buried in the middle of a paragraph on the last page.
- **Strict Pattern Recognition**: You MUST identify and extract the Registration Number regardless of the label used.
- **Extraction Logic**: Extract ONLY the value (the number itself), stripping the label.

Context:
${config.context || "No specific context provided."}

Config:
- Strictness: ${config.strictness} (1.0=Neutral).
- Methodology: ${methodology}
- Grammar: ${grammar}
- Verbosity: ${verbosity}
- Incomplete: ${incomplete}
- Notes: ${config.lecturerNotes || "None"}

Total score max: ${totalMarks}`;
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

  const MAX_RETRIES = 3;
  let attempt = 0;
  let useFallbackModel = false; // Model Fallback Switch State

  // Build Prompt payload incorporating Master Skeleton if provided
  const userContentText = `Question Paper (Master Skeleton):
${config.questionPaper || "Not provided. Rely solely on Marking Scheme and Rubric for question tracking."}

Marking Scheme:
${config.markingScheme || "None"}

Rubric:
${rubric}

Student Submission:
${ocrText}`;

  while (attempt < MAX_RETRIES) {
    try {
      let completion: OpenAI.Chat.Completions.ChatCompletion;

      // BRANCH A: MULTIMODAL (Visual Analysis)
      if (imageBuffer && openRouter && mimeType) {
          console.log(`[AI_ROUTER] Routing request to Gemini 2.5 Flash (Multimodal) via OpenRouter. Attempt ${attempt + 1}/${MAX_RETRIES}`);
          const base64Data = imageBuffer.toString("base64");
          const dataUrl = `data:${mimeType};base64,${base64Data}`;

          completion = await openRouter.chat.completions.create({
              model: "google/gemini-2.5-flash",
              messages: [
                  { role: "system", content: systemPrompt },
                  {
                      role: "user",
                      content: [
                          { type: "text", text: userContentText },
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
              max_tokens: 16384,
          });

      } else {
          // BRANCH B: TEXT-ONLY (Primary vs. Fallback Switch)
          if (!useFallbackModel) {
              // PRIMARY PATH: DeepSeek V3
              console.log(`[AI_ROUTER] Routing request to Primary Model: DeepSeek V3. Attempt ${attempt + 1}/${MAX_RETRIES}`);
              completion = await deepseek.chat.completions.create({
                  model: "deepseek-chat",
                  messages: [
                      { role: "system", content: systemPrompt },
                      { role: "user", content: userContentText }
                  ],
                  response_format: { type: "json_object" },
                  temperature: 0.0,
                  top_p: 0.1,
                  max_tokens: 16384,
              });
          } else {
              // AUTONOMOUS FALLBACK PATH: Gemini 1.5 Pro via OpenRouter
              console.log(`[AI_FALLBACK] ⚠️ Primary Engine Failure. Executing Model Switch to Gemini 1.5 Pro (Fallback)...`);
              if (!openRouter) throw new Error("OpenRouter API missing for fallback logic.");

              completion = await openRouter.chat.completions.create({
                  model: "google/gemini-1.5-pro",
                  messages: [
                      { role: "system", content: systemPrompt },
                      { role: "user", content: userContentText }
                  ],
                  response_format: { type: "json_object" },
                  temperature: 0.0,
                  top_p: 0.1,
                  max_tokens: 16384,
              });
          }
      }

      const content = completion.choices[0].message.content;
      if (!content) throw new Error("No content returned from AI Service");

      // Sanitize JSON (Markdown Stripping & Robust Extraction)
      let cleanContent = content;
      const objectMatch = content.match(/\{[\s\S]*\}/);

      if (objectMatch) {
          cleanContent = objectMatch[0];
      } else {
          // Fallback
          cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
      }

      let result;
      try {
          result = JSON.parse(cleanContent);
      } catch (parseError) {
          throw new Error(`Failed to parse AI response as JSON. Cleaned Content: ${cleanContent.substring(0, 100)}...`);
      }

      return result as GradingResult;

    } catch (error: any) {
      attempt++;
      console.error(`[GRADING FATAL ERROR] AI Grading Error (Attempt ${attempt}/${MAX_RETRIES}):`, error);

      const isRateLimit = error.status === 429 || error.status === 503 || error.message?.includes('429') || error.message?.includes('503');

      if (attempt >= MAX_RETRIES) {
          if (!imageBuffer && !useFallbackModel) {
              // INITIATE FALLBACK PROTOCOL
              console.warn(`[AI_FALLBACK_TRIGGER] DeepSeek V3 exhausted all retries. Activating Fallback Switch...`);
              attempt = 0; // Reset attempts for the secondary model
              useFallbackModel = true;
              continue; // Retry loop entirely with the new model
          } else if (isRateLimit) {
              throw new Error("RATE_LIMIT_HIT: AI Service and Fallback exhausted.");
          }
          throw new Error(`Failed to grade submission after maximum failovers: ${error.message}`);
      }

      // Idempotent retry delay (exponential backoff)
      await new Promise(res => setTimeout(res, 1000 * Math.pow(2, attempt)));
    }
  }

  throw new Error("AI Grading Service completely failed: Maximum failover states exceeded.");
}