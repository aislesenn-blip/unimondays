# Playbook Ecosystem - Production Hardening & Group Logic

## 0. Deep Group Logic & Naming Strategy

The "Group" system is a critical backend component that connects Students, Lecturers, and Assessments.

### 0.1 Naming & Hierarchy
*   **Group Set:** A container for a specific grouping strategy (e.g., "Lab Partners", "Project Teams").
*   **Group:** A specific bucket of students within a Set (e.g., "Group A", "Blue Team").
*   **Group Member:** The link between a Student and a Group.

### 0.2 Manual Selection Logic
The UI currently mocks this. The backend flow must be:
1.  **Fetch Candidates:** `GET /api/sessions/[id]/students?enrolled=true` (List all students).
2.  **Create Buckets:** Lecturer creates `N` groups named "Group 1" to "Group N".
3.  **Assignment:**
    *   **Drag & Drop UI:** Lecturer moves Student ID from "Unassigned" to "Group X".
    *   **Backend:** `POST /api/groups/assign`
    *   **Payload:** `{ groupId: "uuid", studentIds: ["uuid1", "uuid2"] }`
    *   **Constraint:** A student can only belong to **one** Group within a specific **Group Set**.

### 0.3 Student View (The "How do they know?")
*   **Endpoint:** `GET /api/student/groups`
*   **Logic:** Query `GroupMember` where `userId = current_user`. Join with `Group` and `GroupSet`.
*   **UI:** In `/student/dashboard`, display a "My Groups" card:
    *   *Lab Partners: Group A (with Baraka, Sarah)*
    *   *Project Teams: Team Red (with John, Doe)*
*   **Submission:** When submitting a "Group Assessment", the system automatically tags the submission with the Student's `groupId`. All members of that group receive the same grade.

---

## 1. Session State Machine

**Entity:** `Session` (DB: `Classes`)

| State | Description | Lecturer Permissions | Student Permissions | Transitions To |
| :--- | :--- | :--- | :--- | :--- |
| **DRAFT** | Created, not visible. | Edit, Delete. | None. | ACTIVE |
| **ACTIVE** | Live course. | Edit, Create Assessment, Manage Groups. | Join, View, Submit. | ARCHIVED, LOCKED |
| **LOCKED** | Temporarily frozen. | View, Export. | View Only. Cannot Join. | ACTIVE, ARCHIVED |
| **ARCHIVED** | Historic. | View, Export. | View Only. | None (Final). |

*   **Transition Rules:**
    *   `DRAFT -> ACTIVE`: Requires at least 1 valid metadata field.
    *   `ACTIVE -> LOCKED`: Manual trigger (e.g., Semester break).
    *   `* -> ARCHIVED`: Irreversible.

---

## 2. Submission State Machine

**Entity:** `Submission`

| State | Description | Transition Trigger |
| :--- | :--- | :--- |
| **PENDING** | Student clicked start, no file yet. | Student action. |
| **SUBMITTED** | File uploaded. | Upload complete. |
| **PROCESSING** | AI Analysis in progress. | Lecturer clicks "Start Grading". |
| **GRADED** | AI/Human assigned score. | Worker success OR Human override. |
| **FLAGGED** | AI uncertain / Anti-Garbage trigger. | Worker failure (low confidence). |
| **LATE** | Submitted after deadline (if allowed). | Time comparison on upload. |
| **MISSING** | No file by deadline. | Cron job / Deadline check. |

*   **Illegal Transitions:**
    *   `GRADED -> PENDING` (Cannot un-submit after grading).
    *   `FLAGGED -> GRADED` (Requires explicit resolution).

---

## 3. Database Index & Constraint Strategy (Scaling to 100k+)

### Unique Constraints (Data Integrity)
*   **Session Code:** `UNIQUE(code)` - Prevents duplicate join codes globally.
*   **Enrollment:** `UNIQUE(userId, sessionId)` - Prevents double joining.
*   **Group Membership:** `UNIQUE(groupSetId, userId)` - Student can be in only 1 group per set.
*   **Submission:** `UNIQUE(assessmentId, studentId)` - One active submission per work (unless 'Drafts' supported, but unique 'Final').

### Performance Indexes (Query Speed)
*   `CREATE INDEX idx_submission_assessment ON Submission(assessmentId);` -> Critical for "Grade All" queries.
*   `CREATE INDEX idx_enrollment_session ON StudentEnrollment(sessionId);` -> Critical for "List Students".
*   `CREATE INDEX idx_score_submission ON Score(submissionId);` -> Critical for joining scores.
*   `CREATE INDEX idx_assessment_deadline ON Assessment(deadline);` -> Critical for "Active Works" dashboard.

---

## 4. AI Cost Protection & Rate Limiting

### Protection Mechanism
1.  **Idempotency Key:** Every grading request generates a hash `MD5(assessmentId + version)`. If job exists with this key, reject new trigger.
2.  **Assessment Lock:** When `status = GRADING`, the "Start Grading" button is DISABLED in UI and API rejects `POST /grade`.
3.  **Circuit Breaker:** If 5 consecutive AI calls fail (5xx), pause the queue for 5 minutes and alert Admin.
4.  **Quota:** Check `User.quota` before queuing. If `used >= limit`, fail fast.

---

## 5. Concurrency Control on Grading

**Scenario:** Lecturer Double-Click "Start Grading".
**Solution:**
1.  **Optimistic Locking:**
    ```sql
    UPDATE Assessment SET status = 'GRADING'
    WHERE id = :id AND status = 'PUBLISHED';
    ```
    *   If rows_affected == 0, return "Already started".
2.  **Job Queue (BullMQ):**
    *   Job ID = `grade_assessment_${id}`.
    *   BullMQ de-duplicates jobs with same ID automatically.

**Scenario:** Worker Crash mid-batch.
**Solution:**
1.  **Atomic Transactions:** Each script grading is a transaction.
    *   `BEGIN` -> Save Score -> Update Submission Status -> `COMMIT`.
2.  **Dead Letter Queue:** Failed jobs go to DLQ for manual replay.

---

## 6. Field-Level Immutability Rules

| Field | Pre-Publish | Published | Grading/Released |
| :--- | :--- | :--- | :--- |
| **Title** | Mutable | Mutable | Mutable |
| **Max Marks** | Mutable | **Immutable** (Breaks rubric) | **Immutable** |
| **Weight** | Mutable | **Immutable** (Affects CA) | **Immutable** |
| **Rubric** | Mutable | Mutable (Not recommended) | **Immutable** |
| **Questions** | Mutable | **Immutable** (Students answering) | **Immutable** |

---

## 7. Fail-Safe & Recovery Logic

1.  **Stuck in PROCESSING:**
    *   **Monitor:** Cron job checks `PROCESSING` submissions older than 30 mins.
    *   **Action:** Reset to `SUBMITTED` and flag "AI Timeout".
2.  **Anti-Garbage:**
    *   If AI detects non-academic content (e.g., ID card, blank page), set status `FLAGGED`, confidence `0`.
3.  **Manual Override:**
    *   Human edit always wins. Set `isOverridden = true`. AI re-runs DO NOT overwrite overridden scores.

---

## 8. Final Production Readiness Checklist

*   [ ] **No Race Conditions:** 'Start Grading' uses DB atomic update + Job Deduplication.
*   [ ] **No Duplicate Data:** Unique constraints on Enrollment and Submissions.
*   [ ] **No Illegal States:** State machines enforced in Service Layer (not just UI).
*   [ ] **No AI Trigger Duplication:** Rate limiter + Idempotency keys active.
*   [ ] **No Enrollment Duplication:** DB Constraint `(user, session)`.
*   [ ] **No Performance Bottlenecks:** Indexes on FKs (AssessmentId, SessionId).
*   [ ] **No Orphan Records:** Cascade Delete set on `Session -> Assessment -> Submission`.
*   [ ] **Group Logic Sealed:** Manual selection maps to `GroupMember` table; Students can query their group.

This document serves as the final architectural sign-off.
