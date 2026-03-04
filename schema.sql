-- Create Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'STUDENT',
    tier TEXT DEFAULT 'Lite',
    quota INTEGER DEFAULT 100,
    used INTEGER DEFAULT 0,
    calibration_settings TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_users_email ON users(email);

-- Create Classes Table
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    lecturer_id UUID NOT NULL REFERENCES users(id),
    status TEXT DEFAULT 'ACTIVE',
    semester TEXT,
    mode TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_classes_lecturer_id ON classes(lecturer_id);

-- Create Bulk Sessions Table
CREATE TABLE bulk_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    cloud_link TEXT NOT NULL,
    lecturer_id UUID NOT NULL REFERENCES users(id),
    status TEXT DEFAULT 'PENDING',
    total_files INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    marking_scheme TEXT,
    gold_standard_url TEXT,
    question_paper_url TEXT,
    calibration TEXT,
    total_marks INTEGER DEFAULT 100,
    success_count INTEGER DEFAULT 0,
    unidentified_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_bulk_sessions_lecturer_id ON bulk_sessions(lecturer_id);
CREATE INDEX idx_bulk_sessions_status ON bulk_sessions(status);

-- Create Standardized Rubrics Table
CREATE TABLE standardized_rubrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecturer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_title TEXT NOT NULL,
    course_code TEXT NOT NULL,
    exam_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_marks DOUBLE PRECISION NOT NULL,
    number_of_questions INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_standardized_rubrics_lecturer_id ON standardized_rubrics(lecturer_id);

-- Create Work Sessions Table
CREATE TABLE work_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    work_code TEXT UNIQUE NOT NULL,
    lecturer_id UUID NOT NULL REFERENCES users(id),
    class_id UUID REFERENCES classes(id),
    deadline TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'DRAFT',
    rubric TEXT,
    rubric_url TEXT,
    marking_scheme TEXT,
    gold_standard_url TEXT,
    question_paper_url TEXT,
    instructions TEXT,
    calibration TEXT,
    strictness TEXT,
    total_marks INTEGER,
    release_mode TEXT DEFAULT 'MANUAL',
    bulk_session_id UUID REFERENCES bulk_sessions(id),
    standardized_rubric_id UUID REFERENCES standardized_rubrics(id),
    strict_deadline BOOLEAN DEFAULT false,
    are_grades_released BOOLEAN DEFAULT false,
    include_in_calculation BOOLEAN DEFAULT true,
    allow_appeals BOOLEAN DEFAULT false,
    appeal_deadline TIMESTAMP WITH TIME ZONE,
    confidence_threshold INTEGER DEFAULT 85,
    type TEXT DEFAULT 'WORK_SESSION',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_work_sessions_class_id ON work_sessions(class_id);
CREATE INDEX idx_work_sessions_lecturer_id ON work_sessions(lecturer_id);
CREATE INDEX idx_work_sessions_bulk_session_id ON work_sessions(bulk_session_id);
CREATE INDEX idx_work_sessions_standardized_rubric_id ON work_sessions(standardized_rubric_id);

-- Create Submissions Table
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_session_id UUID NOT NULL REFERENCES work_sessions(id),
    user_id UUID REFERENCES users(id),
    student_reg_no TEXT,
    student_name TEXT,
    file_path TEXT,
    ocr_text TEXT,
    status TEXT DEFAULT 'PENDING',
    feedback TEXT,
    confidence_score DOUBLE PRECISION,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(work_session_id, user_id)
);
CREATE INDEX idx_submissions_work_session_id ON submissions(work_session_id);
CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_student_reg_no ON submissions(student_reg_no);

-- Create Scores Table
CREATE TABLE scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID UNIQUE NOT NULL REFERENCES submissions(id),
    total_marks DOUBLE PRECISION NOT NULL,
    breakdown TEXT NOT NULL,
    remarks TEXT,
    student_remarks TEXT,
    teacher_remarks TEXT,
    detected_identity TEXT,
    is_overridden BOOLEAN DEFAULT false,
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Student Concept Results Table
CREATE TABLE student_concept_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    score_id UUID NOT NULL REFERENCES scores(id) ON DELETE CASCADE,
    concept_id TEXT NOT NULL,
    status TEXT NOT NULL,
    awarded_marks DOUBLE PRECISION NOT NULL,
    reasoning TEXT NOT NULL
);
CREATE INDEX idx_student_concept_results_score_id ON student_concept_results(score_id);

-- Create Jobs Table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    result TEXT,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_jobs_status_type ON jobs(status, type);

-- Create Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    severity TEXT DEFAULT 'INFO',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Appeals Table
CREATE TABLE appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id),
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    admin_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_appeals_submission_id ON appeals(submission_id);

-- Create Rubric Questions Table
CREATE TABLE rubric_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standardized_rubric_id UUID NOT NULL REFERENCES standardized_rubrics(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    question_text TEXT NOT NULL,
    marks_allocated DOUBLE PRECISION NOT NULL,
    question_type TEXT NOT NULL,
    learning_objective TEXT NOT NULL,
    mcq_options TEXT
);
CREATE INDEX idx_rubric_questions_standardized_rubric_id ON rubric_questions(standardized_rubric_id);

-- Create Concept Units Table
CREATE TABLE concept_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rubric_question_id UUID NOT NULL REFERENCES rubric_questions(id) ON DELETE CASCADE,
    concept_id TEXT NOT NULL,
    concept_text TEXT NOT NULL,
    marks DOUBLE PRECISION NOT NULL,
    partial_rule TEXT
);
CREATE INDEX idx_concept_units_rubric_question_id ON concept_units(rubric_question_id);

-- Create Evaluation Tiers Table
CREATE TABLE evaluation_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rubric_question_id UUID NOT NULL REFERENCES rubric_questions(id) ON DELETE CASCADE,
    tier_name TEXT NOT NULL,
    description TEXT NOT NULL
);
CREATE INDEX idx_evaluation_tiers_rubric_question_id ON evaluation_tiers(rubric_question_id);

-- Create Out of Scope Rules Table
CREATE TABLE out_of_scope_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rubric_question_id UUID NOT NULL REFERENCES rubric_questions(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    max_marks DOUBLE PRECISION NOT NULL
);
CREATE INDEX idx_out_of_scope_rules_rubric_question_id ON out_of_scope_rules(rubric_question_id);

-- Create Penalty Rules Table
CREATE TABLE penalty_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rubric_question_id UUID NOT NULL REFERENCES rubric_questions(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    deduct DOUBLE PRECISION NOT NULL
);
CREATE INDEX idx_penalty_rules_rubric_question_id ON penalty_rules(rubric_question_id);
