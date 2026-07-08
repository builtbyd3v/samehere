-- Pro "Express" perk: profile banner. Stored in the existing public avatars
-- bucket at path <uid>/banner (existing owner-scoped upload + public-read
-- policies already cover it). Column frozen for non-Pro rows in the guard
-- trigger so it can't be set via a raw PostgREST update (same as accent_color).
alter table public.profiles add column if not exists banner_url text;

create or replace function public.guard_profile_privileged()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if current_user in ('authenticated', 'anon') then
    new.is_pro := old.is_pro;
    new.is_founder := old.is_founder;
    new.is_campus_founder := old.is_campus_founder;
    new.stripe_customer_id := old.stripe_customer_id;
    new.pro_until := old.pro_until;
    new.is_admin := old.is_admin;
    new.is_suspended := old.is_suspended;
    if not coalesce(old.is_pro, false) then
      new.accent_color := old.accent_color;
      new.avatar_is_animated := old.avatar_is_animated;
      new.banner_url := old.banner_url;
    end if;
  end if;
  return new;
end;
$function$;
