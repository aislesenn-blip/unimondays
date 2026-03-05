import { PageData } from './gemini';

export interface QuestionChunk {
  questionId: string; // e.g., "Q1", "Q6", or "GLOBAL_METADATA"
  combinedText: string; // All text for this question concatenated across all pages
  associatedImagesBase64: string[]; // Array of unique Base64 images where this question appeared
}

/**
 * Parses OCR markdown from multiple pages, detecting question boundaries
 * and stitching scattered answers together into isolated QuestionChunks.
 */
export function detectAndChunkQuestions(pages: PageData[]): QuestionChunk[] {
  const chunkMap = new Map<string, QuestionChunk>();

  // Initialize the catch-all metadata chunk
  chunkMap.set("GLOBAL_METADATA", {
    questionId: "GLOBAL_METADATA",
    combinedText: "",
    associatedImagesBase64: []
  });

  let activeQuestionId = "GLOBAL_METADATA";

  // Robust Regex to catch OCR variations of question headers at the start of a line
  // Matches: "Question 1", "Q1.", "1.", "Qn 2", "**Question 6**", "Q1 (continued)"
  // Breakdown:
  // ^\s*                     : Start of line, optional whitespace
  // (\*\*|__)?               : Optional markdown bolding
  // (Question|Qn|Q)?         : Optional word prefix (case-insensitive)
  // \s*                      : Optional space
  // (\d+[a-zA-Z]?)           : The actual Question Number/Letter (e.g., 1, 1a, 2B)
  // \s*                      : Optional space
  // [.):-]?                  : Optional punctuation separator
  // (\s*\(continued\))?      : Optional continuation marker
  // (\*\*|__)?               : Optional closing markdown bolding
  // \s*                      : Trailing whitespace
  const questionHeaderRegex = /^\s*(\*\*|__)?(?:Question|Qn|Q)?\s*(\d+[a-zA-Z]?)\s*[.):-]?\s*(?:\(continued\))?(\*\*|__)?\s*/i;

  for (const page of pages) {
    const lines = page.extractedText.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const match = trimmedLine.match(questionHeaderRegex);

      if (match) {
        // match[2] captures the strict alphanumeric ID (e.g., "1", "1a", "6")
        // We normalize it to "Q" + ID (e.g., "Q1", "Q6") to ensure standard stitching
        const rawId = match[2].toUpperCase();
        activeQuestionId = `Q${rawId}`;

        // If this question doesn't exist yet, initialize it
        if (!chunkMap.has(activeQuestionId)) {
          chunkMap.set(activeQuestionId, {
            questionId: activeQuestionId,
            combinedText: "",
            associatedImagesBase64: []
          });
        }

        // Append the header line itself to the new/existing chunk for context
        const chunk = chunkMap.get(activeQuestionId)!;
        chunk.combinedText += (chunk.combinedText ? "\n" : "") + trimmedLine;

        // Deduplicate image base64 injection
        if (!chunk.associatedImagesBase64.includes(page.pageImageBase64)) {
          chunk.associatedImagesBase64.push(page.pageImageBase64);
        }
      } else {
        // No new header detected. Append this line to the currently active question chunk.
        const chunk = chunkMap.get(activeQuestionId)!;
        chunk.combinedText += (chunk.combinedText ? "\n" : "") + trimmedLine;

        // Ensure the current page's image is associated with this active chunk
        if (!chunk.associatedImagesBase64.includes(page.pageImageBase64)) {
          chunk.associatedImagesBase64.push(page.pageImageBase64);
        }
      }
    }
  }

  // Convert the Map back to an array
  return Array.from(chunkMap.values()).map(chunk => ({
    ...chunk,
    // Clean up excessive newlines
    combinedText: chunk.combinedText.trim()
  }));
}
