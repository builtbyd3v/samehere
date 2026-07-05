-- Wave B: Eastern day boundary + streak + leaderboard + public heatmap for OG.

-- 1) Key contribution days to America/New_York (midnight Eastern reset, DST-aware),
--    so heatmap/streak/leaderboard share one day boundary. ponytail: one tz constant.
create or replace function public.log_contribution(p_action_type text, p_metadata jsonb default null)
returns void language plpgsql security definer set search_path to '' as $function$
declare
  v_user uuid := auth.uid();
  v_points int;
  v_len int := coalesce((p_metadata ->> 'character_count')::int, 0);
  v_today date := (now() at time zone 'America/New_York')::date;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  v_points := case p_action_type
    when 'post' then 5 when 'comment' then 3 when 'connection' then 2 when 'profile_update' then 1
    else null end;
  if v_points is null then raise exception 'invalid action_type: %', p_action_type; end if;
  if p_action_type = 'post' and v_len < 150 then return; end if;
  if p_action_type = 'comment' and v_len < 50 then return; end if;
  if p_action_type = 'profile_update'
     and exists (select 1 from public.contribution_log
                 where user_id = v_user and action_type = 'profile_update' and date > v_today - 7)
  then return; end if;
  insert into public.contribution_log (user_id, date, action_type, points, metadata)
  values (v_user, v_today, p_action_type, v_points, p_metadata)
  on conflict (user_id, date, action_type) do nothing;
end;
$function$;

-- 2) Leaderboard opt-out.
alter table public.profiles add column if not exists leaderboard_opt_out boolean not null default false;

-- 3) Streak (current/longest + whether today already earned). Mirrors get_heatmap visibility.
create or replace function public.get_streak(p_profile_id uuid)
returns table(current_streak int, longest_streak int, today_earned boolean)
language plpgsql security definer set search_path to '' as $function$
declare
  v_viewer uuid := auth.uid();
  v_allowed boolean;
  v_today date := (now() at time zone 'America/New_York')::date;
begin
  if v_viewer is null then raise exception 'not authenticated'; end if;
  select v_viewer = p_profile_id or p.heatmap_visibility = 'public'
     or exists (select 1 from public.follows f
                where f.following_id = p_profile_id and f.follower_id = v_viewer and f.status = 'accepted')
  into v_allowed from public.profiles p where p.id = p_profile_id;
  if not coalesce(v_allowed, false) then raise exception 'streak not visible'; end if;

  return query
  with days as (
    select distinct date d from public.contribution_log where user_id = p_profile_id and points > 0
  ),
  grp as (
    select d, d - (row_number() over (order by d))::int as g from days
  ),
  runs as (
    select min(d) s, max(d) e, count(*)::int len from grp group by g
  )
  select
    coalesce((select r.len from runs r where r.e >= v_today - 1 order by r.e desc limit 1), 0),
    coalesce((select max(r.len) from runs r), 0),
    exists (select 1 from days where d = v_today);
end;
$function$;

-- 4) Leaderboard: weekly points (since Monday 00:00 Eastern), global or per-school,
--    excludes opted-out users; hides school label for hide_school users.
create or replace function public.get_leaderboard(p_scope text, p_school text default null)
returns table(rank int, id uuid, username text, display_name text, avatar_url text,
              is_pro boolean, is_founder boolean, accent_color text, school text, weekly_points bigint)
language plpgsql security definer set search_path to '' as $function$
declare
  v_viewer uuid := auth.uid();
  v_monday date := (date_trunc('week', (now() at time zone 'America/New_York')))::date;
begin
  if v_viewer is null then raise exception 'not authenticated'; end if;
  return query
  with pts as (
    select cl.user_id, sum(cl.points)::bigint wp
    from public.contribution_log cl
    where cl.date >= v_monday
    group by cl.user_id
  )
  select row_number() over (order by pts.wp desc, p.created_at asc)::int,
         p.id, p.username, p.display_name, p.avatar_url, p.is_pro, p.is_founder, p.accent_color,
         case when p.hide_school then null else ps.school end,
         pts.wp
  from pts
  join public.profiles p on p.id = pts.user_id
  left join public.profile_school ps on ps.profile_id = p.id
  where p.leaderboard_opt_out = false
    and (p_scope <> 'school' or ps.school = p_school)
  order by pts.wp desc, p.created_at asc
  limit 100;
end;
$function$;

-- 5) Public heatmap for unauthenticated OG image render. Returns rows ONLY for
--    public, non-private profiles, so no viewer session is needed and nothing leaks.
create or replace function public.get_public_heatmap(p_profile_id uuid)
returns table(day date, points bigint)
language sql security definer set search_path to '' as $function$
  select cl.date, sum(cl.points)::bigint
  from public.contribution_log cl
  join public.profiles p on p.id = cl.user_id
  where cl.user_id = p_profile_id
    and p.heatmap_visibility = 'public'
    and p.is_private = false
    and cl.date > (now() at time zone 'America/New_York')::date - 371
  group by cl.date;
$function$;

grant execute on function public.get_streak(uuid) to authenticated;
grant execute on function public.get_leaderboard(text, text) to authenticated;
grant execute on function public.get_public_heatmap(uuid) to anon, authenticated;
