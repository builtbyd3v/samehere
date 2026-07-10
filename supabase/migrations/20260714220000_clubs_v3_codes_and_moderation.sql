-- Clubs v3: the slug is a user-chosen CODE fixed at creation and IS the route.
-- Name is display-only and renames freely without touching the route. Plus
-- club moderation: remove (kick) and ban.
--
-- Model change from v2:
--   - slug (already unique + frozen by guard_clubs_privileged) is now the
--     user-entered club code, chosen once at creation. It never changes.
--   - Name no longer needs to be unique (two "Robotics" clubs with codes
--     robotics-mit / robotics-stanford is correct and wanted). Drop the
--     case-insensitive name unique index.
--   - Renaming is now a plain name UPDATE via updateClub (name is not frozen
--     by the guard). The slug-regenerating club_rename() is retired.
--
-- Moderation: owner|officer can remove or ban a member. An officer may only act
-- on 'member's; an owner may act on members and officers (never an owner --
-- transfer/demote first). A banned user cannot rejoin until unbanned.

-- ============================================================
-- 1. Names are no longer unique; the code (slug) is the unique route key.
-- ============================================================
drop index if exists public.clubs_name_lower_unique_idx;

-- ============================================================
-- 2. Retire club_rename (it regenerated the slug from the name -- exactly what
--    we no longer want). Name changes go through updateClub now.
-- ============================================================
drop function if exists public.club_rename(uuid, text);

-- ============================================================
-- 3. club_bans -- a club-level block that prevents rejoining.
-- ============================================================
create table public.club_bans (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  banned_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create index club_bans_user_idx on public.club_bans (user_id);

alter table public.club_bans enable row level security;

-- Only a club's owner/officer can see its ban list. Writes are definer-only.
create policy "club bans read" on public.club_bans
  for select using (public.club_role(club_id) in ('owner', 'officer'));

revoke all on table public.club_bans from anon;
revoke all on table public.club_bans from authenticated;
grant select on table public.club_bans to authenticated;

-- ============================================================
-- 4. Moderation functions. Shared authorization rule: caller must be
--    owner|officer; an officer may only act on a 'member'; nobody may act on
--    an 'owner' through these (protects ownership -- demote/transfer instead).
-- ============================================================

-- Remove a member. They may rejoin (unless separately banned).
create function public.club_kick(p_club uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_caller text := public.club_role(p_club);
  v_target text;
begin
  if v_caller is null or v_caller not in ('owner', 'officer') then
    raise exception 'not authorized';
  end if;
  if p_user = auth.uid() then
    raise exception 'use leave, not remove, on yourself';
  end if;

  select role into v_target from public.club_members
  where club_id = p_club and user_id = p_user;
  if not found then raise exception 'not a member'; end if;
  if v_target = 'owner' then raise exception 'cannot remove an owner'; end if;
  if v_caller = 'officer' and v_target <> 'member' then
    raise exception 'officers can only remove members';
  end if;

  update public.club_role_history
  set ended_at = now()
  where club_id = p_club and user_id = p_user and ended_at is null;

  delete from public.club_members where club_id = p_club and user_id = p_user;
end;
$function$;

revoke all on function public.club_kick(uuid, uuid) from public, anon;
grant execute on function public.club_kick(uuid, uuid) to authenticated;

-- Remove + block from rejoining.
create function public.club_ban(p_club uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_caller text := public.club_role(p_club);
  v_target text;
begin
  if v_caller is null or v_caller not in ('owner', 'officer') then
    raise exception 'not authorized';
  end if;
  if p_user = auth.uid() then raise exception 'cannot ban yourself'; end if;

  -- target need not currently be a member (can pre-ban), but if they are, the
  -- role hierarchy applies.
  select role into v_target from public.club_members
  where club_id = p_club and user_id = p_user;
  if found then
    if v_target = 'owner' then raise exception 'cannot ban an owner'; end if;
    if v_caller = 'officer' and v_target <> 'member' then
      raise exception 'officers can only ban members';
    end if;

    update public.club_role_history
    set ended_at = now()
    where club_id = p_club and user_id = p_user and ended_at is null;
    delete from public.club_members where club_id = p_club and user_id = p_user;
  end if;

  insert into public.club_bans (club_id, user_id, banned_by)
  values (p_club, p_user, auth.uid())
  on conflict (club_id, user_id) do nothing;
end;
$function$;

revoke all on function public.club_ban(uuid, uuid) from public, anon;
grant execute on function public.club_ban(uuid, uuid) to authenticated;

-- Lift a ban.
create function public.club_unban(p_club uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_caller text := public.club_role(p_club);
begin
  if v_caller is null or v_caller not in ('owner', 'officer') then
    raise exception 'not authorized';
  end if;
  delete from public.club_bans where club_id = p_club and user_id = p_user;
end;
$function$;

revoke all on function public.club_unban(uuid, uuid) from public, anon;
grant execute on function public.club_unban(uuid, uuid) to authenticated;

-- ============================================================
-- 5. club_join refuses a banned user. Body otherwise identical to v2's
--    (block check, pending/accepted). CREATE OR REPLACE preserves the ACL.
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

  if exists (select 1 from public.club_bans where club_id = p_club and user_id = v_me) then
    raise exception 'you are banned from this club';
  end if;

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
