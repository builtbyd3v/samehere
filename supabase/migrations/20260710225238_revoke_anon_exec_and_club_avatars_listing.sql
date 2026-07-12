-- 1. Revoke anon EXECUTE on internal SECURITY DEFINER fns (default-privileges regrant regression)
revoke execute on function public.admin_list_reports() from anon;
revoke execute on function public.current_is_admin() from anon;
revoke execute on function public.current_is_suspended() from anon;
revoke execute on function public.get_blocked_ids() from anon;
revoke execute on function public.get_founder_spots_left() from anon;
revoke execute on function public.is_conversation_member(uuid) from anon;

-- These four were authored in the dashboard and only get a tracked CREATE later
-- (20260711130000 / 20260711150000), so on a fresh replay they don't exist yet.
-- Guard with to_regprocedure: no-op here on replay (the creating migrations set
-- the correct grants themselves), unchanged on the live DB where they exist.
do $$
declare
  fn text;
  sigs text[] := array[
    'get_my_billing()',
    'leave_conversation(uuid)',
    'reactivate_on_message()',
    'reports_assert_target()'
  ];
begin
  foreach fn in array sigs loop
    if to_regprocedure('public.' || fn) is not null then
      execute format('revoke execute on function public.%s from anon', fn);
    end if;
  end loop;
end $$;

-- 2. club-avatars scoped-SELECT policy: it depends on public.club_role(), which
-- is dashboard-era and only gets a tracked CREATE at 20260714140000_clubs.sql.
-- On a fresh replay club_role doesn't exist yet here, so the policy creation was
-- moved to 20260717100000_club_avatars_scoped_select_and_limits.sql (the final
-- club-avatars hardening migration, which runs after club_role exists). No-op on
-- the live DB where the policy was already created by this migration.
