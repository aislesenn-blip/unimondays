
import { describe, it, expect, vi } from 'vitest';
import { buildSystemPrompt, GradeConfig } from '../deepseek';

// Mock OpenAI to resolve import issues during test
vi.mock('openai', () => {
  return {
    default: class OpenAI {
      apiKey: string;
      constructor(config: { apiKey: string }) {
        this.apiKey = config.apiKey;
      }
    }
  };
});

describe('AI System Prompt Generation', () => {
  it('should contain the V2 strict deterministic mandate', () => {
    const config: GradeConfig = {
      strictness: 1.0,
      calibration: {
        methodology: 'Standard',
        grammar: 'Ignore',
        verbosity: 'Concise',
        incomplete: 'Zero',
        custom: 'IGNORE SPELLING ERRORS',
      },
    };

    const prompt = buildSystemPrompt(config, 100);

    expect(prompt).toContain("You are a Deterministic Grading Engine");
    expect(prompt).toContain("You are NOT a creative AI");
    expect(prompt).toContain("The Marking Scheme is FINAL and LOCKED");
  });

  it('should include strict mark allocation enforcement', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    expect(prompt).toContain('CORE RULE: MARK ALLOCATION ENFORCEMENT');
    expect(prompt).toContain('You CANNOT exceed this number');
  });

  it('should include the 3-Tier Evaluation Protocol', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    expect(prompt).toContain('TIER 1 (DIRECT OR SEMANTIC MATCH)');
    expect(prompt).toContain('TIER 2 (EQUIVALENT CONCEPT VALIDATION)');
    expect(prompt).toContain('TIER 3 (OUT-OF-SCOPE OR GENERIC KNOWLEDGE)');
  });

  it('should include the new V2 strict JSON output schema', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    expect(prompt).toContain('OUTPUT FORMAT (MANDATORY STRICT JSON ONLY)');
    expect(prompt).toContain('"results": [');
    expect(prompt).toContain('"tier_used": "Tier 1 | Tier 2 | Tier 3 | N/A"');
    expect(prompt).toContain('"alternative_valid_concept": boolean');
    expect(prompt).toContain('"review_flag": boolean');
  });
});
