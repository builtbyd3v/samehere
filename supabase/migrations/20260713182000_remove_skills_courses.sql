-- Remove profiles.skills and profiles.courses entirely.
-- Product decision: too much profile surface now that signup is open beyond
-- .edu — skills/courses free-text fields no longer earn their keep.
--
-- Data loss (accepted, deliberate): 2 profiles lose their `skills` values,
-- 1 profile loses its `courses` value, and the 1 historical `courses`
-- contribution_log row is deleted (points from a deleted feature should not
-- persist).
--
-- This migration also OWNS the contribution_log_action_type_check cleanup
-- for the whole 20260713 round: it drops 'courses' (removed here) AND
-- 'weekly_prompt' (feature removed by 20260713180000, which must not touch
-- this constraint). No other migration in this round may touch this CHECK.
--
-- Verified against live prod before writing this file:
--   - profiles_award_contribution is the ONLY function referencing
--     skills/courses (pg_proc.prosrc scan); no pg_policies qual/with_check
--     reference either column.
--   - No index exists on profiles.skills or profiles.courses (no GIN, no
--     btree) — nothing to drop in that department.
--   - get_public_profile already omits skills/courses (narrowed in
--     20260711140100) — left untouched, confirmed correct.
--   - profiles_award_contribution's current grants are postgres/service_role
--     only (no PUBLIC, no authenticated) — CREATE OR REPLACE below preserves
--     that ACL automatically since the signature (0 args, returns trigger)
--     is unchanged. No re-pin needed.

-- ============================================================
-- 1. profiles_award_contribution: drop skills/courses from the
--    meaningful-field list, drop the once-ever courses award block.
--    7-day profile_update cooldown logic is byte-identical to prod.
-- ============================================================
create or replace function public.profiles_award_contribution()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  v_today date := (now() at time zone 'America/New_York')::date;
begin
  if (new.display_name is distinct from old.display_name
      or new.bio is distinct from old.bio
      or new.goals is distinct from old.goals
      or new.year is distinct from old.year
      or new.major is distinct from old.major)
     and not exists (
       select 1 from public.contribution_log
       where user_id = new.id and action_type = 'profile_update'
         and date > v_today - 7
     )
  then
    perform public._log_contribution(new.id, 'profile_update', 1, null, jsonb_build_object('field', 'profile'));
  end if;

  return new;
end;
$function$;

-- ============================================================
-- 2. Delete historical rows for the removed award. Exactly 1 row today.
-- ============================================================
delete from public.contribution_log where action_type = 'courses';

-- ============================================================
-- 3. Recreate the CHECK without 'courses' (this migration) and without
--    'weekly_prompt' (removed feature, owned here per round-wide agreement).
--    Assert first: no surviving row may violate the new list.
-- ============================================================
do $$
begin
  if exists (
    select 1 from public.contribution_log
    where action_type not in (
      'post', 'post_media', 'comment', 'quote',
      'connection', 'referral', 'profile_update'
    )
  ) then
    raise exception 'contribution_log has rows outside the new action_type list — aborting';
  end if;
end;
$$;

alter table public.contribution_log
  drop constraint if exists contribution_log_action_type_check;
alter table public.contribution_log
  add constraint contribution_log_action_type_check
  check (action_type in (
    'post', 'post_media', 'comment', 'quote',
    'connection', 'referral', 'profile_update'
  ));

-- ============================================================
-- 5. Drop the columns. Column grants (select/insert/update/references for
--    anon, authenticated, service_role, postgres) disappear with them —
--    nothing left to revoke.
-- ============================================================
alter table public.profiles
  drop column if exists skills,
  drop column if exists courses;
