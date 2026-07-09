-- M4: leaderboard "school" scope replaced with "peers". School is self-reported
-- (profiles.profile_school, no verification), so ranking by it was meaningless
-- once signup opened past .edu. Peers = people you and you-them mutually follow
-- (accepted both directions) -- a real, earned relationship. Also threads
-- verified_student (added by sibling migration 20260713100000) onto both
-- leaderboard rows and the public profile OG card, so the badge renders there.

-- Signature changes (p_school drops out), so drop + recreate; ACL resets to the
-- Postgres default (EXECUTE to PUBLIC) and must be re-pinned below, mirroring the
-- authenticated-only grant the old function had after 20260708004649/004722.
drop function if exists public.get_leaderboard(text, text);

create function public.get_leaderboard(p_scope text)
returns table(rank int, id uuid, username text, display_name text, avatar_url text,
              is_pro boolean, is_founder boolean, is_campus_founder boolean,
              accent_color text, school text, weekly_points bigint, verified_student boolean)
language plpgsql security definer set search_path to '' as $function$
declare
  v_viewer uuid := auth.uid();
  v_monday date := (date_trunc('week', (now() at time zone 'America/New_York')))::date;
begin
  if v_viewer is null then raise exception 'not authenticated'; end if;
  -- v_viewer is never null past this guard, so "peers scope + no viewer -> empty"
  -- is already satisfied by the exception above; nothing further needed for it.

  return query
  with pts as (
    select cl.user_id, sum(cl.points)::bigint wp
    from public.contribution_log cl
    where cl.date >= v_monday
    group by cl.user_id
  ),
  -- Mutual-follow peers: for every profile v_viewer follows (f1), check the
  -- reverse edge exists and is accepted (f2). Both joins are equality lookups
  -- on the baseline unique(follower_id, following_id) index (point lookups in
  -- both directions), so cost is bounded by how many people v_viewer follows,
  -- not the size of `follows` -- no new index needed.
  peers as (
    select f1.following_id as peer_id
    from public.follows f1
    join public.follows f2
      on f2.follower_id = f1.following_id
     and f2.following_id = f1.follower_id
     and f2.status = 'accepted'
    where f1.follower_id = v_viewer and f1.status = 'accepted'
    union
    select v_viewer
  )
  select row_number() over (order by pts.wp desc, p.created_at asc)::int,
         p.id, p.username, p.display_name, p.avatar_url, p.is_pro, p.is_founder, p.is_campus_founder,
         p.accent_color,
         case when p.hide_school then null else ps.school end,
         pts.wp,
         p.verified_student
  from pts
  join public.profiles p on p.id = pts.user_id
  left join public.profile_school ps on ps.profile_id = p.id
  where (
      -- global: unchanged from the pre-M4 function (opt-out + not-followers-only).
      (p_scope = 'global' and p.heatmap_visibility <> 'followers' and p.leaderboard_opt_out = false)
      or
      -- peers: mutual-follow set (or self), opt-out respected for everyone
      -- EXCEPT self -- you always see your own row on your own peers board.
      (p_scope = 'peers' and exists (select 1 from peers pe where pe.peer_id = p.id)
         and (p.leaderboard_opt_out = false or p.id = v_viewer))
    )
  order by pts.wp desc, p.created_at asc
  limit 100;
end;
$function$;

revoke all on function public.get_leaderboard(text) from public;
grant execute on function public.get_leaderboard(text) to authenticated, service_role;

-- get_public_profile_card: body copied verbatim from 20260705170000 (latest
-- definition), only addition is verified_student. Return-type change forces
-- drop + recreate; this function is deliberately anon-callable (OG card for
-- logged-out link previews), so anon keeps its grant.
drop function if exists public.get_public_profile_card(text);
create function public.get_public_profile_card(p_username text)
returns table(id uuid, display_name text, username text, avatar_url text,
              is_pro boolean, is_founder boolean, is_campus_founder boolean, school text,
              verified_student boolean)
language sql security definer set search_path to '' as $function$
  select p.id, p.display_name, p.username, p.avatar_url, p.is_pro, p.is_founder, p.is_campus_founder,
         case when p.hide_school then null else ps.school end,
         p.verified_student
  from public.profiles p
  left join public.profile_school ps on ps.profile_id = p.id
  where lower(p.username) = lower(p_username) and p.is_private = false;
$function$;

grant execute on function public.get_public_profile_card(text) to anon, authenticated;
