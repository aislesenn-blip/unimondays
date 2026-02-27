
-- 11. BULK SESSIONS (New Cloud Marking Feature)
CREATE TABLE "bulk_sessions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cloud_link" TEXT NOT NULL,
    "lecturer_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "total_files" INTEGER DEFAULT 0,
    "processed_files" INTEGER DEFAULT 0,
    "marking_scheme" TEXT,
    "gold_standard_url" TEXT,
    "calibration" TEXT,
    "total_marks" INTEGER DEFAULT 100,
    "success_count" INTEGER DEFAULT 0,
    "unidentified_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_sessions_pkey" PRIMARY KEY ("id")
);

-- Add relation to users
ALTER TABLE "bulk_sessions" ADD CONSTRAINT "bulk_sessions_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add bulkSessionId to WorkSession
ALTER TABLE "work_sessions" ADD COLUMN "bulk_session_id" TEXT;
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_bulk_session_id_fkey" FOREIGN KEY ("bulk_session_id") REFERENCES "bulk_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
