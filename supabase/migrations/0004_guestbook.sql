-- Guest-book entries: short written notes about the trip/event (not photo
-- captions). They get scattered through the printed book and the recap.
create table public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.guestbook_entries enable row level security;

create policy "Members can view guestbook entries"
  on public.guestbook_entries for select
  to authenticated
  using (public.is_album_member(album_id));

create policy "Members can write guestbook entries"
  on public.guestbook_entries for insert
  to authenticated
  with check (author_id = auth.uid() and public.is_album_member(album_id));

create policy "Author or album owner can delete guestbook entries"
  on public.guestbook_entries for delete
  to authenticated
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.albums
      where albums.id = guestbook_entries.album_id
      and albums.owner_id = auth.uid()
    )
  );
