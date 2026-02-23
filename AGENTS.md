# Playbook Ecosystem - Agent Instructions

## Running the Project

### Backend (FastAPI)
1.  `cd backend`
2.  `pip install -r requirements.txt`
3.  `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

### Frontend (Next.js)
1.  `cd frontend`
2.  `npm install`
3.  `npm run dev` (Runs on port 3000)

## Verification
-   Run `python3 verification/verify_full_flow.py` to test the backend API flow.
-   Ensure backend is running on port 8000 before verifying.

## Key Files
-   `backend/services/gemini.py`: OCR Logic (Gemini 1.5 Flash).
-   `backend/services/deepseek.py`: Grading Logic (DeepSeek V3).
-   `backend/services/collation.py`: 1000-Page PDF Splitter Logic.
-   `frontend/src/app/dashboard/page.tsx`: Lecturer Dashboard.

## Notes
-   Database is SQLite (`playbook.db`).
-   Frontend proxies `/api/*` to `http://localhost:8000`.
