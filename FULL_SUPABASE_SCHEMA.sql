-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "tier" TEXT DEFAULT 'Lite',
    "quota" INTEGER DEFAULT 100,
    "used" INTEGER DEFAULT 0,
    "calibration_settings" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "lecturer_id" TEXT NOT NULL,
    "status" TEXT DEFAULT 'ACTIVE',
    "semester" TEXT,
    "mode" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_sessions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "work_code" TEXT NOT NULL,
    "lecturer_id" TEXT NOT NULL,
    "class_id" TEXT,
    "deadline" TIMESTAMP(3),
    "status" TEXT DEFAULT 'DRAFT',
    "rubric" TEXT,
    "rubric_url" TEXT,
    "marking_scheme" TEXT,
    "gold_standard_url" TEXT,
    "question_paper_url" TEXT,
    "instructions" TEXT,
    "calibration" TEXT,
    "strictness" TEXT,
    "total_marks" INTEGER,
    "release_mode" TEXT DEFAULT 'MANUAL',
    "bulk_session_id" TEXT,
    "standardized_rubric_id" TEXT,
    "strict_deadline" BOOLEAN DEFAULT false,
    "are_grades_released" BOOLEAN DEFAULT false,
    "include_in_calculation" BOOLEAN DEFAULT true,
    "allow_appeals" BOOLEAN DEFAULT false,
    "appeal_deadline" TIMESTAMP(3),
    "confidence_threshold" INTEGER DEFAULT 85,
    "type" TEXT DEFAULT 'WORK_SESSION',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "work_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "work_session_id" TEXT NOT NULL,
    "user_id" TEXT,
    "student_reg_no" TEXT,
    "student_name" TEXT,
    "file_path" TEXT,
    "ocr_text" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT,
    "confidence_score" DOUBLE PRECISION,
    "submitted_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "total_marks" DOUBLE PRECISION NOT NULL,
    "breakdown" TEXT NOT NULL,
    "remarks" TEXT,
    "student_remarks" TEXT,
    "teacher_remarks" TEXT,
    "detected_identity" TEXT,
    "is_overridden" BOOLEAN DEFAULT false,
    "graded_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_concept_results" (
    "id" TEXT NOT NULL,
    "score_id" TEXT NOT NULL,
    "concept_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "awarded_marks" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,

    CONSTRAINT "student_concept_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "result" TEXT,
    "error" TEXT,
    "retry_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ip_address" TEXT,
    "severity" TEXT DEFAULT 'INFO',
    "timestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appeals" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "admin_comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appeals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_sessions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cloud_link" TEXT NOT NULL,
    "lecturer_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "total_files" INTEGER DEFAULT 0,
    "processed_files" INTEGER DEFAULT 0,
    "marking_scheme" TEXT,
    "gold_standard_url" TEXT,
    "question_paper_url" TEXT,
    "calibration" TEXT,
    "total_marks" INTEGER DEFAULT 100,
    "success_count" INTEGER DEFAULT 0,
    "unidentified_count" INTEGER DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standardized_rubrics" (
    "id" TEXT NOT NULL,
    "lecturer_id" TEXT NOT NULL,
    "exam_title" TEXT NOT NULL,
    "course_code" TEXT NOT NULL,
    "exam_date" TIMESTAMP(3) NOT NULL,
    "total_marks" DOUBLE PRECISION NOT NULL,
    "number_of_questions" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "standardized_rubrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rubric_questions" (
    "id" TEXT NOT NULL,
    "standardized_rubric_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "marks_allocated" DOUBLE PRECISION NOT NULL,
    "question_type" TEXT NOT NULL,
    "learning_objective" TEXT NOT NULL,
    "mcq_options" TEXT,

    CONSTRAINT "rubric_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_units" (
    "id" TEXT NOT NULL,
    "rubric_question_id" TEXT NOT NULL,
    "concept_id" TEXT NOT NULL,
    "concept_text" TEXT NOT NULL,
    "marks" DOUBLE PRECISION NOT NULL,
    "partial_rule" TEXT,

    CONSTRAINT "concept_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_tiers" (
    "id" TEXT NOT NULL,
    "rubric_question_id" TEXT NOT NULL,
    "tier_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "evaluation_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "out_of_scope_rules" (
    "id" TEXT NOT NULL,
    "rubric_question_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "max_marks" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "out_of_scope_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penalty_rules" (
    "id" TEXT NOT NULL,
    "rubric_question_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "deduct" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "penalty_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "classes_code_key" ON "classes"("code");

-- CreateIndex
CREATE INDEX "classes_lecturer_id_idx" ON "classes"("lecturer_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_sessions_work_code_key" ON "work_sessions"("work_code");

-- CreateIndex
CREATE INDEX "work_sessions_class_id_idx" ON "work_sessions"("class_id");

-- CreateIndex
CREATE INDEX "work_sessions_lecturer_id_idx" ON "work_sessions"("lecturer_id");

-- CreateIndex
CREATE INDEX "work_sessions_bulk_session_id_idx" ON "work_sessions"("bulk_session_id");

-- CreateIndex
CREATE INDEX "work_sessions_standardized_rubric_id_idx" ON "work_sessions"("standardized_rubric_id");

-- CreateIndex
CREATE INDEX "submissions_work_session_id_idx" ON "submissions"("work_session_id");

-- CreateIndex
CREATE INDEX "submissions_user_id_idx" ON "submissions"("user_id");

-- CreateIndex
CREATE INDEX "submissions_status_idx" ON "submissions"("status");

-- CreateIndex
CREATE INDEX "submissions_student_reg_no_idx" ON "submissions"("student_reg_no");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_work_session_id_user_id_key" ON "submissions"("work_session_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scores_submission_id_key" ON "scores"("submission_id");

-- CreateIndex
CREATE INDEX "student_concept_results_score_id_idx" ON "student_concept_results"("score_id");

-- CreateIndex
CREATE INDEX "jobs_status_type_idx" ON "jobs"("status", "type");

-- CreateIndex
CREATE INDEX "appeals_submission_id_idx" ON "appeals"("submission_id");

-- CreateIndex
CREATE INDEX "bulk_sessions_lecturer_id_idx" ON "bulk_sessions"("lecturer_id");

-- CreateIndex
CREATE INDEX "bulk_sessions_status_idx" ON "bulk_sessions"("status");

-- CreateIndex
CREATE INDEX "standardized_rubrics_lecturer_id_idx" ON "standardized_rubrics"("lecturer_id");

-- CreateIndex
CREATE INDEX "rubric_questions_standardized_rubric_id_idx" ON "rubric_questions"("standardized_rubric_id");

-- CreateIndex
CREATE INDEX "concept_units_rubric_question_id_idx" ON "concept_units"("rubric_question_id");

-- CreateIndex
CREATE INDEX "evaluation_tiers_rubric_question_id_idx" ON "evaluation_tiers"("rubric_question_id");

-- CreateIndex
CREATE INDEX "out_of_scope_rules_rubric_question_id_idx" ON "out_of_scope_rules"("rubric_question_id");

-- CreateIndex
CREATE INDEX "penalty_rules_rubric_question_id_idx" ON "penalty_rules"("rubric_question_id");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_bulk_session_id_fkey" FOREIGN KEY ("bulk_session_id") REFERENCES "bulk_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_standardized_rubric_id_fkey" FOREIGN KEY ("standardized_rubric_id") REFERENCES "standardized_rubrics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_work_session_id_fkey" FOREIGN KEY ("work_session_id") REFERENCES "work_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_concept_results" ADD CONSTRAINT "student_concept_results_score_id_fkey" FOREIGN KEY ("score_id") REFERENCES "scores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_sessions" ADD CONSTRAINT "bulk_sessions_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standardized_rubrics" ADD CONSTRAINT "standardized_rubrics_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rubric_questions" ADD CONSTRAINT "rubric_questions_standardized_rubric_id_fkey" FOREIGN KEY ("standardized_rubric_id") REFERENCES "standardized_rubrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_units" ADD CONSTRAINT "concept_units_rubric_question_id_fkey" FOREIGN KEY ("rubric_question_id") REFERENCES "rubric_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_tiers" ADD CONSTRAINT "evaluation_tiers_rubric_question_id_fkey" FOREIGN KEY ("rubric_question_id") REFERENCES "rubric_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "out_of_scope_rules" ADD CONSTRAINT "out_of_scope_rules_rubric_question_id_fkey" FOREIGN KEY ("rubric_question_id") REFERENCES "rubric_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalty_rules" ADD CONSTRAINT "penalty_rules_rubric_question_id_fkey" FOREIGN KEY ("rubric_question_id") REFERENCES "rubric_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
