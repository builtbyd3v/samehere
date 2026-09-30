-- Plan 001: privacy + consent hardening.
-- 1. guard_profile_privileged: re-freeze last_subscription_event_at (lost when
--    20260713170000/20260716170000 re-created the function from a body that
--    predated 20260711120100) and freeze is_bot (added 20260724000000, never
--    frozen). Body copied from 20260716170000_freeze_profile_theme.sql; only
--    the two freeze lines are new.
-- 2. get_suggested_profiles: same privacy rules as search_people.
-- 3. create_group_conversation / add_group_member: the added member must
--    follow the caller (their own consent), and a member who left cannot be
--    re-added by someone else.
-- 4. guard_post_context_label_only: freeze hidden_by_suspension (authors
--    could mark their own admin-hidden post for restore on unsuspend).

-- ============================================================
-- guard_profile_privileged (stays NON-definer: it reads current_user)
-- ============================================================
create or replace function public.guard_profile_privileged()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if current_user in ('authenticated', 'anon') then
    new.is_pro := old.is_pro;
    new.is_founder := old.is_founder;
    new.is_campus_founder := old.is_campus_founder;
    new.stripe_customer_id := old.stripe_customer_id;
    new.pro_until := old.pro_until;
    new.pro_source := old.pro_source;
    new.is_admin := old.is_admin;
    new.is_suspended := old.is_suspended;
    new.email_domain := old.email_domain;
    new.verified_student := old.verified_student;
    new.last_subscription_event_at := old.last_subscription_event_at;
    new.is_bot := old.is_bot;
    if not public.is_pro_now(old.is_pro, old.pro_until) then
      new.accent_color := old.accent_color;
      new.avatar_is_animated := old.avatar_is_animated;
      new.banner_url := old.banner_url;
      new.profile_theme := old.profile_theme;
    end if;
  end if;
  return new;
end;
$function$;

-- ============================================================
-- get_suggested_profiles: mask private fields, skip suspended users,
-- respect hide_school in the filter and ranking, clamp the limit.
-- Body copied from 20260918011000_bet1_discovery_rpcs.sql. Signature unchanged.
-- ============================================================
create or replace function public.get_suggested_profiles(p_school text default null, p_limit int default 3)
returns table(
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  year text,
  major text,
  goals text,
  bio text,
  is_pro boolean,
  is_founder boolean,
  is_campus_founder boolean,
  verified_student boolean,
  school text
)
language sql
security definer
set search_path = ''
stable
as $$
  with viewer as (
    select
      p.study_mode,
      coalesce(p.open_to, '{}'::text[]) as open_to,
      case when p.hide_school then null else ps.school end as school
    from public.profiles p
    left join public.profile_school ps on ps.profile_id = p.id
    where p.id = auth.uid()
  )
  select
    p.id, p.username, p.display_name, p.avatar_url,
    case when p.is_private then null else p.year end,
    case when p.is_private then null else p.major end,
    case when p.is_private then null else p.goals end,
    case when p.is_private then null else p.bio end,
    p.is_pro, p.is_founder, p.is_campus_founder, p.verified_student,
    case when p.hide_school then null else ps.school end
  from public.profiles p
  left join public.profile_school ps on ps.profile_id = p.id
  left join viewer v on true
  where auth.uid() is not null
    and p.id <> auth.uid()
    and p.is_suspended = false
    and p.id not in (select public.get_blocked_ids())
    and not exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.following_id = p.id
    )
    and (p_school is null or (not p.hide_school and ps.school = p_school))
  order by
    (not p.is_private and p.study_mode is not null and v.study_mode is not null and p.study_mode = v.study_mode) desc,
    case when p.is_private then 0 else (
      select count(*)::int
      from unnest(coalesce(p.open_to, '{}'::text[])) as t(tag)
      where t.tag = any(v.open_to)
    ) end desc,
    (not p.hide_school and ps.school is not null and v.school is not null and ps.school = v.school) desc,
    p.verified_student desc,
    p.created_at desc
  limit least(20, greatest(1, coalesce(p_limit, 3)));
$$;

revoke all on function public.get_suggested_profiles(text, int) from public, anon, authenticated;
grant execute on function public.get_suggested_profiles(text, int) to authenticated;

-- Group functions below: bodies copied from 20260716230000_group_add_follow_edge.sql.
-- Changes: the added member must follow the caller, and add_group_member
-- refuses to re-add someone who left.
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
        and f.follower_id = v_member
        and f.following_id = v_me
    ) then
      raise exception 'can only add people who follow you';
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
      and f.follower_id = p_member_id
      and f.following_id = v_me
  ) then
    raise exception 'can only add people who follow you';
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

  if exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id and user_id = p_member_id and left_at is not null
  ) then
    raise exception 'they left this group';
  end if;

  insert into public.conversation_members (conversation_id, user_id, left_at)
  values (p_conversation_id, p_member_id, null);
end;
$$;

revoke all on function public.add_group_member(uuid, uuid) from public;
grant execute on function public.add_group_member(uuid, uuid) to authenticated;
-- `revoke all from public` does not strip anon by itself in this project
-- (default-privileges trap -- anon/authenticated are granted at the schema
-- level, not via PUBLIC); name anon explicitly.
revoke execute on function public.add_group_member(uuid, uuid) from anon;

-- ============================================================
-- guard_post_context_label_only: body copied from
-- 20260910100000_portfolio_data_contracts.sql; only the hidden_by_suspension
-- freeze line is new. create or replace keeps the trigger binding.
-- ============================================================
create or replace function public.guard_post_context_label_only()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if current_user in ('authenticated', 'anon') then
    new.id := old.id;
    new.user_id := old.user_id;
    new.content := old.content;
    new.created_at := old.created_at;
    new.hidden := old.hidden;
    new.media := old.media;
    new.post_type := old.post_type;
    new.hidden_by_suspension := old.hidden_by_suspension;
  end if;
  return new;
end;
$function$;

revoke all on function public.guard_post_context_label_only() from public;
