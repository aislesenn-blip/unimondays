-- 1. Create Tables

-- USERS Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'STUDENT', -- UserRole enum: 'STUDENT', 'LECTURER', 'ADMIN'
    tier TEXT DEFAULT 'Lite',
    quota INTEGER DEFAULT 100,
    used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- CLASSES Table
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    lecturer_id UUID NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    semester TEXT,
    mode TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_classes_lecturer FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- WORK SESSIONS Table (formerly Quizzes)
CREATE TABLE work_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    work_code TEXT UNIQUE NOT NULL,
    lecturer_id UUID NOT NULL,
    class_id UUID,
    deadline TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'DRAFT',
    rubric TEXT,
    rubric_url TEXT,
    marking_scheme TEXT,
    instructions TEXT,
    strictness TEXT, -- 'LENIENT', 'MODERATE', 'STRICT'
    total_marks INTEGER,
    release_mode TEXT DEFAULT 'MANUAL', -- 'AUTO', 'DEADLINE', 'MANUAL'
    type TEXT DEFAULT 'WORK_SESSION',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_work_sessions_lecturer FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_work_sessions_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- SUBMISSIONS Table
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_session_id UUID NOT NULL,
    user_id UUID, -- Nullable for unauthenticated/guest submissions if supported, but typically linked
    student_reg_no TEXT,
    student_name TEXT,
    file_path TEXT,
    ocr_text TEXT,
    status TEXT DEFAULT 'PENDING' NOT NULL, -- 'PENDING', 'GRADED', 'FAILED'
    feedback TEXT,
    confidence_score DOUBLE PRECISION,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    group_id TEXT,
    group_snapshot TEXT,
    CONSTRAINT fk_submissions_work_session FOREIGN KEY (work_session_id) REFERENCES work_sessions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_submissions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    UNIQUE(work_session_id, user_id)
);

CREATE INDEX idx_submissions_work_session_id ON submissions(work_session_id);

-- SCORES Table
CREATE TABLE scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID UNIQUE NOT NULL,
    total_marks DOUBLE PRECISION NOT NULL,
    breakdown TEXT NOT NULL, -- JSON string
    remarks TEXT,
    is_overridden BOOLEAN DEFAULT FALSE,
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_scores_submission FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- JOBS Table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- JobType enum
    payload TEXT NOT NULL, -- JSON string
    status TEXT DEFAULT 'PENDING' NOT NULL, -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
    result TEXT, -- JSON string
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_jobs_status_type ON jobs(status, type);

-- AUDIT LOGS Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    severity TEXT DEFAULT 'INFO',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- APPEALS Table
CREATE TABLE appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' NOT NULL, -- 'PENDING', 'APPROVED', 'REJECTED'
    admin_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_appeals_submission FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX idx_appeals_submission_id ON appeals(submission_id);
