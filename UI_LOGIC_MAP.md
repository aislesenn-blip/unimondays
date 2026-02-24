# Playbook Ecosystem - UI Logic & Backend Wiring Map

This document serves as the comprehensive blueprint for connecting the frontend UI to the Supabase backend. It details every UI element, its expected behavior, and the corresponding backend logic, adhering to the project's state machines and permissions.

## 1. Authentication & Onboarding

| Page / Component | UI Element | Type | Behavior | Backend Endpoint | Payload Structure | Response Mapping | Permissions | State Rules |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Login Page** | `Email Input` | Input | Captures email | - | - | - | Public | - |
| | `Password Input` | Input | Captures password | - | - | - | Public | - |
| | `Log In` | Button | Authenticates user | `POST /auth/login` | `{ email, password }` | `{ token, user: { id, role } }` | Public | Redirects based on `user.role` |
| **Signup Page** | `Full Name` | Input | Captures name | - | - | - | Public | - |
| | `Institution` | Input | Captures institution | - | - | - | Public | - |
| | `Create Account` | Button | Registers new user | `POST /auth/signup` | `{ email, password, fullName, institution, role }` | `{ user }` | Public | Account status: `PENDING_VERIFICATION` (optional) |
| **Navbar** | `Log Out` | Button | Clears session | `POST /auth/logout` | `{}` | `{ success: true }` | Auth Only | Clears JWT / Session Cookie |

## 2. Landing Page

| Page / Component | UI Element | Type | Behavior | Backend Endpoint | Payload Structure | Response Mapping | Permissions | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Section** | `Start as Lecturer` | Link | Navigates to Signup | - | - | - | Public | - |
| | `Student Access` | Link | Navigates to Student Login | - | - | - | Public | - |
| **Footer** | `Partnerships` | Link | Scrolls to section | - | - | - | Public | Added in Audit |
| | `FAQs` | Link | Scrolls to section | - | - | - | Public | Added in Audit |

## 3. Lecturer Dashboard (Home)

| Page / Component | UI Element | Type | Behavior | Backend Endpoint | Payload Structure | Response Mapping | Permissions | State Rules |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Stats Cards** | `Total Students` | Card | Displays count | `GET /api/dashboard/stats` | - | `{ studentCount, activeSessions, gradedCount }` | Lecturer | Real-time count |
| **Session List** | `Create Session` | Button | Opens Modal | - | - | - | Lecturer | - |
| **Create Session Modal** | `Course Name` | Input | - | - | - | - | Lecturer | - |
| | `Course Code` | Input | - | - | - | - | Lecturer | - |
| | `Save / Create` | Button | Creates new session | `POST /api/sessions` | `{ name, code, academicYear }` | `{ session: { id, code, joinCode } }` | Lecturer | Session: `ACTIVE` |
| **Session Card** | `Manage` | Button | Navigates to Session | - | - | - | Lecturer | - |
| | `Export Report` | Button | Generates PDF | `GET /api/export/session/[id]` | - | `Blob (PDF)` | Lecturer | - |

## 4. Session / Class Details

| Page / Component | UI Element | Type | Behavior | Backend Endpoint | Payload Structure | Response Mapping | Permissions | State Rules |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Header** | `Join Code` | Display | Copies to clipboard | - | - | - | Lecturer | - |
| **Tabs** | `Assessments` | Tab | Lists quizzes/exams | `GET /api/sessions/[id]/work` | - | `[ { id, title, status, date } ]` | Lecturer | - |
| | `Students` | Tab | Lists enrollment | `GET /api/sessions/[id]/students` | - | `[ { id, name, regNo } ]` | Lecturer | - |
| | `Groups` | Tab | Manage groups | `GET /api/sessions/[id]/groups` | - | `[ { id, name, members: [] } ]` | Lecturer | - |
| **Assessment List** | `Create Assessment` | Button | Opens Builder | `POST /api/assessments` | `{ sessionId, title, type, mode }` | `{ assessmentId }` | Lecturer | Assessment: `DRAFT` |
| | `Publish` | Button | Opens to students | `PATCH /api/assessments/[id]/publish` | `{}` | `{ status: "PUBLISHED" }` | Lecturer | `DRAFT` → `PUBLISHED` |
| | `Delete` | Menu Item | Soft deletes | `DELETE /api/assessments/[id]` | - | - | Lecturer | Sets `deletedAt` |

## 5. Group Management

| Page / Component | UI Element | Type | Behavior | Backend Endpoint | Payload Structure | Response Mapping | Permissions | Deep Logic |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Config** | `Grouping Method` | Select | Sets algorithm | - | `method: "random" | "manual" | "smart"` | - | Lecturer | - |
| | `Generate Groups` | Button | Triggers logic | `POST /api/sessions/[id]/groups/generate` | `{ size, method }` | `[ { id, name, members: [] } ]` | Lecturer | **Random**: Shuffles students.<br>**Smart**: Uses grade history to balance.<br>**Manual**: Creates empty buckets. |
| **Active Groups** | `Drag Student` | Interaction | Moves student to group | `PATCH /api/groups/[id]/add-member` | `{ studentId }` | `{ success: true }` | Lecturer | Validates group size limit. |
| **Group Item** | `Actions Menu` | Dropdown | Edit/Delete | - | - | - | Lecturer | Implemented via `DropdownMenu` |
| | `Delete Group` | Item | Removes group | `DELETE /api/groups/[id]` | - | - | Lecturer | Moves members to "Unassigned". |

### Manual Group Selection Logic
When "Manual Selection" is chosen:
1. **Buckets Created**: The system creates $N$ empty groups based on the class size / target group size.
2. **Unassigned List**: All students appear in a "Unassigned Students" sidebar.
3. **Drag & Drop**: The lecturer drags a student from the sidebar into a specific Group Card.
4. **Backend Update**: Each drop triggers `PATCH /api/groups/[groupId]/add-member` with `{ studentId }`.
5. **Student View**: Students see "You have been assigned to **Group A**" on their dashboard instantly.

## 6. Work / Assessment Details (Grading)

| Page / Component | UI Element | Type | Behavior | Backend Endpoint | Payload Structure | Response Mapping | Permissions | State Rules |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Submissions Table** | `Row` | Link | Opens individual grade | - | - | - | Lecturer | - |
| | `Start Grading` | Button | Triggers AI | `POST /api/assessments/[id]/grade-all` | - | `{ jobId }` | Lecturer | Starts async background job. |
| | `Release Results` | Button | Visible to students | `PATCH /api/assessments/[id]/release` | - | `{ status: "RELEASED" }` | Lecturer | `GRADING` → `RELEASED` |
| **Individual Row** | `Flag` | Menu Item | Marks for review | `PATCH /api/submissions/[id]/flag` | `{ reason }` | `{ status: "FLAGGED" }` | Lecturer | `GRADED` → `FLAGGED` |
| | `Reset Grade` | Menu Item | Clears score | `PATCH /api/submissions/[id]/reset` | - | `{ status: "SUBMITTED" }` | Lecturer | `GRADED` → `SUBMITTED` |

## 7. AI Grading & Audit

| Page / Component | UI Element | Type | Behavior | Backend Endpoint | Payload Structure | Response Mapping | Permissions | Deep Logic |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Audit Sheet** | `AI Justification` | Text | Explains score | `GET /api/submissions/[id]/audit` | - | `{ reasoning, confidence }` | Lecturer | Fetched from `Submission.aiMetadata`. |
| | `Edit Score` | Input | Manual override | `PATCH /api/submissions/[id]/score` | `{ newScore, comment }` | `{ score, override: true }` | Lecturer | Logs change in `AuditLog` table. |
| **Unmatched Tab** | `Resolve` | Button | Maps orphan to student | `POST /api/submissions/map-orphan` | `{ orphanId, studentId }` | `{ success: true }` | Lecturer | Updates `Submission.studentId`. |

## 8. Student Portal

| Page / Component | UI Element | Type | Behavior | Backend Endpoint | Payload Structure | Response Mapping | Permissions | State Rules |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Join Session** | `Code Input` | Input | Enters 6-char code | - | - | - | Student | - |
| | `Join Class` | Button | Enrolls student | `POST /api/enroll` | `{ code }` | `{ session }` | Student | Creates `StudentEnrollment`. |
| **Assessment** | `Upload PDF` | File Input | Submits work | `POST /api/submissions/upload` | `FormData(file)` | `{ url, status }` | Student | `PENDING` → `SUBMITTED`. Locked if `LATE`. |
| **Results** | `View Feedback` | Button | Shows rubric + score | `GET /api/submissions/[id]` | - | `{ score, feedback }` | Student | Only visible if `status == RELEASED`. |

## 9. Continuous Assessment (CA)

| Logic Area | Description | Calculation Rule | Update Trigger |
| :--- | :--- | :--- | :--- |
| **Weighted Average** | Calculates final grade based on weights | `∑ (Assessment.Score * Assessment.Weight) / ∑ Weights` | Real-time on dashboard view. |
| **Missing Work** | Handling non-submissions | Counted as `0` if `dueDate` passed. | Daily cron job or on-access calculation. |
| **Precision** | Database storage | Scores stored as `Decimal(5,2)` or Integers scaled x100. | Prevent floating point errors. |

## 10. Export & Reporting

| Feature | Endpoint | Payload | Logic |
| :--- | :--- | :--- | :--- |
| **Export Excel** | `GET /api/export/excel?sessionId=...` | - | Generates `.xlsx` with columns: RegNo, Name, [Assessment 1], [Assessment 2], Total. |
| **Export PDF** | `GET /api/export/pdf?sessionId=...` | - | Generates formatted report card for the class. |
| **Batch Download** | `GET /api/export/zip?assessmentId=...` | - | Zips all PDF submissions (original + annotated) for an assessment. |

## 11. Backend Wiring Guidelines

### Database Constraints
*   **Unique Emails**: `User.email` must be unique.
*   **Unique Enrollments**: `(studentId, sessionId)` must be unique in `StudentEnrollment`.
*   **Immutable History**: `AuditLog` entries cannot be deleted or modified.

### Concurrency
*   **Grading Queue**: Use Redis or DB-backed queue to handle AI grading jobs to prevent timeouts.
*   **Optimistic Locking**: Use `version` field on `Assessment` to prevent overwriting edits.

### State Machines
*   **Session**: `DRAFT` → `ACTIVE` → `ARCHIVED`.
*   **Submission**: `PENDING` → `SUBMITTED` → `PROCESSING` → `GRADED` → `RELEASED`.
    *   *Constraint*: Cannot grade a `PENDING` submission.
    *   *Constraint*: Cannot release results while `Assessment` is `DRAFT`.
