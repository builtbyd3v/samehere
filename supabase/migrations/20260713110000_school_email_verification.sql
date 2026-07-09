-- ============ M2: school email verification (.edu, optional, post-signup) ============
-- Open signup no longer requires .edu (see 20260713100000_*, sibling migration —
-- assumed applied first: adds profiles.verified_student boolean not null default false).
-- This lets an already-signed-up user prove a .edu address from /settings to earn the
-- verified badge. One row per user; a new request overwrites the old code (only the
-- latest code is ever valid).

-- (a) Storage. Same discipline as signup_allowlist / ai_usage: RLS on, ZERO policies,
-- reachable only through the two SECURITY DEFINER functions below.
create table public.school_email_verifications (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  -- rolling 24h rate limit, tracked in the same row (no separate log table)
  requests_today int not null default 1,
  last_request_at timestamptz not null default now()
);
alter table public.school_email_verifications enable row level security;
-- Deliberately zero policies.

revoke all on public.school_email_verifications from public, anon, authenticated;

-- (b) request_school_verification — validates + rate-limits + upserts the pending
-- code. Caller (server action) generates the 6-digit code and sha256-hashes it before
-- calling; the plain code never reaches the DB. RPC error => caller must not send the
-- email.
create or replace function public.request_school_verification(p_email text, p_code_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_domain text;
  v_row public.school_email_verifications%rowtype;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  if exists (select 1 from public.profiles where id = v_uid and verified_student) then
    raise exception 'already verified';
  end if;

  -- domain parse, mirrors is_allowed_signup_email's .edu check (20260711100000):
  -- exactly one '@', non-empty local part, domain trimmed/lowercased, no leading/
  -- trailing/double dots, ends '.edu'.
  if length(p_email) - length(replace(p_email, '@', '')) <> 1 or position('@' in p_email) <= 1 then
    raise exception 'invalid email';
  end if;

  v_domain := lower(trim(split_part(p_email, '@', 2)));
  if v_domain = '' or left(v_domain, 1) = '.' or right(v_domain, 1) = '.'
     or position('..' in v_domain) > 0 or v_domain !~ '\.edu$' then
    raise exception 'must be a .edu email';
  end if;

  select * into v_row from public.school_email_verifications where user_id = v_uid;

  if found then
    if v_row.last_request_at > now() - interval '24 hours' then
      -- ponytail: rolling window approximated by "since last request", not a sliding
      -- log of each request timestamp. Good enough for a 3/day cap.
      if v_row.requests_today >= 3 then
        raise exception 'too many verification requests, try again later';
      end if;
      update public.school_email_verifications
         set email = lower(trim(p_email)),
             code_hash = p_code_hash,
             expires_at = now() + interval '15 minutes',
             attempts = 0,
             requests_today = v_row.requests_today + 1,
             last_request_at = now()
       where user_id = v_uid;
    else
      -- window expired: reset the counter
      update public.school_email_verifications
         set email = lower(trim(p_email)),
             code_hash = p_code_hash,
             expires_at = now() + interval '15 minutes',
             attempts = 0,
             requests_today = 1,
             last_request_at = now()
       where user_id = v_uid;
    end if;
  else
    insert into public.school_email_verifications
      (user_id, email, code_hash, expires_at, attempts, requests_today, last_request_at)
    values (v_uid, lower(trim(p_email)), p_code_hash, now() + interval '15 minutes', 0, 1, now());
  end if;
end;
$function$;

-- (c) confirm_school_verification — checks the code, flips profiles.verified_student.
-- Returns false (not an exception) for "no row" / "expired" / "wrong code" so the UI
-- can show a plain retry message; raises only for the too-many-attempts case, which
-- needs a distinct message telling the user to request a fresh code.
create or replace function public.confirm_school_verification(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_row public.school_email_verifications%rowtype;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select * into v_row from public.school_email_verifications where user_id = v_uid;

  if not found or v_row.expires_at < now() then
    return false;
  end if;

  if v_row.attempts >= 5 then
    raise exception 'too many attempts, request a new code';
  end if;

  -- increment BEFORE compare so a wrong guess always counts, even the 5th.
  update public.school_email_verifications set attempts = attempts + 1 where user_id = v_uid;

  if encode(sha256(convert_to(p_code, 'UTF8')), 'hex') = v_row.code_hash then
    -- guard_profile_privileged (20260711100000) freezes verified_student only when
    -- current_user in ('authenticated','anon') — i.e. a client-role write. This
    -- function is SECURITY DEFINER, so current_user is the function owner here, not
    -- 'authenticated'; the guard's check does not match and this write passes.
    update public.profiles set verified_student = true where id = v_uid;
    delete from public.school_email_verifications where user_id = v_uid;
    return true;
  end if;

  return false;
end;
$function$;

-- (d) Grants. Unlike most SECURITY DEFINER functions in this repo (revoked entirely,
-- called only from triggers/nested calls — see 20260706150000 /
-- 20260708004722_revoke_anon_execute_rpc_explicit.sql), these two are meant to be
-- called directly by the logged-in user from a server action. Revoke the default
-- PUBLIC grant and anon, then grant execute to authenticated only.
revoke all on function public.request_school_verification(text, text) from public, anon;
revoke all on function public.confirm_school_verification(text) from public, anon;
grant execute on function public.request_school_verification(text, text) to authenticated;
grant execute on function public.confirm_school_verification(text) to authenticated;
