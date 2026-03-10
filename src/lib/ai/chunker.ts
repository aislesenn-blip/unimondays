export interface OcrPage {
    page: number;
    text: string;
}

export interface RubricQuestion {
    question: string;
}

export function parsePagesIntoMap(pages: OcrPage[], rubricQuestions: RubricQuestion[]): Record<string, string> {
    const questionMap: Record<string, string> = {};
    const questionIndex: Record<string, number[]> = {};

    // Initialize all expected questions with 'NONE'
    for (const rubricItem of rubricQuestions) {
        questionMap[rubricItem.question] = "NONE";
        questionIndex[rubricItem.question] = [];
    }

    let activeMainQuestion: string | null = null;
    let currentQuestionId: string | null = null;
    let currentBuffer: string[] = [];

    // Robust regex to detect question headers. Matches: "Q1", "Question 1", "1.", "1)", "01", "1(a)", "A)", "i)", "ii)", "iii)"
    // It captures the number/letter/roman numeral part.
    const mainHeaderRegex = /^\s*(?:Q(?:uestion|n)?\.?\s*)?(?:0*)?(\d+)(?:\s*\(?[a-zA-Z0-9]+\)?)?(?:\.|\)|:|-|\s*$)/i;
    const subHeaderRegex = /^\s*(?:0*)?([a-zA-Z]|i{1,3})(?:\s*\(?[a-zA-Z0-9]+\)?)?(?:\.|\)|:|-|\s*$)/i;

    const commitBuffer = (pageNumber: number) => {
        if (currentQuestionId && currentBuffer.length > 0) {
            // Find the closest matching question ID from the rubric
            const normalizedFoundId = currentQuestionId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

            // Try to match against known rubric question IDs
            const matchingRubricQ = rubricQuestions.find(rq => {
                const normalizedRubricId = rq.question.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                return normalizedRubricId === normalizedFoundId ||
                       normalizedRubricId === `Q${normalizedFoundId}` ||
                       `Q${normalizedRubricId}` === normalizedFoundId;
            });

            // If a valid rubric question is matched, append the text.
            if (matchingRubricQ) {
                const targetId = matchingRubricQ.question;
                const joinedText = currentBuffer.join('\n').trim();

                if (joinedText) {
                    if (questionMap[targetId] && questionMap[targetId] !== "NONE") {
                        // Multi-Page/Intra-Page Continuation
                        questionMap[targetId] += "\n\n" + joinedText;
                    } else {
                        questionMap[targetId] = joinedText;
                    }
                    // Add to page index tracking
                    if (!questionIndex[targetId].includes(pageNumber)) {
                        questionIndex[targetId].push(pageNumber);
                    }
                }
            }
        }
        currentBuffer = [];
    };

    // Phase 1: Sequential Page Iteration & Within-Page Segmentation
    for (const pageObj of pages) {
        if (!pageObj.text || pageObj.text.trim() === "") continue;

        // Phase 1: OCR Normalization
        // Normalize common handwritten misreads before regex parsing
        let normalizedText = pageObj.text
            .replace(/\bQl\b/g, "Q1")
            .replace(/\bQI\b/g, "Q1")
            .replace(/\bQ 1\b/g, "Q1")
            .replace(/\bO1\b/g, "01");

        const lines = normalizedText.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            const mainMatch = trimmedLine.match(mainHeaderRegex);
            const subMatch = trimmedLine.match(subHeaderRegex);

            // If we find a new main question (e.g. "Q1", "2.")
            if (mainMatch && trimmedLine.length < 50) {
                commitBuffer(pageObj.page);
                activeMainQuestion = mainMatch[1]; // Store the base number, e.g. "1"
                currentQuestionId = activeMainQuestion;
                currentBuffer.push(trimmedLine);
            }
            // If we find a sub-question (e.g. "a)", "iii)") AND we have an active main question
            else if (subMatch && activeMainQuestion && trimmedLine.length < 50) {
                commitBuffer(pageObj.page);
                // Combine the active main question with the sub question (e.g. "1" + "a" -> "1a")
                currentQuestionId = `${activeMainQuestion}${subMatch[1]}`;
                currentBuffer.push(trimmedLine);
            }
            else {
                // Append text to the active chunk.
                // Unstructured preamble text (before any question ID is found) is discarded to enforce 'No Number -> No Grade'.
                if (currentQuestionId) {
                    currentBuffer.push(trimmedLine);
                }
            }
        }

        // Commit any remaining buffer at the end of the page before moving to the next.
        // We do NOT clear `activeMainQuestion` here, so it persists across pages for continuations.
        commitBuffer(pageObj.page);
    }

    console.log(`[CHUNKER] Page-Level Indexing Complete.`);
    for (const [qId, pageArray] of Object.entries(questionIndex)) {
        if (pageArray.length > 0) {
            console.log(`[CHUNKER] Extracted ${qId} from pages [${pageArray.join(', ')}]`);
        }
    }

    return questionMap;
}