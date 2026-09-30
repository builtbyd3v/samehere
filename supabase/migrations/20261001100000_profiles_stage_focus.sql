-- Plan 004: profiles carry a stage (where a student is in their CS journey)
-- and up to 3 focus areas (what they work on).
-- Adds profiles.stage and profiles.focus_areas with allowlist CHECKs, column
-- grants, and a partial index on stage. The value lists must match lib/stage.ts
-- (lib/stage.test.ts reads this file to keep them in lockstep).
-- Private profiles never expose stage or focus_areas in RPC output, and
-- search filters only match public profiles.
-- search_people gains two optional params (p_stage, p_focus). The old 7-arg
-- signature is dropped first so no overload is left behind (every call would
-- fail as "not unique").
-- get_public_profile is copied from 20260930120000_resume_profile_fields.sql
-- with stage and focus_areas appended.
-- get_suggested_profiles is copied from
-- 20260930100000_harden_profile_guard_suggestions_groups.sql with only the
-- stage/focus ranking and a stage return column added.
-- ponytail: no GIN index on focus_areas; beta scale is tiny. Add
-- `create index ... using gin (focus_areas)` when search_people with p_focus
-- shows up in slow-query logs.

-- ============================================================
-- Columns, CHECKs, grants, index
-- ============================================================
alter table public.profiles
  add column if not exists stage text,
  add column if not exists focus_areas text[] not null default '{}';

alter table public.profiles drop constraint if exists profiles_stage_allowed;
alter table public.profiles
  add constraint profiles_stage_allowed
  check (
    stage is null
    or stage in ('learning', 'building', 'internship_search', 'interning', 'job_search', 'working')
  );

alter table public.profiles drop constraint if exists profiles_focus_areas_allowed;
alter table public.profiles
  add constraint profiles_focus_areas_allowed
  check (
    cardinality(focus_areas) <= 3
    and focus_areas <@ array['web', 'mobile', 'ai_ml', 'data', 'systems', 'security', 'cloud', 'games', 'hardware', 'robotics']::text[]
  );

grant select (stage, focus_areas) on public.profiles to authenticated, anon;
grant update (stage, focus_areas) on public.profiles to authenticated;

create index if not exists profiles_stage_idx
  on public.profiles (stage)
  where stage is not null;

-- ============================================================
-- get_public_profile: stage + focus_areas appended at the end.
-- Same privacy as open_to: nulled when private or suspended.
-- ============================================================
drop function if exists public.get_public_profile(text);
create function public.get_public_profile(p_username text)
returns table(
  id uuid, username text, display_name text, avatar_url text, banner_url text,
  accent_color text, is_pro boolean, is_founder boolean, is_campus_founder boolean,
  is_private boolean, heatmap_visibility text,
  year text, major text, bio text, goals text, school text,
  verified_student boolean, is_bot boolean, open_to text[], study_mode text,
  headline text, github_url text, linkedin_url text, website_url text,
  stage text, focus_areas text[]
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
    case when p.is_private or p.is_suspended then null else p.study_mode end,
    case when p.is_private or p.is_suspended then null else p.headline end,
    case when p.is_private or p.is_suspended then null else p.github_url end,
    case when p.is_private or p.is_suspended then null else p.linkedin_url end,
    case when p.is_private or p.is_suspended then null else p.website_url end,
    case when p.is_private or p.is_suspended then null else p.stage end,
    case when p.is_private or p.is_suspended then null else p.focus_areas end
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

-- ============================================================
-- search_people: body copied from 20260918011000_bet1_discovery_rpcs.sql.
-- Adds p_stage / p_focus filters and stage / focus_areas return columns.
-- ============================================================
drop function if exists public.search_people(text, int, int, text, text, text, text);
drop function if exists public.search_people(text, int, int, text, text, text, text, text, text);

create function public.search_people(
  p_query text default '',
  p_limit int default 20,
  p_offset int default 0,
  p_open_to text default null,
  p_year text default null,
  p_major text default null,
  p_study_mode text default null,
  p_stage text default null,
  p_focus text default null
)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  is_pro boolean,
  is_founder boolean,
  is_campus_founder boolean,
  verified_student boolean,
  open_to text[],
  study_mode text,
  year text,
  major text,
  stage text,
  focus_areas text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tokens text[] := public.search_tokens(p_query);
  v_q text := left(trim(coalesce(p_query, '')), 100);
  v_limit int := least(20, greatest(1, coalesce(p_limit, 20)));
  v_offset int := greatest(0, coalesce(p_offset, 0));
  v_open_to text := null;
  v_year text := null;
  v_major text := null;
  v_study_mode text := null;
  v_stage text := null;
  v_focus text := null;
  v_has_filters boolean;
begin
  if auth.uid() is null then
    return;
  end if;

  if p_open_to in ('collaborate', 'study', 'feedback') then
    v_open_to := p_open_to;
  end if;
  if p_year in ('freshman', 'sophomore', 'junior', 'senior', 'grad') then
    v_year := p_year;
  end if;
  if p_study_mode in ('on_campus', 'online', 'hybrid', 'bootcamp', 'self_taught') then
    v_study_mode := p_study_mode;
  end if;
  if p_stage in ('learning', 'building', 'internship_search', 'interning', 'job_search', 'working') then
    v_stage := p_stage;
  end if;
  if p_focus in ('web', 'mobile', 'ai_ml', 'data', 'systems', 'security', 'cloud', 'games', 'hardware', 'robotics') then
    v_focus := p_focus;
  end if;
  v_major := nullif(left(trim(regexp_replace(coalesce(p_major, ''), '[,()*%\\]', '', 'g')), 80), '');

  v_has_filters := v_open_to is not null or v_year is not null or v_major is not null or v_study_mode is not null
    or v_stage is not null or v_focus is not null;
  if cardinality(v_tokens) = 0 and not v_has_filters then
    return;
  end if;

  return query
  with visible as (
    select
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      public.is_pro_now(p.is_pro, p.pro_until) as is_pro,
      p.is_founder,
      p.is_campus_founder,
      p.verified_student,
      case when p.is_private then null else p.open_to end as open_to,
      case when p.is_private then null else p.study_mode end as study_mode,
      case when p.is_private then null else p.year end as year,
      case when p.is_private then null else p.major end as major,
      case when p.is_private then null else p.stage end as stage,
      case when p.is_private then null else p.focus_areas end as focus_areas,
      p.created_at,
      (
        cardinality(v_tokens) > 0
        and (
          lower(p.username) = lower(v_q)
          or lower(coalesce(p.display_name, '')) = lower(v_q)
        )
      ) as exact,
      case when cardinality(v_tokens) = 0 then 0 else public.search_term_hits(
        concat_ws(
          ' ',
          p.username,
          p.display_name,
          case when p.is_private then null else p.bio end,
          case when p.is_private then null else p.goals end,
          case when p.is_private then null else p.major end,
          case when p.is_private then null else array_to_string(p.open_to, ' ') end,
          case when p.is_private then null else p.study_mode end,
          case when p.is_private then null else (
            select string_agg(concat_ws(' ', pr.title, pr.summary, array_to_string(pr.technologies, ' ')), ' ')
            from public.portfolio_projects pr
            join public.portfolio_settings s on s.owner_id = pr.owner_id
            where pr.owner_id = p.id
              and pr.status = 'published'
              and s.publish_projects
              and public.portfolio_publicly_readable(pr.owner_id)
          ) end
        ),
        v_tokens
      ) end as term_hits
    from public.profiles p
    where p.is_suspended = false
      and p.id not in (select public.get_blocked_ids())
      and (v_open_to is null or (p.is_private = false and p.open_to @> array[v_open_to]::text[]))
      and (v_year is null or (p.is_private = false and p.year = v_year))
      and (v_study_mode is null or (p.is_private = false and p.study_mode = v_study_mode))
      and (v_stage is null or (p.is_private = false and p.stage = v_stage))
      and (v_focus is null or (p.is_private = false and p.focus_areas @> array[v_focus]::text[]))
      and (v_major is null or (p.is_private = false and lower(coalesce(p.major, '')) = lower(v_major)))
  )
  select
    v.id, v.username, v.display_name, v.avatar_url, v.is_pro,
    v.is_founder, v.is_campus_founder, v.verified_student, v.open_to,
    v.study_mode, v.year, v.major, v.stage, v.focus_areas
  from visible v
  where cardinality(v_tokens) = 0 or v.exact or v.term_hits > 0
  order by v.exact desc, v.term_hits desc, v.created_at desc, v.id desc
  limit v_limit
  offset v_offset;
end;
$$;

revoke all on function public.search_people(text, int, int, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.search_people(text, int, int, text, text, text, text, text, text) to authenticated;

-- ============================================================
-- get_suggested_profiles: body copied from
-- 20260930100000_harden_profile_guard_suggestions_groups.sql. Ranks by same
-- stage, then focus overlap, before the existing terms. Private targets are
-- never ranked by their private fields. Adds a stage return column.
-- ============================================================
drop function if exists public.get_suggested_profiles(text, int);
create function public.get_suggested_profiles(p_school text default null, p_limit int default 3)
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
  school text,
  stage text
)
language sql
security definer
set search_path = ''
stable
as $$
  with viewer as (
    select
      p.study_mode,
      p.stage,
      p.focus_areas,
      coalesce(p.open_to, '{}'::text[]) as open_to,
      case when p.hide_school then null else ps.school end as school
    from public.profiles p
    left join public.profile_school ps on ps.profile_id = p.id
    where p.id = auth.uid()
  )
  select
    p.id, p.username, p.display_name, p.avatar_url,
    case when p.is_private then null else p.year end,
    case when p.is_private then null else p.major end,
    case when p.is_private then null else p.goals end,
    case when p.is_private then null else p.bio end,
    p.is_pro, p.is_founder, p.is_campus_founder, p.verified_student,
    case when p.hide_school then null else ps.school end,
    case when p.is_private then null else p.stage end
  from public.profiles p
  left join public.profile_school ps on ps.profile_id = p.id
  left join viewer v on true
  where auth.uid() is not null
    and p.id <> auth.uid()
    and p.is_suspended = false
    and p.id not in (select public.get_blocked_ids())
    and not exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.following_id = p.id
    )
    and (p_school is null or (not p.hide_school and ps.school = p_school))
  order by
    (not p.is_private and p.stage is not null and v.stage is not null and p.stage = v.stage) desc,
    (
      case when p.is_private then 0 else (
        select count(*)::int
        from unnest(p.focus_areas) as f(area)
        where f.area = any(v.focus_areas)
      ) end
    ) desc,
    (not p.is_private and p.study_mode is not null and v.study_mode is not null and p.study_mode = v.study_mode) desc,
    case when p.is_private then 0 else (
      select count(*)::int
      from unnest(coalesce(p.open_to, '{}'::text[])) as t(tag)
      where t.tag = any(v.open_to)
    ) end desc,
    (not p.hide_school and ps.school is not null and v.school is not null and ps.school = v.school) desc,
    p.verified_student desc,
    p.created_at desc
  limit least(20, greatest(1, coalesce(p_limit, 3)));
$$;

revoke all on function public.get_suggested_profiles(text, int) from public, anon, authenticated;
grant execute on function public.get_suggested_profiles(text, int) to authenticated;
