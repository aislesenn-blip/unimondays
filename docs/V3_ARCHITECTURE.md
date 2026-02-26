# V3.0 Architecture: The "Hydraulic Press" Queue

## Overview
To handle massive bursts of traffic (e.g., 100k simultaneous submissions), V3.0 moves away from synchronous webhook processing to a robust **Database-Backed Job Queue**.

## Components

### 1. Ingestion Layer (`/api/student/submit`)
-   **Action:** Validates file, uploads to Storage.
-   **Queueing:** Creates a `Job` record in Prisma:
    ```json
    {
      "type": "AI_GRADE_SUBMISSION",
      "payload": { "submissionId": "..." },
      "status": "PENDING"
    }
    ```
-   **Trigger:** Sends a fire-and-forget request to `/api/queue/process` to wake up the worker.
-   **Response:** Returns `200 OK` immediately to the student.

### 2. Processing Layer (`/api/queue/process`)
-   **Mechanism:** Recursive Batch Processor.
-   **Logic:**
    1.  Fetches 5 `PENDING` jobs (FIFO).
    2.  Locks them (Optimistic locking via status update to `PROCESSING`).
    3.  Executes `handleAiGrade` (OCR + DeepSeek).
    4.  Updates Job status to `COMPLETED` or `FAILED`.
    5.  **Recursion:** If a full batch (5) was processed, it triggers itself again to process the next batch.
-   **Rate Limit Handling:** If DeepSeek returns a `429` error, the job is reset to `PENDING` with an incremented `retryCount`.

### 3. Monitoring
-   **Lecturer Dashboard:** The `LiveSubmissionTable` polls the submission status. Since the queue updates the `Submission` status, the lecturer sees "Grading in Progress..." until the queue worker finishes the job.

## Advantages
-   **Burst Tolerance:** Database absorbs the spike; worker processes at a safe, constant rate.
-   **Reliability:** No more timeouts from 60s serverless limits.
-   **Zero Data Loss:** Failed jobs are persisted for manual retry or auto-retry.
