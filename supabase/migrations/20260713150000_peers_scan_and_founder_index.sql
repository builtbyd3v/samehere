-- Perf fixes from the open-signup round's optimization review.
--
-- (1) get_leaderboard('peers') inherited the platform-wide weekly aggregation
-- from the old school scope but lost the hourly cache (peers is per-viewer, so
-- lib/leaderboard.ts deliberately calls it uncached). The pts CTE therefore
-- summed contribution_log for EVERY user on EVERY peers-tab view. Filter the
-- aggregation to the peer set first: cost now scales with the viewer's mutual
-- count, not platform activity. Global scope is byte-identical in behavior
-- (the added predicate is a no-op when p_scope = 'global') and stays cached.
--
-- (2) handle_new_user runs (select count(*) from profiles where is_founder)
-- on every signup, and get_founder_spots_left runs it on every cold landing
-- render. No index on is_founder = full table scan, now exercised harder with
-- signup opened. Partial index bounds it to the founder subset (<= 100 rows).

drop function if exists public.get_leaderboard(text);

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

  return query
  -- Mutual-follow peers: for every profile v_viewer follows (f1), check the
  -- reverse edge exists and is accepted (f2). Both joins are equality lookups
  -- on the unique(follower_id, following_id) index, so the set is bounded by
  -- how many people v_viewer follows.
  with peers as (
    select f1.following_id as peer_id
    from public.follows f1
    join public.follows f2
      on f2.follower_id = f1.following_id
     and f2.following_id = f1.follower_id
     and f2.status = 'accepted'
    where f1.follower_id = v_viewer and f1.status = 'accepted'
    union
    select v_viewer
  ),
  pts as (
    select cl.user_id, sum(cl.points)::bigint wp
    from public.contribution_log cl
    where cl.date >= v_monday
      -- peers scope: aggregate only the peer set, not the whole platform.
      and (p_scope = 'global' or cl.user_id in (select pe.peer_id from peers pe))
    group by cl.user_id
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
      (p_scope = 'global' and p.heatmap_visibility <> 'followers' and p.leaderboard_opt_out = false)
      or
      (p_scope = 'peers' and exists (select 1 from peers pe where pe.peer_id = p.id)
         and (p.leaderboard_opt_out = false or p.id = v_viewer))
    )
  order by pts.wp desc, p.created_at asc
  limit 100;
end;
$function$;

-- Drop/recreate resets the ACL to EXECUTE for PUBLIC; re-pin it.
revoke all on function public.get_leaderboard(text) from public;
grant execute on function public.get_leaderboard(text) to authenticated, service_role;

-- (2) founder count: partial index over the <= 100 founder rows.
create index if not exists profiles_is_founder_partial
  on public.profiles (is_founder) where is_founder;
