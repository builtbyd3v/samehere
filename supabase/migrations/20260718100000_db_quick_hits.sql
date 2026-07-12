-- Plan 008: three independent perf quick-hits, live-verified 2026-07-12
-- against gannghfikhikdeqvyrwc. No behavior changes -- same reads, same RLS
-- outcomes, computed more cheaply.
--
-- Note for plan 001 (group-unread-total, not yet landed as of this
-- migration): if you rebuild list_unread_digest_recipients() after this
-- migration lands, rebase your group_counts CTE onto this version's
-- dm_counts shape -- move any per-row unread predicates into the relevant
-- join's ON clause rather than into count(*) filter, for consistency.

-- (a) Perf: current_is_admin() is called bare in the last conjunct of "posts
-- visible by privacy" -- unlike every auth.*() call in the same policy
-- (already wrapped by 20260708004820_rls_initplan_wrap_auth_uid.sql, whose
-- generator regex only matched auth.(uid|role|jwt|email)()), this nullary
-- definer function is re-evaluated per candidate row on every posts SELECT
-- instead of once per statement. Body reproduced byte-identical from the
-- live policy (verified 2026-07-12) except this one wrap.
drop policy if exists "posts visible by privacy" on public.posts;
create policy "posts visible by privacy" on public.posts
for select using (
  ((select auth.uid()) is not null)
  and (
    (exists (select 1 from public.profiles p where p.id = posts.user_id and p.is_private = false))
    or ((select auth.uid()) = user_id)
    or (exists (select 1 from public.follows f where f.following_id = posts.user_id and f.follower_id = (select auth.uid()) and f.status = 'accepted'))
  )
  and (
    (select auth.uid()) = posts.user_id
    or posts.user_id not in (select public.get_blocked_ids())
  )
  and ((not posts.hidden) or (select auth.uid()) = posts.user_id or (select public.current_is_admin()))
);

-- (b) Perf: no post_id-leading index on bookmarks -- hit by the bookmarks(user_id)
-- embed on every feed post (components/feed/PostCard.tsx:14) and the /saved
-- page's own query (app/(app)/saved/page.tsx:64-70). reactions already has a
-- post_id-leading unique index (reactions_post_id_user_id_type_key) -- do not
-- duplicate that here. Plain CREATE INDEX (not CONCURRENTLY): this migration
-- runs inside a transaction, where CONCURRENTLY is disallowed; table sizes at
-- time of writing do not warrant the added complexity of a non-transactional
-- migration.
create index if not exists bookmarks_post_id_idx on public.bookmarks(post_id);
create index if not exists bookmarks_repost_id_idx on public.bookmarks(repost_id) where repost_id is not null;

-- Perf: no created_at index on profiles -- hit by get_match_candidates's
-- `order by p.created_at desc limit 50`
-- (supabase/migrations/20260716220000_digest_respect_hide_school.sql:44) and
-- RightRail's suggested-profiles query (app/(app)/feed/RightRail.tsx:59),
-- same ordering.
create index if not exists profiles_created_at_idx on public.profiles(created_at desc);

-- (c) Perf: dm_counts previously joined EVERY message ever sent in each of the
-- user's DM conversations, then discarded non-unread rows inside the
-- count(*) filter -- cost scaled with total message history, not unread
-- volume, and this runs daily for every opted-in user
-- (app/api/cron/unread-digest/route.ts). Fix: move the two unread predicates
-- (sender != member, created after last_read_at) into the join's ON clause
-- so only potentially-unread messages are ever joined in. The blocks
-- NOT EXISTS predicate stays inside the FILTER, applied to the now-much-
-- smaller row set. Output contract (columns/types/coalesce/where >0)
-- unchanged -- everything else copied verbatim from
-- 20260714240000_email_digest_opt_out_and_recipients.sql. No explicit grant
-- exists on this function (service_role/admin-client-only caller bypasses
-- grants) -- preserve that; only the trailing revoke line is reproduced.
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
        where not exists (
          select 1 from public.blocks b
          where (b.blocker_id = cm.user_id and b.blocked_id = m.sender_id)
             or (b.blocker_id = m.sender_id and b.blocked_id = cm.user_id)
        )
      )::int as dm_unread
    from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id and c.kind = 'dm'
    join public.messages m on m.conversation_id = cm.conversation_id
      and m.sender_id <> cm.user_id
      and (cm.last_read_at is null or m.created_at > cm.last_read_at)
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

revoke execute on function public.list_unread_digest_recipients() from public, anon, authenticated;
