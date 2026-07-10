-- ============ Close referral-farming hole: require ACTIVITY to qualify ============
-- Farming vector closed: a referral counted the instant the referred user
-- confirmed their email. Open .edu signup makes 100 throwaway-but-confirmable
-- addresses cheap, and 100 referrals auto-grants 6 months of Pro (see
-- 20260713120000). This migration adds a second gate: a referral only QUALIFIES
-- once the referred account earns its first contribution point (any
-- action_type in contribution_log — post, comment, connection, profile_update,
-- courses, etc). Attribution still happens at email confirmation
-- (handle_email_confirmed, unchanged) — the row is just created unqualified.
-- referrals has 0 rows today: no backfill, no grandfathering needed.

alter table public.referrals add column if not exists qualified_at timestamptz;

-- ---------------------------------------------------------------------------
-- Qualify on first contribution point. Point update on the PK
-- (referred_id) per contribution_log row -- cheap even though most inserted
-- rows belong to a non-referred user and no-op here.
-- ponytail: fires on every contribution_log insert, not just the referred
-- user's first one; a WHERE qualified_at is null keeps repeats a no-op. Revisit
-- only if contribution_log write volume becomes a bottleneck.
-- ---------------------------------------------------------------------------
create or replace function public.qualify_referral()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  update public.referrals
     set qualified_at = now()
   where referred_id = new.user_id
     and qualified_at is null;
  return new;
end;
$function$;

-- Trigger-bound only; block direct-call spoofing (house pattern, matches
-- handle_email_confirmed in 20260711160000).
revoke execute on function public.qualify_referral() from public, anon, authenticated;

drop trigger if exists contribution_log_qualify_referral on public.contribution_log;
create trigger contribution_log_qualify_referral
  after insert on public.contribution_log
  for each row execute function public.qualify_referral();

-- ---------------------------------------------------------------------------
-- Milestones now evaluate on QUALIFICATION, not on attribution. Same body as
-- 20260713120000 except v_count now filters qualified_at is not null. No
-- signature change (still returns trigger, no params) -- CREATE OR REPLACE
-- preserves the existing grants untouched.
-- ---------------------------------------------------------------------------
create or replace function public.trg_referral_campus_founder()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  v_count bigint;
begin
  select count(*) into v_count from public.referrals
   where referrer_id = new.referrer_id and qualified_at is not null;

  if v_count >= 50 then
    update public.profiles set is_campus_founder = true
    where id = new.referrer_id and is_campus_founder = false;
  end if;

  -- Never clobber an active Stripe subscriber: only grant when the referrer
  -- isn't currently Pro.
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

-- The old AFTER INSERT trigger on referrals evaluated milestones at
-- attribution time -- wrong now (an inserted row is never qualified). Drop it
-- and re-bind the same function to fire on the null -> not-null qualified_at
-- transition instead.
drop trigger if exists referrals_campus_founder on public.referrals;
create trigger referrals_qualify_milestone
  after update of qualified_at on public.referrals
  for each row
  when (old.qualified_at is null and new.qualified_at is not null)
  execute function public.trg_referral_campus_founder();

-- ---------------------------------------------------------------------------
-- get_referral_stats: counts mean QUALIFIED counts now, plus a pending_count
-- (attributed but not yet active) so the UI can show "N pending". RETURNS
-- TABLE shape changed (new column) -> drop + create -> reset ACL -> re-pin to
-- exactly what it had (authenticated only; no anon, per proacl check).
-- ---------------------------------------------------------------------------
drop function if exists public.get_referral_stats();

create function public.get_referral_stats()
returns table(code text, referral_count bigint, pending_count bigint, is_campus_founder boolean)
language plpgsql security definer set search_path to '' as $function$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  return query
  select p.referral_code,
         (select count(*) from public.referrals r where r.referrer_id = v_me and r.qualified_at is not null),
         (select count(*) from public.referrals r where r.referrer_id = v_me and r.qualified_at is null),
         p.is_campus_founder
  from public.profiles p where p.id = v_me;
end;
$function$;

revoke all on function public.get_referral_stats() from public;
grant execute on function public.get_referral_stats() to authenticated;
