
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
  it('should inject teacher custom instructions as MANDATE 00', () => {
    const config: GradeConfig = {
      strictness: 1.0,
      calibration: {
        methodology: 'Standard',
        grammar: 'Ignore',
        verbosity: 'Concise',
        incomplete: 'Zero',
        custom: 'IGNORE SPELLING ERRORS AND BE VERY LENIENT',
      },
    };

    const prompt = buildSystemPrompt(config, 100);

    expect(prompt).toContain("TEACHER'S CUSTOM INSTRUCTIONS:");
    expect(prompt).toContain('IGNORE SPELLING ERRORS AND BE VERY LENIENT');
  });

  it('should fallback to default message if no custom instructions provided', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    expect(prompt).toContain('No custom instructions provided. Rely on standard marking scheme.');
  });

  it('should include user-defined Mandates 1-5', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    expect(prompt).toContain('MANDATE 1: NON-SEQUENTIAL HUNTING (JUMBLED ANSWERS)');
    expect(prompt).toContain('MANDATE 2: MULTI-PAGE SPILLOVER (CONTEXT BLEED)');
    expect(prompt).toContain('MANDATE 3: RESTORE SEMANTIC GRADING TIERS');
    expect(prompt).toContain('MANDATE 4: MATH & CALCULATION GRADING');
    expect(prompt).toContain('MANDATE 5: MANDATORY EXHAUSTIVE OUTPUT (DYNAMIC CHECKLIST)');
  });

  it('should preserve critical system protocols', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    expect(prompt).toContain('detectedIdentity');

    // Skipped Questions (Mandate 6)
    expect(prompt).toContain('MANDATE 6: SKIPPED QUESTIONS');

    // OCR Tolerance (Mandate 7)
    expect(prompt).toContain('MANDATE 7: OCR ARTIFACT TOLERANCE & LOGICAL MATH REASONING');
  });

  it('should include the strict JSON output schema', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    expect(prompt).toContain('Output STRICT JSON:');
    expect(prompt).toContain('"totalScore": number');
    expect(prompt).toContain('"detectedIdentity": "string');
  });
});
