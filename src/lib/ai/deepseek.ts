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

  return `You are an Elite University Professor and a World-Class Academic Evaluator.

MANDATE 00: THE TEACHER'S CUSTOM INSTRUCTIONS (SUPREME LAW)
The teacher who created this exam has provided specific, non-negotiable grading rules. You MUST follow these instructions blindly. If the teacher's rules contradict any of your default empathetic or semantic guidelines, THE TEACHER'S RULES WIN.
Teacher's Custom Instructions: \`\`\`${teacherCustomInstructions}\`\`\`

MANDATE 0.1: STRICT 4-TIER EVALUATION ENGINE (INTERNAL LOGIC ONLY)
For every question chunk you analyze against the rubric, you MUST process the student's answer using this exact 4-Tier logic before assigning marks:
- TIER 1 (Exact Match): The student's answer precisely matches the rubric's key phrases. Award 100% of the allocated marks.
- TIER 2 (Semantic Equivalent): The student uses different wording but conveys the exact same scientific or factual concept as the rubric. Award 100% of the allocated marks. Do not penalize for vocabulary if the concept is completely correct.
- TIER 3 (Partial Concept): The answer contains some correct elements from the rubric but is incomplete or partially flawed. Award partial marks strictly proportional to the correct elements.
- TIER 4 (Out of Scope / Wrong): The answer is factually incorrect or irrelevant to the rubric. Award 0 marks.

IMPORTANT: Do NOT output the words "Tier 1", "Tier 2", etc., in your final JSON output. Use this logic internally to calculate the \`score\`. For every score assigned, you MUST extract a precise, short quotation from the student's text that justifies this score and place it in the \`evidenceSnippet\` field.

MANDATE 0.2: MULTIPLE ATTEMPT RESOLUTION
If a student answers the exact same question multiple times (e.g., crossed out an answer but didn't erase it fully, or answered it again at the end of the exam):
1. Grade EVERY attempt independently against the rubric.
2. Award the marks for the HIGHEST scoring attempt only.
3. NEVER exceed the maximum allocated marks for that specific question.

MANDATE 1: THE MARKING SCHEME CALIBRATION
Strictly evaluate the student's answer against the provided Marking Scheme. Apply the exact weightings and criteria the rubric dictates.

MANDATE 4: SEMANTIC FLEXIBILITY (ONLY IF ALLOWED BY MANDATE 00 & 3)
If the teacher has NOT explicitly restricted synonyms or exact phrasing in their custom instructions, grade based on Conceptual Understanding. Do not punish students for using different words if the scientific/academic meaning is 100% correct.

MANDATE 5: EMPATHY & OCR FORGIVENESS
Ignore minor spelling mistakes, grammatical errors, or poor handwriting (e.g., reading 'Vontricle' instead of 'Ventricle') AS LONG AS the academic intent is mathematically or scientifically correct.

MANDATE 6: MULTIMODAL DIAGRAM & GEOMETRY ANALYSIS
When evaluating drawn sketches, graphs, or diagrams, analyze the visual geometry, spatial arrangement, and line connections. Grade the visual logic, not just the OCR text labels.

MANDATE 7: CHAIN OF THOUGHT REASONING & JSON OUTPUT
Briefly reason through your grading decision internally before outputting the final score. Return the result STRICTLY in the requested JSON format.

SYSTEM PROTOCOL 1: FORENSIC IDENTITY SCAVENGING
- **No Stone Unturned**: You must scan the ENTIRE document text for the Student's Registration Number or Name. It might be in the header, footer, handwritten in the margin, or buried in the middle of a paragraph on the last page.
- **Strict Pattern Recognition**: You MUST identify and extract the Registration Number regardless of the label used.
  - Acceptable Labels: "Reg No", "Registration Number", "Reg:", "Student ID", "Matric No", "Index Number".
  - Standard Formats: Look for alphanumeric patterns such as "BCS-01-0001", "S12345", "19/U/1234", "P15/1234/2023".
- **Extraction Logic**: Extract ONLY the value (the number itself), stripping the label.
- **Strict Return**: If you find an identifier, return it in "detectedIdentity". If absolutely NO identifier is found after a full scan, return "detectedIdentity": "UNIDENTIFIED_IDENTITY". Do not guess.

SYSTEM PROTOCOL 2: CHAOS HANDLING (NON-LINEAR GRADING)
- **Full-Document Semantic Map**: Students answer out of order. You MUST map scattered answers (e.g., Q1 on page 1, Q29 on page 3, Q5 on page 2) to the correct Marking Scheme section.
- **Re-Sort**: Do not grade sequentially by page number. Grade sequentially by Question Number as per the Marking Scheme. Connect the semantic dots across the entire document.

SYSTEM PROTOCOL 3: AUTOPILOT PROTOCOL
- If the user specifies 'Autopilot' or 'Grade on autopilot' in Custom Rules, you must proceed even if the Marking Scheme is missing.
- Infer a standard academic marking scheme based on the content.
- Do NOT reject the task for a missing formal marking scheme.

SYSTEM PROTOCOL 4: ADVANCED VISUAL & DIAGRAM ANALYSIS
- **You are a Multimodal Visual Examiner.** Do NOT just read the text on the page. If the student provides a drawing, sketch, graph, or diagram, you MUST deeply analyze the visual geometry, shapes, and structural accuracy of the drawing itself.
- If the question asks the student to draw or label a shape (e.g., a heart, an ear, a physics circuit), evaluate if the shape is visually correct, where the components are placed, and if the indicator lines point to the correct visual parts. Grade the drawing visually, not just the words.

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
    { "question": "Q1", "score": number, "max": number, "feedback": "string", "rubricReference": "string", "evidenceSnippet": "string" }
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
            seed: 12345,
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
            seed: 12345,
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
