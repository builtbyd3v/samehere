-- admin_list_feedback/admin_resolve_feedback still carry an EXECUTE grant for
-- anon in prod (confirmed via pg_proc.proacl), even though
-- 20260721010000_admin_feedback_review.sql ends with "revoke execute ... from
-- public". This is the schema-level DEFAULT PRIVILEGES trap already documented
-- in 20260713190000_revoke_anon_on_recreated_rpcs.sql and the clubs migration:
-- Supabase's default privileges on schema public grant EXECUTE to anon,
-- authenticated and service_role on every NEWLY CREATED function. Both feedback
-- functions were new in that migration, so anon received a ROLE-SPECIFIC grant
-- at creation. "revoke ... from public" strips only the PUBLIC pseudo-role
-- grant and leaves a role-specific one untouched, so the backstop missed.
-- Revoking from anon by name is the only thing that removes it.
--
-- Not a live breach: both functions self-gate on current_is_admin(), so an anon
-- caller raises 'not authorized' regardless. This restores the defence in depth
-- every other admin_* function already has.
revoke execute on function public.admin_list_feedback() from anon;
revoke execute on function public.admin_resolve_feedback(uuid) from anon;
