-- Weekly AI prompt threads. Replaces the weekly_prompt feature removed by
-- 20260713180000, whose comment reads: "Clubs (threads) will carry the weekly
-- nudge-to-post mechanic later." This is that.
--
-- Design: a thread is a prompt row. Responses are ORDINARY PUBLIC POSTS
-- carrying posts.thread_id. There is deliberately NO change to the posts
-- SELECT policy: a thread response is as visible as any other post, earns
-- contribution points like any other post, and appears in Latest and on
-- profiles. Only the INSERT policy gains a conjunct (see 4).
--
-- Contrast with the clubs design, where posts.club_id NARROWS visibility and
-- therefore requires patching every SECURITY DEFINER function that reads
-- posts. thread_id widens nothing, so none of that applies.
--
-- Verified against live prod before writing this file:
--   - public.posts has table-level grants (relacl: anon/authenticated =
--     arwdDxtm) and ZERO column-level ACLs (pg_attribute.attacl is null for
--     every column). A new column is therefore granted automatically. This is
--     NOT true of public.profiles, which has 22 column ACLs and no table-level
--     SELECT -- that table's new columns need explicit grants. posts does not.
--   - posts has SELECT, INSERT and DELETE policies but NO UPDATE policy, so
--     thread_id cannot be reassigned after insert even though authenticated
--     holds the UPDATE table grant. Nothing to do.
--   - The live posts INSERT policy "authed users create posts" is exactly
--     ((auth.uid() = user_id) AND (NOT current_is_suspended())). Reproduced
--     verbatim below with one conjunct appended.
--
-- Day boundary is America/New_York, matching heatmap, streak and ai_usage
-- (see 20260711150100_ai_quota_caps_and_eastern_tz.sql).

-- ============================================================
-- 1. threads
--
-- week_start is UNIQUE. That uniqueness IS the manual-override mechanism:
-- hand-insert a row for next Monday and the scheduled AI writer's insert
-- fails, leaving the human prompt in place.
--
-- No INSERT/UPDATE/DELETE policy by design. Writes come only from the
-- scheduled Supabase Edge Function via service_role, which bypasses RLS.
-- This is the same policy-less pattern as ai_usage / profile_views / dm_pairs.
-- ============================================================
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  prompt text not null check (char_length(prompt) between 1 and 500),
  week_start date not null unique,
  summary text check (summary is null or char_length(summary) <= 2000),
  created_at timestamptz not null default now()
);

alter table public.threads enable row level security;

create policy "authed read threads" on public.threads
  for select using ((select auth.uid()) is not null);

-- Defence in depth: the RLS policy above already denies anon, and there is no
-- write policy at all, but Supabase's default privileges hand BOTH anon and
-- authenticated a full arwdDxtm table grant at creation time. Take it all back
-- from both, then grant back exactly the one privilege a policy backs. A
-- future migration that adds a write policy here must add its own grant --
-- it will not inherit a silent one.
revoke all on table public.threads from anon;
revoke all on table public.threads from authenticated;
grant select on table public.threads to authenticated;

create index threads_week_start_idx on public.threads (week_start desc);

-- ============================================================
-- 2. current_thread_id()
--
-- The most recent OPEN thread whose week has started. Used by the posts INSERT
-- policy (4) to stop necro-posting into a closed thread whose AI summary has
-- already been written.
--
-- `summary is null` is what makes a thread open, and it is load-bearing, not
-- decorative. The scheduler summarises week N on Sunday but does not create
-- week N+1 until Monday. Without this clause, week N remains "current" for
-- that whole gap, and a post accepted during it lands under a summary that
-- has already been published and will never be regenerated.
-- ============================================================
create function public.current_thread_id()
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select t.id
  from public.threads t
  where t.week_start <= (now() at time zone 'America/New_York')::date
    and t.summary is null
  order by t.week_start desc
  limit 1;
$$;

revoke all on function public.current_thread_id() from public;
grant execute on function public.current_thread_id() to authenticated, service_role;

-- ============================================================
-- 3. posts.thread_id
--
-- on delete set null, NOT cascade: deleting a bad prompt must not delete the
-- students' writing underneath it. (clubs.club_id will cascade -- deleting a
-- club does take its content. Different objects, different lifetimes.)
-- ============================================================
alter table public.posts
  add column thread_id uuid references public.threads(id) on delete set null;

create index posts_thread_id_created_at_idx
  on public.posts (thread_id, created_at desc)
  where thread_id is not null;

-- ============================================================
-- 4. posts INSERT: you may only answer the current thread.
--
-- Existing clause reproduced verbatim; one conjunct appended. Enforced in
-- Postgres, not TypeScript -- the anon key is a client too.
-- ============================================================
alter policy "authed users create posts" on public.posts
  with check (
    ((select auth.uid()) = user_id)
    and (not public.current_is_suspended())
    and (thread_id is null or thread_id = public.current_thread_id())
  );
