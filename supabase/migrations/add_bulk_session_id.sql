CREATE TABLE IF NOT EXISTS bulk_sessions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  cloud_link TEXT,
  lecturer_id TEXT REFERENCES users(id),
  status TEXT DEFAULT 'PENDING',
  total_files INTEGER DEFAULT 0,
  processed_files INTEGER DEFAULT 0,
  marking_scheme TEXT,
  gold_standard_url TEXT,
  calibration TEXT,
  total_marks INTEGER DEFAULT 100,
  success_count INTEGER DEFAULT 0,
  unidentified_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE work_sessions ADD COLUMN IF NOT EXISTS bulk_session_id TEXT REFERENCES bulk_sessions(id) ON DELETE SET NULL;
