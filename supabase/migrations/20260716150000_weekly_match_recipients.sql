-- Plan 022: weekly "3 people to meet" digest. Two definer RPCs for the cron
-- route (admin-client only, no user session — mirrors
-- list_unread_digest_recipients from 20260714240000). Match scoring itself
-- stays in JS (lib/match.ts scoreOverlap); these just return the recipient
-- list and each recipient's candidate pool.

-- Every opted-in, non-suspended user + the MatchSignal fields lib/match.ts
-- scores on. Reuses the existing email_digest_opt_out column — no second
-- opt-out. pro_until returned alongside is_pro so the caller can run the
-- same isPro() lapse check used everywhere else (lib/pro.ts) instead of
-- trusting the raw flag.
create or replace function public.list_weekly_match_recipients()
returns table (
  user_id uuid,
  email text,
  is_pro boolean,
  pro_until timestamptz,
  year text,
  major text,
  goals text,
  bio text,
  school text
)
language sql
security definer
set search_path = ''
stable
as $$
  select p.id, u.email, p.is_pro, p.pro_until, p.year, p.major, p.goals, p.bio, ps.school
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.profile_school ps on ps.profile_id = p.id
  where p.email_digest_opt_out = false
    and p.is_suspended = false;
$$;

revoke execute on function public.list_weekly_match_recipients() from public, anon, authenticated;

-- Bounded recency pool (~50) of candidates for p_user: excludes self, anyone
-- already followed (any status) by p_user, anyone blocked either direction,
-- suspended accounts, and profiles too thin to score (no year/major/goals/
-- bio/school at all). Caller ranks this pool with lib/match.ts scoreOverlap
-- and takes the top 3 (free) / 5 (Pro) — no scoring here.
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
         ps.school, p.year, p.major, p.goals, p.bio
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
