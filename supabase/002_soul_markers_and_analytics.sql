-- Rooted: tables the app needs that were never created (soul map, covenants, page views).
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run more than once.

create table if not exists public.soul_markers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_text text not null,
  ai_question text not null,
  user_reflection text,
  source_type text not null check (source_type in ('book', 'story')),
  source_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists soul_markers_user_idx on public.soul_markers (user_id, created_at desc);

create table if not exists public.covenant_signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  club_id text not null,
  signed_at timestamptz not null default now(),
  unique (user_id, club_id)
);

create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  story_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  viewed_at timestamptz not null default now()
);
create index if not exists page_views_story_idx on public.page_views (story_id);

-- Only the backend (service role key) may touch these tables.
alter table public.soul_markers enable row level security;
alter table public.covenant_signatures enable row level security;
alter table public.page_views enable row level security;
