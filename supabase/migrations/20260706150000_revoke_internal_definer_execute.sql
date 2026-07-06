-- Lock down SECURITY DEFINER functions that must NOT be callable from the
-- client. Triggers still fire (trigger execution ignores EXECUTE grants) and
-- nested calls run as the function owner, so revoking from PUBLIC/anon/
-- authenticated breaks nothing legitimate.
--
-- Critical: insert_notification took arbitrary (user, actor, type) and had no
-- auth.uid() guard -> any authenticated user could forge notifications.
-- It is only meant to be called by the trg_notify_* triggers.

-- direct-call spoofing / internal helpers (not trigger-bound)
revoke execute on function public.insert_notification(uuid, uuid, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.has_same_day_connection(uuid, date) from public, anon, authenticated;
revoke execute on function public.revoke_contribution_same_day(uuid, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- trigger-only functions (fired by the DB, never called by a client)
revoke execute on function public.bump_conversation_updated() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.comments_cleanup_notification() from public, anon, authenticated;
revoke execute on function public.comments_revoke_contribution() from public, anon, authenticated;
revoke execute on function public.follows_cleanup_notification() from public, anon, authenticated;
revoke execute on function public.follows_revoke_connection() from public, anon, authenticated;
revoke execute on function public.posts_revoke_contribution() from public, anon, authenticated;
revoke execute on function public.reactions_cleanup_notification() from public, anon, authenticated;
revoke execute on function public.rl_check_comments() from public, anon, authenticated;
revoke execute on function public.rl_check_follows() from public, anon, authenticated;
revoke execute on function public.rl_check_posts() from public, anon, authenticated;
revoke execute on function public.trg_notify_comment() from public, anon, authenticated;
revoke execute on function public.trg_notify_follow() from public, anon, authenticated;
revoke execute on function public.trg_notify_reaction() from public, anon, authenticated;
revoke execute on function public.trg_referral_campus_founder() from public, anon, authenticated;
