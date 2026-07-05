-- Surface is_campus_founder through the two functions that feed badge rendering
-- (leaderboard rows + the public OG/profile card). Return-type change needs drop+recreate.
drop function if exists public.get_leaderboard(text, text);
create function public.get_leaderboard(p_scope text, p_school text default null)
returns table(rank int, id uuid, username text, display_name text, avatar_url text,
              is_pro boolean, is_founder boolean, is_campus_founder boolean,
              accent_color text, school text, weekly_points bigint)
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
         p.id, p.username, p.display_name, p.avatar_url, p.is_pro, p.is_founder, p.is_campus_founder,
         p.accent_color,
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

drop function if exists public.get_public_profile_card(text);
create function public.get_public_profile_card(p_username text)
returns table(id uuid, display_name text, username text, avatar_url text,
              is_pro boolean, is_founder boolean, is_campus_founder boolean, school text)
language sql security definer set search_path to '' as $function$
  select p.id, p.display_name, p.username, p.avatar_url, p.is_pro, p.is_founder, p.is_campus_founder,
         case when p.hide_school then null else ps.school end
  from public.profiles p
  left join public.profile_school ps on ps.profile_id = p.id
  where lower(p.username) = lower(p_username) and p.is_private = false;
$function$;

grant execute on function public.get_leaderboard(text, text) to authenticated;
grant execute on function public.get_public_profile_card(text) to anon, authenticated;
