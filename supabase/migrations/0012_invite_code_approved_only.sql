-- Close the loophole from 0011: the invite code was readable by ANY signed-in
-- user, so someone who signed up but was never invited could open Settings,
-- read the code, and approve themselves. Approved users (who are already in)
-- can see and share it; unapproved users get null.
create or replace function public.current_invite_code()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select case
    when coalesce((select approved from public.profiles where id = auth.uid()), false)
    then (select code from public.invite_codes where active limit 1)
  end;
$$;
