-- 20260711150000 revoked SELECT on profiles from `anon` as well as
-- `authenticated`, reasoning that RLS (`auth.uid() is not null`) already denies
-- anon every row so the revoke changed nothing. That holds for a DIRECT read.
-- It does not hold for a POLICY SUBQUERY.
--
-- The `posts` SELECT policy evaluates
--   exists (select 1 from public.profiles p where p.id = posts.user_id and p.is_private = false)
-- under the CALLER's role. With no column privilege, anon cannot evaluate it, so
--   select * from posts   -- as anon
-- now raises 42501 "permission denied for table profiles" instead of returning
-- zero rows. Caught by supabase/tests/rls_test.sql (anon_sees_no_posts,
-- public_surface) the first time that file was ever executed.
--
-- Nothing user-facing broke -- the anon profile/post pages read through the
-- get_public_* SECURITY DEFINER functions, which bypass column ACLs. But a
-- privilege error is not the same answer as an empty set, and the next
-- anon-facing query over posts would have hit it.
--
-- Grant anon the same 23 safe columns. RLS still returns it zero rows from
-- profiles and zero rows from posts; this only lets the subquery EVALUATE.
-- The seven privileged columns stay withheld from anon exactly as before.
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
) on public.profiles to anon;
