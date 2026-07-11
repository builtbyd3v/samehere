-- Plan 025 follow-up: group membership management (add / leave / remove).
-- create_group_conversation (20260716140000_group_dms.sql) is create-only;
-- this adds the ability to grow, shrink, and depart an existing group.
--
-- Product decision: "leave" already exists generically -- leave_conversation
-- (20260711130000_report_targets_and_dm_controls.sql) sets left_at = now()
-- for auth.uid() on the caller's own conversation_members row, for ANY
-- conversation kind, and DmThreadMenu already wires it up on both the 1:1
-- and group thread headers (GroupThreadHeader renders the same menu). A
-- new `leave_group` function would duplicate that update verbatim, so this
-- migration does not add one -- the UI below calls the existing
-- leave_conversation RPC/action for the "Leave group" control instead.
--
-- What's new here is admission control (add) and creator-only removal
-- (remove), which leave_conversation has no equivalent of.

-- ============================================================
-- add_group_member: caller must be an active member of a `group` conversation;
-- target must exist, must not be blocked either-direction with the caller,
-- must not already be an active member, and the group must have room
-- (< 10 active members, mirroring create_group_conversation's 2-10 cap).
-- A member who previously left is re-activated (left_at set back to null)
-- rather than inserted twice, since (conversation_id, user_id) is the PK.
-- ============================================================
create or replace function public.add_group_member(p_conversation_id uuid, p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_kind text;
  v_active_count int;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;
  if p_member_id is null then
    raise exception 'member required';
  end if;
  if not public.is_conversation_member(p_conversation_id) then
    raise exception 'not a member of this conversation';
  end if;

  select kind into v_kind from public.conversations where id = p_conversation_id;
  if v_kind is distinct from 'group' then
    raise exception 'not a group conversation';
  end if;

  if not exists (select 1 from public.profiles where id = p_member_id) then
    raise exception 'no such user';
  end if;

  if exists (
    select 1 from public.blocks
    where (blocker_id = v_me and blocked_id = p_member_id)
       or (blocker_id = p_member_id and blocked_id = v_me)
  ) then
    raise exception 'cannot add a blocked user to a group';
  end if;

  if exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id and user_id = p_member_id and left_at is null
  ) then
    raise exception 'already a member';
  end if;

  select count(*) into v_active_count
  from public.conversation_members
  where conversation_id = p_conversation_id and left_at is null;

  if v_active_count >= 10 then
    raise exception 'group is full';
  end if;

  insert into public.conversation_members (conversation_id, user_id, left_at)
  values (p_conversation_id, p_member_id, null)
  on conflict (conversation_id, user_id) do update set left_at = null;
end;
$$;

revoke all on function public.add_group_member(uuid, uuid) from public;
grant execute on function public.add_group_member(uuid, uuid) to authenticated;
-- `revoke all from public` does not strip anon by itself in this project
-- (default-privileges trap -- anon/authenticated are granted at the schema
-- level, not via PUBLIC); name anon explicitly.
revoke execute on function public.add_group_member(uuid, uuid) from anon;

-- ============================================================
-- remove_group_member: only the group's creator (conversations.created_by)
-- may remove another member; the creator can't remove themself this way
-- (that's what leave_conversation is for). Soft-removes via left_at, same
-- as leave.
-- ============================================================
create or replace function public.remove_group_member(p_conversation_id uuid, p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_created_by uuid;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;

  select created_by into v_created_by
  from public.conversations
  where id = p_conversation_id and kind = 'group';

  if v_created_by is null then
    raise exception 'not a group conversation';
  end if;

  if v_me <> v_created_by then
    raise exception 'only the group creator can remove members';
  end if;

  if p_member_id = v_created_by then
    raise exception 'cannot remove the group creator';
  end if;

  update public.conversation_members
  set left_at = now()
  where conversation_id = p_conversation_id
    and user_id = p_member_id
    and left_at is null;
end;
$$;

revoke all on function public.remove_group_member(uuid, uuid) from public;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;
revoke execute on function public.remove_group_member(uuid, uuid) from anon;
