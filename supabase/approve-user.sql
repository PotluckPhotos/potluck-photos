-- ============================================================
-- Approve someone who already has an account (e.g. they signed up
-- before you sent them the invite link).
-- ============================================================

-- 1. See everyone and their status:
select u.email, p.display_name, p.approved, p.is_admin, u.created_at
from public.profiles p
join auth.users u on u.id = p.id
order by u.created_at desc;

-- 2. Approve one person by email:
update public.profiles
set approved = true
where id = (select id from auth.users where email = 'brother@example.com');

-- Or approve EVERYONE who currently has an account:
-- update public.profiles set approved = true;
