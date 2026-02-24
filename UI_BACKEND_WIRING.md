# Playbook Ecosystem - UI-to-Backend Wiring & Logic Map

This document serves as the comprehensive blueprint for connecting the frontend UI to the Supabase backend. It covers every element, interaction, and logic flow, ensuring strict adherence to the defined state machines and production hardening rules.

---

## 1. Authentication & Landing

### 1.1 Login Page (`/login`)
| UI Element | Type | Action / Behavior | Backend Endpoint | Payload | Response | Permissions | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Email Input** | Input | Validates format. | - | - | - | Public | Client-side validation. |
| **Password Input** | Input | - | - | - | - | Public | - |
| **Sign In Button** | Button | Authenticates user. | `POST /api/auth/login` | `{ email, password }` | `{ token, user: { id, role, institution } }` | Public | **Redirect:** `/dashboard` (Lecturer) or `/student/dashboard` (Student). |
| **Forgot Password** | Link | Triggers reset flow. | `POST /api/auth/reset-password` | `{ email }` | `{ message: "Check email" }` | Public | Sends magic link. |
| **Sign Up Link** | Link | Navigates to `/signup`. | - | - | - | Public | - |

### 1.2 Signup Page (`/signup`)
| UI Element | Type | Action / Behavior | Backend Endpoint | Payload | Response | Permissions | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **First/Last Name** | Input | - | - | - | - | Public | - |
| **Email Input** | Input | - | `GET /api/auth/check-email?email=...` | - | `{ available: boolean }` | Public | Debounced check. |
| **Institution** | Input | - | - | - | - | Public | - |
| **Password** | Input | - | - | - | - | Public | - |
| **Create Account** | Button | Creates user record. | `POST /api/auth/signup` | `{ firstName, lastName, email, password, institution, role: 'LECTURER' }` | `{ token, user }` | Public | Auto-login after creation. Redirect to `/onboarding`. |

### 1.3 Student Login (`/student/login`)
*   *Identical to 1.1 but restricts `role` to 'STUDENT'.*
*   **Sign In Button:** `POST /api/auth/login` -> Payload `{ email, password, role: 'STUDENT' }`.

---

## 2. Lecturer Dashboard

### 2.1 Overview (`/dashboard`)
| UI Element | Type | Action / Behavior | Backend Endpoint | Payload | Response | Permissions | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Total Scripts** | Card | Displays usage count. | `GET /api/lecturer/stats` | - | `{ scriptsUsed, scriptsLimit }` | Lecturer | - |
| **Active Sessions** | Card | Count of ACTIVE sessions. | `GET /api/sessions?status=ACTIVE` | - | `[Session objects]` (count length) | Lecturer | Filter: `deletedAt IS NULL`. |
| **Pending Reviews** | Card | Count of `FLAGGED` submissions. | `GET /api/submissions?status=FLAGGED` | - | `{ count: 12 }` | Lecturer | - |
| **At Risk Students** | Card | Count of students avg < 40%. | `GET /api/analytics/risk` | - | `{ count: 15 }` | Lecturer | Aggregated query. |
| **Recent Activity** | List | List of audit logs. | `GET /api/lecturer/activity` | - | `[{ action, target, time }]` | Lecturer | - |
| **Create Session** | Button | Navigates to `/dashboard/sessions/create`. | - | - | - | Lecturer | - |

### 2.2 Create Session (`/dashboard/sessions/create`)
| UI Element | Type | Action / Behavior | Backend Endpoint | Payload | Response | Permissions | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Course Name** | Input | - | - | - | - | Lecturer | - |
| **Course Code** | Input | Unique validation. | `GET /api/sessions/check-code?code=...` | - | `{ available: boolean }` | Lecturer | Debounced. |
| **Semester** | Input | - | - | - | - | Lecturer | - |
| **Mode** | Radio | Online / Offline / Hybrid. | - | - | - | Lecturer | - |
| **Create Button** | Button | Creates session. | `POST /api/sessions` | `{ name, code, semester, mode }` | `{ id, code, status: 'ACTIVE' }` | Lecturer | **State:** Created as `ACTIVE`. |

---

## 3. Session Management (`/dashboard/sessions/[id]`)

### 3.1 Header & Actions
| UI Element | Type | Action / Behavior | Backend Endpoint | Payload | Response | Permissions | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Export Report** | Button | Download Report Card. | `GET /api/sessions/[id]/export/report` | - | `application/pdf` stream | Lecturer | **Logic:** Aggregates all published grades. |
| **Archive Session** | Button | Soft deletes session. | `DELETE /api/sessions/[id]` | - | `{ success: true }` | Lecturer | **State:** ACTIVE -> ARCHIVED. Sets `deletedAt`. |

### 3.2 Works Tab (Assessments)
| UI Element | Type | Action / Behavior | Backend Endpoint | Payload | Response | Permissions | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Create Work** | Button | Navigates to create form. | - | - | - | Lecturer | - |
| **Work List** | Card | Displays assessment list. | `GET /api/sessions/[id]/assessments` | - | `[{ id, title, status, stats }]` | Lecturer | - |
| **View Results** | Link | Navigates to Work Details. | - | - | - | Lecturer | - |
| **Status Badge** | Badge | Shows DRAFT/PUBLISHED etc. | - | - | - | Lecturer | Color coded. |

### 3.3 Mark Exam Tab (The Marking Workflow)
| UI Element | Type | Action / Behavior | Backend Endpoint | Payload | Response | Permissions | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Upload Scripts** | Dropzone | Batch PDF upload. | `POST /api/upload/batch` | `FormData { files, assessmentId }` | `{ batchId, fileCount }` | Lecturer | **State:** Creates PENDING submissions. |
| **Config Grading** | Button | Opens Calibration Sheet. | - | - | - | Lecturer | - |
| **Save Config** | Button | Saves grading rules. | `PATCH /api/assessments/[id]` | `{ gradingConfig: JSON }` | `{ success: true }` | Lecturer | Rubric, Strictness, etc. |
| **Start Grading** | Button | Triggers AI Worker. | `POST /api/assessments/[id]/grade` | - | `{ jobId, status: 'GRADING' }` | Lecturer | **State:** PUBLISHED -> GRADING. **Lock:** Prevents re-click. |
| **Auto-Save DB** | Switch | Toggles real-time save. | - | - | - | Lecturer | Default ON. |

### 3.4 Group Management Tab (`GroupManagement.tsx`)
| UI Element | Type | Action / Behavior | Backend Endpoint | Payload | Response | Permissions | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Grouping Method** | Select | Random / Manual / Smart. | - | - | - | Lecturer | - |
| **Group Size** | Input | Number of students. | - | - | - | Lecturer | - |
| **Generate** | Button | Creates groups. | `POST /api/sessions/[id]/groups/generate` | `{ method, size }` | `{ groupSetId, groups: [...] }` | Lecturer | **Logic:** Random shuffle or logic based on `method`. |
| **Save Set** | Button | Persists manual changes. | `POST /api/groups/sets` | `{ name, groups: [...] }` | `{ id }` | Lecturer | - |
| **Drag & Drop** | UI | Moves student cards. | `PATCH /api/groups/[id]/members` | `{ add: [uid], remove: [uid] }` | `{ success: true }` | Lecturer | **Constraint:** Locked if Assessment is ACTIVE. |

### 3.5 Continuous Assessment Tab (`ContinuousAssessmentTable.tsx`)
| UI Element | Type | Action / Behavior | Backend Endpoint | Payload | Response | Permissions | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Table Data** | Table | Loads calculated grades. | `GET /api/sessions/[id]/ca` | - | `[{ student, scores: {}, total }]` | Lecturer | **Logic:** `Sum(Score * Weight)`. Normalize weights to 100%. |
| **Auto-Calc** | Switch | Toggles live calculation. | - | - | - | Lecturer | Client-side toggle. |
| **Configure** | Button | Opens Weight Config. | - | - | - | Lecturer | - |
| **Save Weights** | Button | Updates assessment weights. | `PATCH /api/assessments/weights` | `[{ id, weight }]` | `{ success: true }` | Lecturer | **Validation:** Sum must be 10000 (100%). |

---

## 4. Assessment Creation (`/work/create`)

### 4.1 Form Elements
| UI Element | Type | Action / Behavior | Backend Endpoint | Payload | Response | Permissions | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Title** | Input | - | - | - | - | Lecturer | - |
| **Mode** | Tabs | Upload / Digital. | - | - | - | Lecturer | Sets `isUpload` flag. |
| **Group Work** | Switch | Toggles group mode. | - | - | - | Lecturer | Sets `isGroup` flag. |
| **Upload File** | Dropzone | Uploads Question Paper. | `POST /api/upload/resource` | `FormData` | `{ url }` | Lecturer | - |
| **Rubric Text** | Textarea | AI Grading instructions. | - | - | - | Lecturer | Stored in `rubric` field. |
| **Max Marks** | Input | Total marks. | - | - | - | Lecturer | **Immutable** after publish. |
| **Weight** | Input | CA Weight %. | - | - | - | Lecturer | **Immutable** after publish. |
| **Submit** | Button | Creates assessment. | `POST /api/assessments` | `{ title, mode, rubric, ... }` | `{ id, code }` | Lecturer | **State:** DRAFT. |

---

## 5. Student Portal

### 5.1 Dashboard (`/student/dashboard`)
| UI Element | Type | Action / Behavior | Backend Endpoint | Payload | Response | Permissions | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Enter Code** | Input | Session Code. | - | - | - | Student | - |
| **Start Button** | Button | Joins Session / Assessment. | `POST /api/student/join` | `{ code }` | `{ type: 'SESSION'\|'ASSESSMENT', id }` | Student | **Logic:** If Session Code -> Enroll. If Work Code -> Go to Assessment. |
| **Active Works** | List | Shows DUE assessments. | `GET /api/student/assessments?status=PUBLISHED` | - | `[{ id, title, dueDate }]` | Student | Filter: Enrolled Sessions only. |
| **Recent Results** | List | Shows GRADED submissions. | `GET /api/student/submissions?status=GRADED` | - | `[{ id, score, grade }]` | Student | - |

### 5.2 Taking Assessment (`/student/assessment/[code]`)
| UI Element | Type | Action / Behavior | Backend Endpoint | Payload | Response | Permissions | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Start Assessment** | Button | Initializes submission. | `POST /api/submissions/start` | `{ assessmentId }` | `{ submissionId, startTime }` | Student | **State:** PENDING. Starts Timer. |
| **Save Draft** | Button | Saves current answers. | `PATCH /api/submissions/[id]` | `{ answers: JSON }` | `{ savedAt }` | Student | - |
| **Upload File** | Dropzone | Uploads PDF/Image. | `POST /api/upload/submission` | `FormData` | `{ url }` | Student | Hybrid mode only. |
| **Submit** | Button | Finalizes submission. | `POST /api/submissions/[id]/submit` | - | `{ status: 'SUBMITTED' }` | Student | **State:** PENDING -> SUBMITTED. **Lock:** Cannot edit after. |

---

## 6. API Reference (Consolidated)

### Authentication
*   `POST /api/auth/login`
*   `POST /api/auth/signup`
*   `POST /api/auth/logout`

### Sessions
*   `GET /api/sessions` (List)
*   `POST /api/sessions` (Create)
*   `GET /api/sessions/[id]` (Details)
*   `DELETE /api/sessions/[id]` (Archive)
*   `GET /api/sessions/[id]/students` (Enrollment List)

### Assessments (Works)
*   `GET /api/sessions/[id]/assessments`
*   `POST /api/assessments`
*   `PATCH /api/assessments/[id]` (Update/Publish/Lock)
*   `POST /api/assessments/[id]/grade` (Trigger AI)

### Submissions
*   `GET /api/assessments/[id]/submissions` (Lecturer List)
*   `POST /api/submissions` (Student Create)
*   `PATCH /api/submissions/[id]` (Update/Draft)
*   `POST /api/submissions/[id]/submit` (Finalize)
*   `PATCH /api/submissions/[id]/score` (Override Score)

### Groups
*   `GET /api/sessions/[id]/groups`
*   `POST /api/sessions/[id]/groups/generate`
*   `PATCH /api/groups/[id]/members`

### Exports
*   `GET /api/sessions/[id]/export/excel`
*   `GET /api/sessions/[id]/export/zip`
*   `GET /api/sessions/[id]/export/report` (PDF)

---

## 7. Deep Logic & Edge Cases

### 7.1 Group Locking Logic
*   **Trigger:** When `Assessment.status` transitions to `PUBLISHED`.
*   **Action:** The backend freezes the `GroupMember` table for the relevant `GroupSet`.
*   **Edge Case:** If a lecturer MUST move a student, they must conceptually "Unlock" the assessment (or the system warns that this student's grade in pending submissions might be orphaned).
*   **Snapshot:** On `SUBMIT`, the current group members are copied to `Submission.groupSnapshot`. This is the source of truth for grading distribution.

### 7.2 AI Grading Fail-Safe
*   **Circuit Breaker:** If AI API returns 500/429 > 5 times in 1 minute, the Queue pauses. Admin is alerted.
*   **Dead Letter:** Failed grading jobs go to a DLQ. They can be replayed manually via `POST /api/admin/jobs/replay`.
*   **Fallback:** If AI cannot grade (e.g., unreadable PDF), status becomes `FLAGGED`. Confidence = 0. Lecturer must grade manually.

### 7.3 Concurrency
*   **Optimistic Locking:** All `UPDATE` operations on `Submission` or `Assessment` checks `version` or `status` before writing.
*   **Idempotency:** "Start Grading" button generates a unique Job ID (`grade_assess_{id}_v{version}`). If clicked twice, the second request is ignored by the Queue.

This document covers all UI elements and their backend wiring.
