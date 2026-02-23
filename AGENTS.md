# Playbook Ecosystem - Enterprise Edition (Pure Next.js)

## Architecture
-   **Frontend**: Next.js 14 (App Router).
-   **Backend**: Next.js API Routes (`src/app/api/...`).
-   **Database**: SQLite (Dev) -> Supabase Postgres (Prod). Managed via Prisma.
-   **AI Engine**:
    -   **OCR**: Gemini 1.5 Flash (`src/lib/ai/gemini.ts`).
    -   **Grading**: DeepSeek V3 (`src/lib/ai/deepseek.ts`).
    -   **Collation**: `pdf-lib` + Gemini for 1000-page splits.

## Core Features
-   **Upload**: Async, non-blocking (`/api/upload`).
-   **Processing**: Client-triggered background job (`/api/process`).
-   **Export**: ZIP generation of PDFs (`/api/export/zip`).
-   **Tier Enforcement**: Monthly quota limits via `TierManager`.

## Verification
-   **Stress Test**: `npx tsx verification/stress_test_concurrency.ts` (Verified 20 concurrent uploads).
-   **Large PDF**: `npx tsx verification/stress_test_large_pdf.ts`.
-   **AI Services**: `npx tsx verification/verify_ai_services.ts`.

## Environment
-   `GEMINI_API_KEY`: Vision/OCR.
-   `DEEPSEEK_API_KEY`: Grading/Chat.
-   `DATABASE_URL`: SQLite file or Supabase connection string.

## Deployment
-   **Vercel**: One-click deploy compatible.
-   **Limits**: API routes designed to return fast; processing happens in triggered background steps to avoid serverless timeouts.
