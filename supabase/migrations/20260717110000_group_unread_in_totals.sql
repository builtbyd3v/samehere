-- Plan 003: group DMs (20260716140000_group_dms.sql) shipped their own inbox
-- function list_group_inbox() with correct per-conversation unread_count, but
-- the aggregate get_dm_unread_total() -- which feeds the left-nav Messages
-- badge, mobile bottom-bar dot, tab-title badge, and (indirectly, via the
-- mirrored dm_counts logic below) the unread digest -- still summed only
-- list_dm_inbox(). Group unread was invisible everywhere except inside
-- /messages. Fixes both call sites; the digest recipient row shape is
-- unchanged (group unread folds into the existing dm_unread column).

-- ============================================================
-- 1. get_dm_unread_total: fold list_group_inbox() into the sum.
--    search_path restated as '' (not 'public'), matching the current
--    definition after 20260710120000_rls_block_and_quote_visibility.sql's
--    `alter function ... set search_path = ''` search_path hardening pass --
--    the body below is already fully schema-qualified (public.list_dm_inbox,
--    public.list_group_inbox, auth.uid), so no rewrite is needed for that.
-- ============================================================
create or replace function public.get_dm_unread_total()
returns bigint
language sql
security definer
stable
set search_path = ''
as $$
  select case
    when auth.uid() is null then 0::bigint
    else coalesce((select sum(i.unread_count) from public.list_dm_inbox() i), 0)::bigint
       + coalesce((select sum(g.unread_count) from public.list_group_inbox() g), 0)::bigint
  end;
$$;

revoke all on function public.get_dm_unread_total() from public;
revoke all on function public.get_dm_unread_total() from anon;
grant execute on function public.get_dm_unread_total() to authenticated;

-- ============================================================
-- 2. list_unread_digest_recipients: add a group_counts CTE mirroring
--    dm_counts (same block-exclusion subquery, same last_read_at unread
--    logic) but scoped to kind='group' conversations, folded into the same
--    dm_unread output column so the cron route's row shape
--    (user_id, email, dm_unread, notif_unread) is unchanged. Recreated from
--    the newest (and only) prior definition, 20260714240000
--    (grep-confirmed: no later migration touches this function --
--    20260716220000_digest_respect_hide_school.sql recreates the unrelated
--    get_match_candidates). Opt-out filter, hide_school (n/a here -- this
--    function never reads profile_school), and the block-exclusion subquery
--    are preserved verbatim.
-- ============================================================
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
  group_counts as (
    -- Mirrors dm_counts exactly (same block-exclusion subquery, same
    -- last_read_at unread test), scoped to kind='group' instead of 'dm'.
    -- Groups have >2 members, so `m.sender_id <> cm.user_id` still means
    -- "any other member's message", it's just no longer a single peer.
    select cm.user_id as uid,
      count(*) filter (
        where m.sender_id <> cm.user_id
          and (cm.last_read_at is null or m.created_at > cm.last_read_at)
          and not exists (
            select 1 from public.blocks b
            where (b.blocker_id = cm.user_id and b.blocked_id = m.sender_id)
               or (b.blocker_id = m.sender_id and b.blocked_id = cm.user_id)
          )
      )::int as group_unread
    from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id and c.kind = 'group'
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
  select p.id, u.email, coalesce(d.dm_unread, 0) + coalesce(g.group_unread, 0), coalesce(nc.notif_unread, 0)
  from public.profiles p
  join auth.users u on u.id = p.id
  left join dm_counts d on d.uid = p.id
  left join group_counts g on g.uid = p.id
  left join notif_counts nc on nc.uid = p.id
  where p.email_digest_opt_out = false
    and (coalesce(d.dm_unread, 0) + coalesce(g.group_unread, 0) + coalesce(nc.notif_unread, 0)) > 0;
$$;

-- Called only via the admin (service_role) client in the cron route -- never
-- by a user session. Revoke from public, anon, AND authenticated explicitly,
-- restated exactly as 20260714240000_email_digest_opt_out_and_recipients.sql
-- did: a bare `create or replace function` grants EXECUTE to PUBLIC by
-- default, which anon/authenticated inherit unless revoked by name.
revoke execute on function public.list_unread_digest_recipients() from public, anon, authenticated;
