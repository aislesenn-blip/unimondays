-- 1. Add instructions to quizzes
ALTER TABLE quizzes ADD COLUMN instructions TEXT;

-- 2. Create appeals table
CREATE TABLE appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id),
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    admin_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for appeals
CREATE INDEX idx_appeals_submission ON appeals(submission_id);

-- RLS for appeals (matching existing policies)
ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;

-- Students view their own appeals (via submission -> user)
CREATE POLICY "Users view own appeals" ON appeals FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM submissions s
        WHERE s.id = appeals.submission_id
        AND s.user_id = auth.uid()
    )
);

-- Staff view appeals for their university
CREATE POLICY "Staff view appeals" ON appeals FOR ALL USING (
    EXISTS (
        SELECT 1 FROM submissions s
        JOIN users u ON u.id = auth.uid()
        WHERE s.id = appeals.submission_id
        AND s.university_id = u.university_id
        AND u.role IN ('ADMIN', 'LECTURER')
    )
);
