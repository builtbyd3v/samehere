-- ============ Open signup: remove the .edu gate, add verified_student ============
-- Reverses 20260711100000_close_edu_gate.sql's trigger-side gate (see that file's
-- header for the form-vs-trigger split this undoes). Per
-- docs/superpowers/specs/2026-07-09-open-signup-design.md (M1): anyone may sign up
-- with any email or via OAuth; ".edu" becomes an earned "Verified Student" badge
-- instead of an admission requirement. The signup FORM's isEduEmail() check is
-- deleted separately (app-side, not this migration) — this file only touches the
-- DB trigger, which was the actual enforcement point.
--
-- OAuth signups carry no `username` in raw_user_meta_data, so handle_new_user must
-- also stop assuming one exists — this migration folds in username generation for
-- that case (spec M1, "OAuth-safe usernames").

-- (1) verified_student column. Owner-settable only via the trigger below (frozen
-- against client writes by guard_profile_privileged, same pattern as is_founder).
alter table public.profiles add column if not exists verified_student boolean not null default false;

-- (2) Backfill existing rows from email_domain (already lowercased — see
-- 20260711100000_close_edu_gate.sql (c)). Anyone who signed up under the old .edu-only
-- gate already proved a .edu domain, so this is a straight re-derivation, not a guess.
update public.profiles set verified_student = true where email_domain ~ '\.edu$';

-- (3) handle_new_user — base is the LATEST definition, from
-- 20260711160000_referrals_require_confirmation.sql (referral attribution had already
-- moved off this trigger and onto handle_email_confirmed there; nothing here touches
-- that split). Changes: (a) the .edu gate is gone — no more `raise exception` on a
-- non-.edu address; (b) v_username falls back to a generated handle when missing,
-- malformed, or reserved; (c) verified_student is set from the same domain parse used
-- for email_domain. is_founder logic is untouched, verbatim.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare
  v_username text := new.raw_user_meta_data ->> 'username';
  v_domain text := lower(split_part(new.email, '@', 2));
  v_base text;
  v_candidate text;
  v_tries int := 0;
begin
  if v_username is null
     or v_username !~ '^[a-z0-9_]{3,20}$'
     -- Reserved list mirrors RESERVED_USERNAMES in lib/utils/validation.ts (the
     -- `username_not_reserved` CHECK constraint lives outside supabase/migrations,
     -- applied directly — see 20260710120000's comment). A numeric/underscore
     -- suffix appended below can never itself collide with a reserved word (all
     -- reserved words are pure lowercase letters), so this check only needs to
     -- run once, on the un-suffixed base.
     or v_username in ('edit','api','dashboard','feed','post','login',
                        'signup','auth','admin','profile','search','saved')
  then
    v_base := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g');
    v_base := left(v_base, 15);
    if length(v_base) < 3 then
      v_base := left('user' || v_base, 15);
    end if;
    if v_base in ('edit','api','dashboard','feed','post','login',
                   'signup','auth','admin','profile','search','saved') then
      v_base := v_base || '_';
    end if;

    v_candidate := v_base;
    while exists (select 1 from public.profiles where username = v_candidate) and v_tries < 10 loop
      v_tries := v_tries + 1;
      -- v_base capped at 15 + "_" + 4 digits = 20 chars max, matching the CHECK.
      v_candidate := v_base || '_' || lpad(floor(random() * 10000)::int::text, 4, '0');
    end loop;
    if exists (select 1 from public.profiles where username = v_candidate) then
      -- ponytail: 10 numeric-suffix tries exhausted (only plausible if this exact
      -- email local part signs up dozens of times) — fall back to a random 8-char
      -- suffix and stop checking. Residual collision odds are astronomically small
      -- (16^8 space); not worth an unbounded loop over a signup trigger.
      v_candidate := 'user_' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    end if;
    v_username := v_candidate;
  end if;

  insert into public.profiles (id, username, referral_code, email_domain, is_founder, verified_student)
  values (new.id, v_username, v_username, v_domain,
          (select count(*) from public.profiles where is_founder) < 100,
          v_domain ~ '\.edu$');
  return new;
end;
$function$;
-- CREATE OR REPLACE preserves the existing revoke from 20260706150000 (grants/revokes
-- are not reset on replace) — handle_new_user stays client-uncallable, trigger-only.

-- (4) guard_profile_privileged — base is the LATEST definition, from
-- 20260711100000_close_edu_gate.sql (e) (no redefinition since; 20260711150000 only
-- touched column GRANTs, not this function). Body copied verbatim, plus
-- verified_student added to the always-frozen block (not the is_pro-gated one — this
-- isn't a Pro perk). Stays NON-definer: it reads current_user to detect the API role,
-- and SECURITY DEFINER would rewrite current_user to the function owner, defeating
-- the guard entirely.
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
    if not coalesce(old.is_pro, false) then
      new.accent_color := old.accent_color;
      new.avatar_is_animated := old.avatar_is_animated;
      new.banner_url := old.banner_url;
    end if;
  end if;
  return new;
end;
$function$;

-- (5) The gate is gone, so its machinery is pointless. Allowlist existed only to let
-- out-of-band (non-.edu) accounts through is_allowed_signup_email; both are now dead.
drop function if exists public.is_allowed_signup_email(text);
drop table if exists public.signup_allowlist;
