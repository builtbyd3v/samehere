-- Length is a heatmap-qualification threshold, not a creation gate.
-- Allow short posts/comments (non-empty only); points are gated in the function.
alter table public.posts drop constraint post_min_len;
alter table public.posts add constraint post_not_empty check (char_length(content) >= 1);
alter table public.comments drop constraint comment_min_len;
alter table public.comments add constraint comment_not_empty check (char_length(content) >= 1);

-- Award points only when the content qualifies: post >=150, comment >=50.
-- Callers pass the true length in metadata.character_count (server-side).
create or replace function public.log_contribution(p_action_type text, p_metadata jsonb default null::jsonb)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid := auth.uid();
  v_points int;
  v_len int := coalesce((p_metadata ->> 'character_count')::int, 0);
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  v_points := case p_action_type
    when 'post' then 5
    when 'comment' then 3
    when 'connection' then 2
    when 'profile_update' then 1
    else null
  end;
  if v_points is null then
    raise exception 'invalid action_type: %', p_action_type;
  end if;

  -- Length qualifies for the point; below threshold earns nothing (post still exists).
  if p_action_type = 'post' and v_len < 150 then
    return;
  end if;
  if p_action_type = 'comment' and v_len < 50 then
    return;
  end if;

  -- profile_update: weekly cooldown
  if p_action_type = 'profile_update'
     and exists (
       select 1 from public.contribution_log
       where user_id = v_user and action_type = 'profile_update'
         and date > current_date - 7
     ) then
    return;
  end if;

  insert into public.contribution_log (user_id, date, action_type, points, metadata)
  values (v_user, current_date, p_action_type, v_points, p_metadata)
  on conflict (user_id, date, action_type) do nothing;
end;
$function$;
