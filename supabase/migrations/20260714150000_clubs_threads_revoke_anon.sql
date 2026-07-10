-- Corrective grants for the clubs + threads functions.
--
-- 20260714140000_clubs.sql and 20260714130000_threads.sql wrote
-- `revoke all on function ... from public` + `grant execute ... to
-- authenticated` for their definer functions. That does NOT deny anon:
-- Supabase's default privileges grant EXECUTE to `anon` BY NAME at function
-- creation, and `revoke ... from public` leaves a by-name grant intact. Live
-- ACLs confirmed `anon=X` on club_join, club_role, current_thread_id, etc.
--
-- Not exploitable -- every callable function derives its authority from
-- auth.uid(), which is null for anon, so an anon RPC call rejects immediately.
-- But the codebase's deliberate mutation functions (request_follow,
-- accept_follow, block_user, use_ai_quota, get_or_create_dm) all deny anon,
-- and these should match. This is the trap recorded in
-- supabase-default-privileges-trap: the revoke must name anon explicitly.

-- Callable by signed-in users only: revoke anon by name, keep authenticated.
revoke all on function public.is_club_member(uuid) from anon;
revoke all on function public.club_role(uuid) from anon;
revoke all on function public.club_join(uuid) from anon;
revoke all on function public.club_leave(uuid) from anon;
revoke all on function public.club_approve(uuid, uuid) from anon;
revoke all on function public.club_reject(uuid, uuid) from anon;
revoke all on function public.club_set_role(uuid, uuid, text, text) from anon;
revoke all on function public.current_thread_id() from anon;

-- Trigger-only functions: never invoked as RPC. A trigger runs its function as
-- the table owner regardless of EXECUTE grants, so revoke execute from every
-- client role -- there is no reason for /rest/v1/rpc to reach these at all.
revoke all on function public.club_members_track_role_history() from anon, authenticated;
revoke all on function public.clubs_after_insert() from anon, authenticated;
revoke all on function public.rl_check_clubs() from anon, authenticated;
revoke all on function public.guard_clubs_privileged() from anon, authenticated;
