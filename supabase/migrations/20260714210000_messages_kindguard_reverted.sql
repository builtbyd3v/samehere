-- Revert the #2 "kind-guard" message-policy change from 20260714200000.
--
-- That change added `exists (select 1 from public.conversations c where
-- c.id = messages.conversation_id and c.kind = 'dm'/'club')` to each messages
-- policy to short-circuit the wrong branch. It was WRONG: that subquery runs
-- under the caller's RLS, and the conversations SELECT policy only lets
-- conversation MEMBERS see a row. Club channels have no conversation_members
-- rows (v2 gates on role, not membership), so a club member could not select
-- their channel's conversations row -> the guard was always false -> ALL club
-- chat send/read was blocked. Caught by a live send+read round-trip, not by the
-- migration succeeding.
--
-- Restore the original working policies (identical to what 20260714140000 /
-- 20260714160000 created). The double-permissive-policy cost the audit flagged
-- stands as an accepted ceiling:
-- ponytail: two permissive policies per command on messages -- a club message
-- evaluates is_conversation_member (false) and a DM message evaluates
-- can_read_channel (false), i.e. two RLS function calls per row. Fine at
-- current chat volume. If message throughput ever makes RLS eval hot, collapse
-- to one policy per command that branches via a SECURITY DEFINER
-- conversation_kind(uuid) helper (definer so it bypasses the conversations
-- RLS that broke the inline attempt).

drop policy "member read messages" on public.messages;
create policy "member read messages" on public.messages
  for select using (
    (select auth.uid()) is not null
    and public.is_conversation_member(conversation_id)
    and not (exists (
      select 1 from public.conversation_members cm2
      where cm2.conversation_id = messages.conversation_id
        and cm2.user_id <> (select auth.uid())
        and cm2.user_id in (select public.get_blocked_ids())
    ))
  );

drop policy "member send message" on public.messages;
create policy "member send message" on public.messages
  for insert with check (
    (select auth.uid()) = sender_id
    and public.is_conversation_member(conversation_id)
    and not (exists (
      select 1 from public.conversation_members cm2
      where cm2.conversation_id = messages.conversation_id
        and cm2.user_id <> (select auth.uid())
        and cm2.user_id in (select public.get_blocked_ids())
    ))
    and not public.current_is_suspended()
  );

drop policy "club channel reads message" on public.messages;
create policy "club channel reads message" on public.messages
  for select using (
    (select auth.uid()) is not null
    and public.can_read_channel(conversation_id)
    and (
      sender_id = (select auth.uid())
      or not (sender_id in (select public.get_blocked_ids()))
    )
  );

drop policy "club channel sends message" on public.messages;
create policy "club channel sends message" on public.messages
  for insert with check (
    (select auth.uid()) = sender_id
    and public.can_read_channel(conversation_id)
    and not public.current_is_suspended()
  );
