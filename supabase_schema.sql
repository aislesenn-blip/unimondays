-- Supabase PostgreSQL Schema for Playbook
-- Strictly aligned with enterprise production build

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Table (Lecturers and Students via Clerk sync)
CREATE TABLE IF NOT EXISTS "User" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "clerkId" TEXT UNIQUE NOT NULL,
    "email" TEXT UNIQUE NOT NULL,
    "fullName" TEXT,
    "institutionName" TEXT,
    "isAdmin" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Class Table
CREATE TABLE IF NOT EXISTS "Class" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "code" TEXT UNIQUE NOT NULL,
    "lecturerId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_class_lecturer ON "Class"("lecturerId");

-- 3. Enrollment Table (Join table for Students and Classes)
CREATE TABLE IF NOT EXISTS "Enrollment" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "studentId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "classId" UUID NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE("studentId", "classId")
);
CREATE INDEX idx_enrollment_class ON "Enrollment"("classId");

-- 4. Rubric Table
CREATE TABLE IF NOT EXISTS "Rubric" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "creatorId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "standardizedJson" JSONB NOT NULL,
    "maxScore" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_rubric_creator ON "Rubric"("creatorId");

-- 5. WorkSession Table
CREATE TABLE IF NOT EXISTS "WorkSession" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "classId" UUID NOT NULL REFERENCES "Class"("id") ON DELETE CASCADE,
    "lecturerId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "rubricId" UUID NOT NULL REFERENCES "Rubric"("id") ON DELETE RESTRICT,
    "workCode" TEXT UNIQUE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'GRADING', 'COMPLETED', 'ARCHIVED')),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_worksession_class ON "WorkSession"("classId");
CREATE INDEX idx_worksession_code ON "WorkSession"("workCode");

-- 6. Submission Table
CREATE TABLE IF NOT EXISTS "Submission" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "studentId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "workSessionId" UUID NOT NULL REFERENCES "WorkSession"("id") ON DELETE CASCADE,
    "fileUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING', 'GRADED', 'FAILED')),
    "submittedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE("studentId", "workSessionId")
);
CREATE INDEX idx_submission_worksession ON "Submission"("workSessionId");
CREATE INDEX idx_submission_status ON "Submission"("status");

-- 7. Score Table
CREATE TABLE IF NOT EXISTS "Score" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "submissionId" UUID UNIQUE NOT NULL REFERENCES "Submission"("id") ON DELETE CASCADE,
    "totalScore" DECIMAL(10,2) NOT NULL,
    "breakdown" JSONB NOT NULL, -- The granular JSON breakdown from AI
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_score_submission ON "Score"("submissionId");

-- RLS (Row Level Security) - Basic setup for standard operations
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Class" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rubric" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Submission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Score" ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be defined based on the specific Supabase authentication flow
-- being used (e.g., matching auth.uid() with the respective user fields).
