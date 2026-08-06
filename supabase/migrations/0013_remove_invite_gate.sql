-- Removes the invite gate added in 0010-0012. Anyone with an account can
-- create, join, and upload again. Safe to run whether or not 0010 was applied.

-- Restore the ungated creation/upload policies.
drop policy if exists "Approved users can create albums" on public.albums;
drop policy if exists "Authenticated users can create albums" on public.albums;
create policy "Authenticated users can create albums"
  on public.albums for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Approved users can create boards" on public.bingo_boards;
drop policy if exists "Authenticated users can create boards" on public.bingo_boards;
create policy "Authenticated users can create boards"
  on public.bingo_boards for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Approved members can upload photos to their albums" on public.photos;
drop policy if exists "Members can upload photos to their albums" on public.photos;
create policy "Members can upload photos to their albums"
  on public.photos for insert
  to authenticated
  with check (uploaded_by = auth.uid() and public.is_album_member(album_id));

-- Drop the approval check from the join functions.
create or replace function public.join_album_by_code(code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  target_album_id uuid;
begin
  select id into target_album_id from public.albums where join_code = upper(code);
  if target_album_id is null then
    raise exception 'Invalid join code';
  end if;

  insert into public.album_members (album_id, user_id, role)
  values (target_album_id, auth.uid(), 'contributor')
  on conflict (album_id, user_id) do nothing;

  return target_album_id;
end;
$$;

create or replace function public.join_bingo_by_code(code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  b public.bingo_boards;
begin
  select * into b from public.bingo_boards where join_code = upper(code);
  if b.id is null then
    raise exception 'Invalid board code';
  end if;

  insert into public.bingo_cards (board_id, user_id, marks)
  values (b.id, auth.uid(), array_fill(false, array[b.cols * b.rows]))
  on conflict (board_id, user_id) do nothing;

  return b.id;
end;
$$;

-- Tear down the invite machinery.
drop function if exists public.current_invite_code();
drop function if exists public.reset_invite_code();
drop function if exists public.redeem_invite(text);
drop function if exists public.is_approved() cascade;
drop table if exists public.invite_codes cascade;

alter table public.profiles
  drop column if exists approved,
  drop column if exists is_admin;
