-- Social Butterfly (formerly Campus Founder, column stays is_campus_founder --
-- ponytail: column keeps old name; product name is Social Butterfly. rename =
-- 9-site churn for zero user value) thresholds change per 2026-07-09 open-signup
-- spec (M3): badge at 50 confirmed referrals (was 100); at 100, one free
-- semester of Pro unless the referrer is already Pro.
--
-- Base state (read first): 20260711160000_referrals_require_confirmation.sql
-- moved referral attribution to email confirmation, so a row in
-- public.referrals already means "confirmed". trg_referral_campus_founder
-- fires AFTER INSERT on referrals, so count(*) for a referrer is already the
-- confirmed count -- no extra filtering needed here.

-- pro_source CHECK (20260710180000_pro_source_column.sql) only allowed
-- 'subscription' | 'one_time'; add 'referral' as a third grant source.
alter table public.profiles drop constraint if exists profiles_pro_source_check;
alter table public.profiles add constraint profiles_pro_source_check
  check (pro_source is null or pro_source in ('subscription', 'one_time', 'referral'));

create or replace function public.trg_referral_campus_founder()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  v_count bigint;
begin
  select count(*) into v_count from public.referrals where referrer_id = new.referrer_id;

  if v_count >= 50 then
    update public.profiles set is_campus_founder = true
    where id = new.referrer_id and is_campus_founder = false;
  end if;

  -- ponytail: exact-count transition; dup grant needs two referrals committing
  -- the same instant, tolerable. Never touch an active Stripe subscriber:
  -- only grant when the referrer isn't currently Pro.
  if v_count = 100 then
    update public.profiles
       set is_pro = true,
           pro_until = now() + interval '6 months',
           pro_source = 'referral'
     where id = new.referrer_id
       and (is_pro = false or pro_until < now());
  end if;

  return new;
end;
$function$;
-- Trigger wiring (referrals_campus_founder after insert on referrals) is
-- unchanged from 20260705160000 -- only the function body is redefined.

-- Backfill: the trigger only fires on FUTURE inserts, so anyone already sitting
-- at >= 50 confirmed referrals gets the badge here. No retroactive Pro-at-100
-- backfill: that grant is an on-the-moment transition, and nobody is near 100.
update public.profiles p
   set is_campus_founder = true
 where p.is_campus_founder = false
   and (select count(*) from public.referrals r where r.referrer_id = p.id) >= 50;
