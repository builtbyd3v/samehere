-- Bet 1: stage filters on search RPCs + suggested-profile re-rank.
-- Optional args keep existing 3-arg calls working. Visibility/blocks stay
-- in the visible CTE, before rank/limit. Empty query + filters = browse.

drop function if exists public.search_people(text, int, int);
drop function if exists public.search_people(text, int, int, text, text, text, text);

create function public.search_people(
  p_query text default '',
  p_limit int default 20,
  p_offset int default 0,
  p_open_to text default null,
  p_year text default null,
  p_major text default null,
  p_study_mode text default null
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
  major text
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
  v_major := nullif(left(trim(regexp_replace(coalesce(p_major, ''), '[,()*%\\]', '', 'g')), 80), '');

  v_has_filters := v_open_to is not null or v_year is not null or v_major is not null or v_study_mode is not null;
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
      and (v_major is null or (p.is_private = false and lower(coalesce(p.major, '')) = lower(v_major)))
  )
  select
    v.id, v.username, v.display_name, v.avatar_url, v.is_pro,
    v.is_founder, v.is_campus_founder, v.verified_student, v.open_to,
    v.study_mode, v.year, v.major
  from visible v
  where cardinality(v_tokens) = 0 or v.exact or v.term_hits > 0
  order by v.exact desc, v.term_hits desc, v.created_at desc, v.id desc
  limit v_limit
  offset v_offset;
end;
$$;

drop function if exists public.search_posts(text, int, int);
drop function if exists public.search_posts(text, int, int, text);

create function public.search_posts(
  p_query text default '',
  p_limit int default 20,
  p_offset int default 0,
  p_label text default null
)
returns table (
  id uuid,
  user_id uuid,
  content text,
  context_label text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tokens text[] := public.search_tokens(p_query);
  v_limit int := least(20, greatest(1, coalesce(p_limit, 20)));
  v_offset int := greatest(0, coalesce(p_offset, 0));
  v_label text := null;
begin
  if auth.uid() is null then
    return;
  end if;
  if p_label in ('building', 'learning', 'stuck') then
    v_label := p_label;
  end if;
  if cardinality(v_tokens) = 0 and v_label is null then
    return;
  end if;

  return query
  with visible as (
    select
      po.id,
      po.user_id,
      po.content,
      po.context_label,
      po.created_at,
      case when cardinality(v_tokens) = 0 then 1 else public.search_term_hits(
        concat_ws(' ', po.content, po.context_label),
        v_tokens
      ) end as term_hits
    from public.posts po
    join public.profiles a on a.id = po.user_id
    where po.hidden = false
      and a.is_private = false
      and a.is_suspended = false
      and a.id not in (select public.get_blocked_ids())
      and (v_label is null or po.context_label = v_label)
  )
  select v.id, v.user_id, v.content, v.context_label, v.created_at
  from visible v
  where v.term_hits > 0
  order by v.term_hits desc, v.created_at desc, v.id desc
  limit v_limit
  offset v_offset;
end;
$$;

revoke all on function public.search_people(text, int, int, text, text, text, text) from public, anon, authenticated;
revoke all on function public.search_posts(text, int, int, text) from public, anon, authenticated;
grant execute on function public.search_people(text, int, int, text, text, text, text) to authenticated;
grant execute on function public.search_posts(text, int, int, text) to authenticated;

-- Stage + overlapping open_to first, school second. Signature unchanged.
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
  with viewer as (
    select
      p.study_mode,
      coalesce(p.open_to, '{}'::text[]) as open_to,
      case when p.hide_school then null else ps.school end as school
    from public.profiles p
    left join public.profile_school ps on ps.profile_id = p.id
    where p.id = auth.uid()
  )
  select
    p.id, p.username, p.display_name, p.avatar_url,
    p.year, p.major, p.goals, p.bio,
    p.is_pro, p.is_founder, p.is_campus_founder, p.verified_student,
    case when p.hide_school then null else ps.school end
  from public.profiles p
  left join public.profile_school ps on ps.profile_id = p.id
  left join viewer v on true
  where auth.uid() is not null
    and p.id <> auth.uid()
    and p.id not in (select public.get_blocked_ids())
    and not exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.following_id = p.id
    )
    and (p_school is null or ps.school = p_school)
  order by
    (p.study_mode is not null and v.study_mode is not null and p.study_mode = v.study_mode) desc,
    coalesce(cardinality(p.open_to & v.open_to), 0) desc,
    (ps.school is not null and v.school is not null and ps.school = v.school) desc,
    p.verified_student desc,
    p.created_at desc
  limit p_limit;
$$;

revoke all on function public.get_suggested_profiles(text, int) from public, anon, authenticated;
grant execute on function public.get_suggested_profiles(text, int) to authenticated;
