-- ============ Close the .edu signup gate (finding C1) ============
-- The .edu check lived ONLY in the signUp Server Action. NEXT_PUBLIC_SUPABASE_ANON_KEY
-- is public, so anyone could call supabase.auth.signUp() directly and skip it, and
-- handle_new_user never inspected new.email. This moves the gate into the trigger
-- that fires on auth.users INSERT, so a non-.edu (non-allowlisted) signup aborts the
-- transaction and no auth.users row ever commits.
--
-- Two entry points, one gate. They do NOT disagree — they serve different callers:
--   1. The signup FORM (app/(auth)/actions.ts) is the path real students take. It
--      enforces .edu strictly as UX, with no allowlist. That is correct: the form is
--      for students, and a would-be tester never signs up through it.
--   2. The ALLOWLIST is for accounts created OUT OF BAND — a Supabase dashboard
--      invite, an admin-created user. Those INSERT into auth.users directly, fire this
--      trigger, and the allowlist is what lets a non-.edu tester address through the
--      gate. Do NOT "fix" the form by wiring the is_allowed_signup_email RPC into it:
--      that would require granting the function to anon and reintroduce the membership
--      oracle this migration deliberately closes (see the revoke below).

-- (a) Allowlist table — replaces the SIGNUP_ALLOWLIST env var. A process env is
-- invisible to a Postgres trigger, so the app and the DB would disagree; one source
-- of truth instead. Definer-only, zero policies (same discipline as ai_usage /
-- profile_views).
create table if not exists public.signup_allowlist (
  email text primary key,
  note text,
  created_at timestamptz not null default now()
);
alter table public.signup_allowlist enable row level security;
-- Deliberately zero policies: reachable only through SECURITY DEFINER functions.

-- (b) Domain check. Parses the domain off the single '@' — never matches the whole
-- string. Mirrors isEduEmail() in lib/utils/validation.ts exactly: exactly one '@'
-- with a non-empty local part; domain trimmed + lowercased; reject empty, leading /
-- trailing / double dots; require a real .edu. Allowlisted (lowercased) emails bypass
-- the .edu requirement.
create or replace function public.is_allowed_signup_email(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.signup_allowlist a
      where a.email = lower(trim(p_email))
    )
    or (
      -- exactly one '@' (mirrors lastIndexOf === indexOf) and a non-empty local part
      length(p_email) - length(replace(p_email, '@', '')) = 1
      and position('@' in p_email) > 1
      and (
        select
          s.dom <> ''
          and left(s.dom, 1) <> '.'
          and right(s.dom, 1) <> '.'
          and position('..' in s.dom) = 0
          and s.dom ~ '\.edu$'
        from (select lower(trim(split_part(p_email, '@', 2))) as dom) s
      )
    );
$$;

-- New function => default PUBLIC execute grant. It is SECURITY DEFINER and reads
-- signup_allowlist (RLS on, zero policies) with owner rights, so a world-callable
-- copy is a membership oracle: anyone could probe any address for allowlist status.
-- Revoke it. The trigger is unaffected — trigger execution ignores EXECUTE grants,
-- and handle_new_user (SECURITY DEFINER) calls this nested as the function owner, who
-- always retains execute on its own functions.
revoke all on function public.is_allowed_signup_email(text) from public, anon, authenticated;

-- (c) Record the domain the account was created under. Additive; populated by the
-- trigger below and backfilled here for existing rows (a null email_domain silently
-- reading as "unknown" is a trap for any future policy written against it).
alter table public.profiles add column if not exists email_domain text;

update public.profiles p
   set email_domain = lower(split_part(u.email, '@', 2))
  from auth.users u
 where u.id = p.id and p.email_domain is null;

-- (d) handle_new_user — existing username + referral attribution preserved VERBATIM.
-- Added: the gate at the top, and email_domain on the profile insert.
-- NOTE: this function now carries two independent concerns (the .edu gate + referral
-- attribution). Finding H4 will add a third — granting is_founder to the first 100
-- profiles. Whoever does that: keep the gate first and the concerns separate.
-- CREATE OR REPLACE preserves the existing revoke from 20260706150000 (grants are not
-- reset on replace), so this stays client-uncallable.
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

  insert into public.profiles (id, username, referral_code, email_domain)
  values (new.id, v_username, v_username, lower(split_part(new.email, '@', 2)));

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

-- (e) guard_profile_privileged — body copied verbatim from 20260710180000, with
-- email_domain added to the frozen-column list so a client can't rewrite it. (This
-- BEFORE trigger checks current_user, so it must NOT be SECURITY DEFINER — definer
-- would rewrite current_user to the owner and defeat the guard; preserved as-is.)
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
    if not coalesce(old.is_pro, false) then
      new.accent_color := old.accent_color;
      new.avatar_is_animated := old.avatar_is_animated;
      new.banner_url := old.banner_url;
    end if;
  end if;
  return new;
end;
$function$;
