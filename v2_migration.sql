-- V2.0 Enterprise Migration Script

-- 1. Update Work Sessions Table
ALTER TABLE work_sessions ADD COLUMN IF NOT EXISTS strict_deadline BOOLEAN DEFAULT FALSE;
ALTER TABLE work_sessions ADD COLUMN IF NOT EXISTS are_grades_released BOOLEAN DEFAULT FALSE;
ALTER TABLE work_sessions ADD COLUMN IF NOT EXISTS include_in_calculation BOOLEAN DEFAULT TRUE;
ALTER TABLE work_sessions ADD COLUMN IF NOT EXISTS allow_appeals BOOLEAN DEFAULT FALSE;

-- 2. Update Scores Table
ALTER TABLE scores ADD COLUMN IF NOT EXISTS detected_identity TEXT;
