-- ============================================================
-- STEP 1 — What's actually applied? (safe, read-only)
-- Run this block on its own and read the results.
-- ============================================================
select
  to_regclass('public.albums')             is not null as albums_table,          -- 0001
  to_regclass('public.guestbook_entries')  is not null as guestbook_table,       -- 0004
  to_regclass('public.bingo_boards')       is not null as bingo_tables,          -- 0009
  to_regclass('public.invite_codes')       is not null as invite_table,          -- 0010
  exists (select 1 from information_schema.columns
          where table_name='photos' and column_name='focus_x')  as photo_focus,  -- 0006
  exists (select 1 from information_schema.columns
          where table_name='profiles' and column_name='approved') as invite_gate,-- 0010
  exists (select 1 from pg_policies
          where tablename='albums' and cmd='DELETE')            as album_delete, -- 0005
  exists (select 1 from pg_policies
          where tablename='album_members' and cmd='DELETE')     as member_remove;-- 0007

-- Any column that comes back FALSE means that migration still needs running.


-- ============================================================
-- STEP 2 — Make yourself approved + admin.
-- Required after 0010: new accounts start unapproved, and nobody
-- is admin by default, so creating anything is blocked.
-- Replace the email with the one you signed up with.
-- ============================================================
update public.profiles
set approved = true, is_admin = true
where id = (select id from auth.users where email = 'you@example.com');

-- Confirm it worked:
select p.id, u.email, p.display_name, p.approved, p.is_admin
from public.profiles p join auth.users u on u.id = p.id;


-- ============================================================
-- STEP 3 — Generate the first invite link (admins only).
-- Returns the code; the link is /invite?code=<code>
-- ============================================================
-- select public.reset_invite_code();
