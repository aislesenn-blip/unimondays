import OpenAI from 'openai';
import pLimit from 'p-limit';

export interface OcrPage {
    page: number;
    text: string;
}

export interface RubricQuestion {
    question: string;
}

// Ensure the OpenAI client is robustly initialized
const deepSeekClient = new OpenAI({
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    apiKey: process.env.DEEPSEEK_API_KEY || 'dummy',
    timeout: 300000,
    maxRetries: 4,
});

/**
 * Phase 1 & 2: Page-Parallel Map-Reduce Extraction (The Compiler)
 * Sends each page concurrently to a fast LLM to extract exactly and ONLY the explicit question answers,
 * then aggregates them programmatically into a single question map.
 */
export async function extractPageParallelMap(
    pages: OcrPage[],
    rubricQuestions: RubricQuestion[]
): Promise<Record<string, string>> {

    const rubricOutline = rubricQuestions.map(r => r.question).join(', ');
    console.log(`[CHUNKER] Initiating Phase 1: Parallel Page Extraction for ${pages.length} pages...`);

    // We use a higher concurrency limit for map extraction since it's just reading small pages.
    const limit = pLimit(15);

    const pageExtractionPromises = pages.map(pageObj =>
        limit(async () => {
            if (!pageObj.text || pageObj.text.trim() === '') {
                return {};
            }

            const extractionSystemPrompt = `You are a strict Data Extraction Engine. Your ONLY job is to extract text explicitly matching the provided Question IDs.
Do not infer answers. Do not guess meaning. Do not hallucinate.
Extract the EXACT text the student wrote for each Question ID found ON THIS SPECIFIC PAGE.
Preserve exact wording, spacing, and sequence.
Handle sub-question numerals carefully to avoid collisions (e.g., Q1(iii) vs Q6(iii)).
If a Question ID is NOT explicitly present on this page, map it to "NONE".

OUTPUT FORMAT: Strict JSON only.
{
  "Q1": "exact text from this page or 'NONE'",
  "Q2": "exact text from this page or 'NONE'"
}`;

            try {
                const response = await deepSeekClient.chat.completions.create({
                    model: "deepseek-chat", // Fast, cheap model for Map phase
                    messages: [
                        { role: "system", content: extractionSystemPrompt },
                        { role: "user", content: `RUBRIC QUESTION IDs TO EXTRACT:\n${rubricOutline}\n\nPAGE ${pageObj.page} TEXT:\n${pageObj.text}` }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.0,
                    max_tokens: 4096
                });

                const raw = response.choices[0]?.message?.content || '{}';
                const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(clean);
            } catch (error: any) {
                console.warn(`[CHUNKER-WARN] Parallel extraction failed on page ${pageObj.page}: ${error.message}`);
                return {}; // Safe fallback for a single failed page
            }
        })
    );

    // Wait for all pages to be extracted concurrently
    const extractedPageMaps = await Promise.all(pageExtractionPromises);

    // Phase 2: Compiler / Aggregation
    console.log(`[CHUNKER] Phase 2: Compiling Page Maps into Final Document Map...`);
    const finalQuestionMap: Record<string, string> = {};

    // Initialize all with 'NONE'
    for (const rubricItem of rubricQuestions) {
        finalQuestionMap[rubricItem.question] = "NONE";
    }

    // Merge in page order
    for (const pageMap of extractedPageMaps) {
        for (const qId of Object.keys(finalQuestionMap)) {
            const pageSnippet = pageMap[qId];
            if (pageSnippet && pageSnippet !== "NONE" && pageSnippet.trim() !== "") {
                if (finalQuestionMap[qId] === "NONE") {
                    finalQuestionMap[qId] = pageSnippet.trim();
                } else {
                    finalQuestionMap[qId] += "\n\n" + pageSnippet.trim();
                }
            }
        }
    }

    return finalQuestionMap;
}