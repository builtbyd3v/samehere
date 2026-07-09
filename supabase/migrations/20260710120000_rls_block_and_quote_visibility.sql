-- Security fixes:
--   1. posts SELECT never consulted public.blocks -> a blocked user could still
--      read the blocker's posts (and vice versa) straight through PostgREST.
--   2. comments/reactions mirror-visibility policies only checked post_id, so
--      quote-repost engagement rows (post_id null, repost_id set; see
--      20260703260000_quote_engagement.sql) were invisible to everyone,
--      including their own author.
--   3. search_path hardening: DM/notification/AI-quota/profile-view definer
--      functions used `set search_path = public` instead of the project
--      standard `''`. All bodies are fully schema-qualified (verified by
--      reading each latest create-or-replace), so this is a plain ALTER, no
--      body rewrite.
--   4. integrity gaps: storage policy used bare auth.uid() instead of the
--      initplan-wrapped (select auth.uid()); profiles.referral_code had no
--      format constraint beyond the app-layer check in set_referral_code().

-- ============ Fix 1: posts visibility must respect blocks (both directions) ============
-- Owner escape included explicitly so a (impossible, but defensive) self-block
-- row can never hide a user's own posts from themselves.
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
    or not exists (
      select 1 from public.blocks b
      where (b.blocker_id = (select auth.uid()) and b.blocked_id = posts.user_id)
         or (b.blocker_id = posts.user_id and b.blocked_id = (select auth.uid()))
    )
  )
  and ((not posts.hidden) or (select auth.uid()) = posts.user_id or public.current_is_admin())
);

-- ============ Fix 2: quote-repost engagement mirrors visibility through EITHER target ============
-- Nested RLS mechanism preserved: querying public.posts / public.reposts here
-- re-applies THEIR OWN select policies for the invoking role, so no definer
-- helper is introduced. reposts itself has no repost_id column (a repost can't
-- target another repost), so its own mirror policy is untouched.
drop policy if exists "comments mirror post visibility" on public.comments;
create policy "comments mirror post visibility" on public.comments
for select using (
  (post_id is not null and exists (select 1 from public.posts p where p.id = comments.post_id))
  or (repost_id is not null and exists (select 1 from public.reposts r where r.id = comments.repost_id))
);

drop policy if exists "reactions mirror post visibility" on public.reactions;
create policy "reactions mirror post visibility" on public.reactions
for select using (
  (post_id is not null and exists (select 1 from public.posts p where p.id = reactions.post_id))
  or (repost_id is not null and exists (select 1 from public.reposts r where r.id = reactions.repost_id))
);
-- bookmarks: owner-only select (auth.uid() = user_id), no post/repost mirror exists to fix.

-- ============ Fix 3: search_path hardening (bodies already fully schema-qualified) ============
alter function public.is_conversation_member(uuid) set search_path = '';
alter function public.get_or_create_dm(uuid) set search_path = '';
alter function public.mark_dm_read(uuid) set search_path = '';
alter function public.list_dm_inbox() set search_path = '';
alter function public.get_dm_peer(uuid) set search_path = '';
alter function public.get_dm_unread_total() set search_path = '';
-- current signature only: the 4-arg overload was dropped by
-- 20260705120000_fix_insert_notification_ambiguous_overload.sql.
alter function public.insert_notification(uuid, uuid, text, uuid, text) set search_path = '';
alter function public.get_notification_unread_total() set search_path = '';
alter function public.list_notifications(int) set search_path = '';
alter function public.mark_all_notifications_read() set search_path = '';
alter function public.use_ai_quota(text, int) set search_path = '';
alter function public.record_profile_view(uuid) set search_path = '';
alter function public.get_profile_views(uuid) set search_path = '';
alter function public.trg_notify_follow() set search_path = '';
alter function public.trg_notify_comment() set search_path = '';
alter function public.trg_notify_reaction() set search_path = '';

-- ============ Fix 4a: avatars owner-select storage policy initplan wrap ============
drop policy if exists "avatars owner select" on storage.objects;
create policy "avatars owner select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- ============ Fix 4b: referral_code format is a DB constraint, not just app-layer ============
-- Matches set_referral_code()'s exact validation regex (see
-- 20260705160000_growth_wave_d_referrals_and_profile_guard.sql). NOT VALID so
-- the ALTER itself doesn't scan/lock; VALIDATE runs the check separately.
-- ponytail: can't confirm from source alone that every existing row already
-- conforms (backfill = username, whose own charset check lives outside
-- supabase/migrations), so NOT VALID + VALIDATE is the safe path rather than
-- assuming a clean backfill.
alter table public.profiles
  add constraint profiles_referral_code_format
  check (referral_code is null or referral_code ~ '^[a-z0-9_]{3,20}$') not valid;

alter table public.profiles
  validate constraint profiles_referral_code_format;
