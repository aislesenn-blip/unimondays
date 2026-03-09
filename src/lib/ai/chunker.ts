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

    // Regex to detect question headers. e.g., "Q1", "Question 1", "1.", "1a."
    const headerRegex = /^(?:Q(?:uestion|n)?\.?\s*|)(\d+[a-zA-Z]?)(?:\.|\)|:|-|\s*$)/i;

    const commitBuffer = () => {
        if (currentQuestionId && currentBuffer.length > 0) {
            // Find the closest matching question ID from the rubric
            const normalizedFoundId = currentQuestionId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            // Try to match "1" to "Q1" or "Q1" to "Q1"
            const matchingRubricQ = rubricQuestions.find(rq => {
                const normalizedRubricId = rq.question.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                return normalizedRubricId === normalizedFoundId || normalizedRubricId === `Q${normalizedFoundId}`;
            });

            const targetId = matchingRubricQ ? matchingRubricQ.question : `Q${normalizedFoundId}`;

            const joinedText = currentBuffer.join('\n').trim();
            if (joinedText) {
                if (questionMap[targetId] && questionMap[targetId] !== "NONE") {
                    questionMap[targetId] += "\n\n" + joinedText;
                } else {
                    questionMap[targetId] = joinedText;
                }
            }
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
            currentQuestionId = match[1]; // e.g. "1" or "1a"
            currentBuffer.push(trimmedLine); // keep the header for context
        } else {
            // If we haven't found a question yet, we attach it to a GLOBAL context (or the first question later if needed, but best to discard/ignore preamble unless requested)
            if (currentQuestionId) {
                currentBuffer.push(trimmedLine);
            } else {
                // If it's preamble/metadata, we could store it, but for strict 1-to-1 grading, we need it assigned to a question.
                // We'll keep it in a temporary 'PREAMBLE' key just in case.
                if (!questionMap["PREAMBLE"]) questionMap["PREAMBLE"] = "NONE";
                if (questionMap["PREAMBLE"] === "NONE") questionMap["PREAMBLE"] = trimmedLine;
                else questionMap["PREAMBLE"] += "\n" + trimmedLine;
            }
        }
    }
    commitBuffer(); // commit the final question

    return questionMap;
}
