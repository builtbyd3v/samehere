-- H1 fix: contribution points become a CONSEQUENCE of a real row existing,
-- never a client request. The old log_contribution(text,jsonb) read the quality
-- gate (character_count) from a client-supplied argument and was EXECUTE-granted
-- to authenticated, so any logged-in user could mint up to 11 points/day with no
-- content. This inverts the flow: DB triggers measure the row itself and award;
-- the client can no longer ask for a point.

-- ============================================================
-- Primitive: insert-on-conflict at the Eastern day boundary.
-- Points + qualification are decided by the CALLER (a trigger / definer fn),
-- never passed from a client. Not executable by any API role.
-- ============================================================
create or replace function public._log_contribution(
  p_user uuid, p_action_type text, p_points int, p_metadata jsonb default null
)
returns void language plpgsql security definer set search_path to '' as $function$
declare
  v_today date := (now() at time zone 'America/New_York')::date;
begin
  insert into public.contribution_log (user_id, date, action_type, points, metadata)
  values (p_user, v_today, p_action_type, p_points, p_metadata)
  on conflict (user_id, date, action_type) do nothing;
end;
$function$;

revoke all on function public._log_contribution(uuid, text, int, jsonb) from public, anon, authenticated;

-- ============================================================
-- posts: award 5 when the created row qualifies (>= 150 chars). Length gates the
-- POINT, not creation — short posts still exist, they just earn nothing.
-- INSERT only: the app has no post-edit path, so length can't change post-hoc.
-- ============================================================
create or replace function public.posts_award_contribution()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if char_length(new.content) >= 150 then
    perform public._log_contribution(
      new.user_id, 'post', 5,
      jsonb_build_object('character_count', char_length(new.content))
    );
  end if;
  return new;
end;
$function$;

drop trigger if exists posts_award_contribution on public.posts;
create trigger posts_award_contribution
  after insert on public.posts
  for each row execute function public.posts_award_contribution();

revoke execute on function public.posts_award_contribution() from public, anon, authenticated;

-- ============================================================
-- comments: award 3 when the created row qualifies (>= 50 chars). Covers both
-- post comments (post_id) and quote-repost comments (repost_id) — same table,
-- same rule, so quote/[id]/actions.ts is covered by this one trigger.
-- INSERT only (no comment-edit path in the app).
-- ============================================================
create or replace function public.comments_award_contribution()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if char_length(new.content) >= 50 then
    perform public._log_contribution(
      new.user_id, 'comment', 3,
      jsonb_build_object('character_count', char_length(new.content))
    );
  end if;
  return new;
end;
$function$;

drop trigger if exists comments_award_contribution on public.comments;
create trigger comments_award_contribution
  after insert on public.comments
  for each row execute function public.comments_award_contribution();

revoke execute on function public.comments_award_contribution() from public, anon, authenticated;

-- ============================================================
-- profiles: award 1 for a meaningful profile edit, 7-day cooldown. Meaningful =
-- the content fields updateProfile writes (display_name, bio, goals, year, major,
-- skills, courses). Cosmetic changes (avatar_url, banner_url, accent_color) and
-- privileged/pref columns do NOT earn — matches "meaningful field, not avatar".
-- AFTER UPDATE, so it runs after the BEFORE guard_profile_privileged trigger; it
-- reads none of the columns that guard rewrites, so ordering is irrelevant.
-- ============================================================
create or replace function public.profiles_award_contribution()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  v_today date := (now() at time zone 'America/New_York')::date;
begin
  if (new.display_name is distinct from old.display_name
      or new.bio is distinct from old.bio
      or new.goals is distinct from old.goals
      or new.year is distinct from old.year
      or new.major is distinct from old.major
      or new.skills is distinct from old.skills
      or new.courses is distinct from old.courses)
     and not exists (
       select 1 from public.contribution_log
       where user_id = new.id and action_type = 'profile_update'
         and date > v_today - 7
     )
  then
    perform public._log_contribution(new.id, 'profile_update', 1, jsonb_build_object('field', 'profile'));
  end if;
  return new;
end;
$function$;

drop trigger if exists profiles_award_contribution on public.profiles;
create trigger profiles_award_contribution
  after update on public.profiles
  for each row execute function public.profiles_award_contribution();

revoke execute on function public.profiles_award_contribution() from public, anon, authenticated;

-- ============================================================
-- Rehome the two definer callers of the old function. Semantics preserved
-- EXACTLY (mutual-only award; the accepter / follower who forms the accepted
-- follow is the one awarded) — only the internal call target changes.
-- ============================================================
create or replace function public.request_follow(p_target uuid)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_me uuid := auth.uid();
  v_private boolean;
  v_status text;
  v_inserted int;
  v_mutual boolean;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if v_me = p_target then raise exception 'cannot follow yourself'; end if;

  if exists (
    select 1 from public.blocks
    where (blocker_id = v_me and blocked_id = p_target)
       or (blocker_id = p_target and blocked_id = v_me)
  ) then
    raise exception 'cannot follow a blocked user';
  end if;

  select is_private into v_private from public.profiles where id = p_target;
  if not found then raise exception 'no such user'; end if;

  v_status := case when v_private then 'pending' else 'accepted' end;
  insert into public.follows (follower_id, following_id, status)
  values (v_me, p_target, v_status)
  on conflict (follower_id, following_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted > 0 and v_status = 'accepted' then
    select exists (
      select 1 from public.follows
      where follower_id = p_target and following_id = v_me and status = 'accepted'
    ) into v_mutual;
    if v_mutual then
      perform public._log_contribution(v_me, 'connection', 2, jsonb_build_object('with', p_target));
    end if;
  end if;
  return v_status;
end;
$function$;

create or replace function public.accept_follow(p_follower uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_me uuid := auth.uid();
  v_updated int;
  v_mutual boolean;
begin
  if v_me is null then raise exception 'not authenticated'; end if;

  update public.follows
  set status = 'accepted'
  where follower_id = p_follower and following_id = v_me and status = 'pending';
  get diagnostics v_updated = row_count;

  if v_updated > 0 then
    select exists (
      select 1 from public.follows
      where follower_id = v_me and following_id = p_follower and status = 'accepted'
    ) into v_mutual;
    if v_mutual then
      perform public._log_contribution(v_me, 'connection', 2, jsonb_build_object('with', p_follower));
    end if;
  end if;
end;
$function$;

-- ============================================================
-- Retire the forgeable function. All callers are rehomed above (request_follow,
-- accept_follow) or deleted from the app (the 4 rpc call sites). No other
-- definer function references it: set_referral_code and block_user never called
-- it; the only past callers were request_follow / accept_follow.
-- ============================================================
revoke execute on function public.log_contribution(text, jsonb) from public, anon, authenticated;
drop function if exists public.log_contribution(text, jsonb);
