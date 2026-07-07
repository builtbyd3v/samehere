-- Suspension was incomplete: only posts/comments/follows blocked suspended
-- users. They could still DM (harass), repost (amplify), and react. Extend the
-- with_check on those inserts. Bookmarks left alone (private, no outward harm).

alter policy "member send message" on public.messages with check (
  (auth.uid() = sender_id)
  and public.is_conversation_member(conversation_id)
  and (not exists (
    select 1
    from public.conversation_members cm2
    join public.blocks b
      on (((b.blocker_id = auth.uid()) and (b.blocked_id = cm2.user_id))
          or ((b.blocker_id = cm2.user_id) and (b.blocked_id = auth.uid())))
    where cm2.conversation_id = messages.conversation_id
      and cm2.user_id <> auth.uid()))
  and not public.current_is_suspended()
);

alter policy "user reacts to post" on public.reactions with check (
  auth.uid() = user_id and not public.current_is_suspended()
);

alter policy "repost only public-author posts" on public.reposts with check (
  (auth.uid() = user_id)
  and (exists (
    select 1 from public.posts p
    join public.profiles pr on pr.id = p.user_id
    where p.id = reposts.post_id and pr.is_private = false))
  and not public.current_is_suspended()
);
