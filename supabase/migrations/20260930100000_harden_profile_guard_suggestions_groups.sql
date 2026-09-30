-- Plan 001: privacy + consent hardening.
-- 1. guard_profile_privileged: re-freeze last_subscription_event_at (lost when
--    20260713170000/20260716170000 re-created the function from a body that
--    predated 20260711120100) and freeze is_bot (added 20260724000000, never
--    frozen). Body copied from 20260716170000_freeze_profile_theme.sql; only
--    the two freeze lines are new.
-- 2. get_suggested_profiles: same privacy rules as search_people.
-- 3. create_group_conversation / add_group_member: the added member must
--    follow the caller (their own consent), and a member who left cannot be
--    re-added by someone else.
-- 4. guard_post_context_label_only: freeze hidden_by_suspension (authors
--    could mark their own admin-hidden post for restore on unsuspend).

-- ============================================================
-- guard_profile_privileged (stays NON-definer: it reads current_user)
-- ============================================================
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
    new.last_subscription_event_at := old.last_subscription_event_at;
    new.is_bot := old.is_bot;
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
