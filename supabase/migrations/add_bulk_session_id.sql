ALTER TABLE work_sessions ADD COLUMN IF NOT EXISTS bulk_session_id TEXT REFERENCES bulk_sessions(id) ON DELETE SET NULL;
