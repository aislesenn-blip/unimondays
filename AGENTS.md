# PLAYBOOK ECOSYSTEM - Architecture Documentation

## 1. System Architecture
- **Frontend**: Next.js 14 (App Router) with Tailwind CSS (Charcoal + White Luxury Theme).
- **Backend**: Python FastAPI (Serverless-ready).
- **Database**: SQLite (Local `dev.db`) -> Migration path to Supabase (Production).
- **AI Engine**:
  - **Vision/OCR**: Gemini 1.5 Flash (via Google GenAI SDK).
  - **Reasoning/Grading**: DeepSeek V3 (via OpenAI SDK compatibility).

## 2. Data Flow
1. **Student Uploads Script** -> `POST /api/submit` -> File saved to `uploads/`.
2. **Background Task** (`process_submission_task`) Starts:
   - **Gemini OCR**: Extracts text, math formulas, and detects `RegNo`.
   - **Validation**: Checks for non-academic content (e.g., NIDA cards) using `backend/utils/validation.py`.
   - **Smart Collation**: Logic to stitch pages based on detected IDs.
   - **DeepSeek Grading**: Grades extracted text against the Quiz Rubric.
3. **Result**: Saved to `Result` table with `breakdown`, `remarks`, and `auditLog`.
4. **Student/Lecturer**: Polls `/api/submission/{id}` or views via Dashboard.

## 3. API Interaction
- `POST /api/submit`: Upload file, returns `submission_id`.
- `GET /api/submission/{id}`: Get status (`PENDING`, `PROCESSING`, `COMPLETED`, `FLAGGED`) and result.
- `POST /api/chat`: Context-aware chat with AI.
- `GET /api/health`: Health check.

## 4. Database Schema (Prisma)
- `User`: Lecturers/Admins.
- `Quiz`: Assessment metadata and Rubric.
- `Submission`: Student attempt (File + extracted text).
- `Result`: AI grading output.
- `Appeal`: Student disputes.

## 5. Deployment
- **Frontend**: Vercel (Next.js).
- **Backend**: Vercel Serverless Functions (`api/index.py`) or separate Container (Docker/Fly.io).
- **Environment Variables**: `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`.

## 6. Key Commands
- `npm run dev`: Start Frontend (Port 3000).
- `uvicorn backend.main:app --reload --port 8000`: Start Backend.
- `python verification/verify_system.py`: Run End-to-End Test.
