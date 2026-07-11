-- Plan 025 follow-up: the group-DM definer RPCs used `revoke all from public`
-- but did not name `anon` explicitly, so anon retained EXECUTE (the documented
-- supabase default-privileges / anon-revoke trap; advisor
-- anon_security_definer_function_executable). Functions are internally guarded
-- by auth.uid(), so no active leak, but revoke anon for standard parity.
revoke execute on function public.create_group_conversation(text, uuid[]) from anon;
revoke execute on function public.list_group_inbox() from anon;
revoke execute on function public.get_group_conversation(uuid) from anon;
