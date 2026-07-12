-- RightRail.tsx's "Suggested peers" / "People from {school}" queries fetch
-- EVERY row of the viewer's own `follows` table into app memory just to
-- build a comma-joined `NOT IN (...)` filter string (unbounded as follow
-- counts grow), and never exclude blocked users at all -- a real regression
-- vs. the pre-redesign feed, which did fold blocks into this same exclusion
-- list. A user you've blocked (or who has blocked you) can currently
-- resurface in "Suggested peers".
--
-- This RPC replaces both app-side queries with one SQL-side anti-join:
-- excludes self, anyone already followed (any status -- mirrors the old
-- app-side behavior of excluding even a pending outgoing follow request),
-- and get_blocked_ids() (bidirectional, STABLE, already granted to
-- authenticated -- see 20260711110000_blocks_and_follow_policies.sql).
--
-- SECURITY DEFINER bypasses profile_school's RLS (a hide_school-gated
-- select policy), so the hide_school check must be re-implemented by hand --
-- copied from get_leaderboard's `case when p.hide_school then null else
-- ps.school end` pattern (20260713150000_peers_scan_and_founder_index.sql:53-61).
-- Getting this wrong would leak a school the owner explicitly hid.
--
-- p_school is nullable: null = the generic "recent profiles" pool
-- (RightRail's old SUGGESTED_SELECT query); non-null = the "people from
-- {school}" pool (RightRail's old schoolData query). No new filtering vs.
-- the old app-side queries is added (e.g. no is_private filter -- neither
-- old query had one; preserved as-is to avoid changing the suggestions
-- pool's composition beyond this fix's actual scope).
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
  order by p.created_at desc
  limit p_limit;
$$;

revoke all on function public.get_suggested_profiles(text, int) from public;
grant execute on function public.get_suggested_profiles(text, int) to authenticated;
-- `revoke all from public` does not strip anon by itself in this project
-- (default-privileges trap -- anon/authenticated are granted at the schema
-- level, not via PUBLIC); name anon explicitly.
revoke execute on function public.get_suggested_profiles(text, int) from anon;
