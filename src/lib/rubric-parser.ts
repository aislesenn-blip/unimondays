export interface RubricItem {
  questionId: string;      // e.g., "1a", "2", "3(b)(ii)"
  rubricSegment: string;
  maxScore: number;
}

export function parseRubric(rubricText: string): RubricItem[] {
  const lines = rubricText.split('\n');
  const items: RubricItem[] = [];

  // Pattern 1: Standard "Q1 (5 marks)" or "1. (a) [4]"
  const patterns = [
    { regex: /^(?:Q(?:uestion)?\s*)?(\d+[a-zA-Z]*(?:\.[a-z]+|\([a-z]+\))?)\s*[\(\[\{]?(\d+)\s*(?:marks?|pts?|points?)[\)\]\}]?/i, groupQuestion: 1, groupMarks: 2 },
    { regex: /^(\d+[a-zA-Z]*(?:\.[a-z]+|\([a-z]+\))?)\s*[—–—-]?\s*\(?(\d+)\s*[mM]/, groupQuestion: 1, groupMarks: 2 },
    { regex: /^[\(\[\{]?(\d+)[\)\]\}]\s+(\d+[a-zA-Z]*(?:\.[a-z]+|\([a-z]+\))?)/, groupQuestion: 2, groupMarks: 1 } // e.g., "(5) Question 1a"
  ];

  let currentItem: Partial<RubricItem> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let matched = false;
    for (const p of patterns) {
      const match = trimmed.match(p.regex);
      if (match) {
        // Save previous item
        if (currentItem && currentItem.rubricSegment) {
          items.push({
            questionId: currentItem.questionId!,
            rubricSegment: currentItem.rubricSegment.trim(),
            maxScore: currentItem.maxScore!
          });
        }
        // Start new item
        currentItem = {
          questionId: match[p.groupQuestion],
          maxScore: parseInt(match[p.groupMarks], 10),
          rubricSegment: trimmed
        };
        matched = true;
        break;
      }
    }

    if (!matched && currentItem) {
      // Continuation of previous rubric segment
      currentItem.rubricSegment += '\n' + trimmed;
    }
  }

  // Push last item
  if (currentItem && currentItem.rubricSegment) {
    items.push({
      questionId: currentItem.questionId!,
      rubricSegment: currentItem.rubricSegment.trim(),
      maxScore: currentItem.maxScore!
    });
  }

  // Fallback: If no items found, try splitting by blank lines and heuristic
  if (items.length === 0) {
    // Simple fallback: split by double newline, assume each block is a question
    const blocks = rubricText.split(/\n\s*\n/);
    for (let i = 0; i < blocks.length; i++) {
      const lines = blocks[i].split('\n');
      const firstLine = lines[0];
      // Try to extract marks from first line
      const markMatch = firstLine.match(/(\d+)\s*(?:marks?|pts?)/i);
      const maxScore = markMatch ? parseInt(markMatch[1], 10) : 1; // default 1 if not found
      items.push({
        questionId: `Q${i+1}`,
        rubricSegment: blocks[i],
        maxScore
      });
    }
  }

  return items;
}
