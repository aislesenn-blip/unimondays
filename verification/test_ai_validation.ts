import { DeepSeekService } from "../src/lib/ai/deepseek";

// Mock OpenAI Client
const mockOpenAI = {
  chat: {
    completions: {
      create: async (params: any) => {
        console.log("\n--- Mock OpenAI Request ---");
        console.log("Model:", params.model);
        console.log("System Prompt:", params.messages[0].content);
        // Truncate long user prompt for display
        console.log("User Prompt (Snippet):", params.messages[1].content.slice(0, 200) + "...");

        const prompt = params.messages[1].content;

        // Logic to simulate responses
        if (prompt.includes("STRICTLY Determine if it is a valid academic student script")) {
            if (prompt.includes("REJECTED_DOC_TYPE")) {
                 return {
                    choices: [{ message: { content: JSON.stringify({ is_valid: false, reason: "Explicitly Rejected Document Type" }) } }]
                 };
            }
             return {
                choices: [{ message: { content: JSON.stringify({ is_valid: true, reason: "Valid Academic Script" }) } }]
             };
        }

        if (prompt.includes("You are a strict academic grader")) {
             return {
                choices: [{ message: { content: JSON.stringify({
                    total_marks: 85.5,
                    breakdown: [{ question: "Q1", marks: 10 }],
                    general_remarks: "Good work.",
                    confidence_score: 92.5,
                    audit_trail: "Q1: Correct answer."
                }) } }]
             };
        }

        if (prompt.includes("You are the Head of Department")) {
            return {
                choices: [{ message: { content: "Students are struggling with Algebra. Recommend reviewing quadratic equations." } }]
            };
        }

        return { choices: [{ message: { content: "{}" } }] };
      }
    }
  }
};

async function run() {
  try {
    console.log("Initializing DeepSeekService with Mock Client...");
    // @ts-ignore
    const service = new DeepSeekService(mockOpenAI);

    console.log("\nTesting Validation (Valid Doc)...");
    const validResult = await service.validateContent("This is a student answer for Math Q1.");
    console.log("Result:", validResult);
    if (validResult.is_valid !== true) throw new Error("Validation Failed for Valid Doc");

    console.log("\nTesting Validation (Invalid Doc)...");
    // We inject a special keyword trigger for our mock
    const invalidResult = await service.validateContent("REJECTED_DOC_TYPE content here.");
    console.log("Result:", invalidResult);
    if (invalidResult.is_valid !== false) throw new Error("Validation Failed for Invalid Doc");

    console.log("\nTesting Grading...");
    const gradeResult = await service.gradeSubmission("Student Answer...", "Rubric...");
    console.log("Result:", gradeResult);
    if (gradeResult.confidence_score !== 92.5 || !gradeResult.audit_trail) throw new Error("Grading Failed");

    console.log("\nTesting HOD Summary...");
    const summary = await service.generateHODSummary("Stats...");
    console.log("Result:", summary);
    if (!summary || !summary.includes("Students are struggling")) throw new Error("HOD Summary Failed");

    console.log("\nSUCCESS: All AI Logic Tests Passed.");

  } catch (e) {
    console.error("Test Failed:", e);
    process.exit(1);
  }
}

run();
