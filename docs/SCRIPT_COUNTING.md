# Script Counting & Quota Logic

## Principle: One Script = One Student Submission
The system counts usage based on the number of *unique student submissions* processed, regardless of page count.

## Logic Flow

1.  **Initial Check**: When a file is uploaded, verify the user has quota remaining (at least 1 script).
2.  **Increment on Upload**: Increment usage by 1 immediately to prevent spam.
3.  **Collation Adjustment**:
    -   If the uploaded file is a bulk PDF (e.g., 50 scripts), the system splits it.
    -   **CRITICAL**: The system must increment the user's usage by `(detected_scripts - 1)` after collation to accurately reflect the 50 total scripts.
    -   Currently, the implementation increments by 1 on initial upload. Future versions must implement the post-collation adjustment for accurate billing.

## Limitations
-   **Page Count**: Pages do not count against quota directly, but extremely large PDFs (1000+ pages) may hit system timeouts.
-   **Retries**: Re-processing a failed script does not consume additional quota (status check logic prevents duplicate increment).

## Monitoring
-   Usage is tracked in the `User` table: `quota` (limit) vs `used` (current consumption).
-   Visible to the user on the dashboard (future UI enhancement).
