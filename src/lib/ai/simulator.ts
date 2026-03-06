// Mock High-Fidelity Simulator for AI Calls
// Since we cannot use real credit cards/API keys, we simulate REALISTIC behavior:
// - Latency: 2s - 15s (network + processing)
// - Failures: 5% (timeouts, rate limits)
// - Malformed JSON: 1% (hallucinations)
// - Costs: Tracked based on input/output tokens

export interface AIResponse {
    score: number;
    breakdown: any;
    reasoning: string;
    confidence: number;
    tokens: { input: number, output: number };
    cost: number;
}

const DEEPSEEK_PRICING = {
    input: 0.14 / 1000000, // per token
    output: 0.28 / 1000000 // per token
};

export async function simulateDeepSeekCall(ocrText: string): Promise<AIResponse> {
    const startTime = Date.now();

    // 1. Simulate Network Latency (2s - 8s)
    const latency = Math.floor(Math.random() * 6000) + 2000;
    await new Promise(r => setTimeout(r, latency));

    // 2. Simulate Random Failures (5%)
    const failRoll = Math.random();
    if (failRoll < 0.05) {
        throw new Error("503 Service Unavailable: DeepSeek API Overload");
    }

    // 3. Simulate Malformed JSON (1%)
    if (failRoll < 0.06) {
        return {
            score: 0,
            breakdown: "INVALID_JSON_RESPONSE",
            reasoning: "Hallucinated Structure",
            confidence: 0,
            tokens: { input: 0, output: 0 },
            cost: 0
        };
    }

    // 4. Generate Realistic Response
    const inputTokens = ocrText.length / 4; // Approx
    const outputTokens = 500; // Breakdown + Reasoning
    const cost = (inputTokens * DEEPSEEK_PRICING.input) + (outputTokens * DEEPSEEK_PRICING.output);

    return {
        score: Math.floor(Math.random() * 40) + 60, // 60-100
        breakdown: [
            { question_id: "Q1", score: 10, short_evidence: "Correct definition." },
            { question_id: "Q2", score: 8, short_evidence: "Minor calculation error." }
        ],
        reasoning: "Student demonstrates solid understanding but made a minor arithmetic mistake in Q2.",
        confidence: Math.random() * 20 + 80, // 80-100%
        tokens: { input: inputTokens, output: outputTokens },
        cost
    };
}
