create extension if not exists pgcrypto;

-- Profiles: public-facing user info, synced from auth.users on signup.
-- auth.users itself isn't queryable from client code, so album member lists
-- (display names) read from here instead.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id),
  event_date date,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

-- Owner is automatically added as a member so the album-membership check
-- (used everywhere below) covers them without a special case.
create function public.handle_new_album()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.album_members (album_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create table public.album_members (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  role text not null default 'contributor' check (role in ('owner', 'contributor')),
  joined_at timestamptz not null default now(),
  unique (album_id, user_id)
);

create trigger on_album_created
  after insert on public.albums
  for each row execute function public.handle_new_album();

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  storage_key text not null,
  caption text,
  width int,
  height int,
  created_at timestamptz not null default now()
);

create table public.book_exports (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  page_count int,
  pdf_storage_key text,
  requested_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.albums enable row level security;
alter table public.album_members enable row level security;
alter table public.photos enable row level security;
alter table public.book_exports enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

create policy "Members can view their albums"
  on public.albums for select
  to authenticated
  using (
    exists (
      select 1 from public.album_members
      where album_members.album_id = albums.id
      and album_members.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create albums"
  on public.albums for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Owners can update their albums"
  on public.albums for update
  to authenticated
  using (owner_id = auth.uid());

create policy "Members can view other members of their albums"
  on public.album_members for select
  to authenticated
  using (
    exists (
      select 1 from public.album_members as m
      where m.album_id = album_members.album_id
      and m.user_id = auth.uid()
    )
  );

create policy "Members can view photos in their albums"
  on public.photos for select
  to authenticated
  using (
    exists (
      select 1 from public.album_members
      where album_members.album_id = photos.album_id
      and album_members.user_id = auth.uid()
    )
  );

create policy "Members can upload photos to their albums"
  on public.photos for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.album_members
      where album_members.album_id = photos.album_id
      and album_members.user_id = auth.uid()
    )
  );

create policy "Members can view book exports for their albums"
  on public.book_exports for select
  to authenticated
  using (
    exists (
      select 1 from public.album_members
      where album_members.album_id = book_exports.album_id
      and album_members.user_id = auth.uid()
    )
  );

create policy "Members can request book exports"
  on public.book_exports for insert
  to authenticated
  with check (
    requested_by = auth.uid()
    and exists (
      select 1 from public.album_members
      where album_members.album_id = book_exports.album_id
      and album_members.user_id = auth.uid()
    )
  );

-- Joining an album happens by a short human-typable code, not by knowing its
-- UUID, so this runs as SECURITY DEFINER to look up the album and insert
-- membership in one safe step rather than exposing albums to lookup-by-code
-- through RLS directly.
create function public.join_album_by_code(code text)
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
