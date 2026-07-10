-- Clubs v1: a CREDENTIAL system, not a posting surface.
--
-- Deliberately NOT built here: posts.club_id, any change to the posts SELECT
-- policy, or contribution points for club activity. Club content lives in a
-- group chat (conversations.kind = 'club') + pinned announcements
-- (club_announcements). Joining, leading, or posting an announcement in a
-- club earns zero heatmap points -- clubs are about who-belongs-where and
-- who-held-what-role (a resume-grade claim backed by club_role_history), not
-- another farmable action.
--
-- Verified against live prod before writing this file (per the dispatch brief):
--   - posts/messages/list_dm_inbox facts below are taken as given, not
--     re-queried. This migration does not touch posts at all.
--   - conversations/conversation_members/messages already exist; messages is
--     already in the supabase_realtime publication (untouched here).
--   - is_conversation_member(uuid) is SECURITY DEFINER, checks auth.uid() AND
--     left_at is null -- reused as-is for club conversations, no change.
--   - The live messages SELECT/INSERT policies are reproduced verbatim in the
--     "existing DM policy unchanged" comment below; this migration only ADDS
--     two new policies for the same commands (RLS OR's policies for the same
--     command together), so DM behaviour is byte-identical after this file.
--   - list_dm_inbox's most recent body (20260711130000, with peer_is_pro +
--     `left_at is null`) is reproduced byte-for-byte below with exactly one
--     added join condition -- see that section.
--   - Drop+create of a public function silently re-grants EXECUTE to anon via
--     Supabase default privileges (known trap); every new function here uses
--     `revoke all ... from public` + explicit `grant ... to authenticated`
--     rather than relying on ACL preservation, since none of these are
--     CREATE OR REPLACE of a pre-existing signature except list_dm_inbox
--     (identical signature, ACL preserved, no re-grant risk).
--
-- What this migration OWNS: clubs, club_members, club_role_history,
-- club_announcements tables + all their RLS/grants/indexes; conversations.kind;
-- the club-conversation additive messages policies; the list_dm_inbox club
-- exclusion guard.
--
-- What this migration deliberately does NOT do: no posts.club_id, no posts
-- RLS change, no contribution_log award for any club action, no modification
-- or removal of the two existing DM messages policies (only additive new
-- ones), no service_role usage anywhere (all writes go through SECURITY
-- DEFINER functions callable by `authenticated`, mirroring request_follow /
-- accept_follow).

-- ============================================================
-- 0. conversations.kind -- distinguishes a DM thread from a club's group chat.
--    Existing rows are all DMs; default backfills them for free.
-- ============================================================
alter table public.conversations
  add column kind text not null default 'dm' check (kind in ('dm', 'club'));

-- ============================================================
-- 1. Tables
-- ============================================================

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null
    check (slug ~ '^[a-z0-9-]{3,40}$' and slug not in ('new', 'create', 'edit', 'api')),
  name text not null check (char_length(name) between 2 and 60),
  purpose text not null check (char_length(purpose) between 10 and 280),
  tags text[] not null default '{}' check (coalesce(array_length(tags, 1), 0) <= 5),
  is_open boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid unique references public.conversations(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.club_members (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'officer', 'member')),
  title text check (title is null or char_length(title) between 2 and 30),
  status text not null default 'accepted' check (status in ('pending', 'accepted')),
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

-- Append-only provenance behind a resume claim ("I was Treasurer of X").
-- No INSERT/UPDATE/DELETE policy anywhere below -- written exclusively by the
-- club_members_track_role_history trigger (section 5).
create table public.club_role_history (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'officer', 'member')),
  title text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- A notice, not a post: no reactions, no comments, no contribution points.
create table public.club_announcements (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. Indexes
-- ============================================================
create index club_members_user_id_idx on public.club_members (user_id);
create index club_members_club_status_idx on public.club_members (club_id, status);
create index club_announcements_club_created_idx on public.club_announcements (club_id, created_at desc);
create index clubs_tags_gin_idx on public.clubs using gin (tags);
create index clubs_created_by_idx on public.clubs (created_by);
create index club_role_history_user_club_idx on public.club_role_history (user_id, club_id);

-- ============================================================
-- 3. Definer helpers used by policies and the mutation functions below.
--    club_members' own SELECT policy calls club_role() (definer) rather than
--    a plain subquery on club_members, or it would recurse against itself.
-- ============================================================
create function public.is_club_member(p_club uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.club_members
    where club_id = p_club and user_id = auth.uid() and status = 'accepted'
  );
$$;

revoke all on function public.is_club_member(uuid) from public;
grant execute on function public.is_club_member(uuid) to authenticated;

create function public.club_role(p_club uuid)
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select role from public.club_members
  where club_id = p_club and user_id = auth.uid() and status = 'accepted';
$$;

revoke all on function public.club_role(uuid) from public;
grant execute on function public.club_role(uuid) to authenticated;

-- ============================================================
-- 4. RLS + grants
-- ============================================================
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.club_role_history enable row level security;
alter table public.club_announcements enable row level security;

-- clubs: discovery is open to any logged-in user. Mutation is definer-free
-- here (owner writes go straight through RLS, unlike club_members) because
-- name/purpose/tags/is_open are cosmetic; the guard trigger below (section 6)
-- freezes the columns that would otherwise let an owner rewrite provenance.
create policy "clubs read" on public.clubs
  for select using ((select auth.uid()) is not null);

create policy "clubs insert" on public.clubs
  for insert with check (
    created_by = (select auth.uid()) and not public.current_is_suspended()
  );

create policy "clubs owner update" on public.clubs
  for update using (public.club_role(id) = 'owner');

create policy "clubs owner delete" on public.clubs
  for delete using (created_by = (select auth.uid()));

revoke all on table public.clubs from anon;
grant select, insert, update, delete on table public.clubs to authenticated;

-- club_members: SELECT only. Every mutation is a SECURITY DEFINER function
-- (section 7), mirroring request_follow/accept_follow.
create policy "club members read" on public.club_members
  for select using (
    (select auth.uid()) is not null
    and (
      status = 'accepted'
      or user_id = (select auth.uid())
      or public.club_role(club_id) in ('owner', 'officer')
    )
  );

revoke all on table public.club_members from anon;
grant select on table public.club_members to authenticated;

-- club_role_history: SELECT only, no INSERT/UPDATE/DELETE policy at all --
-- the append-only trigger writes it as SECURITY DEFINER, bypassing RLS.
create policy "club role history read" on public.club_role_history
  for select using ((select auth.uid()) is not null);

revoke all on table public.club_role_history from anon;
grant select on table public.club_role_history to authenticated;

-- club_announcements
create policy "club announcements read" on public.club_announcements
  for select using (public.is_club_member(club_id));

create policy "club announcements insert" on public.club_announcements
  for insert with check (
    author_id = (select auth.uid())
    and public.club_role(club_id) in ('owner', 'officer')
    and not public.current_is_suspended()
  );

create policy "club announcements delete" on public.club_announcements
  for delete using (
    author_id = (select auth.uid()) or public.club_role(club_id) = 'owner'
  );

revoke all on table public.club_announcements from anon;
grant select, insert, delete on table public.club_announcements to authenticated;

-- ============================================================
-- 5. club_role_history writer: AFTER INSERT of an accepted row, and AFTER
--    UPDATE OF role/title/status -- close the open row, then insert the new
--    one. `title` never gates anything; it only ever rides along for display.
--
--    club_approve's pending -> accepted transition is an UPDATE of `status`
--    only (not role/title, not an INSERT), so it needs its own branch: a
--    pending member never got a row at INSERT time (guarded by
--    `new.status = 'accepted'` there), so there is nothing to close -- just
--    open one. Guarded by `old.status = 'pending'` so an accepted->accepted
--    no-op update (e.g. a role/title-only update on an already-accepted row)
--    can never re-enter this branch and double-insert.
-- ============================================================
create function public.club_members_track_role_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    if new.status = 'accepted' then
      insert into public.club_role_history (club_id, user_id, role, title, started_at)
      values (new.club_id, new.user_id, new.role, new.title, now());
    end if;
    return new;
  end if;

  if old.status = 'pending' and new.status = 'accepted' then
    insert into public.club_role_history (club_id, user_id, role, title, started_at)
    values (new.club_id, new.user_id, new.role, new.title, now());
    return new;
  end if;

  if new.role is distinct from old.role or new.title is distinct from old.title then
    update public.club_role_history
    set ended_at = now()
    where club_id = new.club_id and user_id = new.user_id and ended_at is null;

    insert into public.club_role_history (club_id, user_id, role, title, started_at)
    values (new.club_id, new.user_id, new.role, new.title, now());
  end if;
  return new;
end;
$function$;

create trigger club_members_role_history_ins
  after insert on public.club_members
  for each row execute function public.club_members_track_role_history();

create trigger club_members_role_history_upd
  after update of role, title, status on public.club_members
  for each row execute function public.club_members_track_role_history();

-- ============================================================
-- 6. clubs guard trigger -- freezes slug/created_by/conversation_id/created_at
--    against any UPDATE. Pattern copied from guard_profile_privileged: NON
--    definer, reads current_user to tell a direct client request (role
--    'authenticated'/'anon') apart from a trusted SECURITY DEFINER caller
--    (whose current_user becomes the function owner for the call), which is
--    exactly how clubs_after_insert (section 8) is allowed to set
--    conversation_id once, right after creation, while an owner never can.
-- ============================================================
create function public.guard_clubs_privileged()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if current_user in ('authenticated', 'anon') then
    new.slug := old.slug;
    new.created_by := old.created_by;
    new.conversation_id := old.conversation_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$function$;

create trigger clubs_guard_privileged
  before update on public.clubs
  for each row execute function public.guard_clubs_privileged();

-- ============================================================
-- 7. rl_check_clubs -- cloned from rl_check_posts. Coarse per-user window,
--    same ceiling as the rest of the rate limiters in this codebase.
--    ponytail: coarse per-user window check; swap for a real limiter only if
--    abuse shows.
-- ============================================================
create function public.rl_check_clubs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select count(*) from public.clubs
      where created_by = new.created_by and created_at > now() - interval '24 hours') >= 2 then
    raise exception 'rate limit: too many clubs, slow down';
  end if;
  return new;
end;
$function$;

create trigger clubs_rate_limit
  before insert on public.clubs
  for each row execute function public.rl_check_clubs();

-- ============================================================
-- 8. clubs_after_insert -- bootstraps a club's group chat + owner membership.
--    Runs SECURITY DEFINER so its own UPDATE of clubs.conversation_id passes
--    through guard_clubs_privileged untouched (see section 6).
-- ============================================================
create function public.clubs_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_conv uuid;
begin
  insert into public.conversations (kind) values ('club') returning id into v_conv;

  update public.clubs set conversation_id = v_conv where id = new.id;

  insert into public.club_members (club_id, user_id, role, status)
  values (new.id, new.created_by, 'owner', 'accepted');

  insert into public.conversation_members (conversation_id, user_id)
  values (v_conv, new.created_by);

  return new;
end;
$function$;

create trigger clubs_after_insert_trg
  after insert on public.clubs
  for each row execute function public.clubs_after_insert();

-- ============================================================
-- 9. Mutation functions -- club_members has no INSERT/UPDATE/DELETE policy;
--    every write goes through one of these, mirroring request_follow /
--    accept_follow / reject_follow. Each keeps club_members and
--    conversation_members in sync (point 7 of the brief): an accepted row
--    always implies a conversation_members row.
-- ============================================================

-- Join (or request to join) a club. Returns the resulting status.
create function public.club_join(p_club uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_me uuid := auth.uid();
  v_owner uuid;
  v_open boolean;
  v_conv uuid;
  v_status text;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if public.current_is_suspended() then raise exception 'account suspended'; end if;

  select created_by, is_open, conversation_id into v_owner, v_open, v_conv
  from public.clubs where id = p_club;
  if not found then raise exception 'no such club'; end if;

  if exists (select 1 from public.club_members where club_id = p_club and user_id = v_me) then
    raise exception 'already a member';
  end if;

  if exists (
    select 1 from public.blocks
    where (blocker_id = v_me and blocked_id = v_owner)
       or (blocker_id = v_owner and blocked_id = v_me)
  ) then
    raise exception 'cannot join this club';
  end if;

  v_status := case when v_open then 'accepted' else 'pending' end;

  insert into public.club_members (club_id, user_id, role, status)
  values (p_club, v_me, 'member', v_status);

  if v_status = 'accepted' and v_conv is not null then
    insert into public.conversation_members (conversation_id, user_id)
    values (v_conv, v_me)
    on conflict (conversation_id, user_id) do update set left_at = null;
  end if;

  return v_status;
end;
$function$;

revoke all on function public.club_join(uuid) from public;
grant execute on function public.club_join(uuid) to authenticated;

-- Leave (or withdraw a pending request). The last remaining accepted owner
-- may not leave -- transfer ownership first via club_set_role.
create function public.club_leave(p_club uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_me uuid := auth.uid();
  v_role text;
  v_conv uuid;
  v_owner_count int;
begin
  if v_me is null then raise exception 'not authenticated'; end if;

  select role into v_role from public.club_members
  where club_id = p_club and user_id = v_me;
  if not found then raise exception 'not a member'; end if;

  if v_role = 'owner' then
    -- Row-lock the club's accepted owners before counting, so two owners
    -- leaving/being-demoted concurrently under READ COMMITTED can't both
    -- observe the same pre-decrement count and both pass this guard.
    perform 1 from public.club_members
    where club_id = p_club and role = 'owner' and status = 'accepted'
    for update;

    select count(*) into v_owner_count from public.club_members
    where club_id = p_club and role = 'owner' and status = 'accepted';
    if v_owner_count <= 1 then
      raise exception 'the last owner cannot leave; transfer ownership first';
    end if;
  end if;

  -- Close the open history row BEFORE deleting the membership. The row-history
  -- trigger only fires on INSERT/UPDATE of club_members, so a DELETE would
  -- otherwise leave ended_at null forever -- i.e. every departed member still
  -- reads as serving, in the one table whose whole purpose is a bounded,
  -- provable term. History stays append-only to callers (no UPDATE policy);
  -- this definer is the only writer.
  update public.club_role_history
  set ended_at = now()
  where club_id = p_club and user_id = v_me and ended_at is null;

  delete from public.club_members where club_id = p_club and user_id = v_me;

  select conversation_id into v_conv from public.clubs where id = p_club;
  if v_conv is not null then
    update public.conversation_members
    set left_at = now()
    where conversation_id = v_conv and user_id = v_me and left_at is null;
  end if;
end;
$function$;

revoke all on function public.club_leave(uuid) from public;
grant execute on function public.club_leave(uuid) to authenticated;

-- Approve a pending request. Caller must already be owner|officer.
create function public.club_approve(p_club uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_role text := public.club_role(p_club);
  v_conv uuid;
  v_updated int;
begin
  if v_role is null or v_role not in ('owner', 'officer') then
    raise exception 'not authorized';
  end if;

  update public.club_members
  set status = 'accepted'
  where club_id = p_club and user_id = p_user and status = 'pending';
  get diagnostics v_updated = row_count;

  if v_updated > 0 then
    select conversation_id into v_conv from public.clubs where id = p_club;
    if v_conv is not null then
      insert into public.conversation_members (conversation_id, user_id)
      values (v_conv, p_user)
      on conflict (conversation_id, user_id) do update set left_at = null;
    end if;
  end if;
end;
$function$;

revoke all on function public.club_approve(uuid, uuid) from public;
grant execute on function public.club_approve(uuid, uuid) to authenticated;

-- Reject a pending request. Caller must already be owner|officer.
create function public.club_reject(p_club uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_role text := public.club_role(p_club);
begin
  if v_role is null or v_role not in ('owner', 'officer') then
    raise exception 'not authorized';
  end if;

  delete from public.club_members
  where club_id = p_club and user_id = p_user and status = 'pending';
end;
$function$;

revoke all on function public.club_reject(uuid, uuid) from public;
grant execute on function public.club_reject(uuid, uuid) to authenticated;

-- Set an accepted member's role/display title. Caller must be OWNER. Cannot
-- demote the last owner; cannot act on a pending member.
create function public.club_set_role(p_club uuid, p_user uuid, p_role text, p_title text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_caller_role text := public.club_role(p_club);
  v_target_role text;
  v_target_status text;
  v_owner_count int;
begin
  if v_caller_role is distinct from 'owner' then
    raise exception 'not authorized';
  end if;
  if p_role not in ('owner', 'officer', 'member') then
    raise exception 'invalid role';
  end if;

  select role, status into v_target_role, v_target_status
  from public.club_members where club_id = p_club and user_id = p_user;
  if not found then raise exception 'no such member'; end if;
  if v_target_status <> 'accepted' then
    raise exception 'cannot act on a pending member';
  end if;

  if v_target_role = 'owner' and p_role <> 'owner' then
    -- Same row-lock-before-count as club_leave -- locks the same underlying
    -- owner rows, so a concurrent club_leave and club_set_role on the same
    -- club serialize against each other too, not just two calls of one fn.
    perform 1 from public.club_members
    where club_id = p_club and role = 'owner' and status = 'accepted'
    for update;

    select count(*) into v_owner_count from public.club_members
    where club_id = p_club and role = 'owner' and status = 'accepted';
    if v_owner_count <= 1 then
      raise exception 'cannot demote the last owner';
    end if;
  end if;

  update public.club_members
  set role = p_role, title = p_title
  where club_id = p_club and user_id = p_user;
end;
$function$;

revoke all on function public.club_set_role(uuid, uuid, text, text) from public;
grant execute on function public.club_set_role(uuid, uuid, text, text) to authenticated;

-- ============================================================
-- 10. messages: two ADDITIVE policies for club conversations. The two
--     existing DM policies ("member read messages" / "member send message")
--     are untouched -- reproduced here only as a comment for contrast, not
--     re-created:
--       SELECT "member read messages": auth.uid() is not null AND
--         is_conversation_member(conversation_id) AND NOT EXISTS (select 1
--         from conversation_members cm2 where cm2.conversation_id =
--         messages.conversation_id and cm2.user_id <> auth.uid() and
--         cm2.user_id in (select get_blocked_ids()))
--       INSERT "member send message": auth.uid() = sender_id AND
--         is_conversation_member(conversation_id) AND NOT EXISTS (same
--         blocked-member subquery) AND NOT current_is_suspended()
--     That DM SELECT policy hides the WHOLE conversation the moment ANY other
--     member is blocked -- fine for 2 people, but in a 40-member club it
--     blackholes the room for anyone who has ever blocked (or been blocked
--     by) a single other member. The club policy below is per-SENDER instead:
--     a message is visible unless the room member reading it has personally
--     blocked (or been blocked by) that specific sender.
--     RLS OR's multiple policies for the same command together, so adding
--     these changes nothing about DM behaviour.
-- ============================================================
create policy "club member reads message" on public.messages
  for select using (
    (select auth.uid()) is not null
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.kind = 'club'
    )
    and public.is_conversation_member(conversation_id)
    and (
      sender_id = (select auth.uid())
      or not (sender_id in (select public.get_blocked_ids()))
    )
  );

create policy "club member sends message" on public.messages
  for insert with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.kind = 'club'
    )
    and public.is_conversation_member(conversation_id)
    and not public.current_is_suspended()
  );

-- ============================================================
-- 11. list_dm_inbox: one added guard so club conversations never reach the DM
--     inbox or the unread badge. Body copied byte-for-byte from its most
--     recent definition (20260711130000_report_targets_and_dm_controls.sql)
--     -- identical signature, so CREATE OR REPLACE preserves the existing ACL
--     and avoids the anon re-grant trap. The ONLY change is the added
--     `join public.conversations c0 ... and c0.kind = 'dm'` inside my_convs.
-- ============================================================
create or replace function public.list_dm_inbox()
returns table (
  conversation_id uuid,
  peer_id uuid,
  peer_username text,
  peer_display_name text,
  peer_avatar_url text,
  peer_is_pro boolean,
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
    join public.conversations c0 on c0.id = cm.conversation_id and c0.kind = 'dm'
    where cm.user_id = auth.uid()
      and cm.left_at is null
  ),
  peers as (
    select mc.conversation_id, mc.last_read_at, cm2.user_id as peer_id
    from my_convs mc
    join public.conversation_members cm2
      on cm2.conversation_id = mc.conversation_id and cm2.user_id <> auth.uid()
    where not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = cm2.user_id)
         or (b.blocker_id = cm2.user_id and b.blocked_id = auth.uid())
    )
  ),
  last_msgs as (
    select distinct on (m.conversation_id)
      m.conversation_id, m.content, m.created_at, m.sender_id
    from public.messages m
    join peers p on p.conversation_id = m.conversation_id
    order by m.conversation_id, m.created_at desc
  )
  select
    p.conversation_id,
    p.peer_id,
    pr.username,
    pr.display_name,
    pr.avatar_url,
    public.is_pro_now(pr.is_pro, pr.pro_until),
    coalesce(lm.content, ''),
    coalesce(lm.created_at, c.updated_at),
    lm.sender_id,
    coalesce((
      select count(*)::bigint
      from public.messages m2
      where m2.conversation_id = p.conversation_id
        and m2.sender_id = p.peer_id
        and (p.last_read_at is null or m2.created_at > p.last_read_at)
    ), 0)
  from peers p
  join public.conversations c on c.id = p.conversation_id
  join public.profiles pr on pr.id = p.peer_id
  left join last_msgs lm on lm.conversation_id = p.conversation_id
  order by coalesce(lm.created_at, c.updated_at) desc nulls last;
$$;
