# Official System Workflow & Capabilities Documentation

**Product:** Playbook by Uni Monday
**Status:** Production-Ready (Version 1.0)
**Architecture:** Next.js (App Router) + Supabase (PostgreSQL) + DeepSeek AI + Gemini 1.5 Flash

---

## 1. THE ECOSYSTEM OVERVIEW

The platform is built on a robust, multi-tenant architecture designed for scale and strict data isolation.

*   **Core Architecture:**
    *   **Frontend/Backend:** Next.js 14 (App Router) hosting both the UI and the API routes.
    *   **Database:** Supabase PostgreSQL. Every relevant table (`users`, `classes`, `quizzes`, `submissions`) enforces strict tenant isolation via `university_id`.
    *   **Authentication:** Custom session-based auth (`auth-session`) tied to the `users` table.
    *   **Storage:** Supabase Storage (`exam_pdfs` bucket) for secure handling of assessment files.
    *   **AI Workers:** Dedicated Node.js background workers (`scripts/start-worker.ts`) processing `Job` queues for heavy lifting (OCR, Grading).

*   **Key Technical Features:**
    *   **UUIDs:** All primary keys are UUIDs (`gen_random_uuid()`).
    *   **Enums:** Strict type safety using PostgreSQL enums (`user_role`, `job_status`, `submission_status`).
    *   **RLS:** Row Level Security policies are defined in SQL to enforce data access rules at the database level.

---

## 2. THE LECTURER JOURNEY (End-to-End)

### A. Create Session
*   **Action:** Lecturer creates a new class/module.
*   **Workflow:**
    1.  Frontend sends `POST /api/sessions`.
    2.  Server validates the user's `university_id`.
    3.  A new record is inserted into the **`classes`** table.
    4.  The session status defaults to `ACTIVE`.
*   **Database Impact:** `classes` table row created.

### B. Create Assessment & Rubric (OCR)
*   **Action:** Lecturer sets up a quiz/exam and uploads a rubric.
*   **Workflow:**
    1.  **Rubric Upload:** Lecturer uploads a PDF/Image rubric.
    2.  **OCR Processing:** Frontend calls `POST /api/ocr`. The backend reads the file from Supabase Storage and uses **Gemini 1.5 Flash** to extract text.
    3.  **Assessment Creation:** Lecturer reviews the extracted text and submits.
    4.  **API Call:** `POST /api/assessments` is triggered.
    5.  **Data Persistence:** A new record is created in the **`quizzes`** table.
        *   `rubric` field stores the raw text/file reference.
        *   `marking_scheme` stores the OCR-processed text for the AI.
        *   `code` is automatically generated (e.g., `QUIZ-123456`).
        *   `gradingConfig` (methodology) maps to the `strictness` enum (LENIENT, MODERATE, STRICT).

### C. Calibration & Controls
*   **Action:** Lecturer changes grading strictness or locks a session.
*   **Workflow:**
    1.  **Strictness:** Toggling "Lenient" to "Strict" fires `PATCH /api/assessments/[id]`. The `strictness` column in the **`quizzes`** table is updated instantly.
    2.  **Session Status:** Archiving a class fires `PATCH /api/sessions/[id]`. The `status` column in **`classes`** updates to `ARCHIVED` or `LOCKED`, preventing further submissions.

### D. Analytics & Risk Detection
*   **Action:** Lecturer views the Dashboard.
*   **Logic:**
    1.  The `AnalyticsPage` (Server Component) fetches data directly via Prisma.
    2.  **Performance:** Aggregates `Score.totalMarks` from the **`scores`** table linked to `submissions`.
    3.  **Risk Calculation:** The system identifies students whose average score across all graded submissions is **< 40%**.
    4.  **Display:** Renders a list of "At-Risk Students" and calculates the class average and pass rate dynamically.

---

## 3. THE STUDENT JOURNEY (Action-Based Enrollment)

### A. Joining a Class (Strict Privacy)
*   **Philosophy:** "Action-Based Enrollment". There is no `enrollments` table.
*   **Workflow:**
    1.  A student's dashboard is initially empty.
    2.  The student enters an **Assessment Code** (e.g., `QUIZ-123456`).
    3.  The system validates the code against the **`quizzes`** table.
    4.  Upon valid entry (or first submission), the context is established.

### B. Upload Script
*   **Action:** Student uploads their exam PDF.
*   **Workflow:**
    1.  File is uploaded to Supabase Storage.
    2.  Frontend calls `POST /api/submissions` with the `fileUrl`.
    3.  **Database Insert:** A record is created/upserted in the **`submissions`** table.
        *   `status` set to `PENDING`.
        *   `file_path` stores the reference.
        *   `university_id` is linked from the quiz.
    4.  **Audit:** An `audit_logs` entry ("SUBMISSION_CREATED") is written.

### C. Viewing Results
*   **Action:** Student checks their grades.
*   **Logic:**
    1.  Dashboard fetches records from **`submissions`** where `status = 'GRADED'`.
    2.  It joins the **`scores`** table to retrieve the specific breakdown.
    3.  The student sees the `total_marks` and the JSON-based feedback (Strengths, Weaknesses).

---

## 4. THE AI GRADING ENGINE (The Core Pipeline)

The heart of the system is the asynchronous Job Queue.

### A. Triggering the Job
*   When a student submits (`POST /api/submissions`), the API transactionally creates a **`Job`** record:
    *   `type`: `AI_GRADE`
    *   `payload`: `{ submissionId: "..." }`
    *   `status`: `PENDING`

### B. The Worker Process
*   The dedicated worker (`scripts/start-worker.ts` -> `src/workers/grading-worker.ts`) polls the `jobs` table.
*   **Execution Flow:**
    1.  **Claim:** Worker picks up the job and sets status to `PROCESSING`.
    2.  **Context Assembly:** Fetches the `Submission`, links it to the `Quiz` (for `rubric` and `strictness`), and retrieves the file.
    3.  **OCR (if needed):** If `ocrText` is missing, it calls Gemini to digitize the student's PDF.
    4.  **Strictness Application:** Maps the `strictness` enum to a numeric multiplier (Lenient=0.8, Moderate=1.0, Strict=1.2).
    5.  **AI Analysis:** Sends the Student Work + Rubric + Strictness Config to **DeepSeek**.
    6.  **Grading:** DeepSeek returns a JSON structure containing the score and detailed feedback.

### C. Finalization
*   **Persistence:**
    *   Upserts a record in the **`scores`** table (`total_marks`, `breakdown` JSON).
    *   Updates **`submissions`** status to `GRADED` (or `FLAGGED` if confidence is low).
*   **Notification:** Writes to **`audit_logs`** (`action: 'GRADED'`), which powers the user's notification stream.

---

## 5. THE GLOBAL ORACLE (AI Chat)

### Context-Aware Assistance
*   **Endpoint:** `POST /api/chat`.
*   **Logic:**
    1.  **Authentication:** Identifies the user (Student or Lecturer).
    2.  **Context Injection:**
        *   **For Lecturers:** Fetches the most recent `GRADED` submissions to provide stats and insights.
        *   **For Students:** Fetches their own recent results and feedback.
    3.  **System Prompt:** Dynamically constructs a prompt: *"You are Playbook AI... here is the recent performance data..."*.
    4.  **DeepSeek Call:** Generates a tailored response based on real database records.

---
*Documentation generated dynamically from the production codebase.*
