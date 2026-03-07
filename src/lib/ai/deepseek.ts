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
        max_tokens: 2000, // Reduced token limit to enforce budget constraints
    });

    const resultString = completion.choices[0]?.message?.content || '{"results":[]}';

    // Clean markdown wrappers if any exist
    const cleanString = resultString.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanString);
}
