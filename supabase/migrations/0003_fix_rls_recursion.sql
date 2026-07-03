-- Fixes infinite recursion (Postgres 42P17) in the membership RLS policies.
-- The album_members SELECT policy referenced album_members, and the albums /
-- photos / book_exports policies referenced album_members whose policy
-- referenced itself again — an endless loop.
--
-- A SECURITY DEFINER function checks membership while bypassing RLS (it runs
-- as the function owner, not the calling user), so the self-reference no longer
-- re-triggers the policy. All membership checks now route through it.

create or replace function public.is_album_member(_album_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.album_members
    where album_id = _album_id and user_id = auth.uid()
  );
$$;

grant execute on function public.is_album_member(uuid) to authenticated;

drop policy if exists "Members can view their albums" on public.albums;
create policy "Members can view their albums"
  on public.albums for select
  to authenticated
  using (public.is_album_member(id));

drop policy if exists "Members can view other members of their albums" on public.album_members;
create policy "Members can view other members of their albums"
  on public.album_members for select
  to authenticated
  using (public.is_album_member(album_id));

drop policy if exists "Members can view photos in their albums" on public.photos;
create policy "Members can view photos in their albums"
  on public.photos for select
  to authenticated
  using (public.is_album_member(album_id));

drop policy if exists "Members can upload photos to their albums" on public.photos;
create policy "Members can upload photos to their albums"
  on public.photos for insert
  to authenticated
  with check (uploaded_by = auth.uid() and public.is_album_member(album_id));

drop policy if exists "Members can update photos in their albums" on public.photos;
create policy "Members can update photos in their albums"
  on public.photos for update
  to authenticated
  using (public.is_album_member(album_id));

drop policy if exists "Members can view book exports for their albums" on public.book_exports;
create policy "Members can view book exports for their albums"
  on public.book_exports for select
  to authenticated
  using (public.is_album_member(album_id));

drop policy if exists "Members can request book exports" on public.book_exports;
create policy "Members can request book exports"
  on public.book_exports for insert
  to authenticated
  with check (requested_by = auth.uid() and public.is_album_member(album_id));
