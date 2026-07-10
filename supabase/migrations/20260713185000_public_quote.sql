-- ============================================================================
-- DELIBERATE PUBLIC SURFACE — logged-out quote-repost rendering.
-- ============================================================================
-- /quote/[id] had no logged-out path while /post/[id] did (get_public_post,
-- 20260711140000). Same reason, same shape: a shared quote-repost link must
-- open (and unfurl) for anon visitors. `reposts`/`comments`/`reactions` SELECT
-- RLS stays untouched (still auth.uid() is not null) — this definer is the
-- only anon door, and it re-checks every visibility predicate by hand because
-- a definer bypasses RLS entirely.
--
-- Returns ZERO rows unless: the row is actually a quote (quote_text is not
-- null — a plain repost has no quote page), the reposter is not private, the
-- quoted post's author is not private, and the quoted post is not hidden.
-- Zero rows = the page 404s.
--
-- Counts returned mirror what QuotedRepostCard's ReactionRow actually renders
-- in "detail" mode: like/samehere are quote-level (reactions.repost_id =
-- quote id — comments on the quote are hidden in that view via hideComments,
-- so no comment_count here). repost_count is the ORIGINAL post's repost
-- count (reposts.post_id = post id) — reposts don't reference other reposts,
-- so a quote has no "repost of a repost" count of its own.
--
-- No media, no comment bodies, no bookmark counts (bookmarks stay private).
-- verified_student/is_founder/is_campus_founder/is_pro (via is_pro_now) on
-- BOTH identities, matching get_public_post's badge set.
--
-- ⚠️ Adding a field here is a new public disclosure — same scrutiny as
--    get_public_post: would this be fine for an anonymous scraper to read?
--
-- App-side note (not this migration): the middleware allowlist for
-- /quote/[id] is a separate change another agent makes.
drop function if exists public.get_public_quote(uuid);

create function public.get_public_quote(p_id uuid)
returns table(
  id uuid, quote_text text, created_at timestamptz,
  reposter_id uuid, reposter_username text, reposter_display_name text, reposter_avatar_url text,
  reposter_is_pro boolean, reposter_is_founder boolean, reposter_is_campus_founder boolean, reposter_verified_student boolean,
  post_id uuid, post_content text, post_created_at timestamptz,
  author_id uuid, author_username text, author_display_name text, author_avatar_url text,
  author_is_pro boolean, author_is_founder boolean, author_is_campus_founder boolean, author_verified_student boolean,
  like_count bigint, samehere_count bigint, repost_count bigint
)
language sql security definer set search_path = '' stable as $$
  select
    rp.id,
    rp.quote_text,
    rp.created_at,
    ru.id,
    ru.username,
    ru.display_name,
    ru.avatar_url,
    public.is_pro_now(ru.is_pro, ru.pro_until),
    ru.is_founder,
    ru.is_campus_founder,
    ru.verified_student,
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
    a.verified_student,
    (select count(*) from public.reactions r where r.repost_id = rp.id and r.type = 'like'),
    (select count(*) from public.reactions r where r.repost_id = rp.id and r.type = 'samehere'),
    (select count(*) from public.reposts rp2 where rp2.post_id = po.id)
  from public.reposts rp
  join public.profiles ru on ru.id = rp.user_id
  join public.posts po on po.id = rp.post_id
  join public.profiles a on a.id = po.user_id
  where rp.id = p_id
    and rp.quote_text is not null
    and ru.is_private = false
    and a.is_private = false
    and po.hidden = false;
$$;

-- New function: Postgres grants EXECUTE to PUBLIC by default. Revoke, then
-- grant explicitly to the two roles that should have it (anon on purpose).
revoke all on function public.get_public_quote(uuid) from public;
grant execute on function public.get_public_quote(uuid) to anon, authenticated;
