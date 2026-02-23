# System Architecture

## Overview
The "Playbook Ecosystem" is a high-performance, AI-powered assessment infrastructure designed for the Tanzanian and African education sector. It features a Dual-AI architecture (Gemini + DeepSeek) and is built on a pure Next.js stack optimized for Vercel Serverless deployment.

## Components

### 1. Frontend Layer
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Shadcn UI ("Luxury Minimal" Theme)
- **Key Pages**:
  - `src/app/page.tsx`: Landing Page
  - `src/app/dashboard/page.tsx`: Lecturer Interface (Upload, Analytics, HOD Summary)
  - `src/app/quiz/page.tsx`: Student Interface (Code Entry, Upload)

### 2. Backend Layer (Serverless)
- **API Routes**: `src/app/api/*`
- **Database**: SQLite (Dev) -> Supabase Postgres (Prod) via Prisma ORM.
- **File Handling**: `os.tmpdir()` for ephemeral processing; planned S3 integration for persistence.

### 3. AI Engine (Dual-Core)
- **The Eyes (OCR)**: Google Gemini 1.5 Flash (`src/lib/ai/gemini.ts`)
  - Handles handwritten text extraction, math formulas, and student ID detection.
- **The Brain (Reasoning)**: DeepSeek V3 (`src/lib/ai/deepseek.ts`)
  - Handles semantic grading, rubric application, anti-garbage validation, audit trails, and HOD summaries.

### 4. PDF Processing Engine
- **Library**: `pdf-lib` + `jszip`
- **Smart Collation**: `src/lib/pdf/collation.ts` splits bulk uploads into individual student dossiers based on detected IDs.
- **Reporting**: Generates PDF reports embedding original scripts and AI feedback.

## Infrastructure Diagram (Conceptual)
[Client (Web/Mobile)] -> [Vercel Edge Network] -> [Next.js API Routes]
                                      |
                                      v
                             [Prisma ORM] <-> [SQLite/Supabase]
                                      |
                                      v
                             [AI Service Layer]
                            /                  \
                    [Gemini 1.5]          [DeepSeek V3]
