export function parseFullExamTextIntoMap(fullExamText: string, rubricQuestions: { question: string }[]): Record<string, string> {
    const questionMap: Record<string, string> = {};

    // Initialize all expected questions with 'NONE'
    for (const rubricItem of rubricQuestions) {
        questionMap[rubricItem.question] = "NONE";
    }

    // Fallback: If no text, return all NONEs.
    if (!fullExamText || fullExamText.trim() === "" || fullExamText.includes("No readable text extracted")) {
        return questionMap;
    }

    // Split text into lines for parsing
    const lines = fullExamText.split('\n');
    let currentQuestionId: string | null = null;
    let currentBuffer: string[] = [];

    // Robust regex to detect question headers. Matches formats: "1", "01", "1.", "Q1", "Question 1", "1)", "1(a)", "A)", "i)", "ii)"
    const headerRegex = /^\s*(?:Q(?:uestion|n)?\.?\s*)?(?:0*)?(\d+|[a-zA-Z]|i{1,3})(?:\s*\(?[a-zA-Z0-9]+\)?)?(?:\.|\)|:|-|\s*$)/i;

    const commitBuffer = () => {
        if (currentQuestionId && currentBuffer.length > 0) {
            // Normalize the extracted ID for comparison
            const normalizedFoundId = currentQuestionId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

            // Try to match the parsed header against known rubric question IDs
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
                        // Handle Multi-Page Continuation: append additional text to same snippet
                        questionMap[targetId] += "\n\n" + joinedText;
                    } else {
                        questionMap[targetId] = joinedText;
                    }
                }
            }
            // Discard unstructured text that does not map to a rubric ID (No Number -> No Grade)
        }
        currentBuffer = [];
    };

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        const match = trimmedLine.match(headerRegex);

        // If a new question header is found and it's short enough to not be an accidental match in a paragraph
        if (match && trimmedLine.length < 50) {
            commitBuffer(); // Save previous question data
            currentQuestionId = match[1]; // e.g. "1" or "a" or "i"
            currentBuffer.push(trimmedLine); // keep the header for context
        } else {
            // Append to the active question buffer.
            if (currentQuestionId) {
                currentBuffer.push(trimmedLine);
            }
            // Unstructured preamble text (before any question ID is found) is discarded.
        }
    }
    commitBuffer(); // commit the final question

    // Clean up temporary internal state if any
    delete questionMap["PREAMBLE"];

    return questionMap;
}
