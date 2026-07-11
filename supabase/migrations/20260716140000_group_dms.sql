-- Plan 025: user-created group DMs (N-participant conversations), additive
-- to the existing 1:1 DM system.
--
-- Spike / Target-D decision (block semantics in groups) -- see the header
-- comment above the two new message policies below for the full reasoning.
-- Short version: block checks gate group CREATE/JOIN only; once co-members,
-- a block hides only the blocked party's messages from the blocker (never
-- the whole room). This is not a new pattern -- it is the exact shape
-- 20260714140000_clubs.sql already shipped for club chat ("club member reads
-- message" is per-sender, not per-room), reused here verbatim for groups.
--
-- kind vs title: conversations already carries `kind in ('dm','club')`
-- (added by clubs). The plan's literal spec called for a nullable `title`
-- column with NULL meaning 1:1 -- but that discriminator would require
-- teaching list_dm_inbox to also filter out titled rows, touching a function
-- three other migrations have carefully preserved byte-for-byte. Extending
-- `kind` to add 'group' costs one CHECK-constraint edit, needs zero changes
-- to list_dm_inbox (it already filters `c0.kind = 'dm'`, so group rows are
-- excluded for free), and matches the discriminator this codebase already
-- uses for club vs dm. `title` is still added, but only as a plain display
-- field, required for kind='group' and NULL for dm/club.

-- ============================================================
-- 1. conversations: kind='group' + title + created_by
-- ============================================================
alter table public.conversations drop constraint conversations_kind_check;
alter table public.conversations
  add constraint conversations_kind_check check (kind in ('dm', 'club', 'group'));

alter table public.conversations add column title text;
alter table public.conversations add column created_by uuid references public.profiles(id) on delete set null;

alter table public.conversations
  add constraint conversations_group_title_check
  check (kind <> 'group' or (title is not null and char_length(trim(title)) between 1 and 60));

-- ============================================================
-- 2. create_group_conversation: creator + 2..10 total members, no dm_pairs
--    row. Blocks are checked creator<->each invited member only (mirrors
--    get_or_create_dm's own block check; there is no pairwise check among
--    invitees -- the boundary this migration is scoped to is "don't let the
--    CREATOR add someone who blocked them / whom they blocked", not policing
--    every possible pair). Direct `public.blocks` read is correct here (not
--    get_blocked_ids()): this function is SECURITY DEFINER owned by the
--    migration role, which bypasses blocks' RLS entirely, same as
--    get_or_create_dm above it -- get_blocked_ids() exists to work around RLS
--    when the read happens inside an INVOKER-context POLICY subquery, which
--    this is not.
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

-- ============================================================
-- 3. Message RLS for groups -- ADDITIVE policies, same shape as the club
--    policies in 20260714140000_clubs.sql (per-sender block masking, not
--    per-room). The two existing DM policies ("member read messages" /
--    "member send message", most recently reproduced in
--    20260714210000_messages_kindguard_reverted.sql) are untouched -- RLS
--    OR's multiple permissive policies for the same command together, so
--    adding these changes nothing about 1:1 DM behaviour, and reuses
--    is_conversation_member (already left_at-aware, already recursion-safe)
--    with zero modification.
-- ============================================================
create policy "group member reads message" on public.messages
  for select using (
    (select auth.uid()) is not null
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.kind = 'group'
    )
    and public.is_conversation_member(conversation_id)
    and (
      sender_id = (select auth.uid())
      or not (sender_id in (select public.get_blocked_ids()))
    )
  );

create policy "group member sends message" on public.messages
  for insert with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.kind = 'group'
    )
    and public.is_conversation_member(conversation_id)
    and not public.current_is_suspended()
  );

-- ============================================================
-- 4. list_group_inbox: parallel to list_dm_inbox, NOT a mutation of it (its
--    RETURNS TABLE shape and 1:1 peer_* contract stay exactly as every prior
--    migration left them). Unlike list_dm_inbox, a blocked co-member does
--    NOT drop the group from the inbox -- consistent with Target D (blocking
--    inside a group hides that member's messages, not the whole room).
-- ============================================================
create or replace function public.list_group_inbox()
returns table (
  conversation_id uuid,
  title text,
  members jsonb,
  last_message text,
  last_message_at timestamptz,
  last_sender_id uuid,
  unread_count bigint
)
language sql
security definer
set search_path = ''
stable
as $$
  with my_convs as (
    select cm.conversation_id, cm.last_read_at
    from public.conversation_members cm
    join public.conversations c0 on c0.id = cm.conversation_id and c0.kind = 'group'
    where cm.user_id = auth.uid()
      and cm.left_at is null
  ),
  last_msgs as (
    select distinct on (m.conversation_id)
      m.conversation_id, m.content, m.created_at, m.sender_id
    from public.messages m
    join my_convs mc on mc.conversation_id = m.conversation_id
    order by m.conversation_id, m.created_at desc
  ),
  member_lists as (
    select cm.conversation_id,
           jsonb_agg(jsonb_build_object(
             'id', pr.id,
             'username', pr.username,
             'display_name', pr.display_name,
             'avatar_url', pr.avatar_url
           ) order by pr.username) as members
    from public.conversation_members cm
    join public.profiles pr on pr.id = cm.user_id
    where cm.conversation_id in (select conversation_id from my_convs)
      and cm.left_at is null
    group by cm.conversation_id
  )
  select
    mc.conversation_id,
    c.title,
    coalesce(ml.members, '[]'::jsonb),
    coalesce(lm.content, ''),
    coalesce(lm.created_at, c.updated_at),
    lm.sender_id,
    coalesce((
      select count(*)::bigint
      from public.messages m2
      where m2.conversation_id = mc.conversation_id
        and m2.sender_id <> auth.uid()
        and (mc.last_read_at is null or m2.created_at > mc.last_read_at)
    ), 0)
  from my_convs mc
  join public.conversations c on c.id = mc.conversation_id
  left join member_lists ml on ml.conversation_id = mc.conversation_id
  left join last_msgs lm on lm.conversation_id = mc.conversation_id
  order by coalesce(lm.created_at, c.updated_at) desc nulls last;
$$;

revoke all on function public.list_group_inbox() from public;
grant execute on function public.list_group_inbox() to authenticated;

-- ============================================================
-- 5. get_group_conversation: title + active member roster for the thread
--    header, gated by membership (mirrors get_dm_peer's shape but returns
--    one row per member instead of a single peer).
-- ============================================================
create or replace function public.get_group_conversation(p_conversation_id uuid)
returns table (
  title text,
  member_id uuid,
  member_username text,
  member_display_name text,
  member_avatar_url text
)
language sql
security definer
stable
set search_path = ''
as $$
  select c.title, pr.id, pr.username, pr.display_name, pr.avatar_url
  from public.conversations c
  join public.conversation_members cm on cm.conversation_id = c.id and cm.left_at is null
  join public.profiles pr on pr.id = cm.user_id
  where c.id = p_conversation_id
    and c.kind = 'group'
    and public.is_conversation_member(p_conversation_id)
  order by pr.username;
$$;

revoke all on function public.get_group_conversation(uuid) from public;
grant execute on function public.get_group_conversation(uuid) to authenticated;
