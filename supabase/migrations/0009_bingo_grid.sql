-- Reworks bingo from a shuffled phrase pool into a fixed, owner-authored grid
-- with editable dimensions. Everyone sees the same board; each player only owns
-- their marks. Safe to run whether or not 0008 was applied.

drop trigger if exists on_bingo_board_created on public.bingo_boards;
drop function if exists public.handle_new_bingo_board();
drop function if exists public.join_bingo_by_code(text);
drop function if exists public.bingo_random_layout(int, int);
drop table if exists public.bingo_cards;
drop table if exists public.bingo_boards;

create table public.bingo_boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  title text not null,
  cols smallint not null default 5 check (cols between 3 and 8),
  rows smallint not null default 5 check (rows between 3 and 8),
  -- One entry per grid position, row-major. Empty strings are unfilled cells.
  cells text[] not null default '{}',
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.bingo_cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.bingo_boards(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  marks boolean[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (board_id, user_id)
);

-- Owner gets a playable card automatically.
create function public.handle_new_bingo_board()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.bingo_cards (board_id, user_id, marks)
  values (new.id, new.owner_id, array_fill(false, array[new.cols * new.rows]));
  return new;
end;
$$;

create trigger on_bingo_board_created
  after insert on public.bingo_boards
  for each row execute function public.handle_new_bingo_board();

-- Joining by code deals a blank card if the caller doesn't have one yet.
create function public.join_bingo_by_code(code text)
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

grant execute on function public.join_bingo_by_code(text) to authenticated;

alter table public.bingo_boards enable row level security;
alter table public.bingo_cards enable row level security;

create policy "Owner or card holder can view board"
  on public.bingo_boards for select
  to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.bingo_cards
      where bingo_cards.board_id = bingo_boards.id and bingo_cards.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create boards"
  on public.bingo_boards for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Owner can edit their boards"
  on public.bingo_boards for update
  to authenticated
  using (owner_id = auth.uid());

create policy "Owner can delete their boards"
  on public.bingo_boards for delete
  to authenticated
  using (owner_id = auth.uid());

-- Cards are created only via the trigger / SECURITY DEFINER join function.
create policy "Users can view their own bingo cards"
  on public.bingo_cards for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can update their own bingo cards"
  on public.bingo_cards for update
  to authenticated
  using (user_id = auth.uid());
