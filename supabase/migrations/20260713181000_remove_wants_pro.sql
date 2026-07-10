-- Retire the Pro waitlist. Stripe billing is live; wants_pro is dead weight
-- (1 row true, no reads anywhere but get_my_billing). guard_profile_privileged
-- does not reference wants_pro (checked prosrc) — untouched.

-- get_my_billing: RETURNS TABLE shape changes (drop wants_pro column) =>
-- drop+create resets ACL to EXECUTE-for-PUBLIC. Re-pin to the exact grants
-- observed on prod (proacl: postgres=X, anon=X, authenticated=X, service_role=X;
-- postgres is owner, appears automatically).
drop function if exists public.get_my_billing();

create function public.get_my_billing()
returns table(is_pro boolean, pro_until timestamptz, pro_source text, stripe_customer_id text)
language sql
stable
security definer
set search_path = ''
as $function$
  select p.is_pro, p.pro_until, p.pro_source, p.stripe_customer_id
  from public.profiles p where p.id = auth.uid();
$function$;

revoke all on function public.get_my_billing() from public;
grant execute on function public.get_my_billing() to anon, authenticated, service_role;

alter table public.profiles drop column if exists wants_pro;
