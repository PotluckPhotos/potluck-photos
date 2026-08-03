-- Invite gate: signup stays open, but nothing that costs storage (creating,
-- joining, or uploading) works until the user redeems the current invite
-- link. Resetting the link revokes every old one.

alter table public.profiles
  add column if not exists approved boolean not null default false,
  add column if not exists is_admin boolean not null default false;

-- Everyone who already had an account keeps access.
update public.profiles set approved = true;

create table public.invite_codes (
  code text primary key,
  created_at timestamptz not null default now(),
  active boolean not null default true
);

-- Only admins can read/manage invite codes directly; everyone else redeems
-- through the SECURITY DEFINER function below, so the code list itself stays
-- hidden from ordinary users.
alter table public.invite_codes enable row level security;

create policy "Admins manage invite codes"
  on public.invite_codes for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

create or replace function public.is_approved()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select approved from public.profiles where id = auth.uid()), false);
$$;

grant execute on function public.is_approved() to authenticated;

-- Redeems the active invite for the calling user. Returns true on success.
create or replace function public.redeem_invite(code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.invite_codes
    where invite_codes.code = upper(trim(redeem_invite.code)) and active
  ) then
    return false;
  end if;

  update public.profiles set approved = true where id = auth.uid();
  return true;
end;
$$;

grant execute on function public.redeem_invite(text) to authenticated;

-- Rotates the invite: deactivates all existing codes and stores a new one.
create or replace function public.reset_invite_code(new_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'Not allowed';
  end if;

  update public.invite_codes set active = false where active;
  insert into public.invite_codes (code, active) values (upper(new_code), true);
  return upper(new_code);
end;
$$;

grant execute on function public.reset_invite_code(text) to authenticated;

create or replace function public.current_invite_code()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select case when exists (select 1 from public.profiles where id = auth.uid() and is_admin)
    then (select code from public.invite_codes where active limit 1)
    else null
  end;
$$;

grant execute on function public.current_invite_code() to authenticated;

-- Gate creation on approval.
drop policy if exists "Authenticated users can create albums" on public.albums;
create policy "Approved users can create albums"
  on public.albums for insert
  to authenticated
  with check (owner_id = auth.uid() and public.is_approved());

drop policy if exists "Authenticated users can create boards" on public.bingo_boards;
create policy "Approved users can create boards"
  on public.bingo_boards for insert
  to authenticated
  with check (owner_id = auth.uid() and public.is_approved());

-- Gate the actual storage-cost action: uploading a photo.
drop policy if exists "Members can upload photos to their albums" on public.photos;
create policy "Approved members can upload photos to their albums"
  on public.photos for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.is_approved()
    and public.is_album_member(album_id)
  );

-- Gate joining, since these SECURITY DEFINER functions bypass RLS entirely
-- and would otherwise let an unapproved user join and then upload.
create or replace function public.join_album_by_code(code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  target_album_id uuid;
begin
  if not public.is_approved() then
    raise exception 'This account needs an invite before joining albums.';
  end if;

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
  if not public.is_approved() then
    raise exception 'This account needs an invite before joining boards.';
  end if;

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
