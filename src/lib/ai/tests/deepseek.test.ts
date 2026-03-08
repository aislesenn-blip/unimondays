
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

    expect(prompt).toContain('No custom instructions provided. Rely on standard marking scheme.');
  });

  it('should include user-defined Mandates 1-5', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    expect(prompt).toContain('MANDATE 1: THE MARKING SCHEME CALIBRATION');
    expect(prompt).toContain('MANDATE 2: SEMANTIC FLEXIBILITY (ONLY IF ALLOWED BY MANDATE 00 & 1)');
    expect(prompt).toContain('MANDATE 3: EMPATHY & OCR FORGIVENESS');
    expect(prompt).toContain('MANDATE 4: MULTIMODAL DIAGRAM & GEOMETRY ANALYSIS');
    expect(prompt).toContain('MANDATE 5: CHAIN OF THOUGHT REASONING & JSON OUTPUT');
  });

  it('should preserve critical system protocols', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    // Identity Extraction (Old Mandate 1)
    expect(prompt).toContain('SYSTEM PROTOCOL 1: FORENSIC IDENTITY SCAVENGING');
    expect(prompt).toContain('detectedIdentity');

    // Chaos Handling (Old Mandate 2)
    expect(prompt).toContain('SYSTEM PROTOCOL 2: CHAOS HANDLING (NON-LINEAR GRADING)');

    // Autopilot (Old Mandate 6)
    expect(prompt).toContain('SYSTEM PROTOCOL 3: AUTOPILOT PROTOCOL');

    // Visual Analysis (Old Mandate 7)
    expect(prompt).toContain('SYSTEM PROTOCOL 4: ADVANCED VISUAL & DIAGRAM ANALYSIS');
  });

  it('should include the strict JSON output schema', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    expect(prompt).toContain('Output STRICT JSON:');
    expect(prompt).toContain('"totalScore": number');
    expect(prompt).toContain('"detectedIdentity": "string');
  });
});
