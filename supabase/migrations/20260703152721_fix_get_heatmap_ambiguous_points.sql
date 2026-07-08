CREATE OR REPLACE FUNCTION public.get_heatmap(p_profile_id uuid)
 RETURNS TABLE(day date, points bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    select cl.date as day, sum(cl.points)::bigint
    from public.contribution_log cl
    where cl.user_id = p_profile_id
      and cl.date > current_date - 371
    group by cl.date;
end;
$function$;
