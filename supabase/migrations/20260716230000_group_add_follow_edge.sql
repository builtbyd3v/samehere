-- Fix: create_group_conversation (20260716140000_group_dms.sql) and
-- add_group_member (20260716200000_group_membership.sql) only rejected
-- blocked pairs -- the "followed-only" rule was enforced solely client-side
-- (listFollowedForGroup), so either RPC let a caller pull an arbitrary
-- non-blocking stranger into a group with an attacker-chosen title. Both
-- bodies are copied verbatim from their source migrations, adding one
-- relationship check per added member: an accepted follows row must exist
-- in either direction between the caller and that member. Everything else
-- (block check, size cap, kind check) is unchanged.

-- ============================================================
-- create_group_conversation
-- ============================================================
create or replace function public.create_group_conversation(p_title text, p_member_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_title text := trim(coalesce(p_title, ''));
  v_members uuid[];
  v_member uuid;
  v_total int;
  v_conv uuid;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;
  if char_length(v_title) < 1 or char_length(v_title) > 60 then
    raise exception 'group title must be 1-60 characters';
  end if;
  if p_member_ids is null or array_length(p_member_ids, 1) is null then
    raise exception 'at least one other member required';
  end if;

  select array_agg(distinct m) into v_members
  from unnest(p_member_ids) as m
  where m <> v_me;

  v_total := coalesce(array_length(v_members, 1), 0) + 1;
  if v_total < 2 or v_total > 10 then
    raise exception 'group must have between 2 and 10 members';
  end if;

  foreach v_member in array v_members loop
    if not exists (select 1 from public.profiles where id = v_member) then
      raise exception 'no such user';
    end if;
    if exists (
      select 1 from public.blocks
      where (blocker_id = v_me and blocked_id = v_member)
         or (blocker_id = v_member and blocked_id = v_me)
    ) then
      raise exception 'cannot add a blocked user to a group';
    end if;
    if not exists (
      select 1 from public.follows f
      where f.status = 'accepted'
        and ((f.follower_id = v_me and f.following_id = v_member)
          or (f.follower_id = v_member and f.following_id = v_me))
    ) then
      raise exception 'can only add people you follow or who follow you';
    end if;
  end loop;

  insert into public.conversations (kind, title, created_by)
  values ('group', v_title, v_me)
  returning id into v_conv;

  insert into public.conversation_members (conversation_id, user_id) values (v_conv, v_me);
  foreach v_member in array v_members loop
    insert into public.conversation_members (conversation_id, user_id) values (v_conv, v_member);
  end loop;

  return v_conv;
end;
$$;

revoke all on function public.create_group_conversation(text, uuid[]) from public;
grant execute on function public.create_group_conversation(text, uuid[]) to authenticated;
-- `revoke all from public` does not strip anon by itself in this project
-- (default-privileges trap -- anon/authenticated are granted at the schema
-- level, not via PUBLIC); name anon explicitly.
revoke execute on function public.create_group_conversation(text, uuid[]) from anon;

-- ============================================================
-- add_group_member
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

  if not exists (
    select 1 from public.follows f
    where f.status = 'accepted'
      and ((f.follower_id = v_me and f.following_id = p_member_id)
        or (f.follower_id = p_member_id and f.following_id = v_me))
  ) then
    raise exception 'can only add people you follow or who follow you';
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
