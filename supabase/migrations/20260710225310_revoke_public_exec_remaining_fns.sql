-- Prior migration revoked anon EXECUTE directly, but these 5 fns still had
-- an EXECUTE grant to PUBLIC (default Postgres behavior on function create),
-- which anon inherits via the PUBLIC pseudo-role regardless of the direct
-- anon revoke. Revoke from PUBLIC and re-grant to authenticated explicitly
-- so legitimate callers are unaffected.
revoke execute on function public.current_is_admin() from public;
revoke execute on function public.current_is_suspended() from public;
revoke execute on function public.get_blocked_ids() from public;
revoke execute on function public.get_founder_spots_left() from public;
revoke execute on function public.reactivate_on_message() from public;

grant execute on function public.current_is_admin() to authenticated;
grant execute on function public.current_is_suspended() to authenticated;
grant execute on function public.get_blocked_ids() to authenticated;
grant execute on function public.get_founder_spots_left() to authenticated;
grant execute on function public.reactivate_on_message() to authenticated;
