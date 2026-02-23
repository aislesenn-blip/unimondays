# API Documentation

## Base URL
`http://localhost:8000/api`

## Endpoints

### 1. Upload Scripts
`POST /upload`
-   **Params**: `file` (UploadFile).
-   **Content-Type**: `multipart/form-data`.
-   **Description**:
    -   Handles multi-page PDF upload.
    -   Triggers `ScriptCollator` to separate scripts by Student ID.
    -   Returns processing status and created Submission IDs.
-   **Response**:
    ```json
    {
      "message": "Processed PDF",
      "scripts_count": 5,
      "submissions": [1, 2, 3, 4, 5]
    }
    ```

### 2. Grade Submission
`POST /grade/{submission_id}`
-   **Params**: `submission_id` (Path), `rubric` (Query/Body).
-   **Description**:
    -   Triggers DeepSeek grading logic.
    -   Validates content (Anti-Garbage).
    -   Stores `Score` with breakdown and `confidence_score`.
-   **Response**:
    ```json
    {
      "total_marks": 85.0,
      "breakdown": [...],
      "remarks": "Strong conceptual understanding...",
      "confidence_score": 98.0
    }
    ```

### 3. Get Results
`GET /results`
-   **Description**: Returns list of all submissions and their scores.
-   **Response**: `[SubmissionObject, ...]`

### 4. Chat
`POST /chat`
-   **Params**: `query` (Query Param for now).
-   **Description**:
    -   Fetches recent submission data context.
    -   Calls DeepSeek Chat to answer user query.
-   **Response**:
    ```json
    {
      "response": "Based on recent results, Student A is struggling with..."
    }
    ```

## Models (Simplified)

### Submission
-   `id`: Int
-   `student_reg_no`: String
-   `status`: 'pending', 'processing', 'graded', 'flagged'

### Score
-   `total_marks`: Float
-   `breakdown`: JSON
-   `audit_trail`: JSON
