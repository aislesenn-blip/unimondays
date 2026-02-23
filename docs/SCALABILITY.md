# Scalability Roadmap

## Current State (Phase 1)
- **Database**: SQLite (local dev).
- **Processing**: Single-instance Next.js API Routes.
- **File Storage**: Ephemeral `/tmp` + Local Disk.

## Phase 2 (Production Scale)
- **Database Migration**: Migrate to Supabase Postgres (managed, scalable).
- **Storage**: Integrate Supabase Storage or AWS S3 for persistent file handling.
- **Queue System**: Replace client-triggered async processing with a proper queue (e.g., BullMQ + Redis) running on a separate worker service.
  - This decouples upload from processing, preventing Vercel timeouts.

## Phase 3 (Global Scale)
- **CDN**: Serve static assets via Vercel Edge Network.
- **Regional Deployment**: Deploy API routes to regions closer to users (e.g., Africa, Europe).
- **Auth**: Implement Clerk or Supabase Auth for secure, scalable user management.
- **Rate Limiting**: Implement Upstash Redis for API rate limiting to protect AI quotas.

## Future Enhancements
- **LMS Integration**: Webhooks for Canvas/Moodle grade syncing.
- **Mobile App**: React Native app consuming the same API for offline-first grading.
