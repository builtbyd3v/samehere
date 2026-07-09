-- M2: every authenticated user can read every COLUMN of every profile.
--   The live policy `profiles / "profiles readable by authed users"` is
--   `using ((select auth.uid()) is not null)`. RLS is ROW-level: it can gate
--   which rows you see, never which columns. So any logged-in account could
--   `select is_admin, stripe_customer_id, pro_source, email_domain, ...` off
--   every other user -- enumerate admins to social-engineer, and harvest every
--   Stripe customer id. The policy stays (it still scopes ROWS); we add COLUMN
--   privileges on top, exactly as 20260711130000 did for reports.snapshot.
--
--   Postgres treats a table-level SELECT grant as covering ALL columns, so the
--   blanket grant must be REVOKED and re-granted per safe column. Seven columns
--   are deliberately withheld from anon/authenticated:
--     is_admin, is_suspended, stripe_customer_id, pro_source,
--     last_subscription_event_at, wants_pro, email_domain.
--   Each is re-exposed to its legitimate reader via a SECURITY DEFINER function
--   (owner-run, so column privileges do not restrict it):
--     is_admin       -> current_is_admin()      (own status only)
--     is_suspended   -> current_is_suspended()  (own status only)
--     stripe_customer_id / pro_source / wants_pro / pro_until
--                    -> get_my_billing()        (own row only, added below)
--   last_subscription_event_at and email_domain have no client reader at all --
--   they are written by the Stripe webhook (service_role, unaffected by this
--   revoke) and the signup trigger respectively; nothing legitimately selects
--   them from a user session, so they simply stay withheld.
--
--   Nothing else needs the withheld columns from an invoker context: the only
--   RLS policy on any table that subqueries public.profiles reads `is_private`
--   (posts/reposts visibility, follows INSERT) -- granted below. Every other
--   consumer (get_public_profile, get_leaderboard, admin_list_reports,
--   list_dm_inbox, get_dm_peer, get_profile_views, guard_profile_privileged,
--   current_is_*) is SECURITY DEFINER / a trigger and bypasses column ACLs.
--
-- service_role keeps its blanket grant (never revoked here); the webhook writer
-- is unaffected. anon never selected profiles directly (it reads through the
-- get_public_* definers), so revoking its SELECT changes nothing it could do.

revoke select on public.profiles from anon, authenticated;

-- Every column EXCEPT the seven privileged ones above. UPDATE/INSERT privileges
-- are separate and untouched, so profile edits keep working.
grant select (
  id,
  username,
  display_name,
  avatar_url,
  banner_url,
  accent_color,
  avatar_is_animated,
  bio,
  goals,
  major,
  year,
  skills,
  courses,
  hide_school,
  heatmap_visibility,
  is_private,
  is_pro,
  pro_until,
  is_founder,
  is_campus_founder,
  leaderboard_opt_out,
  referral_code,
  created_at
) on public.profiles to authenticated;

-- Own-row billing read: replaces the three session-client selects that used to
-- pull stripe_customer_id / pro_source / wants_pro straight off profiles. Definer
-- + `where p.id = auth.uid()` means a caller can only ever read their OWN billing
-- state, by construction -- there is no argument to point at someone else.
create or replace function public.get_my_billing()
returns table(is_pro boolean, pro_until timestamptz, pro_source text,
              stripe_customer_id text, wants_pro boolean)
language sql security definer set search_path = '' stable as $$
  select p.is_pro, p.pro_until, p.pro_source, p.stripe_customer_id, p.wants_pro
  from public.profiles p where p.id = auth.uid();
$$;
revoke all on function public.get_my_billing() from public;
grant execute on function public.get_my_billing() to authenticated;
