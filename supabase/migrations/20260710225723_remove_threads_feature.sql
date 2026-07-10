-- Remove the weekly-threads feature (community "Threads" tab). Product
-- decision 2026-07-15: drop it for now; the leaderboard takes its tab slot
-- in /community instead. Reversible via git history + this file's inverse if
-- ever un-deferred.
--
-- Order matters: the posts INSERT policy's with-check references thread_id,
-- so it must be rewritten (dropping the thread_id conjunct) before the column
-- can be dropped. Reproduces the pre-thread_id check from
-- 20260714130000_threads.sql verbatim, minus the appended conjunct.

-- 1. Unschedule the two weekly cron jobs that called the weekly-thread edge
--    function. The edge function itself is left deployed (no MCP tool to
--    delete it) -- delete supabase/functions/weekly-thread manually via the
--    Supabase dashboard or CLI (`supabase functions delete weekly-thread`).
select cron.unschedule('thread-generate');
select cron.unschedule('thread-summarize');

-- 2. Drop the thread_id conjunct from the posts INSERT policy.
alter policy "authed users create posts" on public.posts
  with check (
    ((select auth.uid()) = user_id)
    and (not public.current_is_suspended())
  );

-- 3. Drop the thread_id column (and its index, which goes with it) + the
--    current_thread_id() definer function + the threads table itself.
drop index if exists public.posts_thread_id_created_at_idx;
alter table public.posts drop column if exists thread_id;
drop function if exists public.current_thread_id();
drop table if exists public.threads;
