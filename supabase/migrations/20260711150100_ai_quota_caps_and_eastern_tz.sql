-- M7 + L2: use_ai_quota(p_kind, p_cap) took its cap from the caller. Not
-- exploitable for free AI (every Server Action computes its own cap
-- independently and never trusts the client), but a client could inflate its
-- own usage counter, and the Pro cap was 9999 -- effectively unmetered Sonnet
-- spend on a $4.99/mo account. Move the cap table INSIDE the definer, keyed
-- on p_kind + the caller's own is_pro/pro_until (via is_pro_now, which
-- already exists and is STABLE) -- never an argument.
--
-- Cap table (free / pro):
--   people_search     1 / 150
--   connection_prompt 3 / 150
--   composer_nudge    3 / 150
--   profile_nudge     3 / 150
--   improve_post      3 / 150  (Pro-only in practice -- the caller gates on
--                               isPro() before this is ever reached; free
--                               value is unreachable, kept for symmetry)
--   icebreaker        3 / 150
-- 150/day: a human can't hit it, a script hits it in a minute -- not 9999.
--
-- L1: use_ai_quota wrote (now() at time zone 'utc')::date, so quotas reset
-- ~7-8pm Eastern instead of midnight Eastern like every other time-gated
-- feature (log_contribution, get_streak, get_leaderboard, get_public_heatmap
-- -- see 20260705130000_growth_wave_b_contribution.sql). Switch to
-- America/New_York.
--
-- Quota-row transition: ai_usage is keyed (user_id, date, kind). A user who
-- already burned quota this morning has a row under today's UTC date; the
-- first call after this ships computes today's Eastern date (which lags UTC
-- by 4-5h), so on the day this ships it's a *different* primary key and
-- starts a fresh counter -- a one-day double-allowance. Acceptable, not
-- backfilled; every day after, UTC-date and Eastern-date agree except for the
-- same few evening hours, which just shifts which day the row lands on.
--
-- Changing the signature (p_cap drops out) means DROP + CREATE, which resets
-- the ACL to Postgres's default (EXECUTE to PUBLIC) -- re-revoke from public,
-- re-grant to authenticated.

drop function if exists public.use_ai_quota(text, integer);

create function public.use_ai_quota(p_kind text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_pro boolean;
  v_cap int;
  v_today date := (now() at time zone 'America/New_York')::date;
  v_count int;
begin
  if v_user is null then
    return false;
  end if;

  select public.is_pro_now(is_pro, pro_until) into v_pro
  from public.profiles where id = v_user;

  v_cap := case
    when p_kind = 'people_search' then case when v_pro then 150 else 1 end
    else case when v_pro then 150 else 3 end
  end;

  insert into public.ai_usage (user_id, date, kind, count)
  values (v_user, v_today, p_kind, 1)
  on conflict (user_id, date, kind)
  do update set count = ai_usage.count + 1
  returning count into v_count;

  return v_count <= v_cap;
end;
$$;

revoke all on function public.use_ai_quota(text) from public, anon;
grant execute on function public.use_ai_quota(text) to authenticated;

-- L1: get_heatmap bounded its 371-day window on bare current_date (UTC on
-- Supabase), off by up to a day from the Eastern-keyed rows
-- (log_contribution writes cl.date as an Eastern date) it displays. Shape is
-- unchanged from the live definition (day date, points bigint, breakdown
-- jsonb -- see 20260703160000_get_heatmap_breakdown.sql, the latest CREATE),
-- so CREATE OR REPLACE, no drop needed.
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
    select cl.date as day,
           sum(cl.points)::bigint,
           jsonb_object_agg(cl.action_type, cl.points)
    from public.contribution_log cl
    where cl.user_id = p_profile_id
      and cl.date > (now() at time zone 'America/New_York')::date - 371
    group by cl.date;
end;
$function$;
