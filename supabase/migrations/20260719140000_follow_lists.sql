-- Twitter-style follower / following lists.
--
-- follows' only SELECT policy is "see own follow rows" (own edges), so a
-- viewer cannot read another user's follow graph directly. This definer
-- exposes exactly the list view the product allows:
--   * authenticated viewers only (auth.uid() checked inside — definer bypasses RLS);
--   * private target: owner or an ACCEPTED follower only (profile-shell
--     invariant: non-followers never see a private account's follower lists);
--   * blocks filtered both directions via get_blocked_ids(), and a viewer
--     block-separated from the target gets nothing at all;
--   * suspended accounts excluded from rows.
-- Returns the listed users' public shell + the viewer's own follow status
-- toward each row (for the follow button), newest edge first.
-- ponytail: LIMIT 100, no keyset pagination — add p_before when any account
-- outgrows it.

create or replace function public.get_follow_list(p_profile_id uuid, p_kind text)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  is_pro boolean,
  is_founder boolean,
  is_campus_founder boolean,
  verified_student boolean,
  year text,
  major text,
  viewer_follow_status text,
  followed_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  with viewer as (select auth.uid() as uid)
  select
    u.id,
    u.username,
    u.display_name,
    u.avatar_url,
    u.is_pro,
    u.is_founder,
    u.is_campus_founder,
    u.verified_student,
    u.year,
    u.major,
    vf.status as viewer_follow_status,
    f.created_at as followed_at
  from viewer v
  join public.follows f
    on (p_kind = 'followers' and f.following_id = p_profile_id)
    or (p_kind = 'following' and f.follower_id = p_profile_id)
  join public.profiles u
    on u.id = case when p_kind = 'followers' then f.follower_id else f.following_id end
  left join public.follows vf
    on vf.follower_id = v.uid and vf.following_id = u.id
  where v.uid is not null
    and p_kind in ('followers', 'following')
    and f.status = 'accepted'
    and not u.is_suspended
    -- target reachable: not block-separated from the viewer
    and p_profile_id not in (select public.get_blocked_ids())
    -- privacy gate: private target readable by owner + accepted followers only
    and (
      v.uid = p_profile_id
      or not exists (select 1 from public.profiles t where t.id = p_profile_id and t.is_private)
      or exists (
        select 1 from public.follows g
        where g.follower_id = v.uid and g.following_id = p_profile_id and g.status = 'accepted'
      )
    )
    -- listed rows: hide block-separated users
    and u.id not in (select public.get_blocked_ids())
  order by f.created_at desc
  limit 100
$$;

-- CREATE OR REPLACE re-grants EXECUTE to PUBLIC; name anon explicitly.
revoke all on function public.get_follow_list(uuid, text) from public;
revoke all on function public.get_follow_list(uuid, text) from anon;
grant execute on function public.get_follow_list(uuid, text) to authenticated;
