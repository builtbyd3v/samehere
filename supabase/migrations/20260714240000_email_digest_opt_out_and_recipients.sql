-- Plan 013: daily unread-activity email digest. Opt-out column + a
-- set-returning recipients fn for the cron route (called only via the admin
-- client — see lib/supabase/admin.ts; no direct authenticated/anon caller).

alter table public.profiles add column if not exists email_digest_opt_out boolean not null default false;

-- Own-row read (settings toggle). SELECT on profiles is column-scoped since
-- 20260711150000_lock_down_profile_columns.sql, so a new column needs an
-- explicit grant or authenticated selects 42501. Not granted to anon — this
-- is a private preference, never evaluated by a public/anon-facing RLS
-- subquery (unlike e.g. leaderboard_opt_out). UPDATE isn't column-scoped on
-- this table, so the existing "owner write" RLS policy already covers writes
-- once the settings toggle action updates its own row.
grant select (email_digest_opt_out) on public.profiles to authenticated;

-- Recipients for today's digest run: unread DM + notification counts per
-- user, filtered to opted-in users with at least one unread item. Mirrors
-- the per-caller logic in get_dm_unread_total/list_dm_inbox and
-- get_notification_unread_total (20260703250000_notifications_and_unread.sql),
-- generalized across all users instead of auth.uid() since the cron route
-- has no user session — it calls this via the admin (service_role) client.
create or replace function public.list_unread_digest_recipients()
returns table (
  user_id uuid,
  email text,
  dm_unread int,
  notif_unread int
)
language sql
security definer
set search_path = ''
stable
as $$
  with dm_counts as (
    -- Scope DMs exactly like list_dm_inbox (20260714140000_clubs.sql): only
    -- kind='dm' conversations (excludes club channels), only memberships the
    -- user hasn't left. Once kind='dm' is enforced a conversation has exactly
    -- two members, so `m.sender_id <> cm.user_id` == "peer's messages".
    select cm.user_id as uid,
      count(*) filter (
        where m.sender_id <> cm.user_id
          and (cm.last_read_at is null or m.created_at > cm.last_read_at)
          and not exists (
            select 1 from public.blocks b
            where (b.blocker_id = cm.user_id and b.blocked_id = m.sender_id)
               or (b.blocker_id = m.sender_id and b.blocked_id = cm.user_id)
          )
      )::int as dm_unread
    from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id and c.kind = 'dm'
    join public.messages m on m.conversation_id = cm.conversation_id
    where cm.left_at is null
    group by cm.user_id
  ),
  notif_counts as (
    select n.user_id as uid, count(*)::int as notif_unread
    from public.notifications n
    where n.read = false
    group by n.user_id
  )
  select p.id, u.email, coalesce(d.dm_unread, 0), coalesce(nc.notif_unread, 0)
  from public.profiles p
  join auth.users u on u.id = p.id
  left join dm_counts d on d.uid = p.id
  left join notif_counts nc on nc.uid = p.id
  where p.email_digest_opt_out = false
    and (coalesce(d.dm_unread, 0) + coalesce(nc.notif_unread, 0)) > 0;
$$;

-- Called only via the admin (service_role) client in the cron route — never
-- by a user session. Revoke from public, anon, AND authenticated explicitly:
-- a bare `create or replace function` grants EXECUTE to PUBLIC by default,
-- which anon/authenticated inherit unless revoked by name (the trap fixed
-- platform-wide in 20260710225310_revoke_public_exec_remaining_fns.sql).
revoke execute on function public.list_unread_digest_recipients() from public, anon, authenticated;
