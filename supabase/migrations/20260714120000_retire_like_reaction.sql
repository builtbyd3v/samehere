-- Retire the 'like' reaction type. Product decision: 'samehere' is the one
-- reaction that matters — 'like' is redundant with it and is being cut.
--
-- Verified against live prod before writing this file:
--   - public.reactions has 0 rows. Zero data loss from the reactions delete.
--   - reactions_type_check = check ((type = any (array['like'::text, 'samehere'::text])))
--   - notifications_reaction_type_check =
--       check (((reaction_type is null) or (reaction_type = any (array['like'::text, 'samehere'::text]))))
--   - notifications has 2 rows with reaction_type = 'like' — these ARE deleted
--     below (a notification for a reaction type that can no longer exist has
--     nothing left to represent).
--   - get_public_post(uuid) and get_public_quote(uuid) both expose like_count
--     and are the only public RPCs that do; both currently GRANT EXECUTE to
--     postgres, anon, authenticated, service_role — intentional, preserved.
--   - reactions_cleanup_notification() and trg_notify_reaction() reference
--     new.type/old.type generically (not type-specific) — untouched, still
--     correct with one type.
--   - notifications.reaction_type column itself is NOT dropped (kept for the
--     'samehere' case) — only the CHECK narrows.
--
-- This migration owns: reactions_type_check, notifications_reaction_type_check,
-- and the RETURNS TABLE shape of get_public_post/get_public_quote (like_count
-- removed from both). No other migration in this round may touch these.

-- ============================================================
-- 1. Delete rows that reference the retiring type. No-op in prod (reactions
--    has 0 rows) but protects any other environment running this migration.
-- ============================================================
delete from public.reactions where type = 'like';
delete from public.notifications where reaction_type = 'like';

-- ============================================================
-- 2. Narrow reactions_type_check to 'samehere' only.
-- ============================================================
alter table public.reactions
  drop constraint if exists reactions_type_check;
alter table public.reactions
  add constraint reactions_type_check
  check (type = 'samehere');

-- ============================================================
-- 3. Narrow notifications_reaction_type_check to null or 'samehere'.
-- ============================================================
alter table public.notifications
  drop constraint if exists notifications_reaction_type_check;
alter table public.notifications
  add constraint notifications_reaction_type_check
  check (reaction_type is null or reaction_type = 'samehere');

-- ============================================================
-- 4. Recreate get_public_post(uuid) with like_count removed. Body otherwise
--    byte-identical to 20260713140000. RETURNS TABLE shape changes, so
--    DROP + recreate — this resets grants to Postgres's default (EXECUTE to
--    PUBLIC), hence the explicit revoke/grant below.
-- ============================================================
drop function if exists public.get_public_post(uuid);

create function public.get_public_post(p_id uuid)
returns table(
  id uuid, content text, created_at timestamptz,
  author_id uuid, author_username text, author_display_name text, author_avatar_url text,
  author_is_pro boolean, author_is_founder boolean, author_is_campus_founder boolean,
  samehere_count bigint, repost_count bigint,
  author_verified_student boolean
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
    (select count(*) from public.reactions r where r.post_id = po.id and r.type = 'samehere'),
    (select count(*) from public.reposts   rp where rp.post_id = po.id),
    a.verified_student
  from public.posts po
  join public.profiles a on a.id = po.user_id
  where po.id = p_id
    and a.is_private = false
    and po.hidden = false;
$$;

revoke all on function public.get_public_post(uuid) from public;
grant execute on function public.get_public_post(uuid) to anon, authenticated, service_role;

-- ============================================================
-- 5. Recreate get_public_quote(uuid) with like_count removed. Body otherwise
--    byte-identical to 20260713185000. Same DROP + recreate grant reset.
-- ============================================================
drop function if exists public.get_public_quote(uuid);

create function public.get_public_quote(p_id uuid)
returns table(
  id uuid, quote_text text, created_at timestamptz,
  reposter_id uuid, reposter_username text, reposter_display_name text, reposter_avatar_url text,
  reposter_is_pro boolean, reposter_is_founder boolean, reposter_is_campus_founder boolean, reposter_verified_student boolean,
  post_id uuid, post_content text, post_created_at timestamptz,
  author_id uuid, author_username text, author_display_name text, author_avatar_url text,
  author_is_pro boolean, author_is_founder boolean, author_is_campus_founder boolean, author_verified_student boolean,
  samehere_count bigint, repost_count bigint
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

revoke all on function public.get_public_quote(uuid) from public;
grant execute on function public.get_public_quote(uuid) to anon, authenticated, service_role;
