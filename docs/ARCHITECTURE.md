# Playbook Ecosystem Architecture

## Overview
Playbook Ecosystem is a dual-interface platform for academic assessment:
1.  **Student Account**: Freemium access for students to take quizzes/upload scripts.
2.  **Playbook (Lecturer)**: Paid tier for lecturers to manage assessments, grade with AI, and view analytics.

## Tech Stack
-   **Frontend**: Next.js 14+ (App Router), Tailwind CSS v4, Lucide React.
-   **Backend**: Python FastAPI (Async), SQLAlchemy (SQLite/Postgres).
-   **AI Engine**:
    -   **Vision/OCR**: Google Gemini 1.5 Flash (via `google-generativeai`).
    -   **Reasoning/Grading**: DeepSeek V3 (via OpenAI client).
-   **Database**: SQLite (Dev) -> Supabase (Prod).

## Core Modules

### 1. Hybrid AI Engine
-   **Gemini Service**: Handles OCR and "Smart Collation" of 1000-page PDFs.
-   **DeepSeek Service**: Handles semantic grading, "Anti-Garbage" validation, and Omniscient Chat.

### 2. Backend Services
-   `ScriptCollator`: Orchestrates PDF splitting and student ID detection.
-   `DeepSeekService`: Grades submission against rubric and validates content.

### 3. Frontend Architecture
-   **Dashboard**: Real-time analytics and script management.
-   **Quiz Portal**: Student entry point for code validation and upload.
-   **Components**: Reusable UI components (Shadcn-like) in `src/components/ui`.

## Data Flow
1.  **Upload**: Lecturer/Student uploads PDF/Image -> Backend (`/api/upload`).
2.  **Collation**: `ScriptCollator` splits PDF by student ID using Gemini.
3.  **Storage**: Submissions stored in DB with status "processing".
4.  **Grading**: Asynchronous job (triggered via API for now) calls DeepSeek to grade text.
5.  **Analytics**: Dashboard fetches results via `/api/results`.
6.  **Chat**: Lecturer queries system via `/api/chat`, context-injected with recent grades.

## File Structure
-   `frontend/`: Next.js application.
-   `backend/`: FastAPI application.
-   `docs/`: Documentation.
