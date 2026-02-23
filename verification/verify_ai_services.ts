import "dotenv/config";
import { GeminiService } from "../src/lib/ai/gemini";
import { DeepSeekService } from "../src/lib/ai/deepseek";
import { ScriptCollator } from "../src/lib/pdf/collation";
import { TierManager } from "../src/lib/utils/tier-manager";

async function verify() {
  try {
    const gemini = new GeminiService();
    console.log("GeminiService: Initialized");

    const deepseek = new DeepSeekService();
    console.log("DeepSeekService: Initialized");

    const collator = new ScriptCollator();
    console.log("ScriptCollator: Initialized");

    console.log("TierManager: Loaded");

    console.log("AI Services Verification: SUCCESS");
  } catch (e) {
    console.error("AI Services Verification: FAILED", e);
    process.exit(1);
  }
}

verify();
