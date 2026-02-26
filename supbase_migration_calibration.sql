-- Add gold_standard_url and calibration to work_sessions table
ALTER TABLE work_sessions ADD COLUMN IF NOT EXISTS gold_standard_url TEXT;
ALTER TABLE work_sessions ADD COLUMN IF NOT EXISTS calibration TEXT;

-- Add calibration_settings to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS calibration_settings TEXT;
