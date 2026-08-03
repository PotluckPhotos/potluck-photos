-- Any signed-in user can see the current invite link (so they can pass it
-- along themselves), but only an admin can reset it (unchanged, enforced
-- inside reset_invite_code).
create or replace function public.current_invite_code()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select code from public.invite_codes where active limit 1;
$$;
