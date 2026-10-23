-- Rooted: writers, saved reading data, and locked-down public access.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- It is safe to run more than once.

-- ---------- Writers ----------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  bio text not null default '',
  is_writer boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.stories add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.stories add column if not exists status text not null default 'published';
alter table public.stories add column if not exists published_at timestamptz;
alter table public.stories drop constraint if exists stories_status_check;
alter table public.stories add constraint stories_status_check check (status in ('draft', 'published'));
update public.stories set published_at = created_at where published_at is null and status = 'published';
create index if not exists stories_user_idx on public.stories (user_id);
create index if not exists stories_status_idx on public.stories (status, created_at desc);

alter table public.books add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.clubs add column if not exists user_id uuid references auth.users(id) on delete set null;

-- ---------- Per-reader data ----------
create table if not exists public.user_books (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  progress integer not null default 0 check (progress between 0 and 100),
  saved boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create table if not exists public.club_members (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create table if not exists public.story_likes (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author text not null,
  content text not null check (char_length(content) <= 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  author text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, author)
);

-- ---------- Row Level Security ----------
-- The public anon key (which ships in the browser) may only READ public content.
-- All writes go through the backend API, which uses the service role key.
alter table public.books enable row level security;
alter table public.clubs enable row level security;
alter table public.stories enable row level security;
alter table public.profiles enable row level security;
alter table public.user_books enable row level security;
alter table public.club_members enable row level security;
alter table public.story_likes enable row level security;
alter table public.notes enable row level security;
alter table public.subscriptions enable row level security;

-- Remove the old policy that let any signed-in user edit any story.
drop policy if exists "Users can create and edit their own stories" on public.stories;
drop policy if exists "Stories are viewable by everyone" on public.stories;

drop policy if exists "Public can read books" on public.books;
create policy "Public can read books" on public.books for select using (true);

drop policy if exists "Public can read clubs" on public.clubs;
create policy "Public can read clubs" on public.clubs for select using (true);

drop policy if exists "Public can read published stories" on public.stories;
create policy "Public can read published stories" on public.stories for select using (status = 'published');

drop policy if exists "Public can read writers" on public.profiles;
create policy "Public can read writers" on public.profiles for select using (is_writer);

-- Tables that already exist in your project: lock them to the backend only.
do $$
declare t text;
begin
  foreach t in array array['soul_markers', 'covenant_signatures', 'page_views'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;
