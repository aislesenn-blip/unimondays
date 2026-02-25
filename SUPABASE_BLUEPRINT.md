# National University - Supabase Production Blueprint

## Part 1: Architectural Breakdown

### 1. Database & Multi-Tenancy Strategy
The system uses a **Single Database, Logical Isolation** strategy on Supabase (PostgreSQL). Every operational table (Users, Classes, Quizzes, Submissions, Jobs) includes a `university_id` column that references the `universities` table. This ensures strict data segregation at the Row Level Security (RLS) layer.

### 2. Authentication & User Management
- **Supabase Auth** manages credentials (email/password, OAuth).
- A public `users` table extends `auth.users` via a 1-to-1 relationship on the `id` column.
- The `users` table stores application-specific profiles: `role` (ADMIN, LECTURER, STUDENT), `university_id`, `full_name`, and `quota`.
- **Triggers** automatically sync `auth.users` creation to `public.users`.

### 3. File Storage (Supabase Storage)
Two private buckets are required:
- `exam_pdfs`: Stores original student submissions and split parts.
  - Path structure: `{university_id}/{quiz_id}/{student_id}/{filename}`.
- `feedback_exports`: Stores generated ZIP files for bulk export.
  - Path structure: `{university_id}/exports/{job_id}/{filename}`.
- **Security:** Access is controlled via RLS policies on the `storage.objects` table, matching the user's `university_id`.

### 4. The AI Job Queue (Async Workers)
To handle heavy AI tasks (OCR, Grading) without timing out Vercel Serverless Functions:
- A `jobs` table acts as a persistent queue.
- **Status Enum:** `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`.
- **Concurrency Control:** Workers use `FOR UPDATE SKIP LOCKED` to fetch pending jobs atomically. This allows multiple Vercel workers (triggered via CRON or HTTP endpoints) to process the queue in parallel without race conditions.
- **Payload:** Stored as `JSONB` for flexibility (e.g., file paths, model configs).

### 5. Observability & Auditing
- `audit_logs` table tracks all sensitive actions (Grading, Flagging, User Access).
- RLS enforces `INSERT`-only access for regular users/apps. Only Admins can `SELECT`.
- Triggers automatically log changes to critical tables (e.g., `scores`).

---

## Part 2: The setup.sql Script

Copy and paste the following SQL into the Supabase SQL Editor.

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('ADMIN', 'LECTURER', 'STUDENT');
CREATE TYPE job_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE job_type AS ENUM ('OCR_SPLIT', 'AI_GRADE', 'EXPORT_ZIP');
CREATE TYPE submission_status AS ENUM ('PENDING', 'PROCESSING', 'GRADED', 'FLAGGED', 'LATE', 'MISSING');

-- 2. UNIVERSITIES (Tenant Root)
CREATE TABLE universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    domain TEXT UNIQUE, -- e.g. 'uon.ac.ke'
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. USERS (Extends auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    university_id UUID REFERENCES universities(id),
    role user_role DEFAULT 'STUDENT',
    tier TEXT DEFAULT 'Lite',
    quota INTEGER DEFAULT 100,
    used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 4. CLASSES
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    university_id UUID NOT NULL REFERENCES universities(id),
    lecturer_id UUID NOT NULL REFERENCES users(id),
    status TEXT DEFAULT 'ACTIVE',
    semester TEXT,
    mode TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 5. QUIZZES (Assessments)
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    university_id UUID NOT NULL REFERENCES universities(id),
    lecturer_id UUID NOT NULL REFERENCES users(id),
    class_id UUID REFERENCES classes(id),
    deadline TIMESTAMPTZ,
    status TEXT DEFAULT 'DRAFT',
    rubric TEXT,
    marking_scheme TEXT,
    strictness TEXT, -- 'LENIENT', 'MODERATE', 'STRICT'
    weight INTEGER DEFAULT 0,
    total_marks INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 6. SUBMISSIONS
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id),
    user_id UUID REFERENCES users(id), -- Nullable if legacy/unmatched
    university_id UUID NOT NULL REFERENCES universities(id),
    student_reg_no TEXT, -- Fallback
    student_name TEXT, -- Fallback
    file_path TEXT, -- Path in Storage
    ocr_text TEXT,
    status submission_status DEFAULT 'PENDING',
    feedback JSONB, -- AI Feedback
    confidence_score FLOAT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    group_id UUID, -- For group submissions
    group_snapshot JSONB, -- Snapshot of members at submission
    UNIQUE(quiz_id, user_id)
);

-- 7. SCORES
CREATE TABLE scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID UNIQUE NOT NULL REFERENCES submissions(id),
    total_marks FLOAT NOT NULL,
    breakdown JSONB NOT NULL, -- Question-wise breakdown
    remarks TEXT,
    is_overridden BOOLEAN DEFAULT FALSE,
    graded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. JOBS (Async Queue)
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type job_type NOT NULL,
    payload JSONB NOT NULL,
    status job_status DEFAULT 'PENDING',
    result JSONB,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    university_id UUID REFERENCES universities(id), -- Tenant Isolation
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- 9. AUDIT LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    university_id UUID REFERENCES universities(id),
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    severity TEXT DEFAULT 'INFO',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for Performance & RLS
CREATE INDEX idx_users_university ON users(university_id);
CREATE INDEX idx_classes_university ON classes(university_id);
CREATE INDEX idx_quizzes_university ON quizzes(university_id);
CREATE INDEX idx_submissions_university ON submissions(university_id);
CREATE INDEX idx_submissions_quiz ON submissions(quiz_id);
CREATE INDEX idx_jobs_status_type ON jobs(status, type);
CREATE INDEX idx_jobs_university ON jobs(university_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES (Examples)

-- Users: Read own profile. Admins/Lecturers read users in their university.
CREATE POLICY "Users view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Staff view university users" ON users FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.university_id = users.university_id AND u.role IN ('ADMIN', 'LECTURER'))
);

-- Classes: Read if in same university. Write if Lecturer/Admin.
CREATE POLICY "View classes in university" ON classes FOR SELECT USING (
    university_id = (SELECT university_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Staff manage classes" ON classes FOR ALL USING (
    university_id = (SELECT university_id FROM users WHERE id = auth.uid()) AND
    (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'LECTURER')
);

-- Jobs: Workers (Service Role) have full access. Users read nothing directly (usually).
-- Assuming Service Role bypasses RLS. For debugging, Admins can read.
CREATE POLICY "Admins view jobs" ON jobs FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
);

-- TRIGGERS
-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_classes_modtime BEFORE UPDATE ON classes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_jobs_modtime BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

```

---

## Part 3: Vercel Environment Variables (.env)

Configure these in your Vercel Project Settings.

```bash
# --- DATABASE (Supabase) ---
# Transaction Pooler (Port 6543) - Use for most queries (Prisma/Vercel)
DATABASE_URL="postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Session Pooler (Port 5432) - Use for migrations/direct connections
DIRECT_URL="postgres://postgres.[project-ref]:[password]@aws-0-[region].supabase.co:5432/postgres"

# --- SUPABASE AUTH & API ---
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[your-anon-key]"
SUPABASE_SERVICE_ROLE_KEY="[your-service-role-key]" # CRITICAL: Keep secret! Used by Workers.

# --- AI SERVICES ---
GEMINI_API_KEY="[your-gemini-key]"
DEEPSEEK_API_KEY="[your-deepseek-key]"

# --- APP CONFIG ---
NEXT_PUBLIC_APP_URL="https://your-domain.com"
NODE_ENV="production"
```

### Wiring Instructions
1.  **Supabase:** Run the `setup.sql` script in the SQL Editor.
2.  **Vercel:** Copy the `.env` content, replace placeholders with actual values from Supabase (Settings > API) and AI Providers.
3.  **Deploy:** Push code to Vercel. Ensure `prisma generate` runs during build (already in package.json).
