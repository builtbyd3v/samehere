-- Plan 005: resume-grade profile fields (headline + three profile links).
-- Skill chips are derived in app code from published projects; no column.
-- Column-grant trap: profiles SELECT is per column. An ungranted column
-- 42501s every client query that names it (rls_test profiles_column_grants).
-- Host rules (github.com, linkedin.com) are enforced in the server action;
-- the DB only enforces http(s) shape, like portfolio_projects urls.

alter table public.profiles
  add column if not exists headline text,
  add column if not exists github_url text,
  add column if not exists linkedin_url text,
  add column if not exists website_url text;

alter table public.profiles drop constraint if exists profiles_headline_len;
alter table public.profiles drop constraint if exists profiles_github_url_ok;
alter table public.profiles drop constraint if exists profiles_linkedin_url_ok;
alter table public.profiles drop constraint if exists profiles_website_url_ok;

alter table public.profiles
  add constraint profiles_headline_len
    check (headline is null or char_length(headline) <= 120),
  add constraint profiles_github_url_ok
    check (public.portfolio_http_url_ok(github_url)),
  add constraint profiles_linkedin_url_ok
    check (public.portfolio_http_url_ok(linkedin_url)),
  add constraint profiles_website_url_ok
    check (public.portfolio_http_url_ok(website_url));

grant select (headline, github_url, linkedin_url, website_url) on public.profiles to authenticated, anon;
grant update (headline, github_url, linkedin_url, website_url) on public.profiles to authenticated;

-- Recreate get_public_profile with the four fields appended at the end.
-- Same privacy as open_to: nulled when private or suspended.
drop function if exists public.get_public_profile(text);
create function public.get_public_profile(p_username text)
returns table(
  id uuid, username text, display_name text, avatar_url text, banner_url text,
  accent_color text, is_pro boolean, is_founder boolean, is_campus_founder boolean,
  is_private boolean, heatmap_visibility text,
  year text, major text, bio text, goals text, school text,
  verified_student boolean, is_bot boolean, open_to text[], study_mode text,
  headline text, github_url text, linkedin_url text, website_url text
)
language sql security definer set search_path = '' stable as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    case when p.is_suspended then null
         when public.is_pro_now(p.is_pro, p.pro_until) then p.banner_url end,
    case when p.is_suspended then null
         when public.is_pro_now(p.is_pro, p.pro_until) then p.accent_color end,
    public.is_pro_now(p.is_pro, p.pro_until) and not p.is_suspended,
    p.is_founder,
    p.is_campus_founder,
    p.is_private,
    p.heatmap_visibility,
    case when p.is_private or p.is_suspended then null else p.year end,
    case when p.is_private or p.is_suspended then null else p.major end,
    case when p.is_private or p.is_suspended then null else p.bio end,
    case when p.is_private or p.is_suspended then null else p.goals end,
    case when p.is_private or p.is_suspended or p.hide_school then null else ps.school end,
    p.verified_student,
    p.is_bot,
    case when p.is_private or p.is_suspended then null else p.open_to end,
    case when p.is_private or p.is_suspended then null else p.study_mode end,
    case when p.is_private or p.is_suspended then null else p.headline end,
    case when p.is_private or p.is_suspended then null else p.github_url end,
    case when p.is_private or p.is_suspended then null else p.linkedin_url end,
    case when p.is_private or p.is_suspended then null else p.website_url end
  from public.profiles p
  left join public.profile_school ps on ps.profile_id = p.id
  where lower(p.username) = lower(p_username)
    and (
      auth.uid() is null
      or p.id not in (select public.get_blocked_ids())
    );
$$;

revoke all on function public.get_public_profile(text) from public, anon, authenticated;
grant execute on function public.get_public_profile(text) to anon, authenticated;
