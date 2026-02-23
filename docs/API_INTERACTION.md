# API Interaction Documentation

## Authentication
- **Current**: Implicit session via dashboard context (mock login for MVP).
- **Future**: Supabase Auth integration via middleware.

## Endpoints

### 1. Upload & Ingestion
- `POST /api/upload`: Handles file uploads (multipart/form-data).
  - **Params**: `file` (PDF/Image), `quizCode` (optional).
  - **Returns**: `submissionId` and status.

### 2. Processing (Async)
- `POST /api/process`: Triggers AI processing for a submission.
  - **Body**: `{ "submissionId": 123 }`.
  - **Logic**: Splits bulk PDFs, performs OCR, validation, grading.
  - **Returns**: `{ "message": "Processing Complete", "count": 1 }`.

### 3. Analytics & Results
- `GET /api/results`: Returns all submissions for the dashboard.
  - **Returns**: JSON array of submissions with scores.
- `GET /api/analytics/summary`: Generates HOD Executive Summary.
  - **Returns**: `{ "summary": "Text advisory..." }`.

### 4. Exports
- `GET /api/export/table-pdf`: Downloads a PDF summary of the results table.
- `POST /api/export/zip`: Downloads a ZIP file containing individual student result PDFs with embedded scripts.
  - **Body**: `{ "quizId": 1 }`.

### 5. Chat & Context
- `POST /api/chat`: Handles "Playbook AI" assistant queries.
  - **Body**: `{ "query": "Who failed Q3?" }`.
  - **Logic**: Injects recent scores/remarks context into DeepSeek prompt.
  - **Returns**: `{ "response": "Student X failed Q3..." }`.
