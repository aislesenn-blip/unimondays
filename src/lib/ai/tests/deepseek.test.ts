
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

  it('should include the 3 UAT Hard Protocols (Anti-Skip, Partial Mark, Absolute Allocation)', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    // Protocol 1
    expect(prompt).toContain('>>> PROTOCOL 1: THE ANTI-SKIP & MATH RECOGNITION LOCK <<<');
    expect(prompt).toContain('Actively scan for numbers, operators (+, -, =, x), scribbles, and multi-line working.');

    // Protocol 2
    expect(prompt).toContain('>>> PROTOCOL 2: THE "ACTION VERB" PARTIAL MARK RULE <<<');
    expect(prompt).toContain('If a question asks the student to "Describe", "Explain", or "Elaborate", and the student only "Mentions"');

    // Protocol 3
    expect(prompt).toContain('>>> PROTOCOL 3: ABSOLUTE MARKS ALLOCATION SUPREMACY <<<');
    expect(prompt).toContain('You cannot exceed the maximum marks (max_marks) allocated for any question or sub-question.');
  });

  it('should include Protocol 5 (Orphaned Answer Handling) and Protocol 6 (Aggressive Spatial Parsing)', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    // Protocol 5
    expect(prompt).toContain('>>> PROTOCOL 5: THE ORPHANED ANSWER HANDLING <<<');
    expect(prompt).toContain('You must NEVER silently skip a student\'s answer just because it is missing from the Marking Scheme.');
    expect(prompt).toContain('"Attempted but Rubric Missing"');

    // Protocol 6
    expect(prompt).toContain('>>> PROTOCOL 6: AGGRESSIVE SPATIAL PARSING (MESSY SCRIPTS) <<<');
    expect(prompt).toContain('Actively scan the margins, bottom corners, and crossed-out sections');
  });

  it('should include Protocol 7 (Independent Sub-Question Evaluation)', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    expect(prompt).toContain('>>> PROTOCOL 7: INDEPENDENT SUB-QUESTION EVALUATION <<<');
    expect(prompt).toContain('You must process sub-questions independently.');
    expect(prompt).toContain('NEVER drop or skip the legible parts of a rubric just because the bottom half of the page is missing.');
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
  });

  it('should include the strict JSON output schema', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    expect(prompt).toContain('📦 OUTPUT FORMAT (MANDATORY STRICT JSON ONLY)');
    expect(prompt).toContain('"total_marks_awarded": number');
    expect(prompt).toContain('"detectedIdentity": "string');
    expect(prompt).toContain('"studentRemarks": "string');
    expect(prompt).toContain('"teacherRemarks": "string');
  });

  it('should include Dual-Persona Feedback Architecture logic', () => {
    const config: GradeConfig = { strictness: 1.0 };
    const prompt = buildSystemPrompt(config, 100);

    expect(prompt).toContain('⚖️ THE DUAL-PERSONA FEEDBACK ARCHITECTURE:');
    expect(prompt).toContain('Student-Facing Feedback (studentRemarks):');
    expect(prompt).toContain('Teacher-Facing Feedback (teacherRemarks):');
  });
});
