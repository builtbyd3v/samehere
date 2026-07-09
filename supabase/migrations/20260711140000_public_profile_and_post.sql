-- ============================================================================
-- DELIBERATE PUBLIC SURFACE — logged-out profile + single-post rendering.
-- ============================================================================
-- These three SECURITY DEFINER RPCs are how unauthenticated visitors read ONE
-- profile and ONE post, exactly like the existing get_public_profile_card /
-- get_public_heatmap. They are anon-granted on purpose.
--
-- The `posts` SELECT RLS policy is INTENTIONALLY NOT loosened. It still requires
-- auth.uid() is not null. If anon could `select` posts directly, anyone holding
-- the public anon key would run `from('posts').select('*')` and scrape the entire
-- corpus in a single request. All public post access therefore flows through a
-- definer that returns exactly one row for one id and re-checks every visibility
-- predicate BY HAND (a definer bypasses RLS — a missing predicate here IS a leak).
--
-- No policy is changed. No existing function is touched. get_public_heatmap and
-- get_public_profile_card already gate `heatmap_visibility = 'public' and
-- is_private = false`; they are reused as-is by the caller.
--
-- ⚠️  Any NEW field added to these return types is a NEW public disclosure. Adding
--     a column here exposes it to the entire internet with no auth — give it the
--     same "would I hand this to an anonymous scraper?" scrutiny before adding it.
--     Never add: post media, comment content/counts, bookmark counts, follower or
--     following LISTS, email, or anything a private account is meant to hide.
-- ============================================================================

-- 1) Public profile by username. THE FUNCTION enforces privacy so the page can't
--    forget to. Private accounts return identity + badges only; every content
--    field (year/major/bio/goals/skills/courses/school) is NULLed here in SQL.
--    Public accounts return everything, with school NULLed when hide_school.
--    banner_url/accent_color are Pro cosmetics — NULL unless is_pro_now (mirrors
--    the app: profile page sets `bannerUrl = pro ? banner_url : null`).
--    is_pro is returned as is_pro_now(...), never the raw column.
--    heatmap_visibility is a HINT for whether to ask for a heatmap; get_public_heatmap
--    independently enforces it.
create or replace function public.get_public_profile(p_username text)
returns table(
  id uuid, username text, display_name text, avatar_url text, banner_url text,
  accent_color text, is_pro boolean, is_founder boolean, is_campus_founder boolean,
  is_private boolean, heatmap_visibility text,
  year text, major text, bio text, goals text, skills text[], courses text[], school text
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
    case when p.is_private then null else p.skills end,
    case when p.is_private then null else p.courses end,
    case when p.is_private or p.hide_school then null else ps.school end
  from public.profiles p
  left join public.profile_school ps on ps.profile_id = p.id
  where lower(p.username) = lower(p_username);
$$;

-- 2) Public counts sibling of get_profile_counts (which ends in `auth.uid() is not
--    null`). Counts are non-sensitive aggregates already visible to authed users;
--    returned for private accounts too (a number, never the follower/following LIST).
create or replace function public.get_public_profile_counts(p_profile_id uuid)
returns table(posts bigint, followers bigint, following bigint)
language sql security definer set search_path = '' stable as $$
  select
    (select count(*) from public.posts   po where po.user_id = p_profile_id),
    (select count(*) from public.follows  f  where f.following_id = p_profile_id and f.status = 'accepted'),
    (select count(*) from public.follows  f  where f.follower_id  = p_profile_id and f.status = 'accepted');
$$;

-- 3) Public single post. Returns ZERO rows unless the post exists, the author is
--    NOT private, and the post is NOT hidden — nothing else. Definer bypasses RLS,
--    so those three exclusions are written by hand below. No media, no comments,
--    no bookmark counts (bookmarks are private by design). Reaction counts come
--    from reactions(type in like/samehere) filtered to post_id (NOT repost_id, so
--    reactions on quote-reposts aren't miscounted); reposts by post_id.
create or replace function public.get_public_post(p_id uuid)
returns table(
  id uuid, content text, created_at timestamptz,
  author_id uuid, author_username text, author_display_name text, author_avatar_url text,
  author_is_pro boolean, author_is_founder boolean, author_is_campus_founder boolean,
  like_count bigint, samehere_count bigint, repost_count bigint
)
language sql security definer set search_path = '' stable as $$
  select
    po.id,
    po.content,
    po.created_at,
    a.id,
    a.username,
    a.display_name,
    a.avatar_url,
    public.is_pro_now(a.is_pro, a.pro_until),
    a.is_founder,
    a.is_campus_founder,
    (select count(*) from public.reactions r where r.post_id = po.id and r.type = 'like'),
    (select count(*) from public.reactions r where r.post_id = po.id and r.type = 'samehere'),
    (select count(*) from public.reposts   rp where rp.post_id = po.id)
  from public.posts po
  join public.profiles a on a.id = po.user_id
  where po.id = p_id
    and a.is_private = false
    and po.hidden = false;
$$;

-- Grants. Postgres grants EXECUTE to PUBLIC by default on new functions, so revoke
-- first, then grant explicitly to the two roles that should have it.
revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;

revoke all on function public.get_public_profile_counts(uuid) from public;
grant execute on function public.get_public_profile_counts(uuid) to anon, authenticated;

revoke all on function public.get_public_post(uuid) from public;
grant execute on function public.get_public_post(uuid) to anon, authenticated;
