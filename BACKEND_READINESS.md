# Playbook Ecosystem - Backend Readiness & Logic Audit

## 1. Global Consistency Validation

### Naming Standardization
The system currently suffers from split-personality naming between Frontend and Database.
**Decision:** We will standardize on the **Frontend** terminology for user-facing concepts, but map them to rigorous Database schemas.

| UI Term | Current DB Term | **Unified Standard (Proposed)** | Notes |
| :--- | :--- | :--- | :--- |
| **Session** | `Classes` | **Session** | "Class" implies a static group. "Session" implies a time-bound academic period (Semester/Course). |
| **Work** | `Quiz` | **Assessment** | "Quiz" is too narrow. "Work" is too vague. "Assessment" covers Quizzes, Exams, and Assignments. |
| **Lecturer** | `User.role='lecturer'` | **User (Role: LECTURER)** | Keep single User table with RBAC. |
| **Student** | `User.role='student'` | **User (Role: STUDENT)** | Keep single User table with RBAC. |
| **Group** | *Missing* | **Group** | New entity required. |

### Mock Logic Identification
The following components rely on `setTimeout` or hardcoded data and must be replaced:
1.  **Auth:** `src/app/(auth)/*` -> Replace with NextAuth.js / Supabase Auth.
2.  **Session Creation:** `src/app/dashboard/sessions/create/page.tsx` -> Replace with `POST /api/sessions`.
3.  **Work Creation:** `src/app/dashboard/sessions/[id]/work/create/page.tsx` -> Replace with `POST /api/assessments`.
4.  **Group Generation:** `src/components/dashboard/GroupManagement.tsx` -> Replace with `POST /api/sessions/[id]/groups/generate`.
5.  **CA Table:** `src/components/dashboard/ContinuousAssessmentTable.tsx` -> Replace with real-time aggregation query.

---

## 2. Student Portal – Full Lifecycle Definition

### A. Session Code Logic
*   **Format:** `[A-Z]{3}-[0-9]{4}` (e.g., `CSE-2024`).
*   **Generation:**
    *   On Session Create: `GenerateUniqueCode()`.
    *   Check DB for collision. If exists, retry.
*   **Validation:**
    *   Input sanitization (Upper case, trim).
    *   Query `Session` table where `code == input` AND `status == 'ACTIVE'`.

### B. Enrollment Flow (The "Join" Action)
1.  **Trigger:** Student enters code in `/student/dashboard`.
2.  **Backend Action:** `POST /api/student/join`.
3.  **Logic:**
    *   Verify Code.
    *   Check if `StudentEnrollment` exists for `(userId, sessionId)`.
    *   If yes -> Error: "Already joined".
    *   If no -> Create `StudentEnrollment`.
4.  **State:** `EnrollmentStatus` enum: `ACTIVE`, `DROPPED`, `SUSPENDED`.

### C. Visibility Rules
*   **Active Student:** Sees all `PUBLISHED` assessments.
*   **Dropped Student:** Sees historical data but cannot submit new work.
*   **Pending Work:** Students can only upload if `Assessment.status` is `PUBLISHED` and `Submission.status` is `PENDING` or `MISSING`.

---

## 3. Lecturer Workflow – Complete Mapping

### A. Dashboard (`/dashboard`)
*   **Query:** `SELECT * FROM Session WHERE lecturerId = current_user.id ORDER BY updatedAt DESC`.
*   **Stats:** Aggregate `count(StudentEnrollment)` and `count(Assessment)` per session.

### B. Session Creation
*   **Endpoint:** `POST /api/sessions`
*   **Payload:** `{ name, courseCode, semester, mode: 'ONLINE'|'OFFLINE'|'HYBRID' }`
*   **Validation:** `courseCode` + `semester` must be unique per Lecturer.

### C. Group Management
*   **Data Structure:**
    *   `GroupSet`: Parent container (e.g., "Lab Groups").
    *   `Group`: Individual bucket (e.g., "Group 1").
    *   `GroupMember`: Link table `(groupId, studentId)`.
*   **Strategy - Random:** `Shuffle(students).Chunk(size)`.
*   **Strategy - Smart:** `Sort(students, by=avgScore).Distribute(balanced)`. *Requires CA calculation first.*

### D. Assessment Creation
*   **Endpoint:** `POST /api/assessments`
*   **Types:** `QUIZ`, `EXAM`, `ASSIGNMENT`.
*   **Validation:**
    *   `TotalMarks` must be > 0.
    *   `Deadline` must be > `StartDate`.
    *   If `Mode` is `DIGITAL`, `Questions` array must be valid.

---

## 4. Marking Workflow – State Machine

### States & Transitions
1.  **DRAFT:** Editable. Invisible to students.
    *   *Transition -> PUBLISHED:* Validation (Rubric exists, Deadline set).
2.  **PUBLISHED:** Visible to students. Submissions accepted.
    *   *Lecturer Action:* Can edit typos, cannot change max marks.
    *   *Transition -> GRADING:* Deadline passed OR Lecturer manually locks.
3.  **GRADING:** Submissions closed. AI processing active.
    *   *Lecturer Action:* "Start Grading" (Triggers Job). Review individual scripts. Override marks.
    *   *Student View:* "Grading in progress".
    *   *Transition -> RELEASED:* All scripts graded (or explicitly skipped).
4.  **RELEASED:** Grades visible to students. Appeals open.

### Backend Mapping
*   **Script Upload:** `POST /api/upload/batch`.
    *   **Logic:** Stream upload -> Save to S3/Storage -> Return `BatchID`.
    *   **Worker:** `SplitPDF(BatchID)` -> creates `Submission` records.
*   **AI Grading:**
    *   **Trigger:** `POST /api/assessments/[id]/grade`.
    *   **Job:** Queue `GradeSubmission(submissionId)` for every submission.
    *   **Failure:** Mark Submission as `FLAGGED`. Lecturer must resolve manually.

---

## 5. Continuous Assessment Logic

### Formula
$$ \text{Total CA} = \sum (\text{Assessment.Score} \times \text{Assessment.Weight}) $$
*   **Constraint:** $\sum \text{Weights} = 100\%$ (of the CA component).

### Implementation
*   **DB:** `Assessment` table has `weight` (Float, 0.0 - 1.0).
*   **Calculation:** Calculated on-the-fly via SQL View or Application Logic when rendering the CA Table.
*   **Handling Missing:** Treat as 0 for calculation.

---

## 6. Import / Export Architecture

*   **File Handling:**
    *   **Allowed:** PDF, JPG, PNG.
    *   **Limit:** 10MB per student upload. 100MB per lecturer batch upload.
    *   **Sanitization:** `uuidv4() + original_ext`.
*   **Excel Export:**
    *   **Library:** `xlsx` (SheetJS) or `exceljs`.
    *   **Structure:** RegNo | Name | A1 (10%) | A2 (20%) | ... | Total | Grade.
*   **Zip Export:**
    *   **Logic:** Select all PDFs for Assessment -> Stream to `archiver` -> Pipe to Response.
    *   **Naming:** `[RegNo]_[Name]_[AssessmentCode].pdf`.

---

## 7. Error States & Permission Matrix

| Action | Lecturer | Student | Unauthorized | Error Handling |
| :--- | :--- | :--- | :--- | :--- |
| **Create Session** | ✅ Allowed | ❌ Forbidden | ❌ Redirect Login | Toast "Failed to create" |
| **Join Session** | ❌ Forbidden | ✅ Allowed | ❌ Redirect Login | "Invalid Code" / "Already Joined" |
| **Upload Script** | ✅ (Batch) | ✅ (Single) | ❌ Forbidden | "File too large" / "Invalid Type" |
| **Trigger AI** | ✅ Allowed | ❌ Forbidden | ❌ Forbidden | "Quota Exceeded" / "API Error" |
| **View Grades** | ✅ (All) | ✅ (Own Only) | ❌ Forbidden | "Not Released Yet" |

---

## 8. Full Click-by-Click Walkthrough

1.  **Lecturer Login:** `POST /auth/login` -> Returns JWT.
2.  **Create Session:** `POST /api/sessions` -> DB: Insert `Session`.
3.  **Student Join:** Student calls `POST /api/student/join` with code -> DB: Insert `StudentEnrollment`.
4.  **Create Assessment:** Lecturer clicks "Create Work" -> `POST /api/assessments` -> DB: Insert `Assessment`.
5.  **Publish:** Lecturer clicks "Publish" -> `PATCH /api/assessments/[id]` -> status=`PUBLISHED`.
6.  **Student Submit:** Student uploads PDF -> `POST /api/submissions` -> S3 upload -> DB: Insert `Submission`.
7.  **Lock & Grade:** Lecturer clicks "Start Grading" -> `POST /api/assessments/[id]/grade` -> Status=`GRADING`.
8.  **AI Worker:** Background job processes PDFs -> Updates `Score` table.
9.  **Override:** Lecturer edits score -> `PATCH /api/submissions/[id]/score` -> Update `Score`, Set `humanOverride=true`.
10. **Release:** Lecturer clicks "Release Results" -> `PATCH /api/assessments/[id]` -> status=`RELEASED`.
11. **Export:** Lecturer clicks "Export Excel" -> `GET /api/assessments/[id]/export/excel` -> Download stream.

---

## 9. Backend Readiness Checklist

### Database Schema (Supabase/Postgres)
*   [ ] **Users:** `id, email, role, institution`
*   [ ] **Sessions:** `id, lecturerId, code, name, semester, status`
*   [ ] **StudentEnrollment:** `id, userId, sessionId, status`
*   [ ] **Groups:** `id, sessionId, name`
*   [ ] **GroupMembers:** `groupId, userId`
*   [ ] **Assessments:** `id, sessionId, title, type, weight, status, gradingConfig (JSON)`
*   [ ] **Submissions:** `id, assessmentId, studentId, fileUrl, status`
*   [ ] **Scores:** `id, submissionId, marks (JSON), total, aiConfidence`

### Infrastructure
*   [ ] **Auth:** NextAuth.js configured with Credentials/Google Provider.
*   [ ] **Storage:** AWS S3 or Supabase Storage bucket created (`/scripts`).
*   [ ] **Queue:** Redis instance for BullMQ (AI Grading jobs).
*   [ ] **AI Keys:** DeepSeek & Gemini API keys in `.env`.

This document certifies that the **Playbook Ecosystem** logic is fully audited and mapped. Backend implementation can proceed immediately.
