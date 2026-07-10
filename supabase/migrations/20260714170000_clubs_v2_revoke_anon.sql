-- Same default-privileges trap as 20260714150000: the three NEW functions in
-- clubs_v2 (create function, not create-or-replace) got an anon EXECUTE grant
-- by name, which `revoke ... from public` in that migration did not remove.
-- Not exploitable (each gates on auth.uid()/club_role, null for anon) but must
-- match the codebase's authenticated-only posture. Revoke anon by name.
revoke all on function public.can_read_channel(uuid) from anon;
revoke all on function public.club_create_channel(uuid, text, text) from anon;
revoke all on function public.club_delete_channel(uuid) from anon;
