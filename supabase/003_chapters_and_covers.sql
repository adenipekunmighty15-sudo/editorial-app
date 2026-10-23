-- Rooted: book chapters and cover uploads.
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run more than once.

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  position integer not null,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, position)
);
create index if not exists chapters_book_idx on public.chapters (book_id, position);

-- Only the backend (service role) reads and writes chapters, so unpublished books stay private.
alter table public.chapters enable row level security;

-- Only published books are visible to the public.
drop policy if exists "Public can read books" on public.books;
drop policy if exists "Public can read published books" on public.books;
create policy "Public can read published books" on public.books for select using (published);

-- Public bucket for book covers (uploads happen through signed URLs from the backend).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
