'use server';

// Mock function to simulate AI rubric extraction
export async function extractRubric(fileUrl: string) {
  console.log(`Mock extracting rubric from: ${fileUrl}`);
  // In a real scenario, this would involve a call to an LLM.
  // For now, we return a standardized, mock JSON object.
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
  return {
    success: true,
    rubric: [
      { question: "1a", marks: 5, keywords: ["speed", "velocity", "calculation"] },
      { question: "1b", marks: 3, keywords: ["graph", "axis", "interpretation"] },
      { question: "2", marks: 10, keywords: ["Ohm's Law", "circuit", "resistance"] },
    ]
  };
}