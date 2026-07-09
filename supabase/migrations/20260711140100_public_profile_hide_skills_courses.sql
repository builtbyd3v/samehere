-- Narrow the public profile surface: skills and courses are for verified students.
--
-- 20260711140000 exposed skills + courses to anonymous visitors. Courses in
-- particular are a weekly-whereabouts disclosure ("CS210 MWF") readable by anyone
-- with a browser, and the pair together is the matching signal the product runs on.
-- Neither belongs on a logged-out page. bio / goals / year / major / school stay:
-- they are what makes a shared profile link worth opening, and school already has
-- its own hide_school preference.
--
-- RETURNS TABLE shape changes, so DROP + recreate. That RESETS grants to Postgres's
-- default (EXECUTE to PUBLIC), so the revoke/grant below is mandatory, not tidiness.
--
-- Authenticated callers are unaffected: they read profiles directly under RLS and
-- never call this function. It exists solely as the anon surface.
drop function if exists public.get_public_profile(text);

create function public.get_public_profile(p_username text)
returns table(
  id uuid, username text, display_name text, avatar_url text, banner_url text,
  accent_color text, is_pro boolean, is_founder boolean, is_campus_founder boolean,
  is_private boolean, heatmap_visibility text,
  year text, major text, bio text, goals text, school text
)
language sql security definer set search_path = '' stable as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    case when public.is_pro_now(p.is_pro, p.pro_until) then p.banner_url end,
    case when public.is_pro_now(p.is_pro, p.pro_until) then p.accent_color end,
    public.is_pro_now(p.is_pro, p.pro_until),
    p.is_founder,
    p.is_campus_founder,
    p.is_private,
    p.heatmap_visibility,
    case when p.is_private then null else p.year end,
    case when p.is_private then null else p.major end,
    case when p.is_private then null else p.bio end,
    case when p.is_private then null else p.goals end,
    case when p.is_private or p.hide_school then null else ps.school end
  from public.profiles p
  left join public.profile_school ps on ps.profile_id = p.id
  where lower(p.username) = lower(p_username);
$$;

revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;
