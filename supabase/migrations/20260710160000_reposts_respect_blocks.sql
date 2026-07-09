-- 20260710120000 added a bidirectional `blocks` check to the `posts` SELECT
-- policy but left `reposts` alone. The reposts mirror only resolves through the
-- ORIGINAL POST's author, never the reposter:
--
--   A blocks B. B reposts a public post by C (unrelated to A).
--   `posts` visibility passes (C is not blocked by A), so A reads B's repost
--   straight off /rest/v1/reposts — and, because comments/reactions mirror
--   through `reposts`, A reads that repost's engagement too.
--
-- Same conjunct as the posts policy, applied to reposts.user_id. Owner escape
-- first so a user always sees their own reposts.

drop policy if exists "reposts mirror post visibility" on public.reposts;
create policy "reposts mirror post visibility" on public.reposts
for select using (
  exists (select 1 from public.posts p where p.id = reposts.post_id)
  and (
    (select auth.uid()) = reposts.user_id
    or not exists (
      select 1 from public.blocks b
      where (b.blocker_id = (select auth.uid()) and b.blocked_id = reposts.user_id)
         or (b.blocker_id = reposts.user_id and b.blocked_id = (select auth.uid()))
    )
  )
);
