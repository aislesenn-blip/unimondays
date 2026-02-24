# Playbook Ecosystem - Production Patch Notes & Logic

This document details the specific production-level logic implemented to harden the system against concurrency issues, data loss, and precision errors.

## 1. Group Submission Locking (The "Snapshot" Rule)

To prevent grade disputes when students change groups mid-assessment:

### Logic
1.  **Trigger:** When a student submits work for a Group Assessment.
2.  **Action:**
    *   Fetch current `GroupMember` list for the student's group.
    *   Serialize list to JSON: `["student_1_id", "student_2_id"]`.
    *   Store in `Submission.groupSnapshot`.
3.  **Grading:** When the AI (or Lecturer) assigns a grade to this Submission, the system:
    *   Reads `groupSnapshot`.
    *   Applies the grade to **only** those students listed in the snapshot.
    *   Ignores current group membership (which may have changed).
4.  **UI Constraint:**
    *   If `Assessment.status` is `PUBLISHED` or `GRADING`, the Lecturer CANNOT move students out of the linked Group Set.
    *   Attempting to do so returns `409 Conflict: Cannot modify groups while assessment is active`.

## 2. Soft Delete & Archival Strategy

To ensure data integrity and auditability, strict "Hard Delete" is forbidden for business entities.

### Schema Implementation
*   `deletedAt: DateTime?` field added to `Classes`, `Quiz` (Assessment), `Submission`, `User`, `GroupSet`.
*   **Query Rule:** All default queries must include `WHERE deletedAt IS NULL`.
*   **Archive Action:**
    *   Lecturer clicks "Archive Session".
    *   Backend sets `Classes.status = 'ARCHIVED'`.
    *   Backend sets `Classes.deletedAt = NOW()`.
    *   **Result:** Session disappears from "Active" lists but remains in "Archived" view (by explicitly querying `deletedAt IS NOT NULL`).

### Relationships
*   **No Cascade Delete:** Deleting a Session does *not* delete its Assessments in the DB. They remain orphan-linked for audit.
*   **Restore:** Admin can set `deletedAt = NULL` to restore data.

## 3. Continuous Assessment (CA) Precision

To prevent floating-point drift (e.g., `33.333333%`):

### Logic
1.  **Storage:** Weights are stored as **Basis Points (Integers)**.
    *   `100.00%` = `10000`
    *   `33.33%` = `3333`
    *   `12.5%` = `1250`
2.  **Validation:**
    *   On Assessment Publish: `SUM(Assessments.weight) MUST EQUAL 10000` (for the CA component).
    *   If `SUM != 10000`, Publish is rejected.
3.  **Calculation:**
    *   `Score = (RawScore / MaxMarks) * Weight`
    *   *Implementation:* `(Raw * Weight) / Max` (Do multiplication first to preserve precision).

## 4. State Machine Validation & Recovery

### Submission States
*   **PENDING:** Created on start.
*   **SUBMITTED:** File uploaded.
*   **PROCESSING:** Locked. Worker active.
    *   *Timeout:* If stuck > 30 mins, Cron Job resets to `SUBMITTED` + Alert.
*   **GRADED:** Final state.
*   **FLAGGED:** AI confused.
    *   *Resolution:* Lecturer Manual Grade -> Moves to `GRADED`.
*   **LATE:** Upload time > Deadline.
*   **MISSING:** Deadline passed, no upload.

### Concurrency Protection
*   **Double-Click Grading:**
    *   `UPDATE Quiz SET status='GRADING' WHERE id=X AND status='PUBLISHED'`
    *   If `rows=0`, request denied.
*   **Worker Idempotency:**
    *   Worker checks `Submission.status`. If `GRADED`, acts as no-op.

## 5. Enrollment & Visibility

*   **Duplicate Prevention:** `@@unique([userId, classId])` in DB.
*   **Code Validation:** Codes are globally unique.
*   **View Rules:**
    *   `ACTIVE`: Full Access.
    *   `ARCHIVED`: Read-Only.
    *   `DROPPED`: No Access (or minimal history).
