-- Bet 1: optional self-reported study_mode on profiles.
-- Nullable enum + allowlist. No verification. Visible on public projection
-- with the same privacy rule as open_to (nulled when private or suspended).
--
-- Column-grant trap: profiles SELECT is per-column. An ungranted column
-- 42501s every client query that names it (rls_test profiles_column_grants).

alter table public.profiles
  add column if not exists study_mode text;

alter table public.profiles
  drop constraint if exists profiles_study_mode_allowed;

alter table public.profiles
  add constraint profiles_study_mode_allowed
  check (
    study_mode is null
    or study_mode in ('on_campus', 'online', 'hybrid', 'bootcamp', 'self_taught')
  );

grant select (study_mode) on public.profiles to authenticated, anon;
grant update (study_mode) on public.profiles to authenticated;

create index if not exists profiles_study_mode_idx
  on public.profiles (study_mode)
  where study_mode is not null;

-- Recreate get_public_profile with study_mode at the end. Same privacy as open_to.
drop function if exists public.get_public_profile(text);
create function public.get_public_profile(p_username text)
returns table(
  id uuid, username text, display_name text, avatar_url text, banner_url text,
  accent_color text, is_pro boolean, is_founder boolean, is_campus_founder boolean,
  is_private boolean, heatmap_visibility text,
  year text, major text, bio text, goals text, school text,
  verified_student boolean, is_bot boolean, open_to text[], study_mode text
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
    case when p.is_private or p.is_suspended then null else p.study_mode end
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
