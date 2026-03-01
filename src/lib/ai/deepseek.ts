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

export interface AtomicConceptResult {
  conceptId: string;
  status: "MET" | "PARTIALLY_MET" | "FAILED";
  reasoning: string;
  awardedMarks: number;
}

export interface QuestionResult {
    question_id: string;
    status: "Attempted" | "Not Attempted" | "Attempted but Rubric Missing";
    concept_results: AtomicConceptResult[];
    justification: string;
    review_flag: boolean;
    confidence: number;
}

export interface GradingResult {
  exam_id: string;
  results: QuestionResult[];
  detectedIdentity?: string | null;
  studentRemarks?: string;
  teacherRemarks?: string;
  clusterTag?: string; // SQC Semantic Clustering
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
  const methodology = METHODOLOGY_MAP[config.calibration?.methodology || 'Standard'] || config.calibration?.methodology || "Standard";
  const grammar = GRAMMAR_MAP[config.calibration?.grammar || 'Ignore unless critical'] || config.calibration?.grammar || "Ignore unless critical";
  const verbosity = VERBOSITY_MAP[config.calibration?.verbosity || 'Concise'] || config.calibration?.verbosity || "Concise";
  const incomplete = INCOMPLETE_MAP[config.calibration?.incomplete || 'Grade present work'] || config.calibration?.incomplete || "Grade present work";
  const teacherCustomInstructions = config.calibration?.custom || "No custom instructions provided.";

  return `You are an atomic Concept Validator operating for an Elite University. You are NOT a holistic grader.
Your sole purpose is to evaluate the student's text against a strict array of "Concept Units" provided in the JSON Rubric.

🛑 CRITICAL MANDATE: DO NOT CALCULATE TOTAL SCORES.
You are stripped of your mathematical freedom. You MUST NOT attempt to sum the total marks for the exam or even for a single question.
Our Node.js math engine handles that. You only evaluate the binary or partial truth of whether a Concept Unit is present.

🛑 CRITICAL: Keep all feedback extremely concise, crisp, and clear. Maximum 1 to 2 short sentences. Do not over-explain. Provide a brief, reasonable justification for the marks awarded or lost, suitable for quick reading by both teachers and students.
🛑 CRITICAL: Limit Diagnostic Feedback (Teacher Remarks) and Actionable Feedback (Student Remarks) to a MAXIMUM of 4 sentences total for both feedback sections. Do NOT write paragraphs. Long-winded answers are heavily penalized. Be extremely direct and ruthlessly concise.
🛑 CRITICAL: You must provide ONE definitive evaluation per question. Never contradict yourself. If the student attempted the question anywhere in the document, evaluate it once. DO NOT say 'not attempted' if you are also grading their attempt.

🧠 ATOMIC CONCEPT EVALUATION PROTOCOL
For each ConceptUnit provided to you:
1. "MET": The student's text fully satisfies the 'ConceptText'. Output the full 'Marks' allocated to this concept.
2. "PARTIALLY_MET": The student partially satisfies it, based strictly on the 'PartialRule'. Output the marks specified by the partial rule.
3. "FAILED": The concept is missing or factually wrong. Output 0 marks.

>>> PROTOCOL 1: THE ANTI-SKIP LOCK <<<
You must evaluate EVERY concept unit provided for every question. If a question is entirely unattempted, still output all its concepts with status "FAILED" and reasoning "Question not attempted."

>>> PROTOCOL 2: THE ANTI-TRUNCATION LOCK <<<
You MUST evaluate every single student answer visible in this chunk against the rubric. Do not stop early. If a student attempted 4 questions in these images, you must return 4 evaluated results.

>>> DOMAIN-SPECIFIC EVALUATION PROTOCOLS <<<
- MATHEMATICS: Check symbolic equivalence. If a specific formula (Concept) is required, check if it's there.
- ESSAYS: Look for semantic matches. "Arms races" = "Militarism".
- VISUAL ELEMENTS: You must actively look for, analyze, and grade all visual elements, diagrams, charts, and hand-drawn graphs provided by the student. Evaluate these visual answers against the rubric just as rigorously as text.

>>> SYSTEM PROTOCOL 5: SEMANTIC CLUSTERING (SQC) <<<
- If multiple concepts fail dramatically or the student's answer is chaotic/off-topic, assign a \`clusterTag\` (e.g., \`MISSING_PROCESS_STEPS\`, \`OFF_TOPIC_RAMBLE\`). This helps us group failures.

📦 OUTPUT FORMAT (MANDATORY STRICT JSON ONLY)
Return strictly this JSON structure:
{
  "exam_id": "string",
  "detectedIdentity": "string (Optional)",
  "studentRemarks": "string (Overall encouraging study directive based on the concept failures)",
  "teacherRemarks": "string (Overall pedagogical diagnosis of the student's concept failures)",
  "clusterTag": "string (Optional, e.g., NO_WORKING_OUT, FAILED_CORE_CONCEPT)",
  "results": [
    {
      "question_id": "string",
      "status": "Attempted" | "Not Attempted" | "Attempted but Rubric Missing",
      "justification": "string (Brief overall verdict for the question)",
      "review_flag": boolean (true if highly ambiguous),
      "confidence": number (0.0 to 1.0),
      "concept_results": [
        {
          "conceptId": "string (Exact ID from the provided rubric)",
          "status": "MET" | "PARTIALLY_MET" | "FAILED",
          "reasoning": "string (1-sentence explanation of why it met or failed)",
          "awardedMarks": number (Must be the concept's max marks, the partial marks, or 0)
        }
      ]
    }
  ]
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
  imageBuffer?: Buffer | Buffer[], // NEW: Multimodal Payload (Supports multiple pages)
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
      let completion: OpenAI.Chat.Completions.ChatCompletion | undefined;

      // BRANCH A: MULTIMODAL (Visual Analysis)
      if (imageBuffer && openRouter && mimeType) {
          console.log(`[AI_ROUTER] Routing request to Vision Models (Multimodal) via OpenRouter. Attempt ${attempt + 1}/${MAX_RETRIES}`);

          const buffers = Array.isArray(imageBuffer) ? imageBuffer : [imageBuffer];
          const imageContents = buffers.map(buf => {
              const base64Data = buf.toString("base64");
              const dataUrl = `data:${mimeType};base64,${base64Data}`;
              return {
                  type: "image_url" as const,
                  image_url: {
                      url: dataUrl,
                      detail: "high" as const
                  }
              };
          });

          const modelsToTry = [
              "google/gemini-2.5-flash",
              "anthropic/claude-3.5-sonnet"
          ];

          for (const currentModel of modelsToTry) {
              try {
                  completion = await openRouter.chat.completions.create({
                      model: currentModel,
                      messages: [
                          { role: "system", content: systemPrompt },
                          {
                              role: "user",
                              content: [
                                  { type: "text", text: userContentText },
                                  ...imageContents
                              ]
                          }
                      ],
                      response_format: { type: "json_object" },
                      temperature: 0.0,
                      top_p: 0.1,
                      max_tokens: 16384,
                  });
                  break; // Success, break out of model loop
              } catch (modelErr: any) {
                  console.error(`Attempt ${attempt + 1}: Model ${currentModel} failed in gradeSubmission (Multimodal):`, modelErr?.message || modelErr);
                  if (currentModel === modelsToTry[modelsToTry.length - 1]) {
                      throw modelErr; // Last model failed, throw to outer catch
                  }
              }
          }

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
              // AUTONOMOUS FALLBACK PATH: Gemini 2.5 Pro via OpenRouter
              console.log(`[AI_FALLBACK] ⚠️ Primary Engine Failure. Executing Model Switch to Gemini 2.5 Pro (Fallback)...`);
              if (!openRouter) throw new Error("OpenRouter API missing for fallback logic.");

              completion = await openRouter.chat.completions.create({
                  model: "google/gemini-2.5-pro",
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

      if (!completion) throw new Error("AI Service failed to return a completion object.");
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