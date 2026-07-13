-- Verified Student badge gets functional leverage in "Suggested peers": order
-- verified_student accounts first within the existing recency ordering, so
-- the one hard-to-fake trust signal on this platform actually surfaces
-- students instead of only decorating their card. Body copied verbatim from
-- 20260718110000_get_suggested_profiles.sql except the ORDER BY clause.
create or replace function public.get_suggested_profiles(p_school text default null, p_limit int default 3)
returns table(
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  year text,
  major text,
  goals text,
  bio text,
  is_pro boolean,
  is_founder boolean,
  is_campus_founder boolean,
  verified_student boolean,
  school text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    p.id, p.username, p.display_name, p.avatar_url,
    p.year, p.major, p.goals, p.bio,
    p.is_pro, p.is_founder, p.is_campus_founder, p.verified_student,
    case when p.hide_school then null else ps.school end
  from public.profiles p
  left join public.profile_school ps on ps.profile_id = p.id
  where auth.uid() is not null
    and p.id <> auth.uid()
    and p.id not in (select public.get_blocked_ids())
    and not exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.following_id = p.id
    )
    and (p_school is null or ps.school = p_school)
  order by p.verified_student desc, p.created_at desc
  limit p_limit;
$$;

revoke all on function public.get_suggested_profiles(text, int) from public;
grant execute on function public.get_suggested_profiles(text, int) to authenticated;
-- `revoke all from public` does not strip anon by itself in this project
-- (default-privileges trap -- anon/authenticated are granted at the schema
-- level, not via PUBLIC); name anon explicitly.
revoke execute on function public.get_suggested_profiles(text, int) from anon;
