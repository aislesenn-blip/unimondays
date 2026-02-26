ALTER TABLE work_sessions ADD COLUMN IF NOT EXISTS confidence_threshold INTEGER DEFAULT 85;
