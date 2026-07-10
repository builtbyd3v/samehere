-- Fix: get_heatmap's tooltip breakdown silently drops same-day duplicate
-- action types. 20260712110000_contribution_v2.sql removed the unique index
-- that used to make same-day duplicates of one action_type impossible, so
-- two posts (or two of anything) on the same day is now the normal case.
-- jsonb_object_agg(action_type, points) grouped by date alone feeds it two
-- rows with the same key and silently keeps only the last one, so the
-- tooltip under-reports even though the cell color (sum(points)) is right.
-- Fix: pre-aggregate to (date, action_type) first, then build the object
-- from the already-summed per-action totals.
--
-- ponytail: a comment on a quote-repost cannot be revoked when the repost is
-- cascade-deleted (the reposts row is gone before the comment's AFTER DELETE
-- trigger runs, so the root post id cannot be resolved). Worth <=1 same-day
-- point; fixing it means storing the root post id on the comment row.

create or replace function public.get_heatmap(p_profile_id uuid)
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
    with per_action as (
      select cl.date as d, cl.action_type as a, sum(cl.points)::int as p
      from public.contribution_log cl
      where cl.user_id = p_profile_id
        and cl.date > (now() at time zone 'America/New_York')::date - 371
      group by cl.date, cl.action_type
    )
    select pa.d, sum(pa.p)::bigint, jsonb_object_agg(pa.a, pa.p)
    from per_action pa
    group by pa.d;
end;
$function$
;
