-- Remove the weekly-prompt feature. Clubs (threads) will carry the weekly
-- nudge-to-post mechanic later; this mechanic is dead in the meantime.
-- Zero data lost beyond the single unused weekly_prompts row: 0 posts have
-- answers_prompt = true, 0 contribution_log rows have action_type =
-- 'weekly_prompt'. Verified against live prod before writing this file.
--
-- Does NOT touch contribution_log_action_type_check — the skills/courses
-- migration (20260713182000) owns that constraint.

-- ============================================================
-- posts_award_contribution: drop the weekly_prompt award block only.
-- CREATE OR REPLACE preserves the existing ACL (revoke-all-but-owner),
-- verified live: proacl = {postgres=X/postgres,service_role=X/postgres}.
-- Everything else (post 4/6, post_media +1, referral) stays byte-identical
-- to the live function, copied from 20260712110000_contribution_v2.sql.
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

revoke execute on function public.posts_award_contribution() from public, anon, authenticated;

-- ============================================================
-- posts.answers_prompt: no index, policy, or other function references it
-- (verified live) besides the function just rewritten above.
-- ============================================================
alter table public.posts drop column if exists answers_prompt;

-- ============================================================
-- weekly_prompts: 1 row, own pkey (week_key) only, no FKs pointing at it,
-- no triggers, no function reads it. Deliberate data loss of that one row.
-- ============================================================
drop table if exists public.weekly_prompts;
