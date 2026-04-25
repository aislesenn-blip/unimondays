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
  USING ( auth.uid() = id );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING ( auth.uid() = id );

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

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
