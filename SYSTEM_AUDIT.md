# Playbook Ecosystem - Deep System Architecture Audit & Backend Preparation

## Executive Summary
This document serves as the definitive architectural blueprint for transitioning the Playbook Ecosystem from a mock-driven frontend prototype to a fully functional, production-ready system.

**Current Status:**
- **Frontend:** High-fidelity UI with mocked data (`src/lib/mock-data.ts`) and simulated interactions (`setTimeout`).
- **Backend:** Non-existent (`src/app/api` is missing).
- **Database:** `prisma/schema.prisma` exists but is disconnected from the application logic.
- **Key Issues:** The "Group Manual Creation" and "Marking" workflows are purely cosmetic. The "Tiers" section on the landing page was inconsistent with the enterprise focus (now removed).

**Goal:** Provide a line-by-line logical audit and a concrete backend implementation plan.

---

## 1. Total System Flow Validation

### Current State vs. Required State

| Flow Step | Current Implementation | Required Backend Logic |
| :--- | :--- | :--- |
| **Landing Page** | Static UI (Tiers removed). | Dynamic content (optional), Login/Signup links functioning. |
| **Authentication** | Fake `setTimeout` in `/login` & `/signup`. | **NextAuth.js (v5)** or **Supabase Auth**. JWT sessions with Role-Based Access Control (RBAC) for `LECTURER` vs `STUDENT`. |
| **Lecturer Dashboard** | Loads mock data from `SESSIONS`. | Fetch `Sessions` where `lecturerId == current_user.id` from DB. |
| **Session Creation** | Mock form with `setTimeout`. | `POST /api/sessions` -> Create `Class` record -> Initialize default settings. |
| **Group Management** | `GroupManagement.tsx` mocks group generation. | **Algorithm:** Random/Manual/Performance-based distribution. **DB:** `StudentGroups` table linked to `Classes`. |
| **Work/Assignment** | Mock list in `SessionDetailsPage`. | `POST /api/work` -> Create `Quiz` record. Handle file upload for rubrics. |
| **Student Portal** | `/student` was dead (now redirects). | Student view of assigned works. upload capability for `PENDING` works. |
| **Marking Workflow** | "Mark Exam" tab simulates steps. | **Complex Pipeline:** Upload -> Split PDF -> OCR -> AI Analysis -> Grade Storage. |

---

## 2. Click-by-Click Logic Extraction & Fixes

### A. Group Management (`src/components/dashboard/GroupManagement.tsx`)
*   **Current:** Uses `Math.random()` to simulate group sets. "Generate Groups" button just waits 1s.
*   **Required Backend Logic:**
    1.  **Input:** Session ID, Group Size, Strategy (Random/Smart).
    2.  **Process:** Fetch all students in session. Apply strategy.
    3.  **Storage:** Create `GroupSet` record. Create `Group` records. Map `Student` to `Group`.
    4.  **UI Update:** Invalidate cache/Refetch groups.

### B. Marking Exam Tab (`src/app/dashboard/sessions/[id]/page.tsx`)
The "Mark Exam" tab is the most critical workflow.
*   **Step 1: Upload Scripts**
    *   **Logic:** Multi-file upload (PDFs).
    *   **Backend:** `POST /api/upload`. Store in `tmp` or Object Storage (S3/Supabase Storage). Return `fileId`.
*   **Step 2: Calibration**
    *   **Logic:** Upload Rubric + Gold Standards. Configure AI strictness.
    *   **Backend:** `POST /api/calibration`. Parse rubric (Text/OCR). Store configuration in `Quiz` metadata.
*   **Step 3: AI Grading**
    *   **Logic:** "Start Grading Process" button.
    *   **Backend:** Trigger Background Job (e.g., BullMQ or Inngest).
        *   Split PDF into individual scripts (detect Student ID).
        *   Send each script + Rubric to DeepSeek/Gemini.
        *   Store result in `Submission` and `Score` tables.

### C. Continuous Assessment (`src/components/dashboard/ContinuousAssessmentTable.tsx`)
*   **Current:** Hardcoded `students` array.
*   **Required:**
    *   Dynamic aggregation of all `Scores` for a student within a `Class`.
    *   Weighted average calculation based on `Quiz` weights.

---

## 3. Data Architecture Requirements (Supabase Schema)

The existing `schema.prisma` is a good start but needs expansion to support Groups, Configurable Grading, and Richer User Profiles.

### Core Entities

#### 1. User (Enhanced)
*   **Role:** `LECTURER` | `STUDENT` | `ADMIN`
*   **Institution:** String (for multi-tenant support)
*   **Metadata:** JSON (Avatar, Preferences)

#### 2. Class (Renamed from `Classes` for consistency or mapped)
*   *Note: The UI uses "Session", Schema uses "Classes". We should standardize on **Session** in UI and **Class** in DB, or rename DB to `Session`.*
*   `id`: UUID
*   `code`: String (e.g., "CS 101")
*   `name`: String
*   `semester`: String
*   `mode`: `ONLINE` | `OFFLINE` | `HYBRID`

#### 3. StudentEnrollment (New)
*   *Replaces the JSON `students` string in `Classes` model which is non-scalable.*
*   `id`: UUID
*   `studentId`: FK `User`
*   `classId`: FK `Class`
*   `status`: `ACTIVE` | `DROPPED`

#### 4. GroupSet & Groups (New)
*   **GroupSet:** `id`, `classId`, `name` (e.g., "Lab Groups"), `createdAt`.
*   **Group:** `id`, `groupSetId`, `name` (e.g., "Group A").
*   **GroupMember:** `groupId`, `studentId`.

#### 5. Quiz / Assessment (Enhanced)
*   `type`: `QUIZ` | `EXAM` | `ASSIGNMENT`
*   `weight`: Float (for CA calculation)
*   `gradingConfig`: JSON (Strictness, Language, RubricText)
*   `status`: `DRAFT` | `PUBLISHED` | `GRADING` | `RELEASED`

#### 6. Submission (Enhanced)
*   `fileUrl`: String (Storage path)
*   `ocrText`: Text (Raw text from script)
*   `pageCount`: Int

#### 7. Score (Enhanced)
*   `breakdown`: JSON (Question-level scores)
*   `aiReasoning`: Text (DeepSeek chain-of-thought)
*   `humanOverride`: Boolean
*   `gradedAt`: DateTime

---

## 4. Marking Workflow Deep Logic

**The "Black Box" of AI Grading exposed:**

1.  **Ingestion:**
    *   User uploads `Batch_A.pdf` (500 pages).
    *   System validates PDF integrity.
2.  **Smart Collation (The "Splitter"):**
    *   **Logic:** Iterate pages. Look for "Name/RegNo" region or QR code.
    *   **Action:** Slice pages [0-4] -> `Student_A.pdf`. Slice [5-9] -> `Student_B.pdf`.
    *   **Fallback:** If unsure, flag for manual review ("Unassigned Pages").
3.  **OCR & Vision (The "Eyes" - Gemini 1.5):**
    *   Convert PDF pages to images.
    *   Extract handwritten text to Markdown.
4.  **Semantic Grading (The "Brain" - DeepSeek V3):**
    *   **Prompt:** "You are a strict academic marker. Here is the Rubric: {rubric}. Here is the Student Answer: {ocr_text}. Grade Q1, Q2..."
    *   **Output:** structured JSON `{ "q1": { "score": 5, "max": 10, "comment": "..." } }`.
5.  **Persistence:**
    *   Save JSON to `Score` table. Update `Submission` status to `GRADED`.

---

## 5. Session Mode Logic

| Feature | Online Mode | Offline Mode | Hybrid |
| :--- | :--- | :--- | :--- |
| **Student Input** | Web Form / File Upload | Physical Paper | Both |
| **Submission** | Auto-created on upload | Created via Bulk Scan | Mixed |
| **Grading** | Text comparison | OCR + Text comparison | Both |
| **Identity** | Auth-based | OCR detection of RegNo | Mixed |

**Database Implication:** `Quiz` table needs a `mode` field. `Submission` table needs a `source` field (`WEB` vs `SCAN`).

---

## 6. Export & Report Logic

**Exports must be generated on the fly or cached for large sets.**

*   **Excel Export:** Query `StudentEnrollment` + `Scores`. Pivot data so columns are Assessments.
*   **PDF Report:** Generate a "Report Card" style PDF using `react-pdf` or server-side `pdf-lib`.
*   **Zip Export:** Create a job to zip all `Submission.filePath` files.

---

## 7. Import / File Handling Logic

*   **Validation:** Max size 50MB per file. Allowed types: PDF, PNG, JPG.
*   **Sanitization:** Rename files to prevent collision (`uuid-original_name.pdf`).
*   **Storage:** Do NOT store files in database. Use `public/uploads` (dev) or AWS S3 / Supabase Storage (prod).
*   **Mapping:** The filename or the content MUST contain the Student Reg No for auto-mapping in Offline mode.

---

## 8. UI Component & Code Review

**Folder Structure:** Standard Next.js App Router.
*   `src/app`: Routes.
*   `src/components`: UI library (Shadcn UI).
*   `src/lib`: Utilities.

**Findings:**
*   **Abstraction:** Good use of `DashboardShell`.
*   **Components:** `GroupManagement` and `ContinuousAssessmentTable` are monolithic. Should be broken down.
*   **State:** Mostly local `useState`. For global data (User, Session), use a Context or **TanStack Query** to manage server state and caching.
*   **Inconsistencies:** "Session" in UI vs "Classes" in Prisma. "Group" logic exists in UI but missing in DB.

---

## 9. Implementation Plan (Roadmap)

To move from Audit to Production:

1.  **Database Migration:**
    *   Update `schema.prisma` with `StudentEnrollment`, `GroupSet`, `Group`.
    *   Run `npx prisma migrate dev`.
2.  **API Construction:**
    *   Build `GET /api/sessions`.
    *   Build `POST /api/sessions`.
    *   Build `POST /api/upload` (Multer/Next Request).
3.  **Authentication Integration:**
    *   Install NextAuth.js.
    *   Protect `/dashboard` routes.
4.  **Connect UI to API:**
    *   Replace `setTimeout` in `GroupManagement` with `fetch('/api/groups/generate')`.
    *   Replace mock `SESSIONS` with `useSWR` or `react-query` hooks.
5.  **Build the AI Worker:**
    *   Implement the PDF Splitter & OCR logic in a background worker (or long-running API route with increased timeout).

---

## Conclusion

The "Playbook Ecosystem" frontend is a polished, high-fidelity prototype. The "logic gaps" identified are simply due to the absence of a backend. The architecture proposed here bridges that gap, creating a scalable, enterprise-grade system.
