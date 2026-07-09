-- Contribution v2. Spec: docs/superpowers/specs/2026-07-09-contribution-v2-design.md
--
-- Three changes, one migration, because any two of them alone leave the graph
-- inconsistent:
--   1. Volume counts. The per-day unique index becomes a per-TARGET unique
--      index, so ten posts pay ten times but ten comments on one post pay once.
--   2. Effort counts. Two tiers per text action instead of one binary gate.
--   3. The surface broadens to 9 action types, all of which either produce a
--      public artifact or required a second human to agree. Taps still earn 0.
--
-- Awarding stays where 20260711110100_contribution_from_rows.sql (finding H1)
-- put it: inside triggers that read NEW. `source_id` is DERIVED, never an
-- argument an API role can supply. Re-exposing a client-callable
-- log_contribution(action_type, source_id) would reopen H1 with a higher
-- ceiling now that the per-day cap is gone. Do not add one.

-- ============================================================
-- Schema
-- ============================================================

-- Boolean, NOT a week key: the composer may claim "this answers the prompt",
-- but it must not get to say WHICH week. posts INSERT policy is only
-- `auth.uid() = user_id`, so a client hitting PostgREST directly could
-- otherwise mint 2 points x 52 distinct week keys. The trigger derives the
-- week from now(), capping the forgery at +2 per real week.
alter table public.posts
  add column if not exists answers_prompt boolean not null default false;

alter table public.contribution_log
  add column if not exists source_id uuid;

-- The old cap. Its whole job was anti-spam; the partial index below replaces it.
drop index if exists public.contribution_log_user_id_date_action_type_idx;

-- Volume allowed; repetition against one target is not. This single index is
-- also the ONLY dedupe logic in the system: "once ever" (courses), "once per
-- week" (weekly_prompt), "once per referee" (referral) and "once per post"
-- (comment) are all just `on conflict do nothing` against it.
create unique index if not exists contribution_log_user_action_source_idx
  on public.contribution_log (user_id, action_type, source_id)
  where source_id is not null;

-- profile_update has no target. Keep it once per Eastern day.
-- The 11 pre-existing rows all have source_id = null and land here. No backfill.
create unique index if not exists contribution_log_user_date_action_idx
  on public.contribution_log (user_id, date, action_type)
  where source_id is null;

alter table public.contribution_log
  drop constraint if exists contribution_log_action_type_check;
alter table public.contribution_log
  add constraint contribution_log_action_type_check
  check (action_type in (
    'post', 'post_media', 'weekly_prompt', 'comment', 'quote',
    'connection', 'referral', 'profile_update', 'courses'
  ));

-- ============================================================
-- Primitives
-- ============================================================

-- Run-collapse before measuring: 'a' x 200 is 2 chars, not 200.
-- ponytail: run-collapse only; repeat('ab',100) still measures 200. The
-- rl_check_* triggers and public attribution are the real backstop.
create or replace function public.qualifying_length(p_content text)
returns int language sql immutable set search_path to '' as $function$
  select char_length(regexp_replace(coalesce(p_content, ''), '(.)\1{2,}', '\1\1', 'g'));
$function$;

revoke all on function public.qualifying_length(text) from public, anon, authenticated;

-- Insert-or-ignore at the Eastern day boundary. Bare `on conflict do nothing`
-- (no target clause) so it satisfies whichever partial index applies.
create or replace function public._log_contribution(
  p_user uuid, p_action_type text, p_points int, p_source_id uuid, p_metadata jsonb default null
)
returns void language plpgsql security definer set search_path to '' as $function$
begin
  insert into public.contribution_log (user_id, date, action_type, points, source_id, metadata)
  values (
    p_user,
    (now() at time zone 'America/New_York')::date,
    p_action_type, p_points, p_source_id, p_metadata
  )
  on conflict do nothing;
end;
$function$;

revoke all on function public._log_contribution(uuid, text, int, uuid, jsonb) from public, anon, authenticated;

-- The old 4-arg signature is superseded. Drop it so nothing can call it.
drop function if exists public._log_contribution(uuid, text, int, jsonb);

-- ============================================================
-- posts: post (4 / 6), post_media (+1), weekly_prompt (+2), referral (3)
-- ============================================================
create or replace function public.posts_award_contribution()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  v_len int := public.qualifying_length(new.content);
  v_points int;
  v_referrer uuid;
begin
  if v_len < 150 then
    return new; -- short posts exist, they just earn nothing
  end if;

  v_points := case when v_len >= 600 then 6 else 4 end;
  perform public._log_contribution(
    new.user_id, 'post', v_points, new.id,
    jsonb_build_object('character_count', v_len)
  );

  if jsonb_array_length(coalesce(new.media, '[]'::jsonb)) > 0 then
    perform public._log_contribution(new.user_id, 'post_media', 1, new.id, null);
  end if;

  -- Week key derived here, never from the client. Unique index makes a second
  -- prompt-answering post this week a no-op.
  if new.answers_prompt then
    perform public._log_contribution(
      new.user_id, 'weekly_prompt', 2,
      md5(to_char((now() at time zone 'America/New_York'), 'IYYY-"W"IW'))::uuid,
      null
    );
  end if;

  -- A referral converts when the referee publishes a qualifying post. Fired on
  -- every qualifying post; the unique index (referrer, 'referral', referee)
  -- makes it once-ever. No "is this their first post" check needed.
  select r.referrer_id into v_referrer
  from public.referrals r where r.referred_id = new.user_id;
  if v_referrer is not null then
    perform public._log_contribution(v_referrer, 'referral', 3, new.user_id, null);
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
-- comments: 3 / 4, deduped on the ROOT post. Own-post comments earn 0.
-- Covers post comments (post_id) and comments on a quote-repost (repost_id).
-- ============================================================
create or replace function public.comments_award_contribution()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  v_len int := public.qualifying_length(new.content);
  v_root uuid;
  v_author uuid;
begin
  if v_len < 50 then
    return new;
  end if;

  v_root := coalesce(
    new.post_id,
    (select rp.post_id from public.reposts rp where rp.id = new.repost_id)
  );
  if v_root is null then
    return new;
  end if;

  select p.user_id into v_author from public.posts p where p.id = v_root;
  if v_author = new.user_id then
    return new; -- commenting on your own post is self-farming
  end if;

  perform public._log_contribution(
    new.user_id, 'comment', case when v_len >= 250 then 4 else 3 end, v_root,
    jsonb_build_object('character_count', v_len)
  );
  return new;
end;
$function$;

drop trigger if exists comments_award_contribution on public.comments;
create trigger comments_award_contribution
  after insert on public.comments
  for each row execute function public.comments_award_contribution();

revoke execute on function public.comments_award_contribution() from public, anon, authenticated;

-- ============================================================
-- reposts: quote-repost = 3. New trigger — quotes earned nothing before.
-- Plain reposts (quote_text null) earn 0, forever: single tap, no gate possible.
-- ============================================================
create or replace function public.reposts_award_contribution()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.quote_text is not null and public.qualifying_length(new.quote_text) >= 50 then
    perform public._log_contribution(new.user_id, 'quote', 3, new.post_id, null);
  end if;
  return new;
end;
$function$;

drop trigger if exists reposts_award_contribution on public.reposts;
create trigger reposts_award_contribution
  after insert on public.reposts
  for each row execute function public.reposts_award_contribution();

revoke execute on function public.reposts_award_contribution() from public, anon, authenticated;

-- ============================================================
-- profiles: profile_update (1, 7-day cooldown) + courses (1, once ever)
-- source_id = new.id for courses => unique (user, 'courses', user) => once ever.
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
    perform public._log_contribution(new.id, 'profile_update', 1, null, jsonb_build_object('field', 'profile'));
  end if;

  if coalesce(array_length(new.courses, 1), 0) > 0 then
    perform public._log_contribution(new.id, 'courses', 1, new.id, null);
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
-- follows: connection = 5, paid to BOTH sides of the mutual pair.
-- Before this migration only the user who COMPLETED the pair was awarded:
-- A follows B, B follows back -> B earned 2, A earned 0, for identical work.
-- ============================================================
create or replace function public.request_follow(p_target uuid)
returns text
language plpgsql security definer set search_path to ''
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
      perform public._log_contribution(v_me, 'connection', 5, p_target, null);
      perform public._log_contribution(p_target, 'connection', 5, v_me, null);
    end if;
  end if;
  return v_status;
end;
$function$;

create or replace function public.accept_follow(p_follower uuid)
returns void
language plpgsql security definer set search_path to ''
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
      perform public._log_contribution(v_me, 'connection', 5, p_follower, null);
      perform public._log_contribution(p_follower, 'connection', 5, v_me, null);
    end if;
  end if;
end;
$function$;

-- ============================================================
-- Revocation. `date = today` IS the same-day guard: a 30-day-old post's row
-- carries date = 30 days ago and can never match. No created_at parameter.
-- ============================================================
drop function if exists public.revoke_contribution_same_day(uuid, text, timestamptz);

create or replace function public.revoke_contribution_same_day(p_user uuid, p_action text, p_source uuid)
returns void language plpgsql security definer set search_path to '' as $function$
begin
  delete from public.contribution_log
  where user_id = p_user
    and action_type = p_action
    and source_id = p_source
    and date = (now() at time zone 'America/New_York')::date;
end;
$function$;

revoke all on function public.revoke_contribution_same_day(uuid, text, uuid) from public, anon, authenticated;

create or replace function public.posts_revoke_contribution()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  perform public.revoke_contribution_same_day(old.user_id, 'post', old.id);
  perform public.revoke_contribution_same_day(old.user_id, 'post_media', old.id);
  -- weekly_prompt is NOT revoked: its source_id is the WEEK, and another post
  -- may legitimately claim it. referral is NOT revoked: the referee still joined.
  -- ponytail: two actions skip revocation; tighten only if delete-to-farm shows.
  return old;
end;
$function$;

drop trigger if exists posts_revoke_contribution on public.posts;
create trigger posts_revoke_contribution
  after delete on public.posts
  for each row execute function public.posts_revoke_contribution();

revoke execute on function public.posts_revoke_contribution() from public, anon, authenticated;

-- Only revoke when no OTHER qualifying comment by this user remains on the root.
create or replace function public.comments_revoke_contribution()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  v_root uuid := coalesce(
    old.post_id,
    (select rp.post_id from public.reposts rp where rp.id = old.repost_id)
  );
begin
  if v_root is null then return old; end if;

  if not exists (
    select 1 from public.comments c
    left join public.reposts rp on rp.id = c.repost_id
    where c.user_id = old.user_id
      and coalesce(c.post_id, rp.post_id) = v_root
      and public.qualifying_length(c.content) >= 50
  ) then
    perform public.revoke_contribution_same_day(old.user_id, 'comment', v_root);
  end if;
  return old;
end;
$function$;

drop trigger if exists comments_revoke_contribution on public.comments;
create trigger comments_revoke_contribution
  after delete on public.comments
  for each row execute function public.comments_revoke_contribution();

revoke execute on function public.comments_revoke_contribution() from public, anon, authenticated;

create or replace function public.reposts_revoke_contribution()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  perform public.revoke_contribution_same_day(old.user_id, 'quote', old.post_id);
  return old;
end;
$function$;

drop trigger if exists reposts_revoke_contribution on public.reposts;
create trigger reposts_revoke_contribution
  after delete on public.reposts
  for each row execute function public.reposts_revoke_contribution();

revoke execute on function public.reposts_revoke_contribution() from public, anon, authenticated;

-- Unfollowing breaks the mutual for BOTH endpoints. source_id makes this exact:
-- each side's row is keyed by the other user, so no recount is needed.
create or replace function public.follows_revoke_connection()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  perform public.revoke_contribution_same_day(old.follower_id, 'connection', old.following_id);
  perform public.revoke_contribution_same_day(old.following_id, 'connection', old.follower_id);
  return old;
end;
$function$;

drop trigger if exists follows_revoke_connection on public.follows;
create trigger follows_revoke_connection
  after delete on public.follows
  for each row execute function public.follows_revoke_connection();

revoke execute on function public.follows_revoke_connection() from public, anon, authenticated;

-- source_id made the recount obsolete.
drop function if exists public.has_same_day_connection(uuid, date);

-- ============================================================
-- get_heatmap: window on the EASTERN date, matching the date awards are keyed
-- on. `current_date` is UTC and drifts one day near the boundary.
-- get_streak and get_public_heatmap already use Eastern; only this one is wrong.
-- ============================================================
create or replace function public.get_heatmap(p_profile_id uuid)
  returns table(day date, points bigint, breakdown jsonb)
  language plpgsql security definer set search_path to ''
as $function$
declare
  v_viewer uuid := auth.uid();
  v_allowed boolean;
begin
  if v_viewer is null then
    raise exception 'not authenticated';
  end if;

  select
    v_viewer = p_profile_id
    or p.heatmap_visibility = 'public'
    or exists (
      select 1 from public.follows f
      where f.following_id = p_profile_id
        and f.follower_id = v_viewer
        and f.status = 'accepted'
    )
  into v_allowed
  from public.profiles p
  where p.id = p_profile_id;

  if not coalesce(v_allowed, false) then
    raise exception 'heatmap not visible';
  end if;

  return query
    select cl.date as day,
           sum(cl.points)::bigint,
           jsonb_object_agg(cl.action_type, cl.points)
    from public.contribution_log cl
    where cl.user_id = p_profile_id
      and cl.date > (now() at time zone 'America/New_York')::date - 371
    group by cl.date;
end;
$function$;
