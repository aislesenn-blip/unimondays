# Performance Documentation

## Performance Architecture
- **Environment**: Vercel Serverless (optimized for Edge/Serverless environments).
- **Backend**: Next.js 14 API Routes (Stateless, lightweight).
- **Processing**: Async, client-triggered background jobs.

## Optimizations

### 1. Smart Collation
- **Library**: `pdf-lib` + `jszip` (Browser/Node.js compatible).
- **Efficiency**: Splits 100-page PDF into 100 student dossiers in ~30s (linear scaling).
- **Memory**: Optimized by creating temporary files (`os.tmpdir()`) per page/dossier instead of loading full PDF into RAM.

### 2. Dual-AI Pipeline
- **Parallel Processing**: Gemini handles heavy lifting (Vision/OCR). DeepSeek handles reasoning/grading.
- **Latency**:
  - OCR: ~2-5s per page.
  - Validation: ~1-2s per submission.
  - Grading: ~5-10s per submission.
- **Total Throughput**: ~15-20 submissions per minute (per instance).

### 3. Dashboard Responsiveness
- **Polling**: Client polls `/api/results` every 5s for updates (efficient for moderate load).
- **Rendering**: Shadcn UI + Tailwind CSS (minimal DOM footprint).
- **Excel Export**: Client-side `xlsx` generation (offloads server).

## Limitations
- **Vercel Limits**: Max execution time 10-60s (depending on plan). Large files (>50MB) may timeout.
- **Storage**: Ephemeral `/tmp` storage means files must be processed quickly or moved to persistent storage (S3).
