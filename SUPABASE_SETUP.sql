-- ==============================================================================
-- SUPABASE SETUP SCRIPT
-- ==============================================================================
-- RUN THIS SCRIPT IN THE SUPABASE SQL EDITOR TO CONFIGURE AUTH, RLS, AND STORAGE.

-- 1. AUTH TRIGGER: Sync Supabase Auth to Public User Table
-- This ensures that when a user signs up via Supabase Auth, they exist in your public schema.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'LECTURER' -- Default role, can be adjusted or passed via metadata
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. ENABLE ROW LEVEL SECURITY (RLS)
alter table public.users enable row level security;
alter table public.classes enable row level security;
alter table public.work_sessions enable row level security;
alter table public.submissions enable row level security;

-- 3. RLS POLICIES

-- USERS: Users can view and update their own profile
create policy "Users can view own profile"
  on public.users for select
  using ( auth.uid()::text = id );

create policy "Users can update own profile"
  on public.users for update
  using ( auth.uid()::text = id );

-- CLASSES: Lecturers only access their own classes
create policy "Lecturers view their own classes"
  on public.classes for select
  using ( auth.uid()::text = lecturer_id );

create policy "Lecturers create their own classes"
  on public.classes for insert
  with check ( auth.uid()::text = lecturer_id );

create policy "Lecturers update their own classes"
  on public.classes for update
  using ( auth.uid()::text = lecturer_id );

create policy "Lecturers delete their own classes"
  on public.classes for delete
  using ( auth.uid()::text = lecturer_id );

-- WORK SESSIONS: Lecturers only access their own sessions
create policy "Lecturers view their work sessions"
  on public.work_sessions for select
  using ( auth.uid()::text = lecturer_id );

create policy "Lecturers create work sessions"
  on public.work_sessions for insert
  with check ( auth.uid()::text = lecturer_id );

create policy "Lecturers update work sessions"
  on public.work_sessions for update
  using ( auth.uid()::text = lecturer_id );

create policy "Lecturers delete work sessions"
  on public.work_sessions for delete
  using ( auth.uid()::text = lecturer_id );

-- SUBMISSIONS:
-- Students view their own submissions
create policy "Students view own submissions"
  on public.submissions for select
  using ( auth.uid()::text = user_id );

-- Students can create submissions (if submitting via client)
create policy "Students create own submissions"
  on public.submissions for insert
  with check ( auth.uid()::text = user_id );

-- Lecturers view submissions for their work sessions
create policy "Lecturers view submissions for their sessions"
  on public.submissions for select
  using (
    exists (
      select 1 from public.work_sessions ws
      where ws.id = submissions.work_session_id
      and ws.lecturer_id = auth.uid()::text
    )
  );

-- 4. STORAGE BUCKETS
-- Create 'submissions' bucket (Private)
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

-- Storage Policies
-- Allow authenticated users to upload to 'submissions'
create policy "Authenticated users can upload submissions"
  on storage.objects for insert
  with check ( bucket_id = 'submissions' and auth.role() = 'authenticated' );

-- Allow users to view their own files
create policy "Users can view own submission files"
  on storage.objects for select
  using ( bucket_id = 'submissions' and owner = auth.uid() );

-- Allow lecturers to view files for their work sessions (Advanced Policy)
-- Note: This often requires a more complex policy involving joins with public tables,
-- which Supabase Storage policies support but can be performance intensive.
-- For now, the application generates Signed URLs via the Service Role key for Lecturers to view files.
