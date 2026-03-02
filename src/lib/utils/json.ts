
// src/lib/utils/json.ts

/**
 * Safely parses a JSON object from a string that may contain conversational text.
 * It looks for the first occurrence of a string that starts with '{' and ends with '}'.
 * @param text The potentially messy string from an AI response.
 * @returns The parsed JSON object, or null if no valid JSON is found.
 */
export function safeJsonParse(text: string): any | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const jsonRegex = /{[\s\S]*}/;
  const match = text.match(jsonRegex);

  if (match && match[0]) {
    try {
      return JSON.parse(match[0]);
    } catch (error) {
      console.error("Failed to parse extracted JSON:", error);
      return null;
    }
  }

  return null;
}
