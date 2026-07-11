-- Pro-gate parity for profile_theme (plan 023 revise).
--
-- profile_theme (20260716160000) is gated only in the app
-- (profile/edit/actions.ts isPro branch). But the profiles UPDATE RLS policy
-- lets an owner PATCH any of their OWN columns via raw PostgREST, so a non-Pro
-- user could set a theme directly through the API and wear it — a (cosmetic)
-- paywall bypass. The live guard_profile_privileged trigger already freezes the
-- other three Pro cosmetics (accent_color / avatar_is_animated / banner_url)
-- back to their prior values for non-Pro writers; profile_theme was simply
-- missed. Add it to the SAME freeze branch for parity.
--
-- Body copied verbatim from 20260713170000_lapse_tightening.sql (the current
-- definition — migrations are immutable, so we CREATE OR REPLACE here rather
-- than edit that file). The ONLY change is the added profile_theme freeze line.
-- Stays NON-definer: it reads current_user to detect the API role.
create or replace function public.guard_profile_privileged()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if current_user in ('authenticated', 'anon') then
    new.is_pro := old.is_pro;
    new.is_founder := old.is_founder;
    new.is_campus_founder := old.is_campus_founder;
    new.stripe_customer_id := old.stripe_customer_id;
    new.pro_until := old.pro_until;
    new.pro_source := old.pro_source;
    new.is_admin := old.is_admin;
    new.is_suspended := old.is_suspended;
    new.email_domain := old.email_domain;
    new.verified_student := old.verified_student;
    if not public.is_pro_now(old.is_pro, old.pro_until) then
      new.accent_color := old.accent_color;
      new.avatar_is_animated := old.avatar_is_animated;
      new.banner_url := old.banner_url;
      new.profile_theme := old.profile_theme;
    end if;
  end if;
  return new;
end;
$function$;
