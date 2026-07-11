-- Fix: get_match_candidates (20260716150000_weekly_match_recipients.sql) is
-- SECURITY DEFINER and reads profile_school.school directly, bypassing the
-- profile_school RLS policy that hides a candidate's school from anyone but
-- the owner/an accepted follower when hide_school=true. That let a
-- candidate's hidden school leak into the weekly digest email sent to
-- strangers. Body copied verbatim from 20260716150000 except the school
-- column, which now honors hide_school the same way every other digest/
-- public-facing RPC in this codebase does (see get_public_profile_card,
-- get_leaderboard, etc.).
create or replace function public.get_match_candidates(p_user uuid)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  school text,
  year text,
  major text,
  goals text,
  bio text
)
language sql
security definer
set search_path = ''
stable
as $$
  select p.id, p.username, p.display_name, p.avatar_url,
         case when p.hide_school then null else ps.school end,
         p.year, p.major, p.goals, p.bio
  from public.profiles p
  left join public.profile_school ps on ps.profile_id = p.id
  where p.id <> p_user
    and p.is_suspended = false
    and (p.year is not null or p.major is not null or p.goals is not null or p.bio is not null or ps.school is not null)
    and not exists (
      select 1 from public.follows f
      where f.follower_id = p_user and f.following_id = p.id
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = p_user and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = p_user)
    )
  order by p.created_at desc
  limit 50;
$$;

revoke execute on function public.get_match_candidates(uuid) from public, anon, authenticated;
