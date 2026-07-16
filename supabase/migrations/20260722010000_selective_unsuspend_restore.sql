-- Selective unsuspend restore: distinguish posts hidden as suspension
-- collateral from posts an admin deliberately hid, so unsuspending a user
-- only restores the collateral and never the deliberate hide.
--
-- posts.hidden is a single boolean today, so admin_suspend_user hiding every
-- post for a user and admin_unsuspend_user restoring none is the only safe
-- option without more state. Add hidden_by_suspension to carry that state.

-- 1. new column. posts uses per-column SELECT grants (anon/authenticated
--    currently hold exactly: content, created_at, hidden, id, media,
--    post_type, user_id). This is moderation metadata with no client
--    reader, so it is intentionally left out of both grants and stays
--    server-only.
alter table public.posts add column if not exists hidden_by_suspension boolean not null default false;

-- 2. admin_hide_post: a deliberate hide always wins. Clear the suspension
--    flag so a later unsuspend can never resurrect this post.
create or replace function public.admin_hide_post(p_post_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.current_is_admin() then raise exception 'not authorized'; end if;
  update public.posts set hidden = true, hidden_by_suspension = false where id = p_post_id;
  update public.reports set status = 'reviewed' where post_id = p_post_id and status = 'open';
end $$;

-- 3. admin_suspend_user gains an optional p_post_id: the post the report
--    was actually about, hidden deliberately (not as collateral). Adding a
--    defaulted param changes the signature -- create or replace would add a
--    second overload and leave admin_suspend_user(uuid) ambiguous, so drop
--    the old one-arg version first.
drop function if exists public.admin_suspend_user(uuid);

create function public.admin_suspend_user(p_user uuid, p_post_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.current_is_admin() then raise exception 'not authorized'; end if;
  -- "and user_id = p_user" pins the deliberate hide to the user actually being
  -- suspended: p_post_id comes from the caller, and a mis-wired caller passing
  -- a stranger's post id must not hide it. No security hole either way (the
  -- whole function is admin-gated), but the invariant belongs in the DB.
  if p_post_id is not null then
    update public.posts set hidden = true, hidden_by_suspension = false
    where id = p_post_id and user_id = p_user;
  end if;
  -- collateral: hide the rest of this user's visible posts, tagged so
  -- unsuspend knows it is safe to restore them. "and not hidden" protects
  -- every already-deliberately-hidden post (including p_post_id above)
  -- from being reflagged as collateral.
  update public.posts set hidden = true, hidden_by_suspension = true where user_id = p_user and not hidden;
  update public.profiles set is_suspended = true where id = p_user;
end $$;

-- 4. admin_unsuspend_user: restore only posts hidden as suspension
--    collateral. Deliberately hidden posts (hidden_by_suspension = false)
--    stay hidden.
create or replace function public.admin_unsuspend_user(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.current_is_admin() then raise exception 'not authorized'; end if;
  update public.posts set hidden = false, hidden_by_suspension = false where user_id = p_user and hidden_by_suspension;
  update public.profiles set is_suspended = false where id = p_user;
end $$;

-- 5. execute backstop. drop+create re-acquired the schema-level DEFAULT
--    PRIVILEGES grant to anon on admin_suspend_user(uuid, uuid) (documented
--    in 20260708004722_revoke_anon_execute_rpc_explicit.sql and
--    20260722000000_revoke_anon_admin_feedback_execute.sql): "revoke ...
--    from public" only strips the PUBLIC pseudo-role grant, not the
--    role-specific anon grant, so anon must be named explicitly.
revoke execute on function public.admin_suspend_user(uuid, uuid) from public;
revoke execute on function public.admin_suspend_user(uuid, uuid) from anon;
grant execute on function public.admin_suspend_user(uuid, uuid) to authenticated, service_role;
