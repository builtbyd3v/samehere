-- Plan 042: invite-only beta signup gate.
--
-- The signup action needs to check "does this referral code belong to a real
-- member" BEFORE auth.signUp() runs (the user isn't authenticated yet). The
-- profiles SELECT policy is `(select auth.uid()) is not null` — anon (no
-- session) never passes that, regardless of the column grants restored in
-- 20260711150200. So a direct anon-key `.from("profiles").select(...)` here
-- returns zero rows always, not "code invalid" — it can't distinguish real
-- codes from fake ones. Hence this SECURITY DEFINER fallback: boolean-only,
-- no row data, so it can't be used as an enumeration oracle beyond "exists".
create or replace function public.check_invite_code(p_code text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists(
    select 1 from public.profiles where referral_code = lower(trim(p_code))
  );
$$;

-- Anon execute is REQUIRED here — that's the point of this function. It runs
-- pre-auth, during signup, when there is no session yet. It leaks nothing
-- beyond a boolean.
revoke all on function public.check_invite_code(text) from public;
grant execute on function public.check_invite_code(text) to anon, authenticated;
