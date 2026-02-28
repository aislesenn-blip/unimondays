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

    expect(prompt).toContain("MANDATE 00: THE TEACHER'S CUSTOM INSTRUCTIONS (SUPREME LAW)");
    expect(prompt).toContain('IGNORE SPELLING ERRORS AND BE VERY LENIENT');
  });

  it('should fallback to default message if no custom instructions provided', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    expect(prompt).toContain('No custom instructions provided.');
  });

  it('should include the Domain-Specific Evaluation Protocols and Semantic Clustering', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    expect(prompt).toContain('>>> DOMAIN-SPECIFIC EVALUATION PROTOCOLS <<<');
    expect(prompt).toContain('- MATHEMATICS: Check symbolic equivalence.');
    expect(prompt).toContain('- ESSAYS: Look for semantic matches.');

    expect(prompt).toContain('>>> SYSTEM PROTOCOL 5: SEMANTIC CLUSTERING (SQC) <<<');
  });

  it('should include the Anti-Skip protocol', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    expect(prompt).toContain('>>> PROTOCOL 1: THE ANTI-SKIP LOCK <<<');
    expect(prompt).toContain('You must evaluate EVERY concept unit provided for every question');
  });

  it('should include the strict JSON output schema', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    expect(prompt).toContain('📦 OUTPUT FORMAT (MANDATORY STRICT JSON ONLY)');
    expect(prompt).toContain('"concept_results": [');
    expect(prompt).toContain('"awardedMarks": number');
    expect(prompt).toContain('"studentRemarks": "string');
    expect(prompt).toContain('"teacherRemarks": "string');
  });
});