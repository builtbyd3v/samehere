-- Fix conversation_members RLS infinite recursion (policy was self-referential).
-- Use SECURITY DEFINER helpers so membership checks bypass RLS.

create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id and user_id = auth.uid()
  );
$$;

revoke all on function public.is_conversation_member(uuid) from public;
grant execute on function public.is_conversation_member(uuid) to authenticated;

drop policy if exists "member read peers" on public.conversation_members;
drop policy if exists "own membership read" on public.conversation_members;

create policy "member read peers" on public.conversation_members
  for select using (public.is_conversation_member(conversation_id));

drop policy if exists "member read conversation" on public.conversations;

create policy "member read conversation" on public.conversations
  for select using (
    auth.uid() is not null and public.is_conversation_member(id)
  );

-- Peer profile for a thread the viewer belongs to.
create or replace function public.get_dm_peer(p_conversation_id uuid)
returns table (
  peer_id uuid,
  peer_username text,
  peer_display_name text,
  peer_avatar_url text
)
language sql
security definer
stable
set search_path = public
as $$
  select pr.id, pr.username, pr.display_name, pr.avatar_url
  from public.conversation_members cm
  join public.profiles pr on pr.id = cm.user_id
  where cm.conversation_id = p_conversation_id
    and cm.user_id <> auth.uid()
    and public.is_conversation_member(p_conversation_id)
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = cm.user_id)
         or (b.blocker_id = cm.user_id and b.blocked_id = auth.uid())
    )
  limit 1;
$$;

revoke all on function public.get_dm_peer(uuid) from public;
grant execute on function public.get_dm_peer(uuid) to authenticated;

drop policy if exists "member read messages" on public.messages;
drop policy if exists "member send message" on public.messages;

create policy "member read messages" on public.messages
  for select using (
    auth.uid() is not null
    and public.is_conversation_member(conversation_id)
    and not exists (
      select 1
      from public.conversation_members cm2
      join public.blocks b on (
        (b.blocker_id = auth.uid() and b.blocked_id = cm2.user_id)
        or (b.blocker_id = cm2.user_id and b.blocked_id = auth.uid())
      )
      where cm2.conversation_id = messages.conversation_id
        and cm2.user_id <> auth.uid()
    )
  );

create policy "member send message" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and public.is_conversation_member(conversation_id)
    and not exists (
      select 1
      from public.conversation_members cm2
      join public.blocks b on (
        (b.blocker_id = auth.uid() and b.blocked_id = cm2.user_id)
        or (b.blocker_id = cm2.user_id and b.blocked_id = auth.uid())
      )
      where cm2.conversation_id = messages.conversation_id
        and cm2.user_id <> auth.uid()
    )
  );
