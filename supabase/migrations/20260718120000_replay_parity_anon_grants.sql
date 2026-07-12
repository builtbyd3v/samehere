-- Anon grants the earlier migrations missed. Surfaced by supabase/tests/rls_test.sql
-- once a fresh replay could finally run it end to end.

-- 1. get_blocked_ids() is evaluated INSIDE the posts/comments/reactions/reposts
--    SELECT policies for every caller. 20260708004649's own note says to keep it
--    callable by anon so anon policy evaluation on public surfaces can't error
--    out -- but 20260710225238 / 20260710225310 then revoked anon/PUBLIC EXECUTE,
--    so an anon SELECT that reaches the policy now 42501s ("permission denied for
--    function get_blocked_ids"). Re-grant to anon; it returns the empty set when
--    auth.uid() is null, so there is no data exposure.
grant execute on function public.get_blocked_ids() to anon;

-- 2. profiles carries column-level SELECT (the table-level SELECT was revoked so
--    hidden fields stay hidden). Three later columns were granted to authenticated
--    only; non-privileged columns must ALSO be anon-readable or any anon/public
--    profile read naming them 42501s (rls_test's profiles_column_grants enforces
--    the anon + authenticated pair for every non-withheld column).
grant select (email_digest_opt_out) on public.profiles to anon;
grant select (onboarded_at)         on public.profiles to anon;
grant select (profile_theme)        on public.profiles to anon;
