-- Add appeal_deadline column to work_sessions
ALTER TABLE "work_sessions" ADD COLUMN "appeal_deadline" TIMESTAMP(3);

-- Add error_message column to bulk_sessions
ALTER TABLE "bulk_sessions" ADD COLUMN "error_message" TEXT;
