-- Re-close the anon EXECUTE grant on two functions recreated this round.
--
-- The trap (already documented by 20260708004722_revoke_anon_execute_rpc_explicit.sql,
-- and stepped on again here): Supabase ships ALTER DEFAULT PRIVILEGES granting
-- EXECUTE on new functions in `public` to anon, authenticated and service_role.
-- `revoke all on function ... from public` does NOT remove those, because they
-- are explicit per-role grants, not the PUBLIC pseudo-role grant. So ANY
-- drop+create of a function silently re-acquires `anon=X` unless anon is named
-- in the revoke.
--
-- get_leaderboard(text)   — recreated by 20260713130000 and 20260713150000
-- get_referral_stats()    — recreated by 20260713184000
--
-- Neither leaked: both raise 'not authenticated' when auth.uid() is null, which
-- is why this is hygiene rather than an incident. The deliberately anon-callable
-- surface (get_public_post / get_public_profile / get_public_profile_card /
-- get_public_quote) is untouched.
--
-- RULE for future migrations: after any `drop function` + `create function`,
-- revoke from `public, anon` explicitly, not just `public`.

revoke all on function public.get_leaderboard(text) from public, anon;
grant execute on function public.get_leaderboard(text) to authenticated, service_role;

revoke all on function public.get_referral_stats() from public, anon;
grant execute on function public.get_referral_stats() to authenticated;
