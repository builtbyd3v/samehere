-- reports_assert_target() is dashboard-era and only gets a tracked CREATE at
-- 20260711130000, so on a fresh replay it doesn't exist yet. Guard so replay
-- skips it (it's a trigger function — not directly callable, so the PUBLIC grant
-- is inert); unchanged on the live DB where it exists.
do $$
begin
  if to_regprocedure('public.reports_assert_target()') is not null then
    revoke execute on function public.reports_assert_target() from public;
    grant execute on function public.reports_assert_target() to authenticated;
  end if;
end $$;
