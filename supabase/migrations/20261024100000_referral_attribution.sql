-- Plan 016: shared portfolio links carry ?ref=<username>, and every signup path
-- records who brought the person in.
--
-- 1. resolve_referrer(p_ref): the one internal lookup. Referral code first (every
--    existing /signup?ref=<code> link keeps working), username second (portfolio
--    links carry a username, which stops matching once a user changes their code).
--    Internal only: no role may call it directly.
-- 2. handle_email_confirmed: body from 20260720120000, lookup replaced by the
--    resolver. Self-check, on conflict do nothing, found guard and the
--    referral_joined notification are unchanged. Trigger binding untouched.
-- 3. check_invite_code: same signature and ACL as 20260720130000, now also
--    accepts a username, so a portfolio link passes the invite-only gate.
-- 4. set_referral_code: body from 20260705160000 plus one guard: a code may not
--    equal another user's username, so nobody can squat a username and be
--    credited for that user's portfolio shares.
-- 5. claim_signup_referral(p_ref): OAuth twin of the metadata path. OAuth
--    accounts are created already confirmed, so on_auth_user_confirmed never
--    fires for them. The callback route calls this once after the code exchange.
--    Only a brand-new confirmed account may claim, and only once (referred_id is
--    the primary key).
--
-- House pattern: create or replace resets EXECUTE to PUBLIC, so every function
-- restates its revoke and grants narrowly.

-- 1. Resolver
create or replace function public.resolve_referrer(p_ref text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.id from public.profiles p where p.referral_code = lower(trim(p_ref))),
    (select p.id from public.profiles p where p.username = lower(trim(p_ref)))
  )
  where lower(trim(coalesce(p_ref, ''))) ~ '^[a-z0-9_]{3,20}$';
$$;

revoke all on function public.resolve_referrer(text) from public, anon, authenticated;

-- 2. Email-confirm attribution
create or replace function public.handle_email_confirmed()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  v_referrer uuid := public.resolve_referrer(new.raw_user_meta_data ->> 'ref_code');
begin
  if v_referrer is not null and v_referrer <> new.id then
    insert into public.referrals (referred_id, referrer_id)
    values (new.id, v_referrer) on conflict (referred_id) do nothing;
    if found then
      perform public.insert_notification(v_referrer, new.id, 'referral_joined');
    end if;
  end if;
  return new;
end;
$function$;

revoke execute on function public.handle_email_confirmed() from public, anon, authenticated;

-- 3. Invite-only gate (anon EXECUTE is required: it runs pre-auth, returns a boolean only)
create or replace function public.check_invite_code(p_code text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select public.resolve_referrer(p_code) is not null;
$$;

revoke all on function public.check_invite_code(text) from public;
grant execute on function public.check_invite_code(text) to anon, authenticated;

-- 4. Change own referral code, now also refusing another user's username
create or replace function public.set_referral_code(p_code text)
returns text language plpgsql security definer set search_path to '' as $function$
declare v_me uuid := auth.uid(); v_code text := lower(trim(p_code));
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if v_code !~ '^[a-z0-9_]{3,20}$' then raise exception 'invalid_code'; end if;
  if exists (select 1 from public.profiles where referral_code = v_code and id <> v_me) then
    raise exception 'code_taken';
  end if;
  if exists (select 1 from public.profiles where username = v_code and id <> v_me) then
    raise exception 'code_taken';
  end if;
  update public.profiles set referral_code = v_code where id = v_me;
  return v_code;
end;
$function$;

revoke all on function public.set_referral_code(text) from public, anon, authenticated;
grant execute on function public.set_referral_code(text) to authenticated;

-- 5. OAuth claim, fresh confirmed accounts only
-- ponytail: the 1-hour window is the only abuse limit on the claim path, same
-- trust level as typing a code at email signup. Tighten to "profile created in
-- this request" only if referral farming shows up.
create or replace function public.claim_signup_referral(p_ref text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_referrer uuid;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;
  -- Only a brand-new, confirmed account may claim, and only once (referred_id
  -- is the primary key). Old accounts cannot re-attribute themselves.
  if not exists (
    select 1 from auth.users u
    where u.id = v_me
      and u.email_confirmed_at is not null
      and u.created_at > now() - interval '1 hour'
  ) then
    return false;
  end if;
  v_referrer := public.resolve_referrer(p_ref);
  if v_referrer is null or v_referrer = v_me then
    return false;
  end if;
  insert into public.referrals (referred_id, referrer_id)
  values (v_me, v_referrer) on conflict (referred_id) do nothing;
  if not found then
    return false;
  end if;
  perform public.insert_notification(v_referrer, v_me, 'referral_joined');
  return true;
end;
$$;

revoke all on function public.claim_signup_referral(text) from public, anon, authenticated;
grant execute on function public.claim_signup_referral(text) to authenticated;
