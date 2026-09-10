-- Atomic analysis finalize + GitHub contribution snapshot.
-- Prepared locally. Not applied to live .env.local.
-- Depends on 20260910100000_portfolio_data_contracts.sql. Do not edit that file.
--
-- Source columns on portfolio_projects are service/definer-only.
-- Advisory lock matches reserve/retry: hashtext('repo_analysis_quota'), owner.

-- ---------------------------------------------------------------------------
-- finalize_repository_analysis
-- Same args as commit_repository_analysis. Returns project_id or null.
-- ---------------------------------------------------------------------------
create function public.finalize_repository_analysis(
  p_analysis_id uuid,
  p_attempt_id uuid,
  p_worker_id text,
  p_connection_epoch int,
  p_status text,
  p_draft jsonb default null,
  p_evidence jsonb default null,
  p_coverage jsonb default null,
  p_safe_error text default null,
  p_model text default null,
  p_prompt_version text default null,
  p_token_input int default null,
  p_token_output int default null,
  p_estimated_cost_usd numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_conn_id uuid;
  v_row public.repository_analyses%rowtype;
  v_project uuid;
  v_src jsonb;
  v_title text;
  v_summary text;
  v_description text;
  v_tech text[];
  v_features text[];
  v_repo_url text;
  v_sort int;
begin
  select a.owner_id, a.connection_id into v_owner, v_conn_id
  from public.repository_analyses a
  where a.id = p_analysis_id;
  if v_owner is null then
    raise exception 'not found';
  end if;

  -- Same namespace as reserve/retry. Then connection then analysis, matching
  -- reserve (advisory → connection) and disconnect (connection → analyses).
  perform pg_advisory_xact_lock(hashtext('repo_analysis_quota'), hashtext(v_owner::text));
  perform 1
  from public.github_connections c
  where c.id = v_conn_id
  for update;

  select * into v_row
  from public.repository_analyses a
  where a.id = p_analysis_id
  for update;
  if not found then
    raise exception 'not found';
  end if;

  if v_row.status = 'succeeded'
     and v_row.attempt_id is not distinct from p_attempt_id
     and p_status = 'succeeded'
     and v_row.project_id is not null then
    return v_row.project_id;
  end if;

  if v_row.status in ('succeeded', 'failed', 'cancelled') then
    if v_row.attempt_id is distinct from p_attempt_id then
      raise exception 'stale analysis attempt';
    end if;
    raise exception 'invalid input';
  end if;

  if p_status = 'succeeded' then
    v_src := p_draft;
    if v_src is null or jsonb_typeof(v_src) is distinct from 'object' then
      raise exception 'invalid input';
    end if;
    v_title := btrim(coalesce(v_src->>'title', ''));
    if char_length(v_title) < 1 or char_length(v_title) > 100 then
      raise exception 'invalid input';
    end if;
    v_summary := nullif(btrim(coalesce(v_src->>'summary', '')), '');
    v_description := nullif(btrim(coalesce(v_src->>'description', '')), '');
    if v_summary is not null and char_length(v_summary) > 500 then
      raise exception 'invalid input';
    end if;
    if v_description is not null and char_length(v_description) > 4000 then
      raise exception 'invalid input';
    end if;
    if v_src ? 'technologies' and jsonb_typeof(v_src->'technologies') is distinct from 'array' then
      raise exception 'invalid input';
    end if;
    if v_src ? 'keyFeatures' and jsonb_typeof(v_src->'keyFeatures') is distinct from 'array' then
      raise exception 'invalid input';
    end if;
    select coalesce(array_agg(btrim(t)), '{}'::text[])
    into v_tech
    from jsonb_array_elements_text(coalesce(v_src->'technologies', '[]'::jsonb)) as t;
    select coalesce(array_agg(btrim(t)), '{}'::text[])
    into v_features
    from jsonb_array_elements_text(coalesce(v_src->'keyFeatures', '[]'::jsonb)) as t;
    if not public.portfolio_text_array_ok(v_tech, 12, 40)
       or not public.portfolio_text_array_ok(v_features, 6, 160) then
      raise exception 'invalid input';
    end if;
  end if;

  perform public.commit_repository_analysis(
    p_analysis_id,
    p_attempt_id,
    p_worker_id,
    p_connection_epoch,
    p_status,
    p_draft,
    p_evidence,
    p_coverage,
    p_safe_error,
    p_model,
    p_prompt_version,
    p_token_input,
    p_token_output,
    p_estimated_cost_usd
  );

  if p_status is distinct from 'succeeded' then
    return null;
  end if;

  select * into v_row
  from public.repository_analyses a
  where a.id = p_analysis_id;

  if v_row.project_id is not null then
    return v_row.project_id;
  end if;

  select pr.id into v_project
  from public.portfolio_projects pr
  where pr.source_analysis_id = p_analysis_id
    and pr.owner_id = v_row.owner_id
    and pr.source_repository_id is not distinct from v_row.repository_id
    and pr.source_commit_sha is not distinct from v_row.commit_sha;
  if v_project is not null then
    update public.repository_analyses a
    set project_id = v_project
    where a.id = p_analysis_id;
    return v_project;
  end if;

  v_repo_url := case
    when nullif(btrim(coalesce(v_row.repository_full_name, '')), '') is null then null
    else 'https://github.com/' || btrim(v_row.repository_full_name)
  end;
  if not public.portfolio_http_url_ok(v_repo_url) then
    raise exception 'invalid input';
  end if;

  select coalesce(max(pr.sort_order), -1) + 1
  into v_sort
  from public.portfolio_projects pr
  where pr.owner_id = v_row.owner_id;

  insert into public.portfolio_projects (
    owner_id, title, summary, description, personal_role,
    technologies, key_features, repo_url, status, sort_order,
    source_repository_id, source_commit_sha, source_analysis_id
  ) values (
    v_row.owner_id, v_title, v_summary, v_description, null,
    v_tech, v_features, v_repo_url, 'draft', v_sort,
    v_row.repository_id, v_row.commit_sha, v_row.id
  )
  returning id into v_project;

  update public.repository_analyses a
  set project_id = v_project
  where a.id = p_analysis_id;

  return v_project;
end;
$$;

-- ---------------------------------------------------------------------------
-- replace_github_contribution_snapshot
-- Official UTC window: [today-364, today] = 365 dates. Missing day ≠ zero.
-- ---------------------------------------------------------------------------
create function public.replace_github_contribution_snapshot(
  p_connection_id uuid,
  p_expected_epoch int,
  p_days jsonb,
  p_from date,
  p_to date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_status text;
  v_epoch int;
  v_today date := (timezone('UTC', now()))::date;
  v_official_from date := ((timezone('UTC', now()))::date - 364);
  v_expected int;
  v_n int;
  v_uniq int;
begin
  if p_connection_id is null
     or p_expected_epoch is null
     or p_from is null
     or p_to is null
     or jsonb_typeof(p_days) is distinct from 'array' then
    raise exception 'invalid input';
  end if;
  if p_from is distinct from v_official_from or p_to is distinct from v_today then
    raise exception 'invalid input';
  end if;
  v_expected := (p_to - p_from) + 1;
  if v_expected is distinct from 365 then
    raise exception 'invalid input';
  end if;
  -- Bound before unnest. Oversized arrays must not reach jsonb_array_elements.
  if jsonb_array_length(p_days) is distinct from v_expected then
    raise exception 'invalid input';
  end if;

  begin
    select count(*), count(distinct (d->>'date')::date)
    into v_n, v_uniq
    from jsonb_array_elements(p_days) d
    where jsonb_typeof(d) = 'object'
      and coalesce(d->>'date', '') ~ '^\d{4}-\d{2}-\d{2}$'
      and jsonb_typeof(d->'count') = 'number'
      and jsonb_typeof(d->'level') = 'number'
      and (d->>'count')::numeric = trunc((d->>'count')::numeric)
      and (d->>'level')::numeric = trunc((d->>'level')::numeric)
      and (d->>'count')::int >= 0
      and (d->>'level')::int between 0 and 4
      and (d->>'date')::date between p_from and p_to;
  exception
    when invalid_datetime_format or datetime_field_overflow then
      raise exception 'invalid input';
  end;

  if v_n is distinct from v_expected
     or v_uniq is distinct from v_expected
     or v_n is distinct from jsonb_array_length(p_days) then
    raise exception 'invalid input';
  end if;

  select c.owner_id, c.status, c.epoch into v_owner, v_status, v_epoch
  from public.github_connections c
  where c.id = p_connection_id
  for update;
  if v_owner is null then
    raise exception 'not found';
  end if;
  if v_epoch is distinct from p_expected_epoch then
    raise exception 'stale connection epoch';
  end if;
  if v_status <> 'connected' then
    raise exception 'github connection inactive';
  end if;

  delete from public.github_contribution_days d
  where d.connection_id = p_connection_id
    and (d.contribution_date < p_from or d.contribution_date > p_to);

  insert into public.github_contribution_days (
    connection_id, owner_id, contribution_date, contribution_count, contribution_level, fetched_at
  )
  select
    p_connection_id,
    v_owner,
    (d->>'date')::date,
    (d->>'count')::int,
    (d->>'level')::int,
    now()
  from jsonb_array_elements(p_days) d
  on conflict (connection_id, contribution_date) do update set
    contribution_count = excluded.contribution_count,
    contribution_level = excluded.contribution_level,
    fetched_at = now();

  update public.github_connections c
  set last_synced_at = now(),
      last_sync_error = null,
      last_error_at = null,
      sync_cursor = null,
      updated_at = now()
  where c.id = p_connection_id;

  return v_expected;
end;
$$;

revoke all on function public.finalize_repository_analysis(uuid, uuid, text, int, text, jsonb, jsonb, jsonb, text, text, text, int, int, numeric) from public, anon, authenticated;
revoke all on function public.replace_github_contribution_snapshot(uuid, int, jsonb, date, date) from public, anon, authenticated;
grant execute on function public.finalize_repository_analysis(uuid, uuid, text, int, text, jsonb, jsonb, jsonb, text, text, text, int, int, numeric) to service_role;
grant execute on function public.replace_github_contribution_snapshot(uuid, int, jsonb, date, date) to service_role;

-- Clients keep SELECT/DELETE and manual field writes. Source linkage is
-- service_role + SECURITY DEFINER only (finalize).
revoke insert, update on table public.portfolio_projects from authenticated;
grant insert (
  id, owner_id, title, summary, description, personal_role,
  technologies, key_features, repo_url, demo_url, status, sort_order,
  published_at, created_at, updated_at
) on table public.portfolio_projects to authenticated;
grant update (
  title, summary, description, personal_role,
  technologies, key_features, repo_url, demo_url, status, sort_order,
  published_at, updated_at
) on table public.portfolio_projects to authenticated;
grant select, insert, update, delete on table public.portfolio_projects to service_role;
