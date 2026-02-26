-- CreateTable
CREATE TABLE "universities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "code" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "university_id" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "tier" TEXT DEFAULT 'Lite',
    "quota" INTEGER DEFAULT 100,
    "used" INTEGER DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" DATETIME,
    CONSTRAINT "users_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "university_id" TEXT NOT NULL,
    "lecturer_id" TEXT NOT NULL,
    "status" TEXT DEFAULT 'ACTIVE',
    "semester" TEXT,
    "mode" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" DATETIME,
    CONSTRAINT "classes_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "classes_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "work_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "work_code" TEXT NOT NULL,
    "university_id" TEXT NOT NULL,
    "lecturer_id" TEXT NOT NULL,
    "class_id" TEXT,
    "deadline" DATETIME,
    "status" TEXT DEFAULT 'DRAFT',
    "rubric" TEXT,
    "rubric_url" TEXT,
    "marking_scheme" TEXT,
    "instructions" TEXT,
    "strictness" TEXT,
    "total_marks" INTEGER,
    "release_mode" TEXT DEFAULT 'MANUAL',
    "type" TEXT DEFAULT 'WORK_SESSION',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" DATETIME,
    CONSTRAINT "work_sessions_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "work_sessions_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "work_sessions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "work_session_id" TEXT NOT NULL,
    "user_id" TEXT,
    "university_id" TEXT NOT NULL,
    "student_reg_no" TEXT,
    "student_name" TEXT,
    "file_path" TEXT,
    "ocr_text" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT,
    "confidence_score" REAL,
    "submitted_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" DATETIME,
    "group_id" TEXT,
    "group_snapshot" TEXT,
    CONSTRAINT "submissions_work_session_id_fkey" FOREIGN KEY ("work_session_id") REFERENCES "work_sessions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "submissions_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submission_id" TEXT NOT NULL,
    "total_marks" REAL NOT NULL,
    "breakdown" TEXT NOT NULL,
    "remarks" TEXT,
    "is_overridden" BOOLEAN DEFAULT false,
    "graded_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scores_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "result" TEXT,
    "error" TEXT,
    "retry_count" INTEGER DEFAULT 0,
    "university_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" DATETIME,
    CONSTRAINT "jobs_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "university_id" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ip_address" TEXT,
    "severity" TEXT DEFAULT 'INFO',
    "timestamp" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "appeals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submission_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "admin_comment" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appeals_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "universities_domain_key" ON "universities"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "universities_code_key" ON "universities"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_university_id_idx" ON "users"("university_id");

-- CreateIndex
CREATE UNIQUE INDEX "classes_code_key" ON "classes"("code");

-- CreateIndex
CREATE INDEX "classes_university_id_idx" ON "classes"("university_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_sessions_work_code_key" ON "work_sessions"("work_code");

-- CreateIndex
CREATE INDEX "work_sessions_university_id_idx" ON "work_sessions"("university_id");

-- CreateIndex
CREATE INDEX "submissions_university_id_idx" ON "submissions"("university_id");

-- CreateIndex
CREATE INDEX "submissions_work_session_id_idx" ON "submissions"("work_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_work_session_id_user_id_key" ON "submissions"("work_session_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scores_submission_id_key" ON "scores"("submission_id");

-- CreateIndex
CREATE INDEX "jobs_status_type_idx" ON "jobs"("status", "type");

-- CreateIndex
CREATE INDEX "jobs_university_id_idx" ON "jobs"("university_id");

-- CreateIndex
CREATE INDEX "appeals_submission_id_idx" ON "appeals"("submission_id");
