-- Some of the private RPCs carried an EXPLICIT grant to anon (from earlier
-- migrations), which revoke-from-public doesn't remove. Revoke from anon
-- directly. Same keep-list as the backstop migration (public OG fns +
-- RLS-helper fns untouched).
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
    execute format('revoke execute on function public.%s from anon', fn);
  end loop;
end $$;
