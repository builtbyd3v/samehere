-- Integrity reversal: undo contribution points + notifications when the
-- qualifying action is deleted. Same-day only for points (never rewrites
-- past streaks/leaderboards) — targets the earn-then-instant-undo cheat.

-- ============================================================
-- FEATURE 1: revoke contribution point on same-day delete
-- ============================================================

-- Recount qualifying rows for (user, action_type) on the Eastern-date the
-- deleted row belonged to; drop the contribution_log row only if none remain,
-- and only if that date is today (Eastern).
create or replace function public.revoke_contribution_same_day(p_user uuid, p_action text, p_created timestamptz)
returns void language plpgsql security definer set search_path to '' as $function$
declare
  v_day date := (p_created at time zone 'America/New_York')::date;
begin
  if v_day <> (now() at time zone 'America/New_York')::date then
    return; -- same-day only
  end if;

  if p_action = 'post' then
    if not exists (
      select 1 from public.posts
      where user_id = p_user and char_length(content) >= 150
        and (created_at at time zone 'America/New_York')::date = v_day
    ) then
      delete from public.contribution_log
      where user_id = p_user and date = v_day and action_type = 'post';
    end if;
  elsif p_action = 'comment' then
    if not exists (
      select 1 from public.comments
      where user_id = p_user and char_length(content) >= 50
        and (created_at at time zone 'America/New_York')::date = v_day
    ) then
      delete from public.contribution_log
      where user_id = p_user and date = v_day and action_type = 'comment';
    end if;
  end if;
end;
$function$;

create or replace function public.posts_revoke_contribution()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  perform public.revoke_contribution_same_day(old.user_id, 'post', old.created_at);
  return old;
end;
$function$;

drop trigger if exists posts_revoke_contribution on public.posts;
create trigger posts_revoke_contribution
  after delete on public.posts
  for each row execute function public.posts_revoke_contribution();

create or replace function public.comments_revoke_contribution()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  perform public.revoke_contribution_same_day(old.user_id, 'comment', old.created_at);
  return old;
end;
$function$;

drop trigger if exists comments_revoke_contribution on public.comments;
create trigger comments_revoke_contribution
  after delete on public.comments
  for each row execute function public.comments_revoke_contribution();

-- Does p_user have ANY mutual (both-accepted) follow pair formed on p_day?
-- Used to decide whether their same-day connection point still stands.
create or replace function public.has_same_day_connection(p_user uuid, p_day date)
returns boolean language plpgsql security definer set search_path to '' as $function$
declare
  v_exists boolean;
begin
  select exists (
    select 1
    from public.follows f1
    join public.follows f2
      on f2.follower_id = f1.following_id and f2.following_id = f1.follower_id
    where f1.follower_id = p_user
      and f1.status = 'accepted'
      and f2.status = 'accepted'
      and (greatest(f1.created_at, f2.created_at) at time zone 'America/New_York')::date = p_day
  ) into v_exists;
  return coalesce(v_exists, false);
end;
$function$;

-- Removing a follow can break a mutual for BOTH endpoints; revoke either
-- side's same-day connection point if no same-day mutual pair remains.
-- ponytail: approximates "connection formed today" via follows.created_at;
-- exact mutualization timestamp isn't stored — tighten only if farming shows up.
create or replace function public.follows_revoke_connection()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  v_today date := (now() at time zone 'America/New_York')::date;
  v_user uuid;
begin
  foreach v_user in array array[old.follower_id, old.following_id] loop
    if exists (
      select 1 from public.contribution_log
      where user_id = v_user and date = v_today and action_type = 'connection'
    ) and not public.has_same_day_connection(v_user, v_today) then
      delete from public.contribution_log
      where user_id = v_user and date = v_today and action_type = 'connection';
    end if;
  end loop;
  return old;
end;
$function$;

drop trigger if exists follows_revoke_connection on public.follows;
create trigger follows_revoke_connection
  after delete on public.follows
  for each row execute function public.follows_revoke_connection();

-- ============================================================
-- FEATURE 2: drop the notification when its action is undone (unread only)
-- ============================================================

-- reaction_type matched so unliking doesn't remove a still-standing 'samehere' notif.
create or replace function public.reactions_cleanup_notification()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  delete from public.notifications n
  using public.posts p
  where p.id = old.post_id
    and n.user_id = p.user_id
    and n.actor_id = old.user_id
    and n.type = 'reaction'
    and n.post_id = old.post_id
    and n.reaction_type = old.type
    and n.read = false;
  return old;
end;
$function$;

drop trigger if exists reactions_cleanup_notification on public.reactions;
create trigger reactions_cleanup_notification
  after delete on public.reactions
  for each row execute function public.reactions_cleanup_notification();

-- ponytail: notifications store no comment id, so only clear the unread
-- 'comment' notif when the actor has no other comment left on that post.
create or replace function public.comments_cleanup_notification()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if not exists (
    select 1 from public.comments
    where post_id = old.post_id and user_id = old.user_id
  ) then
    delete from public.notifications n
    using public.posts p
    where p.id = old.post_id
      and n.user_id = p.user_id
      and n.actor_id = old.user_id
      and n.type = 'comment'
      and n.post_id = old.post_id
      and n.read = false;
  end if;
  return old;
end;
$function$;

drop trigger if exists comments_cleanup_notification on public.comments;
create trigger comments_cleanup_notification
  after delete on public.comments
  for each row execute function public.comments_cleanup_notification();

create or replace function public.follows_cleanup_notification()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  delete from public.notifications
  where user_id = old.following_id
    and actor_id = old.follower_id
    and type in ('follow', 'follow_request')
    and post_id is null
    and read = false;
  return old;
end;
$function$;

drop trigger if exists follows_cleanup_notification on public.follows;
create trigger follows_cleanup_notification
  after delete on public.follows
  for each row execute function public.follows_cleanup_notification();
