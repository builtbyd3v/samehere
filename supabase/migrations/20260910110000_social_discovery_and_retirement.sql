-- Social discovery RPCs + retire named match/Eve/jobs cron schedules.
-- Prepared locally. Not applied. Live .env.local is not a disposable target.
--
-- PREREQ (must already exist — this file does not create them):
--   20260910100000_portfolio_data_contracts.sql
--   public.posts.context_label
--   public.profiles.open_to
--   public.portfolio_projects / public.portfolio_settings
--   public.portfolio_publicly_readable(uuid)
--   public.get_blocked_ids()
--   public.is_pro_now(boolean, timestamptz)
--
-- HARNESS: current local-portfolio-harness/run.sh applies every migration
-- except 20260910100000 first, then the portfolio file. This timestamp
-- would therefore run BEFORE its prerequisite. Exclude this file from
-- that baseline loop and apply it after the portfolio migration.
--
-- pg_cron inventory (named jobs only; unread-digest is Vercel-only):
--   KEEP: expire-lapsed-pro, sweep-unconfirmed-signups
--   already gone: thread-generate, thread-summarize
--   RETIRE if present: weekly-matches, eve, jobs-ingest

-- ---------------------------------------------------------------------------
-- token helper (byte-compatible with lib/search.ts tokensFor)
-- ---------------------------------------------------------------------------
create function public.search_tokens(p_query text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce((
    select array_agg(tok order by ord)
    from (
      select tok, ord
      from (
        select
          nullif(regexp_replace(t, '[^a-zA-Z0-9]', '', 'g'), '') as tok,
          ord
        from unnest(regexp_split_to_array(
          left(trim(regexp_replace(coalesce(p_query, ''), '[,()*%\\]', '', 'g')), 100),
          '\s+'
        )) with ordinality as u(t, ord)
      ) cleaned
      where tok is not null
      order by ord
      limit 8
    ) first8
  ), '{}'::text[]);
$$;

create function public.search_term_hits(p_haystack text, p_tokens text[])
returns int
language sql
immutable
set search_path = ''
as $$
  select coalesce((
    select count(*)::int
    from unnest(p_tokens) as tok
    where coalesce(p_haystack, '') ilike ('%' || tok || '%')
  ), 0);
$$;

revoke all on function public.search_tokens(text) from public, anon, authenticated;
revoke all on function public.search_term_hits(text, text[]) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- search_people
-- Identity (username/display_name) is searchable even when private.
-- Bio / background / open_to / project text only when the account is public.
-- Suspended + blocked filtered before rank/limit. Auth required.
-- ---------------------------------------------------------------------------
create function public.search_people(
  p_query text,
  p_limit int default 20,
  p_offset int default 0
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
  open_to text[]
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
begin
  if auth.uid() is null then
    return;
  end if;
  if cardinality(v_tokens) = 0 then
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
      p.created_at,
      (
        lower(p.username) = lower(v_q)
        or lower(coalesce(p.display_name, '')) = lower(v_q)
      ) as exact,
      public.search_term_hits(
        concat_ws(
          ' ',
          p.username,
          p.display_name,
          case when p.is_private then null else p.bio end,
          case when p.is_private then null else p.goals end,
          case when p.is_private then null else p.major end,
          case when p.is_private then null else array_to_string(p.open_to, ' ') end,
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
      ) as term_hits
    from public.profiles p
    where p.is_suspended = false
      and p.id not in (select public.get_blocked_ids())
  )
  select
    v.id, v.username, v.display_name, v.avatar_url, v.is_pro,
    v.is_founder, v.is_campus_founder, v.verified_student, v.open_to
  from visible v
  where v.exact or v.term_hits > 0
  order by v.exact desc, v.term_hits desc, v.created_at desc, v.id desc
  limit v_limit
  offset v_offset;
end;
$$;

-- ---------------------------------------------------------------------------
-- search_projects
-- Published + publish_projects + public nonsuspended unblocked owner only.
-- ---------------------------------------------------------------------------
create function public.search_projects(
  p_query text,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  owner_id uuid,
  owner_username text,
  title text,
  summary text,
  technologies text[],
  published_at timestamptz
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
begin
  if auth.uid() is null then
    return;
  end if;
  if cardinality(v_tokens) = 0 then
    return;
  end if;

  return query
  with visible as (
    select
      pr.id,
      pr.owner_id,
      p.username as owner_username,
      pr.title,
      pr.summary,
      pr.technologies,
      pr.published_at,
      (lower(pr.title) = lower(v_q)) as exact,
      public.search_term_hits(
        concat_ws(' ', pr.title, pr.summary, array_to_string(pr.technologies, ' ')),
        v_tokens
      ) as term_hits
    from public.portfolio_projects pr
    join public.profiles p on p.id = pr.owner_id
    join public.portfolio_settings s on s.owner_id = pr.owner_id
    where pr.status = 'published'
      and s.publish_projects
      and public.portfolio_publicly_readable(pr.owner_id)
  )
  select
    v.id, v.owner_id, v.owner_username, v.title, v.summary, v.technologies, v.published_at
  from visible v
  where v.exact or v.term_hits > 0
  order by v.exact desc, v.term_hits desc, v.published_at desc nulls last, v.id desc
  limit v_limit
  offset v_offset;
end;
$$;

-- ---------------------------------------------------------------------------
-- search_posts
-- Same visibility as get_public_post: public author, not hidden/suspended/blocked.
-- ---------------------------------------------------------------------------
create function public.search_posts(
  p_query text,
  p_limit int default 20,
  p_offset int default 0
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
begin
  if auth.uid() is null then
    return;
  end if;
  if cardinality(v_tokens) = 0 then
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
      public.search_term_hits(
        concat_ws(' ', po.content, po.context_label),
        v_tokens
      ) as term_hits
    from public.posts po
    join public.profiles a on a.id = po.user_id
    where po.hidden = false
      and a.is_private = false
      and a.is_suspended = false
      and a.id not in (select public.get_blocked_ids())
  )
  select v.id, v.user_id, v.content, v.context_label, v.created_at
  from visible v
  where v.term_hits > 0
  order by v.term_hits desc, v.created_at desc, v.id desc
  limit v_limit
  offset v_offset;
end;
$$;

-- default-privileges trap: CREATE FUNCTION + schema defaults grant anon
-- (and authenticated) EXECUTE directly. `revoke from public` does not
-- strip those role grants. Revoke both roles first, then grant authenticated.
revoke all on function public.search_people(text, int, int) from public, anon, authenticated;
revoke all on function public.search_projects(text, int, int) from public, anon, authenticated;
revoke all on function public.search_posts(text, int, int) from public, anon, authenticated;
grant execute on function public.search_people(text, int, int) to authenticated;
grant execute on function public.search_projects(text, int, int) to authenticated;
grant execute on function public.search_posts(text, int, int) to authenticated;

-- ---------------------------------------------------------------------------
-- retire named pg_cron schedules only
-- ---------------------------------------------------------------------------
create function public.unschedule_retired_social_crons()
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  names text[] := array['weekly-matches', 'eve', 'jobs-ingest'];
  n text;
  done text[] := '{}';
begin
  if to_regclass('cron.job') is null then
    return done;
  end if;
  foreach n in array names loop
    if exists (select 1 from cron.job where cron.job.jobname = n) then
      perform cron.unschedule(n);
      done := array_append(done, n);
    end if;
  end loop;
  return done;
end;
$$;

revoke all on function public.unschedule_retired_social_crons() from public, anon, authenticated;

select public.unschedule_retired_social_crons();
