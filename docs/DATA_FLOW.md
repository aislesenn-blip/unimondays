# Data Flow Diagram

## 1. Submission Flow (Upload Mode)
1.  **Lecturer/Student Upload**: User uploads a PDF (single script or bulk batch) via `/api/upload`.
2.  **Initial Storage**: File saved to temporary storage (`/tmp`).
3.  **Submission Creation**: DB record created with status `pending`.
4.  **Processing Trigger**: Client triggers `/api/process` (async).

## 2. Processing Pipeline
1.  **Smart Collation**:
    -   `ScriptCollator` reads the PDF.
    -   Iterates pages, sending each to **Gemini OCR** to detect Student ID.
    -   Splits the master PDF into individual "Dossier" PDFs (`src/lib/pdf/collation.ts`).
    -   Creates new `Submission` records for each student.
    -   Archives the original batch submission.
2.  **AI Analysis (Per Dossier)**:
    -   **OCR**: Gemini extracts full text from the dossier.
    -   **Validation**: DeepSeek checks for "Anti-Garbage" (IDs, non-academic docs). If invalid -> Flag & Stop.
    -   **Grading**: DeepSeek grades against rubric, generating `totalMarks`, `breakdown`, `remarks`, `confidence`, `auditTrail`.
3.  **Persistence**:
    -   Results saved to `Score` and `AuditLog` tables via Prisma.
    -   Status updated to `graded`.

## 3. Analytics & Export Flow
1.  **Dashboard Load**: Fetches `Submission` and `Score` data via `/api/results`.
2.  **HOD Summary**: Dashboard calls `/api/analytics/summary`. Backend aggregates failure rates and prompts DeepSeek for qualitative advisory.
3.  **Excel Export**: Client-side generation using `xlsx` from fetched JSON.
4.  **PDF Report**: Calls `/api/export/table-pdf` to generate a summary table PDF.
5.  **Batch ZIP**: Calls `/api/export/zip`. Backend generates individual PDFs with embedded scripts and zips them.
