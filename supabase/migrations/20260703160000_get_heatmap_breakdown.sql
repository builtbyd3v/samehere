-- get_heatmap: last-52-weeks contribution grid for a profile, plus a per-day
-- action_type -> points breakdown (e.g. {"post": 5, "connection": 2}) used by
-- the profile heatmap's hover tooltip.
--
-- SECURITY DEFINER: the function enforces visibility itself (owner always;
-- public heatmap; or an accepted follower) and requires an authenticated caller.
-- Return-table columns are qualified against the table alias `cl` so `points`
-- does not collide with the OUT parameter of the same name (that collision
-- raised "column reference \"points\" is ambiguous" and made every call fail).
--
-- Return type changed (added `breakdown`), so the function is dropped first —
-- CREATE OR REPLACE cannot change an existing function's return type.

drop function if exists public.get_heatmap(uuid);

create function public.get_heatmap(p_profile_id uuid)
  returns table(day date, points bigint, breakdown jsonb)
  language plpgsql
  security definer
  set search_path to ''
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
      and cl.date > current_date - 371
    group by cl.date;
end;
$function$;
