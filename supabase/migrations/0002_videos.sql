-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null check (source_type in ('youtube', 'twitch', 'upload')),
  source_url text,
  storage_path text,
  status text not null default 'pending' check (
    status in ('pending', 'downloading', 'ready', 'failed')
  ),
  transcript jsonb,
  duration_seconds int,
  created_at timestamptz not null default now()
);

alter table public.videos enable row level security;

create policy "Users can view their own videos"
  on public.videos for select
  using (auth.uid() = user_id);

create policy "Users can insert their own videos"
  on public.videos for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own videos"
  on public.videos for update
  using (auth.uid() = user_id);

-- Storage: files are stored as <user_id>/<video_id>/source.mp4, so a user
-- may only touch objects whose first path segment is their own user id.
create policy "Users can read their own video files"
  on storage.objects for select
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload their own video files"
  on storage.objects for insert
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
