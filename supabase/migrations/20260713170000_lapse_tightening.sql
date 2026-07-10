-- Pro-lapse tightening, from the Pro-gating audit (open-signup round).
--
-- (1) guard_profile_privileged froze the cosmetic columns on raw old.is_pro.
-- A lapsed one-time buyer (is_pro still true inside the cron grace window,
-- pro_until past) could still WRITE new accent/banner/animated-avatar values.
-- Harmless today because every render site gates on is_pro_now(), so nothing
-- showed — but the DB guard should match the render rule. Body copied verbatim
-- from 20260713100000 (4); only the cosmetic-freeze condition changes.
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
    end if;
  end if;
  return new;
end;
$function$;

-- (2) expire_lapsed_pro only swept pro_source = 'one_time'. The referral grant
-- (20260713120000) writes pro_source = 'referral' with a 6-month pro_until and
-- nothing ever flipped is_pro off — safe (render gates on is_pro_now), but the
-- row would read Pro forever. Sweep both non-subscription sources; subscription
-- rows stay Stripe-driven on purpose.
create or replace function public.expire_lapsed_pro()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_count integer;
begin
  update public.profiles
     set is_pro = false
   where is_pro
     and pro_source in ('one_time', 'referral')
     and pro_until is not null
     and pro_until < now() - interval '1 day';
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;
