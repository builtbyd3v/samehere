-- Clubs v2: multi-channel chat (role-gated), verified badge, club avatar,
-- case-insensitive unique name.
--
-- The big shift from v1: a club no longer has ONE conversation. It has many
-- CHANNELS, each a conversation of kind='club', each with a min_role
-- (everyone | officers | owner). Access to a channel's messages is gated by
-- the caller's club ROLE, checked in RLS via can_read_channel() -- NOT by
-- conversation_members. So promoting a member to officer instantly reveals
-- officer channels with zero membership bookkeeping, and demotion instantly
-- revokes them. Because of this, club_join/leave/approve stop touching
-- conversation_members (that was the v1 single-conversation mechanism); DM
-- conversation_members are untouched.
--
-- Verified against prod before writing:
--   - 0 clubs and 0 club conversations exist, so dropping clubs.conversation_id
--     and restructuring loses no data.
--   - v1 club message policies "club member reads message" / "club member sends
--     message" (added by 20260714140000) gate on is_conversation_member; both
--     are DROPPED and replaced here with can_read_channel() role-gated versions.
--     The two DM policies "member read messages"/"member send message" are NOT
--     touched.
--   - guard_clubs_privileged currently freezes slug/created_by/conversation_id/
--     created_at. conversation_id is dropped from clubs; is_verified is added to
--     the frozen set (an owner must never self-verify).
--   - list_dm_inbox already filters kind='dm', so channels never reach the DM
--     inbox. Untouched here.
--
-- This migration OWNS: clubs.avatar_url, clubs.is_verified, the lower(name)
-- unique index, club_channels + its RLS, can_read_channel(), the reworked
-- club message policies, club_create_channel/club_delete_channel, the reworked
-- clubs_after_insert/club_join/club_leave/club_approve, the guard trigger
-- change, and the club-avatars storage bucket + policies.
--
-- Deliberately NOT here: seeding official verified clubs (needs a system
-- identity / the Eve management layer -- a follow-up), and any AI management
-- behaviour. is_verified is the mechanism; an admin/service flips it.

-- ============================================================
-- 1. New club columns.
-- ============================================================
alter table public.clubs add column avatar_url text;
alter table public.clubs add column is_verified boolean not null default false;

-- Case-insensitive unique name: "Robotics" and "robotics" collide.
create unique index clubs_name_lower_unique_idx on public.clubs (lower(name));

-- ============================================================
-- 2. Freeze is_verified against owners; drop the now-gone conversation_id from
--    the guard. avatar_url stays owner-editable (cosmetic).
--
-- CRITICAL: the v1 guard fired BEFORE UPDATE only. is_verified is a new column
-- with no CHECK and the clubs INSERT policy never mentions it, so a direct
-- PostgREST insert could set is_verified=true and the UPDATE freeze would then
-- protect the forgery. The guard must also fire on INSERT and force false for
-- direct clients (authenticated/anon). A SECURITY DEFINER seed/admin path runs
-- as a different current_user and is unaffected, so it can still set true.
-- ============================================================
create or replace function public.guard_clubs_privileged()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    if current_user in ('authenticated', 'anon') then
      new.is_verified := false;
    end if;
    return new;
  end if;
  if current_user in ('authenticated', 'anon') then
    new.slug := old.slug;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.is_verified := old.is_verified;
  end if;
  return new;
end;
$function$;

drop trigger clubs_guard_privileged on public.clubs;
create trigger clubs_guard_privileged
  before insert or update on public.clubs
  for each row execute function public.guard_clubs_privileged();

-- ============================================================
-- 3. club_channels. Each row is a chat room; each owns one conversation of
--    kind='club'. min_role gates who can read/write it.
-- ============================================================
create table public.club_channels (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  min_role text not null default 'everyone' check (min_role in ('everyone', 'officers', 'owner')),
  conversation_id uuid not null unique references public.conversations(id) on delete cascade,
  is_general boolean not null default false,
  created_at timestamptz not null default now(),
  unique (club_id, name)
);

create index club_channels_club_idx on public.club_channels (club_id, created_at);

-- role rank helper: member 1, officer 2, owner 3; min_role everyone 1 / officers 2 / owner 3.
-- can_read_channel: caller is an accepted member whose role rank meets the
-- channel's min_role rank. Definer so it can read club_channels + club_members
-- regardless of the caller's own row visibility, and so the messages policies
-- that call it don't recurse.
create function public.can_read_channel(p_conversation uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.club_channels ch
    join public.club_members m
      on m.club_id = ch.club_id
     and m.user_id = auth.uid()
     and m.status = 'accepted'
    where ch.conversation_id = p_conversation
      and (case m.role when 'owner' then 3 when 'officer' then 2 else 1 end)
          >= (case ch.min_role when 'owner' then 3 when 'officers' then 2 else 1 end)
  );
$$;

revoke all on function public.can_read_channel(uuid) from public;
grant execute on function public.can_read_channel(uuid) to authenticated;

alter table public.club_channels enable row level security;

-- A member sees a channel row iff they could read it (same role gate).
create policy "club channels read" on public.club_channels
  for select using (public.can_read_channel(conversation_id));

revoke all on table public.club_channels from anon;
grant select on table public.club_channels to authenticated;

-- ============================================================
-- 4. Replace the v1 club message policies with role-gated ones. DM policies
--    untouched. Per-sender block filtering preserved.
-- ============================================================
drop policy "club member reads message" on public.messages;
drop policy "club member sends message" on public.messages;

create policy "club channel reads message" on public.messages
  for select using (
    (select auth.uid()) is not null
    and public.can_read_channel(conversation_id)
    and (
      sender_id = (select auth.uid())
      or not (sender_id in (select public.get_blocked_ids()))
    )
  );

create policy "club channel sends message" on public.messages
  for insert with check (
    (select auth.uid()) = sender_id
    and public.can_read_channel(conversation_id)
    and not public.current_is_suspended()
  );

-- ============================================================
-- 5. Rework clubs_after_insert: no more clubs.conversation_id. Create the
--    club's "general" channel (everyone) + its conversation, and the owner
--    membership. NO conversation_members (channels are role-gated).
-- ============================================================
create or replace function public.clubs_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_conv uuid;
begin
  insert into public.conversations (kind) values ('club') returning id into v_conv;

  insert into public.club_channels (club_id, name, min_role, conversation_id, is_general)
  values (new.id, 'general', 'everyone', v_conv, true);

  insert into public.club_members (club_id, user_id, role, status)
  values (new.id, new.created_by, 'owner', 'accepted');

  return new;
end;
$function$;

-- Drop clubs.conversation_id: channels own conversations now. Safe (0 clubs).
alter table public.clubs drop column conversation_id;

-- ============================================================
-- 6. Rework club_join / club_leave / club_approve: drop conversation_members
--    sync (channels are role-gated, not membership-gated). Everything else
--    -- block checks, pending/accepted, last-owner guard, role-history close
--    -- is preserved byte-for-byte from 20260714140000.
-- ============================================================
create or replace function public.club_join(p_club uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_me uuid := auth.uid();
  v_owner uuid;
  v_open boolean;
  v_status text;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if public.current_is_suspended() then raise exception 'account suspended'; end if;

  select created_by, is_open into v_owner, v_open
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

  return v_status;
end;
$function$;

create or replace function public.club_leave(p_club uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_me uuid := auth.uid();
  v_role text;
  v_owner_count int;
begin
  if v_me is null then raise exception 'not authenticated'; end if;

  select role into v_role from public.club_members
  where club_id = p_club and user_id = v_me;
  if not found then raise exception 'not a member'; end if;

  if v_role = 'owner' then
    perform 1 from public.club_members
    where club_id = p_club and role = 'owner' and status = 'accepted'
    for update;

    select count(*) into v_owner_count from public.club_members
    where club_id = p_club and role = 'owner' and status = 'accepted';
    if v_owner_count <= 1 then
      raise exception 'the last owner cannot leave; transfer ownership first';
    end if;
  end if;

  update public.club_role_history
  set ended_at = now()
  where club_id = p_club and user_id = v_me and ended_at is null;

  delete from public.club_members where club_id = p_club and user_id = v_me;
end;
$function$;

create or replace function public.club_approve(p_club uuid, p_user uuid)
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

  update public.club_members
  set status = 'accepted'
  where club_id = p_club and user_id = p_user and status = 'pending';
end;
$function$;

-- ============================================================
-- 7. Channel management. owner|officer create/delete channels. The general
--    channel is undeletable (it is the always-present everyone room).
-- ============================================================
create function public.club_create_channel(p_club uuid, p_name text, p_min_role text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_role text := public.club_role(p_club);
  v_conv uuid;
  v_channel uuid;
begin
  if v_role is null or v_role not in ('owner', 'officer') then
    raise exception 'not authorized';
  end if;
  if p_min_role not in ('everyone', 'officers', 'owner') then
    raise exception 'invalid channel role';
  end if;
  if char_length(coalesce(p_name, '')) < 1 or char_length(p_name) > 40 then
    raise exception 'channel name must be 1-40 characters';
  end if;

  insert into public.conversations (kind) values ('club') returning id into v_conv;
  insert into public.club_channels (club_id, name, min_role, conversation_id, is_general)
  values (p_club, p_name, p_min_role, v_conv, false)
  returning id into v_channel;

  return v_channel;
end;
$function$;

revoke all on function public.club_create_channel(uuid, text, text) from public;
grant execute on function public.club_create_channel(uuid, text, text) to authenticated;

create function public.club_delete_channel(p_channel uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_club uuid;
  v_general boolean;
  v_role text;
begin
  select club_id, is_general into v_club, v_general
  from public.club_channels where id = p_channel;
  if not found then raise exception 'no such channel'; end if;
  if v_general then raise exception 'the general channel cannot be deleted'; end if;

  v_role := public.club_role(v_club);
  if v_role is null or v_role not in ('owner', 'officer') then
    raise exception 'not authorized';
  end if;

  -- Deleting the channel cascades to its conversation (fk on delete cascade
  -- points the other way -- delete the conversation to take the channel + its
  -- messages).
  delete from public.conversations c
  using public.club_channels ch
  where ch.id = p_channel and c.id = ch.conversation_id;
end;
$function$;

revoke all on function public.club_delete_channel(uuid) from public;
grant execute on function public.club_delete_channel(uuid) to authenticated;

-- ============================================================
-- 8. club-avatars storage bucket: public read, owner-write keyed by club id in
--    the path (first folder segment = club id).
-- ============================================================
insert into storage.buckets (id, name, public)
values ('club-avatars', 'club-avatars', true)
on conflict (id) do nothing;

create policy "club avatars public read" on storage.objects
  for select using (bucket_id = 'club-avatars');

create policy "club owner writes avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'club-avatars'
    and public.club_role((storage.foldername(name))[1]::uuid) = 'owner'
  );

create policy "club owner updates avatar" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'club-avatars'
    and public.club_role((storage.foldername(name))[1]::uuid) = 'owner'
  );

create policy "club owner deletes avatar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'club-avatars'
    and public.club_role((storage.foldername(name))[1]::uuid) = 'owner'
  );
