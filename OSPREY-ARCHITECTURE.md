# 🚀 OSPREY APGP: Elite Enterprise Grading Pipeline
## Architecture Overview

The Atomic Parallel Grading Pipeline (APGP) relies on strict back-pressure, atomic idempotency, deterministic prompt engineering, and fault tolerance at every tier.

### 1. Robust File Validation & Ingestion
- Uses `file-type` magic bytes parsing over fragile MIME strings for PDF validation.
- Drops dead code and eliminates the deadline grace period.

### 2. Idempotent Map Phase (OCR Chunking)
- Extracts documents natively page-by-page.
- Chunks text into the `ExtractedChunk` SQL table containing `{ id, submissionId, chunkIndex, text, pages, confidence }` with a unique composite index `[submissionId, chunkIndex]`.
- Implements `ON CONFLICT` safe upsert semantics, resolving any QStash duplicate-delivery race conditions.
- AI extracts an explicit `[CONFIDENCE: 0.95]` metric used to auto-flag illegible student handwriting.

### 3. Smart Atomic Reduce Phase (Grading)
- Validates chunk completeness before moving `PENDING` to `GRADING` state.
- Combines chunk context map arrays (`pageTextMap`) to enforce isolated semantic boundaries for the LLM.
- **Student ID Consensus**: Determines `RegNo` statistically based on all chunk extractions via array-reduce.
- **Robust Multi-Pass Rubric Parsing**: Migrated away from the inline `regex` code to a dedicated `src/lib/rubric-parser.ts` to build the required `RubricItem[]` maps.
- DeepSeek atomic parallel requests are aggressively metered with the `TokenBucket` rate-limiter.
- Uses `Promise.allSettled()` to intercept and log (`SystemLog` table) single-question API networking failures (e.g. `429`, `ECONNRESET`) without crashing the entire grade. Evaluates successfully graded questions while setting a `0` fallback with explicit errors for missing chunks.

### 4. Transparent Progress Tracking
- Endpoints stream metadata status logs to clients referencing `ExtractedChunk` counts and system logs dynamically.
