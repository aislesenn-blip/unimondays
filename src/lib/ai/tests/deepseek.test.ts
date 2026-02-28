
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

    expect(prompt).toContain('🔐 IMMUTABLE RULES');
    expect(prompt).toContain('🎯 CORE RULE: MARK ALLOCATION ENFORCEMENT');
    expect(prompt).toContain('🧠 EVALUATION PROTOCOL (STRICT 3-TIER MODEL)');
    expect(prompt).toContain('TIER 1 (DIRECT OR SEMANTIC MATCH)');
    expect(prompt).toContain('TIER 2 (EQUIVALENT CONCEPT VALIDATION)');
  });

  it('should include the Domain-Specific Evaluation Protocols and 4-Layer Deterministic Engine', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    expect(prompt).toContain('>>> DOMAIN-SPECIFIC EVALUATION PROTOCOLS <<<');
    expect(prompt).toContain('1. ESSAYS & THEORETICAL QUESTIONS');
    expect(prompt).toContain('2. MATHEMATICS & LOGICAL PROGRESSION');
    expect(prompt).toContain('3. DIAGRAMS & VISUAL RECOGNITION');
    expect(prompt).toContain('4. APPLIED / CASE STUDIES');

    expect(prompt).toContain('>>> THE UNIVERSAL 4-LAYER DETERMINISTIC ENGINE <<<');
    expect(prompt).toContain('1. Concept Layer');
    expect(prompt).toContain('2. Relevance Layer');
    expect(prompt).toContain('3. Logical/Procedural Layer');
    expect(prompt).toContain('4. Deterministic Base');
  });

  it('should preserve critical system protocols', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    // Identity Extraction (Old Mandate 1)
    expect(prompt).toContain('SYSTEM PROTOCOL 1: FORENSIC IDENTITY SCAVENGING');
    expect(prompt).toContain('detectedIdentity');

    // Chaos Handling (Old Mandate 2)
    expect(prompt).toContain('TIER 3 (OUT-OF-SCOPE OR GENERIC KNOWLEDGE)');

    // Autopilot (Old Mandate 6)
    expect(prompt).toContain('❗ VISIBLE UNATTEMPTED QUESTIONS:');

    // Visual Analysis (Old Mandate 7)
    expect(prompt).toContain('📊 CONFIDENCE SCORING & RUBRIC GAP DETECTION');
    expect(prompt).toContain('⚖️ THE DUAL-AUDIENCE JUSTIFICATION RULE:');
  });

  it('should include the strict JSON output schema', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    expect(prompt).toContain('📦 OUTPUT FORMAT (MANDATORY STRICT JSON ONLY)');
    expect(prompt).toContain('"total_marks_awarded": number');
    expect(prompt).toContain('"detectedIdentity": "string');
  });
});
