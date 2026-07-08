-- Backstop: ~28 RPC/admin SECURITY DEFINER functions carried Postgres's default
-- PUBLIC execute, so anon (logged-out) could call them. Each already self-checks
-- auth.uid()/current_is_admin(), so not exploitable today — this removes the
-- default grant so one future self-check bug can't become unauthenticated access.
-- Revoke from PUBLIC (removes anon + the implicit authenticated grant), then
-- re-grant to authenticated + service_role.
-- Deliberately NOT touched: get_public_heatmap / get_public_profile_card (anon OG
-- cards), and current_is_admin / current_is_suspended / is_conversation_member /
-- get_blocked_ids (called inside RLS policies — keep PUBLIC so anon policy
-- evaluation on public surfaces can't error out).
do $$
declare
  fn text;
  sigs text[] := array[
    'accept_follow(uuid)',
    'admin_hide_post(uuid)',
    'admin_list_reports()',
    'admin_resolve_report(uuid)',
    'admin_suspend_user(uuid)',
    'admin_unhide_post(uuid)',
    'admin_unsuspend_user(uuid)',
    'block_user(uuid)',
    'get_dm_peer(uuid)',
    'get_dm_unread_total()',
    'get_heatmap(uuid)',
    'get_leaderboard(text, text)',
    'get_notification_unread_total()',
    'get_or_create_dm(uuid)',
    'get_profile_counts(uuid)',
    'get_profile_views(uuid)',
    'get_referral_stats()',
    'get_streak(uuid)',
    'list_dm_inbox()',
    'list_notifications(integer)',
    'log_contribution(text, jsonb)',
    'mark_all_notifications_read()',
    'mark_dm_read(uuid)',
    'record_profile_view(uuid)',
    'reject_follow(uuid)',
    'request_follow(uuid)',
    'set_referral_code(text)',
    'use_ai_quota(text, integer)'
  ];
begin
  foreach fn in array sigs loop
    execute format('revoke execute on function public.%s from public', fn);
    execute format('grant execute on function public.%s to authenticated, service_role', fn);
  end loop;
end $$;
