-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "tier" TEXT DEFAULT 'Lite',
    "quota" INTEGER DEFAULT 100,
    "used" INTEGER DEFAULT 0,
    "calibration_settings" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "lecturer_id" TEXT NOT NULL,
    "status" TEXT DEFAULT 'ACTIVE',
    "semester" TEXT,
    "mode" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_sessions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "work_code" TEXT NOT NULL,
    "lecturer_id" TEXT NOT NULL,
    "class_id" TEXT,
    "deadline" TIMESTAMP(3),
    "status" TEXT DEFAULT 'DRAFT',
    "rubric" TEXT,
    "rubric_url" TEXT,
    "marking_scheme" TEXT,
    "gold_standard_url" TEXT,
    "instructions" TEXT,
    "calibration" TEXT,
    "strictness" TEXT,
    "total_marks" INTEGER,
    "release_mode" TEXT DEFAULT 'MANUAL',
    "bulk_session_id" TEXT,
    "strict_deadline" BOOLEAN DEFAULT false,
    "are_grades_released" BOOLEAN DEFAULT false,
    "include_in_calculation" BOOLEAN DEFAULT true,
    "allow_appeals" BOOLEAN DEFAULT false,
    "appeal_deadline" TIMESTAMP(3),
    "confidence_threshold" INTEGER DEFAULT 85,
    "type" TEXT DEFAULT 'WORK_SESSION',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "work_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "work_session_id" TEXT NOT NULL,
    "user_id" TEXT,
    "student_reg_no" TEXT,
    "student_name" TEXT,
    "file_path" TEXT,
    "ocr_text" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalChunks" INTEGER NOT NULL DEFAULT 0,
    "processedChunks" INTEGER NOT NULL DEFAULT 0,
    "extractedData" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "feedback" TEXT,
    "confidence_score" DOUBLE PRECISION,
    "submitted_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracted_chunks" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "pages" INTEGER[],
    "text" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extracted_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "total_marks" DOUBLE PRECISION NOT NULL,
    "breakdown" TEXT NOT NULL,
    "remarks" TEXT,
    "detected_identity" TEXT,
    "is_overridden" BOOLEAN DEFAULT false,
    "graded_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "result" TEXT,
    "error" TEXT,
    "retry_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ip_address" TEXT,
    "severity" TEXT DEFAULT 'INFO',
    "timestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appeals" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "admin_comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appeals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "classes_code_key" ON "classes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "work_sessions_work_code_key" ON "work_sessions"("work_code");

-- CreateIndex
CREATE INDEX "submissions_work_session_id_idx" ON "submissions"("work_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_work_session_id_user_id_key" ON "submissions"("work_session_id", "user_id");

-- CreateIndex
CREATE INDEX "extracted_chunks_submission_id_idx" ON "extracted_chunks"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "extracted_chunks_submission_id_chunk_index_key" ON "extracted_chunks"("submission_id", "chunk_index");

-- CreateIndex
CREATE UNIQUE INDEX "scores_submission_id_key" ON "scores"("submission_id");

-- CreateIndex
CREATE INDEX "jobs_status_type_idx" ON "jobs"("status", "type");

-- CreateIndex
CREATE INDEX "appeals_submission_id_idx" ON "appeals"("submission_id");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_bulk_session_id_fkey" FOREIGN KEY ("bulk_session_id") REFERENCES "bulk_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_work_session_id_fkey" FOREIGN KEY ("work_session_id") REFERENCES "work_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_chunks" ADD CONSTRAINT "extracted_chunks_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_sessions" ADD CONSTRAINT "bulk_sessions_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ======================================================================================
-- SUPABASE FRESH SETUP SQL
-- This file configures a brand new Supabase instance for the Playbook V5.5 Ecosystem.
-- Note: Table structures are handled by Prisma (run `npx prisma db push` before this).
-- This script handles Auth Triggers, Storage Buckets, and Row Level Security (RLS).
-- ======================================================================================

-- 1. AUTH TRIGGER (Automatically mirror Auth users to Public Users table)
-- This ensures that when a user signs up via Supabase Auth, they exist in the Prisma `users` table.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, tier, quota)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'LECTURER', -- Default role
    'Lite',
    100
  )
  ON CONFLICT (id) DO NOTHING; -- Avoid errors if Prisma's upsert in API runs first
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ======================================================================================
-- 2. STORAGE BUCKETS
-- Create buckets for Exam PDFs and Feedback Exports
-- ======================================================================================

-- Create 'exam_pdfs' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('exam_pdfs', 'exam_pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Create 'feedback_exports' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback_exports', 'feedback_exports', false)
ON CONFLICT (id) DO NOTHING;

-- ======================================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- Secure the database and storage objects so users only see their own data.
-- ======================================================================================

-- Enable RLS on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow users to view only their own user record
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING ( auth.uid()::text = id );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING ( auth.uid()::text = id );

-- Allow authenticated users to upload files to exam_pdfs
-- Allow users to upload their own files to exam_pdfs
CREATE POLICY "Allow users to upload own files to exam_pdfs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'exam_pdfs'
    AND auth.role() = 'authenticated'
    AND auth.uid() = owner
  );

-- Allow users to read only their own files from exam_pdfs
CREATE POLICY "Allow users to read own files from exam_pdfs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'exam_pdfs'
    AND auth.role() = 'authenticated'
    AND auth.uid() = owner
  );

-- Allow users to upload their own files to feedback_exports
CREATE POLICY "Allow users to upload own files to feedback_exports"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'feedback_exports'
    AND auth.role() = 'authenticated'
    AND auth.uid() = owner
  );

-- Allow users to read only their own files from feedback_exports
CREATE POLICY "Allow users to read own files from feedback_exports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'feedback_exports'
    AND auth.role() = 'authenticated'
    AND auth.uid() = owner
  );

-- Allow users to delete only their own files from specific buckets
CREATE POLICY "Allow users to delete own files"
  ON storage.objects FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND auth.uid() = owner
    AND bucket_id IN ('exam_pdfs', 'feedback_exports')
  );

-- ======================================================================================
-- SETUP COMPLETE
-- ======================================================================================
