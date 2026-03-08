import OpenAI from 'openai';

const deepseek = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || "dummy-key-for-build",
    defaultHeaders: {
      "HTTP-Referer": "https://playbook.edu",
      "X-Title": "Playbook EdTech",
    }
});

export async function gradeSubmission(rawText: string, rubricContent: string, markingSchemeContent: string) {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is not set.");
    }

    console.log("[DEEPSEEK] Initiating God-Tier Grading with JSON Diet...");

    const systemPrompt = `You are an expert academic grader. You have 100% accuracy.
MANDATE 1: NON-SEQUENTIAL HUNTING. Find the answers regardless of page order.
MANDATE 2: THE PHOTOSYNTHESIS PROTOCOL (FEW-SHOT PRECISION).
Always grade exactly based on the marking scheme. Example: If the scheme says "Award 2 marks for mentioning Chlorophyll", and the student mentions "Green leaves" without "Chlorophyll" (Out of scope), award 0 marks. Do not guess. Do not assume.
MANDATE 3: JSON DIET (CRITICAL).
You MUST output the absolute minimum text to save tokens. Use this exact minified JSON array format ONLY:
{"results": [{"q": "QuestionNumber", "s": ScoreGained, "f": "Max 5 words explaining why"}]}
DO NOT write long feedback. DO NOT add strengths/weaknesses arrays.`;

    const completion = await deepseek.chat.completions.create({
        model: "deepseek/deepseek-chat",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `MARKING SCHEME:\n${markingSchemeContent}\n\nRUBRIC:\n${rubricContent}\n\nSTUDENT EXAM:\n${rawText}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.0,
        top_p: 0.1,
        max_tokens: 2000,
    });

    const resultString = completion.choices[0]?.message?.content || '{"results":[]}';

    const cleanString = resultString.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanString);
}

export async function gradeAtomicSegment(questionId: string, studentAnswerSegment: string, rubricSegment: string) {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is not set.");
    }

    console.log(`[DEEPSEEK] Initiating Atomic Segment Grading for ${questionId}...`);

    const systemPrompt = `You are an expert academic grader.
YOUR MANDATORY DIRECTIVES:
1. ATOMIC GRADING: You are grading ONLY ONE specific question: ${questionId}. Focus 100% of your attention on the provided Rubric Segment and Student Answer Segment.
2. THE EVIDENCE-FIRST MANDATE: You MUST populate the \`extracted_evidence\` field with the exact quote from the student's text where they attempted to answer. If missing entirely, output "None found".
3. STRICT SEMANTIC TIERS: Your \`feedback\` MUST start with one of: [Exact Match], [Partial Match], [Out of Scope], or [Missing].
4. STRICT LENGTH LIMITS: \`feedback\` MUST be a maximum of 3 sentences explaining the tier choice.
5. NO MATH: Output individual marks strictly per the rubric logic.

STRICT JSON SCHEMA MANDATE:
You must return ONLY valid JSON matching this EXACT structure:
{
  "q": "${questionId}",
  "s": Number (Marks awarded),
  "max": Number (Maximum possible marks based on this rubric segment),
  "f": "String (Must start with the Semantic Tier tag, e.g., '[Partial Match] You correctly identified X, but missed Y.')",
  "extracted_evidence": "String (Exact quote from student's text)"
}`;

    const completion = await deepseek.chat.completions.create({
        model: "deepseek/deepseek-chat",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `RUBRIC SEGMENT for ${questionId}:\n${rubricSegment}\n\nSTUDENT ANSWER SEGMENT:\n${studentAnswerSegment}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.0,
        top_p: 0.1,
        max_tokens: 2000,
    });

    const resultString = completion.choices[0]?.message?.content || '{}';
    const cleanString = resultString.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanString);
}
