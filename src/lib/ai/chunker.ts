import { PageData } from './gemini';

export interface QuestionChunk {
  questionId: string; // e.g., "Q1", "Q6", or "GLOBAL_METADATA"
  combinedText: string;
  associatedImagesBase64: string[];
}

export function detectAndChunkQuestions(pages: PageData[]): QuestionChunk[] {
  // Use a Map to easily retrieve and update existing chunks by questionId
  const chunkMap = new Map<string, QuestionChunk>();

  // Ensure GLOBAL_METADATA exists from the start
  chunkMap.set("GLOBAL_METADATA", {
    questionId: "GLOBAL_METADATA",
    combinedText: "",
    associatedImagesBase64: []
  });

  // State Machine Tracker
  let activeQuestionId = "GLOBAL_METADATA";

  /**
   * ROBUST REGEX EXPLANATION:
   * - ^\s*(?:\*\*)? : Allows leading whitespace and optional bold markdown (**)
   * - (?:Q(?:uestion|n)?\.?\s*|(\d+)\.\s*) : Non-capturing group matching variants like "Question 1", "Q1", "Qn 2.", or just "1."
   * - (\d+[A-Za-z]?) : The core capture group grabbing the number and optional sub-part (e.g., "1", "1A", "6b")
   * - \s*(?:\(continued\))? : Allows optional "(continued)" text
   * - (?:\*\*)?\s*(?:[:\-\.)])? : Optional closing bold markdown and trailing punctuation/spacing
   */
  const questionHeaderRegex = /^\s*(?:\*\*)?(?:Q(?:uestion|n)?\.?\s*|(\d+)\.\s*)?(\d+[A-Za-z]?)\s*(?:\(continued\))?(?:\*\*)?\s*(?:[:\-\.)])?/i;

  for (const page of pages) {
    if (!page.extractedText || page.extractedText === "BLANK_PAGE" || page.extractedText === "EXTRACTION_FAILED") {
      continue;
    }

    const lines = page.extractedText.split('\n');
    let currentImageAddedToActiveChunk = false;

    for (const line of lines) {
      const match = line.match(questionHeaderRegex);

      if (match) {
        // match[1] is the number from the "1. " format, match[2] is the core number from the "Q1" format.
        // We normalize the ID to a standard "Q#" format.
        const rawNumber = match[2] || match[1];
        const newQuestionId = `Q${rawNumber.toUpperCase()}`;

        // State Transition
        activeQuestionId = newQuestionId;
        currentImageAddedToActiveChunk = false; // Reset for the new chunk on this page

        // Stitching Logic: Create if missing, otherwise we append to existing
        if (!chunkMap.has(activeQuestionId)) {
          chunkMap.set(activeQuestionId, {
            questionId: activeQuestionId,
            combinedText: "",
            associatedImagesBase64: []
          });
        }
      }

      // Append text to the currently active chunk
      const activeChunk = chunkMap.get(activeQuestionId)!;
      // Only append non-empty lines to keep it clean, or append all to preserve formatting
      if (line.trim() !== "") {
          activeChunk.combinedText += (activeChunk.combinedText ? "\n" : "") + line.trim();
      }

      // Image Association & Deduplication
      if (!currentImageAddedToActiveChunk && page.pageImageBase64) {
        // Prevent duplicate images in the same chunk
        if (!activeChunk.associatedImagesBase64.includes(page.pageImageBase64)) {
          activeChunk.associatedImagesBase64.push(page.pageImageBase64);
        }
        currentImageAddedToActiveChunk = true;
      }
    }
  }

  // Cleanup: Remove GLOBAL_METADATA if it ended up completely empty
  const globalMeta = chunkMap.get("GLOBAL_METADATA");
  if (globalMeta && globalMeta.combinedText.trim() === "" && globalMeta.associatedImagesBase64.length === 0) {
    chunkMap.delete("GLOBAL_METADATA");
  }

  // Convert the Map back to an array
  return Array.from(chunkMap.values());
}
