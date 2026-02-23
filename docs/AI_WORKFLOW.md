# AI Workflow Documentation

## Dual-AI Architecture (Gemini 1.5 Flash + DeepSeek V3)
The system leverages a hybrid AI engine, combining Gemini's vision capabilities with DeepSeek's advanced reasoning.

## Workflow

### 1. Vision & Extraction (Gemini)
- **Tool**: Google Gemini 1.5 Flash (`src/lib/ai/gemini.ts`)
- **Input**: PDF pages or Image buffers.
- **Output**: JSON containing:
  - Full OCR text (including handwritten content).
  - Detected `student_name` / `reg_no`.
  - `is_garbage` flag.

### 2. Validation & Grading (DeepSeek)
- **Tool**: DeepSeek V3 (`src/lib/ai/deepseek.ts`)
- **Input**: OCR Text from Gemini.

#### Step 2a: Anti-Garbage Filter
- **Prompt**: "Analyze this text. Determine if it's a valid academic document. REJECT if: NIDA, Birth Cert, Magazine..."
- **Output**: `{ "is_valid": true/false, "reason": "Explicit rejection..." }`

#### Step 2b: Semantic Grading
- **Prompt**: "Grade strictly against this Rubric. Provide marks, remarks, confidence, and audit trail."
- **Output**: JSON with:
  - `total_marks`
  - `breakdown` (Marks per question)
  - `general_remarks`
  - `confidence_score` (0-100)
  - `audit_trail` (Step-by-step reasoning)

### 3. HOD Executive Summary
- **Tool**: DeepSeek V3 (`src/lib/ai/deepseek.ts`)
- **Input**: Aggregated statistics and remarks from recent graded submissions.
- **Output**: 3-sentence qualitative advisory for the lecturer (e.g., "Review Algebra concepts...").

### 4. Omniscient Chat
- **Tool**: DeepSeek V3
- **Input**: User query + Contextual data (Scores, Remarks) from `prisma.score.findMany()`.
- **Output**: Intelligent, data-aware responses (e.g., "Student X failed Q3 because...").
