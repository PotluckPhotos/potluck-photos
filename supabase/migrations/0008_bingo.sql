-- Bingo: a lightweight, separate mini-feature reusing the same auth/profile
-- setup. Owner writes a pool of phrases; each player who joins by code gets
-- their own randomly-dealt 5x5 card (24 phrases + a free center space).
-- Personal cards only — no live sync between players.

create table public.bingo_boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  title text not null,
  phrases text[] not null,
  join_code text not null unique,
  created_at timestamptz not null default now(),
  constraint bingo_min_phrases check (array_length(phrases, 1) >= 24)
);

-- Picks k random indices in [0, n_phrases). With more than 24 phrases in the
-- pool, different players draw different subsets, so their cards vary.
create or replace function public.bingo_random_layout(n_phrases int, k int default 24)
returns smallint[]
language sql
stable
as $$
  select coalesce(array_agg(i), '{}')::smallint[] from (
    select (gs - 1)::smallint as i
    from generate_series(1, n_phrases) gs
    order by random()
    limit k
  ) s;
$$;

create table public.bingo_cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.bingo_boards(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  layout smallint[] not null,
  marks boolean[] not null,
  created_at timestamptz not null default now(),
  unique (board_id, user_id)
);

-- Owner gets their own playable card automatically, same pattern as albums
-- auto-adding the owner as a member.
create or replace function public.handle_new_bingo_board()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.bingo_cards (board_id, user_id, layout, marks)
  values (new.id, new.owner_id, public.bingo_random_layout(array_length(new.phrases, 1)), array_fill(false, array[24]));
  return new;
end;
$$;

create trigger on_bingo_board_created
  after insert on public.bingo_boards
  for each row execute function public.handle_new_bingo_board();

-- Joining by code deals a card if the caller doesn't already have one.
create or replace function public.join_bingo_by_code(code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  target_board_id uuid;
  n_phrases int;
begin
  select id, array_length(phrases, 1) into target_board_id, n_phrases
  from public.bingo_boards where join_code = upper(code);

  if target_board_id is null then
    raise exception 'Invalid board code';
  end if;

  if not exists (
    select 1 from public.bingo_cards
    where board_id = target_board_id and user_id = auth.uid()
  ) then
    insert into public.bingo_cards (board_id, user_id, layout, marks)
    values (target_board_id, auth.uid(), public.bingo_random_layout(n_phrases), array_fill(false, array[24]));
  end if;

  return target_board_id;
end;
$$;

grant execute on function public.join_bingo_by_code(text) to authenticated;
grant execute on function public.bingo_random_layout(int, int) to authenticated;

alter table public.bingo_boards enable row level security;
alter table public.bingo_cards enable row level security;

-- Board contents are only visible to the owner and people who've joined
-- (have a card) — not browsable/listable by any authenticated user.
create policy "Owner or card holder can view board"
  on public.bingo_boards for select
  to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.bingo_cards
      where bingo_cards.board_id = bingo_boards.id
      and bingo_cards.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create boards"
  on public.bingo_boards for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Owner can delete their boards"
  on public.bingo_boards for delete
  to authenticated
  using (owner_id = auth.uid());

-- No insert policy on bingo_cards: creation only happens via the SECURITY
-- DEFINER trigger/RPC above, which bypass RLS. Direct inserts stay blocked.
create policy "Users can view their own bingo cards"
  on public.bingo_cards for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can update their own bingo cards"
  on public.bingo_cards for update
  to authenticated
  using (user_id = auth.uid());
