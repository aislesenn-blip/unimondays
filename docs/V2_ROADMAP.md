# Playbook V2.0 Migration Roadmap

## Executive Summary
V2.0 aims to transition Playbook from a "Fragile MVP" to a durable, real-time, and scalable EdTech ecosystem. The focus is on eliminating grading dropouts, providing instant UI feedback, and modernizing the data layer for analytics.

## 1. Durable Queue (Inngest Integration)
**Goal:** Eliminate "Ghost Grading" and ensure 100% submission delivery.
**Current State:** Submissions rely on a fragile `fetch` trigger to Vercel Serverless functions. Timeouts or network blips cause data loss.
**Migration Plan:**
- **Install Inngest:** `npm install inngest`
- **Setup Client:** Create `src/lib/inngest/client.ts`.
- **Create Functions:** Move `src/workers/grading-worker.ts` logic into an Inngest function `src/inngest/functions/gradeSubmission.ts`.
- **Replace Trigger:** In `api/student/submit`, replace `fetch` with `inngest.send({ name: "grading/submission.created", data: { submissionId } })`.
- **Benefits:** Automatic retries (up to 24h), concurrency control, and durable execution logging.

## 2. Realtime Sync (Supabase Realtime)
**Goal:** Replace polling with "Apple-level" instant updates.
**Current State:** `LiveSubmissionTable.tsx` polls the API every 4 seconds. This is inefficient and feels "laggy".
**Migration Plan:**
- **Enable Realtime:** Turn on Realtime for `submissions` table in Supabase Dashboard.
- **Client Subscription:** In `LiveSubmissionTable`, use `supabase.channel('custom-all-channel').on('postgres_changes', ...)` to listen for UPDATE events on the `submissions` table.
- **Optimistic UI:** Immediately reflect status changes (PENDING -> GRADED) without a page refresh or poll delay.

## 3. UI Polish (Shadcn/Radix Adoption)
**Goal:** Professional, accessible, and consistent design system.
**Current State:** Mixed usage of raw HTML inputs and some Shadcn components.
**Migration Plan:**
- **Audit:** Identify all `<input>`, `<select>`, and raw buttons.
- **Replace:**
    - `<select>` -> `Select`, `SelectTrigger`, `SelectContent` (Shadcn).
    - `<input>` -> `Input` (Shadcn) with `Form` wrapper (React Hook Form).
    - Toasts -> Ensure `sonner` is used universally for success/error states.

## 4. Data Structure Evolution (JSONB Migration)
**Goal:** Enable deep analytics on educational outcomes.
**Current State:** `Submission.feedback` and `Score.breakdown` are stored as serialized strings. Querying "Which question did students fail most?" is impossible.
**Migration Plan:**
- **Schema Update:**
    ```prisma
    model Submission {
      ...
      feedback Json? // Migration from String
    }
    model Score {
      ...
      breakdown Json // Migration from String
    }
    ```
- **Migration Script:** Write a script to parse existing string data and update columns to JSONB.
- **Analytics:** Build a new "Class Insights" dashboard querying inside the JSONB structures.
