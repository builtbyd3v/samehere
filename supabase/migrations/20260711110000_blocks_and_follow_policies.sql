-- H2 (follows INSERT block clause), H5 (blocks are one-directional at the RLS
-- layer), M3 (comments/reactions block clause), M4 (follow-target rewrites
-- follower_id).
--
-- WHY A `blocks` SUBQUERY INSIDE A POLICY IS NOT LIKE A `posts` SUBQUERY:
-- The comments/reactions "mirror post visibility" trick works because the
-- inner `exists (select 1 from public.posts ...)` runs under the caller's own
-- posts RLS, which filters to *what the caller may see* -- exactly the intent.
-- A `select ... from public.blocks` inside a policy also runs under the
-- caller's RLS, but `blocks` has ONE select policy: "owner read" USING
-- (auth.uid() = blocker_id). So the caller can only ever see rows they
-- authored. A `not exists (... blocker_id = X and blocked_id = me ...)` half
-- -- "X blocked me" -- matches zero visible rows, `not exists` -> true, and
-- the clause passes. blocks filters to *what the caller wrote*, which is NOT
-- the intent. Same mechanism (RLS-on-subquery), opposite outcome. This is why
-- the block clauses shipped in 20260710120000 (posts) and 20260710160000
-- (reposts) silently enforce only one direction -- confirmed against prod:
-- "B blocks A" leaves B's posts fully readable by A.
--
-- FIX: route every block check through public.get_blocked_ids(), which is
-- SECURITY DEFINER (bypasses `blocks` RLS) and already bidirectional:
--   select blocked_id from blocks where blocker_id = auth.uid()
--   union
--   select blocker_id from blocks where blocked_id = auth.uid();
-- It is already granted to authenticated and already used by the app
-- (peopleSearch), so reusing it in policies creates NO new oracle -- the
-- caller could already learn the same set. We deliberately do NOT widen
-- `blocks` SELECT to `blocked_id = auth.uid()`, which would newly tell a
-- blocked user they've been blocked -- a product decision nobody made.
--
-- get_blocked_ids() returns only non-null uuids (blocks.blocker_id/blocked_id
-- are NOT NULL fks), so `col not in (select public.get_blocked_ids())` is
-- safe. NOTE for the next editor: `NOT IN` against a subquery that CAN yield
-- NULL silently returns zero rows -- do not add a nullable source to this
-- function without revisiting every NOT IN below.

-- get_blocked_ids() is `language sql` with no volatility marker -> defaults
-- VOLATILE, which the planner re-runs per row inside a policy and never
-- inlines. STABLE lets it hoist to an InitPlan: evaluated once per query.
alter function public.get_blocked_ids() stable;

-- ============ H2 + H5: follows INSERT respects blocks (bidirectional) ============
-- The policy already pins follower_id = auth.uid(), so both block directions
-- reduce to "the OTHER party (following_id) is on the caller's blocked set":
--   (blocker=follower=me AND blocked=following)  -> following in {blocked_id : blocker=me}
--   (blocker=following AND blocked=follower=me)  -> following in {blocker_id : blocked=me}
-- get_blocked_ids() is exactly that union, so the single NOT IN covers both
-- directions -- no two-arm EXISTS needed. Every prior conjunct preserved.
drop policy if exists "user follows user" on public.follows;
create policy "user follows user" on public.follows
for insert with check (
  ((select auth.uid()) = follower_id)
  and (
    (status = 'pending')
    or (not exists (select 1 from public.profiles where profiles.id = follows.following_id and profiles.is_private))
  )
  and (not public.current_is_suspended())
  and (following_id not in (select public.get_blocked_ids()))
);

-- ============ M4: drop the broad follows UPDATE policy ============
-- with_check pins following_id but cannot pin follower_id (RLS with_check
-- cannot reference OLD), so the target of a pending request can substitute an
-- arbitrary follower_id and fabricate "victim follows me". Grepped app for a
-- direct .update() on `follows`: none -- the only mutators are the
-- accept_follow(uuid)/reject_follow(uuid) SECURITY DEFINER RPCs
-- (components/profile/FollowRequests.tsx), which key on
-- following_id = auth.uid() and status = 'pending' and never touch
-- follower_id. Dropping the policy closes the hole with zero app breakage.
drop policy if exists "target accepts follow request" on public.follows;

-- ============ M3 + H5: comments mirror visibility AND block the AUTHOR ============
-- The post-visibility mirror already covers privacy (it inherits the post's
-- RLS). The gap is the comment's OWN author (user_id) -- a different person
-- from the post author -- who may be blocked by/blocking the viewer on an
-- otherwise-visible post. Block-checking the post author would be a no-op
-- (already covered). Owner escape first so a self-block can't hide your rows.
drop policy if exists "comments mirror post visibility" on public.comments;
create policy "comments mirror post visibility" on public.comments
for select using (
  (
    (post_id is not null and exists (select 1 from public.posts p where p.id = comments.post_id))
    or (repost_id is not null and exists (select 1 from public.reposts r where r.id = comments.repost_id))
  )
  and (
    (select auth.uid()) = comments.user_id
    or comments.user_id not in (select public.get_blocked_ids())
  )
);

-- ============ M3 + H5: reactions mirror visibility AND block the AUTHOR ============
drop policy if exists "reactions mirror post visibility" on public.reactions;
create policy "reactions mirror post visibility" on public.reactions
for select using (
  (
    (post_id is not null and exists (select 1 from public.posts p where p.id = reactions.post_id))
    or (repost_id is not null and exists (select 1 from public.reposts r where r.id = reactions.repost_id))
  )
  and (
    (select auth.uid()) = reactions.user_id
    or reactions.user_id not in (select public.get_blocked_ids())
  )
);

-- ============ H5: posts visibility -- replace one-directional blocks subquery ============
-- Every conjunct from 20260710120000 preserved verbatim EXCEPT the broken
-- direct-blocks EXISTS, swapped for the definer-backed NOT IN.
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
  and ((not posts.hidden) or (select auth.uid()) = posts.user_id or public.current_is_admin())
);

-- ============ H5: reposts visibility -- same swap ============
-- Every conjunct from 20260710160000 preserved verbatim EXCEPT the direct
-- blocks EXISTS.
drop policy if exists "reposts mirror post visibility" on public.reposts;
create policy "reposts mirror post visibility" on public.reposts
for select using (
  exists (select 1 from public.posts p where p.id = reposts.post_id)
  and (
    (select auth.uid()) = reposts.user_id
    or reposts.user_id not in (select public.get_blocked_ids())
  )
);

-- ============ H5: messages -- a blocked user could read the blocker's DM thread ============
-- Live body used `NOT EXISTS (... conversation_members cm2 JOIN blocks b ...)`
-- where the blocks JOIN runs under the caller's one-directional RLS -- so the
-- "other member blocked me" case never matched and the message stayed
-- visible. is_conversation_member() guard and the auth.uid() guard preserved
-- verbatim; only the blocks JOIN is replaced with the definer NOT IN against
-- the OTHER member's identity (cm2.user_id <> me).
drop policy if exists "member read messages" on public.messages;
create policy "member read messages" on public.messages
for select using (
  ((select auth.uid()) is not null)
  and public.is_conversation_member(conversation_id)
  and not exists (
    select 1 from public.conversation_members cm2
    where cm2.conversation_id = messages.conversation_id
      and cm2.user_id <> (select auth.uid())
      and cm2.user_id in (select public.get_blocked_ids())
  )
);
