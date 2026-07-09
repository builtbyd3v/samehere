-- ============ Finding H4: Founder badge is unreachable ============
-- is_founder is boolean not null default false, and nothing ever sets it true
-- (guard_profile_privileged freezes it against client writes, and no server
-- code granted it either). get_founder_spots_left() therefore returns a
-- number that never moves, while README.md and Founders.tsx advertise it as
-- a live "first 100 signups" counter. This migration is the fix.
--
-- handle_new_user now carries THREE concerns: (1) the .edu signup gate —
-- MUST stay the first statement, it aborts the transaction before any row
-- is written; (2) the founder grant, added here, folded into the same
-- profile insert so the count-and-set is one atomic statement; (3) referral
-- attribution, copied byte-identical from 20260711100000_close_edu_gate.sql.
-- Do not reorder the gate and do not touch the referral block.
--
-- Why the founder count lives inside the INSERT: computing "am I in the
-- first 100" and writing it in a single INSERT ... VALUES ((select count...))
-- is one statement in one transaction, so there's no separate read-then-write
-- window for THIS transaction to race against itself. See the race analysis
-- below for why it does not fully close the gap across CONCURRENT signups.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  v_username text := new.raw_user_meta_data ->> 'username';
  v_ref text := lower(trim(coalesce(new.raw_user_meta_data ->> 'ref_code', '')));
  v_referrer uuid;
begin
  if not public.is_allowed_signup_email(new.email) then
    raise exception 'signup restricted to verified .edu addresses' using errcode = '22023';
  end if;

  insert into public.profiles (id, username, referral_code, email_domain, is_founder)
  values (new.id, v_username, v_username, lower(split_part(new.email, '@', 2)),
          (select count(*) from public.profiles where is_founder) < 100);

  if length(v_ref) > 0 then
    select id into v_referrer from public.profiles where referral_code = v_ref;
    if v_referrer is not null and v_referrer <> new.id then
      insert into public.referrals (referred_id, referrer_id)
      values (new.id, v_referrer) on conflict (referred_id) do nothing;
    end if;
  end if;
  return new;
end;
$function$;

-- Backfill: grant is_founder to the first 100 profiles that already exist,
-- ranked by created_at (the only ordering that matches "first 100 signups").
-- Runs as the migration owner (not 'authenticated'/'anon'), so
-- guard_profile_privileged — a BEFORE UPDATE trigger — no-ops on this UPDATE
-- and lets is_founder through. See race analysis below for why a bare UPDATE
-- here (outside the trigger) is safe: it's a one-time, single-statement,
-- non-concurrent migration step, not a per-signup hot path.
with first_100 as (
  select id from public.profiles order by created_at limit 100
)
update public.profiles set is_founder = true
 where id in (select id from first_100) and not is_founder;
