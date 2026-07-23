-- Bot accounts must be visibly labeled in the UI. Adds is_bot to profiles and
-- threads it through the two anon-granted SECURITY DEFINER RPCs that back the
-- logged-out profile page and logged-out post page (get_public_profile,
-- get_public_post) so the badge shows for signed-out visitors too, not just
-- authenticated selects.
--
-- Column-level SELECT grant is mandatory (see 20260713160000): profiles SELECT
-- is column-granted, so a new column is invisible to client roles (and every
-- client select naming it 42501s) until granted here.
alter table public.profiles add column if not exists is_bot boolean not null default false;

grant select (is_bot) on public.profiles to authenticated, anon;

-- RETURNS TABLE shape changes, so DROP + recreate. That resets grants to
-- Postgres's default (EXECUTE to PUBLIC); the revoke/grant below is mandatory.
drop function if exists public.get_public_profile(text);

create function public.get_public_profile(p_username text)
returns table(
  id uuid, username text, display_name text, avatar_url text, banner_url text,
  accent_color text, is_pro boolean, is_founder boolean, is_campus_founder boolean,
  is_private boolean, heatmap_visibility text,
  year text, major text, bio text, goals text, school text,
  verified_student boolean, is_bot boolean
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
    case when p.is_private or p.hide_school then null else ps.school end,
    p.verified_student,
    p.is_bot
  from public.profiles p
  left join public.profile_school ps on ps.profile_id = p.id
  where lower(p.username) = lower(p_username);
$$;

revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;

drop function if exists public.get_public_post(uuid);

create function public.get_public_post(p_id uuid)
returns table(
  id uuid, content text, created_at timestamptz,
  author_id uuid, author_username text, author_display_name text, author_avatar_url text,
  author_is_pro boolean, author_is_founder boolean, author_is_campus_founder boolean,
  samehere_count bigint, repost_count bigint,
  author_verified_student boolean, author_is_bot boolean
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
    a.verified_student,
    a.is_bot
  from public.posts po
  join public.profiles a on a.id = po.user_id
  where po.id = p_id
    and a.is_private = false
    and po.hidden = false;
$$;

revoke all on function public.get_public_post(uuid) from public;
grant execute on function public.get_public_post(uuid) to anon, authenticated, service_role;
