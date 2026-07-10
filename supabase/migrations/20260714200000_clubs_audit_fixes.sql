-- Fixes from the community security+optimization audit.
--
-- #1 (HIGH): clubs delete gated on created_by (immutable) instead of the live
--   role, so a founder who transfers ownership and leaves keeps a permanent
--   delete kill-switch. Mirror the update policy: gate on club_role='owner'.
-- #2 (HIGH): messages has two permissive policies per command (DM + club). A
--   club message still evaluates the DM policy's is_conversation_member (always
--   false for club channels) before can_read_channel, ~2x RLS cost on the
--   hottest realtime path. Lead each policy with a cheap PK-indexed
--   conversations.kind guard so the wrong branch short-circuits. DM semantics
--   are byte-identical otherwise.
-- #3 (MEDIUM): every new club table kept the default TRUNCATE + unbacked
--   INSERT/UPDATE/DELETE grant to authenticated (revoke-from-public never
--   removed it). Revoke all from authenticated, re-grant only what the policies
--   back -- mirroring what threads.sql did correctly.
-- #6 (LOW): two ON DELETE CASCADE FKs lack a leading index -> cascade scans.

-- ============================================================
-- #1 delete policy follows live role, not created_by.
-- ============================================================
drop policy "clubs owner delete" on public.clubs;
create policy "clubs owner delete" on public.clubs
  for delete using (public.club_role(id) = 'owner');

-- ============================================================
-- #2 kind-guard the four messages policies. DM policies short-circuit on club
--    messages; club policies short-circuit on DM messages.
-- ============================================================
drop policy "member read messages" on public.messages;
create policy "member read messages" on public.messages
  for select using (
    (select auth.uid()) is not null
    and exists (select 1 from public.conversations c where c.id = messages.conversation_id and c.kind = 'dm')
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
    and exists (select 1 from public.conversations c where c.id = messages.conversation_id and c.kind = 'dm')
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
    and exists (select 1 from public.conversations c where c.id = messages.conversation_id and c.kind = 'club')
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
    and exists (select 1 from public.conversations c where c.id = messages.conversation_id and c.kind = 'club')
    and public.can_read_channel(conversation_id)
    and not public.current_is_suspended()
  );

-- ============================================================
-- #3 least-privilege the club table grants. Revoke the default all-privileges
--    grant to authenticated, then re-grant only what each table's policies back.
-- ============================================================
revoke all on table public.clubs from authenticated;
grant select, insert, update, delete on table public.clubs to authenticated;

revoke all on table public.club_members from authenticated;
grant select on table public.club_members to authenticated;

revoke all on table public.club_role_history from authenticated;
grant select on table public.club_role_history to authenticated;

revoke all on table public.club_announcements from authenticated;
grant select, insert, delete on table public.club_announcements to authenticated;

revoke all on table public.club_channels from authenticated;
grant select on table public.club_channels to authenticated;

-- ============================================================
-- #6 index the two cascade FKs so club/account deletion seeks, not scans.
-- ============================================================
create index club_role_history_club_id_idx on public.club_role_history (club_id);
create index club_announcements_author_id_idx on public.club_announcements (author_id);
