-- ============ Finding M6: referrals attributed before email confirmation ============
-- handle_new_user fires on auth.users INSERT — at signup, BEFORE email
-- confirmation — and inserted the referrals row there. The only guard was
-- v_referrer <> new.id, so 100 throwaway UNCONFIRMED signups earned the badge.
--
-- Fix: move referral attribution off signup and onto the email-confirmation
-- UPDATE of auth.users, so only CONFIRMED users are ever attributed.
--
-- Scope note: the "Campus Founder" badge is being renamed to "Social Butterfly"
-- (UI copy, a sibling agent owns it) and is now honestly just "100 confirmed
-- referrals" — no school matching. So trg_referral_campus_founder keeps its
-- existing count(*) >= 100 logic, its name, and the is_campus_founder column
-- UNCHANGED here. The column is deliberately NOT renamed: is_campus_founder
-- appears in six RETURNS TABLE signatures (get_leaderboard, get_public_profile,
-- get_public_profile_card, get_referral_stats, ...); renaming means drop/recreate
-- each, which resets every ACL to EXECUTE for PUBLIC. We only add a comment.
--
-- ---- Can we trigger on auth.users at all? YES, and UPDATE specifically works. ----
-- The existing on_auth_user_created AFTER INSERT trigger on auth.users (running
-- handle_new_user) proves migrations may create triggers on auth.users at all:
-- migrations run as a role that owns / has TRIGGER on the auth schema. Trigger-
-- creation privilege does not distinguish INSERT from UPDATE — TRIGGER on the
-- table covers every event — so AFTER UPDATE is equally permitted. And it DOES
-- fire in practice: Supabase Auth (GoTrue) confirms an email by issuing a real
-- SQL UPDATE that sets email_confirmed_at, which is exactly the NULL -> NOT NULL
-- transition the WHEN clause below keys on. (If some future locked-down project
-- revoked TRIGGER on auth.users, the fallback is a GoTrue auth hook or an edge
-- function on the confirmation event — not needed here.)
--
-- NOTE (still open, do NOT fix here): handle_new_user still claims the username
-- at signup, before confirmation, so unconfirmed signups can squat usernames.
-- That's CLAUDE.md security item 10 and out of scope for M6.

-- ---------------------------------------------------------------------------
-- handle_new_user: drop the referral insert. Everything else preserved
-- byte-for-byte from 20260711120000_founder_grant.sql — the .edu gate stays the
-- first statement, the founder grant stays folded into the profile INSERT.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  v_username text := new.raw_user_meta_data ->> 'username';
begin
  if not public.is_allowed_signup_email(new.email) then
    raise exception 'signup restricted to verified .edu addresses' using errcode = '22023';
  end if;

  insert into public.profiles (id, username, referral_code, email_domain, is_founder)
  values (new.id, v_username, v_username, lower(split_part(new.email, '@', 2)),
          (select count(*) from public.profiles where is_founder) < 100);
  return new;
end;
$function$;

-- ---------------------------------------------------------------------------
-- Attribute the referral on email confirmation, not at signup.
-- ref_code persists in raw_user_meta_data from signup, so we re-read it here.
-- The referred user's profile already exists (created by handle_new_user at
-- signup), so the FK on referrals.referred_id is satisfied. referred_id is the
-- PRIMARY KEY, so on conflict do nothing makes a second attribution for the same
-- user impossible — double-counting cannot happen even if this ever fires twice.
-- ---------------------------------------------------------------------------
create or replace function public.handle_email_confirmed()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  v_ref text := lower(trim(coalesce(new.raw_user_meta_data ->> 'ref_code', '')));
  v_referrer uuid;
begin
  if length(v_ref) = 0 then return new; end if;
  select id into v_referrer from public.profiles where referral_code = v_ref;
  if v_referrer is not null and v_referrer <> new.id then
    insert into public.referrals (referred_id, referrer_id)
    values (new.id, v_referrer) on conflict (referred_id) do nothing;
  end if;
  return new;
end;
$function$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed after update on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.handle_email_confirmed();

-- ---------------------------------------------------------------------------
-- Lock down the new SECURITY DEFINER function (house pattern from
-- 20260706150000_revoke_internal_definer_execute.sql). It is trigger-bound —
-- triggers fire regardless of EXECUTE grants — so revoking from client roles
-- breaks nothing legitimate but blocks direct call spoofing.
-- ---------------------------------------------------------------------------
revoke execute on function public.handle_email_confirmed() from public, anon, authenticated;

-- Record that the user-facing badge name is "Social Butterfly" so nobody
-- "tidies" the retained-for-ACL-safety column name.
comment on column public.profiles.is_campus_founder is
  'Grants the "Social Butterfly" badge (100 confirmed referrals). Column name '
  'retained deliberately: renaming would drop/recreate six RETURNS TABLE '
  'functions and reset their ACLs to PUBLIC EXECUTE.';
