-- Finalize + contribution snapshot contract tests.
-- Requires 20260910100000 + 20260910130000. Do not edit 100000/120000/harness.
-- Rolls back. Live .env.local is not a target.

begin;

create schema if not exists tests;
grant usage on schema tests to authenticated, anon, service_role;

create or replace function tests.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create or replace function tests.as_anon() returns void language sql as $$
  select set_config('role', 'anon', true),
         set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
$$;

grant execute on function tests.as_user(uuid) to authenticated, anon, service_role;
grant execute on function tests.as_anon() to authenticated, anon, service_role;

create or replace function tests.official_from() returns date language sql stable as $$
  select (timezone('UTC', now()))::date - 364;
$$;

create or replace function tests.official_to() returns date language sql stable as $$
  select (timezone('UTC', now()))::date;
$$;

create or replace function tests.full_days(p_from date, p_to date, p_hit date default null, p_count int default 0, p_level int default 0)
returns jsonb
language sql
stable
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'date', to_char(g.d, 'YYYY-MM-DD'),
      'count', case when p_hit is not null and g.d = p_hit then p_count else 0 end,
      'level', case when p_hit is not null and g.d = p_hit then p_level else 0 end
    ) order by g.d
  ), '[]'::jsonb)
  from generate_series(p_from, p_to, interval '1 day') as g(d);
$$;

create temporary table tests_fixture (key text primary key, id uuid not null);
create temporary table tests_ints (key text primary key, n int not null);
create temporary table tests_results (finding text primary key, passed boolean not null, note text);
grant select, insert, update, delete on tests_fixture to authenticated, anon, service_role;
grant select, insert, update, delete on tests_ints to authenticated, anon, service_role;
grant select, insert, update, delete on tests_results to authenticated, anon, service_role;

do $$
declare
  v_a uuid := gen_random_uuid();
  v_c uuid := gen_random_uuid();
  v_conn uuid;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values
    ('00000000-0000-0000-0000-000000000000', v_a, 'authenticated', 'authenticated',
     'fin-a@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'fin_test_a'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_c, 'authenticated', 'authenticated',
     'fin-c@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'fin_test_c'), now(), now(), '', '', '', '');
  update public.profiles set username = 'fin_test_a', is_private = false where id = v_a;
  -- Pro: second monthly reserve after a_rb success (disconnect fixture). Free cap is 1.
  update public.profiles set username = 'fin_test_c', is_private = false, is_pro = true where id = v_c;
  insert into tests_fixture values ('a', v_a), ('c', v_c);
  v_conn := public.upsert_github_connection(v_c, 7777, 'fin_c');
  insert into tests_fixture values ('conn', v_conn);
  insert into tests_ints values (
    'epoch', (select epoch from public.github_connections where id = v_conn)
  );
end $$;

-- CLIENT_* denied
select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare
  v_denied boolean := false;
begin
  begin
    perform public.finalize_repository_analysis(
      gen_random_uuid(), gen_random_uuid(), 'w', 1, 'failed'
    );
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'authenticated executed finalize_repository_analysis';
  end if;
  insert into tests_results values ('CLIENT_finalize_denied', true, 'ok');
exception when others then
  insert into tests_results values ('CLIENT_finalize_denied', false, sqlerrm);
end $$;
reset role;

select tests.as_anon();
do $$
declare
  v_denied boolean := false;
begin
  begin
    perform public.replace_github_contribution_snapshot(
      gen_random_uuid(), 1, '[]'::jsonb, current_date, current_date
    );
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'anon executed replace_github_contribution_snapshot';
  end if;
  insert into tests_results values ('CLIENT_snapshot_denied', true, 'ok');
exception when others then
  insert into tests_results values ('CLIENT_snapshot_denied', false, sqlerrm);
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare
  v_c uuid := (select id from tests_fixture where key = 'c');
  v_manual uuid;
  v_denied boolean := false;
begin
  insert into public.portfolio_projects (owner_id, title, personal_role, status)
  values (v_c, 'Manual draft', null, 'draft')
  returning id into v_manual;
  insert into tests_fixture values ('manual_c', v_manual);
  begin
    update public.portfolio_projects
    set source_analysis_id = gen_random_uuid(),
        source_repository_id = 1,
        source_commit_sha = 'spoof'
    where id = v_manual;
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'owner updated source_* columns';
  end if;
  if exists (
    select 1 from public.portfolio_projects
    where id = v_manual and source_analysis_id is not null
  ) then
    raise exception 'source spoof stuck on owner update';
  end if;
  insert into tests_results values ('CLIENT_source_update_denied', true, 'ok');
exception when others then
  insert into tests_results values ('CLIENT_source_update_denied', false, sqlerrm);
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'a';
do $$
declare
  v_a uuid := (select id from tests_fixture where key = 'a');
  v_denied boolean := false;
begin
  begin
    insert into public.portfolio_projects (
      owner_id, title, personal_role, status,
      source_analysis_id, source_repository_id, source_commit_sha
    ) values (
      v_a, 'Forged source', 'x', 'draft',
      gen_random_uuid(), 99, 'spoof-sha'
    );
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'other user inserted source_* columns';
  end if;
  insert into tests_results values ('CLIENT_source_insert_denied', true, 'ok');
exception when others then
  insert into tests_results values ('CLIENT_source_insert_denied', false, sqlerrm);
end $$;
reset role;

-- Helpers to reserve+acquire as the fixture user / service.
select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare
  v_res record;
begin
  select * into v_res from public.reserve_repository_analysis(
    null, 99, 'acme/bus', 'sha-reserved-aaa', 'fin-stale', 'prompt-v1'
  );
  insert into tests_fixture values ('a_stale', v_res.analysis_id);
  insert into tests_fixture values ('att_stale', v_res.attempt_id);
end $$;
reset role;

set local role postgres;
do $$
declare
  v_lease record;
  v_proj uuid;
  v_denied boolean := false;
begin
  select * into v_lease from public.acquire_repository_analysis_lease(
    (select id from tests_fixture where key = 'a_stale'), 'worker-a', 90
  );
  begin
    v_proj := public.finalize_repository_analysis(
      (select id from tests_fixture where key = 'a_stale'),
      gen_random_uuid(), 'worker-a',
      (select n from tests_ints where key = 'epoch'),
      'succeeded',
      '{"title":"Nope","summary":"","description":"","technologies":[],"keyFeatures":[]}'::jsonb
    );
  exception when others then
    if sqlerrm = 'stale analysis attempt' then
      v_denied := true;
    else
      raise;
    end if;
  end;
  if not v_denied or v_proj is not null then
    raise exception 'stale finalize materialized a project';
  end if;
  if exists (
    select 1 from public.portfolio_projects
    where source_analysis_id = (select id from tests_fixture where key = 'a_stale')
  ) then
    raise exception 'stale finalize left a project row';
  end if;
  insert into tests_results values ('FINALIZE_stale_no_project', true, 'ok');
exception when others then
  insert into tests_results values ('FINALIZE_stale_no_project', false, sqlerrm);
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare v_res record;
begin
  perform public.cancel_repository_analysis((select id from tests_fixture where key = 'a_stale'));
  select * into v_res from public.reserve_repository_analysis(
    null, 100, 'acme/exp', 'sha-exp', 'fin-exp', 'prompt-v1'
  );
  insert into tests_fixture values ('a_exp', v_res.analysis_id);
  insert into tests_fixture values ('att_exp', v_res.attempt_id);
end $$;
reset role;

set local role postgres;
do $$
declare
  v_lease record;
  v_proj uuid;
  v_denied boolean := false;
begin
  select * into v_lease from public.acquire_repository_analysis_lease(
    (select id from tests_fixture where key = 'a_exp'), 'worker-e', 90
  );
  update public.repository_analyses
  set lease_expires_at = now() - interval '1 second'
  where id = (select id from tests_fixture where key = 'a_exp');
  begin
    v_proj := public.finalize_repository_analysis(
      (select id from tests_fixture where key = 'a_exp'),
      v_lease.attempt_id, 'worker-e',
      (select n from tests_ints where key = 'epoch'),
      'succeeded',
      '{"title":"Late","summary":"","description":"","technologies":[],"keyFeatures":[]}'::jsonb
    );
  exception when others then
    if sqlerrm = 'analysis lease expired' then
      v_denied := true;
    else
      raise;
    end if;
  end;
  if not v_denied or exists (
    select 1 from public.portfolio_projects
    where source_analysis_id = (select id from tests_fixture where key = 'a_exp')
  ) then
    raise exception 'expired finalize materialized a project';
  end if;
  insert into tests_results values ('FINALIZE_expired_no_project', true, 'ok');
exception when others then
  insert into tests_results values ('FINALIZE_expired_no_project', false, sqlerrm);
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare v_res record;
begin
  perform public.cancel_repository_analysis((select id from tests_fixture where key = 'a_exp'));
  select * into v_res from public.reserve_repository_analysis(
    null, 101, 'acme/can', 'sha-can', 'fin-can', 'prompt-v1'
  );
  insert into tests_fixture values ('a_can', v_res.analysis_id);
  perform public.cancel_repository_analysis(v_res.analysis_id);
end $$;
reset role;

set local role postgres;
do $$
declare
  v_proj uuid;
  v_denied boolean := false;
begin
  begin
    v_proj := public.finalize_repository_analysis(
      (select id from tests_fixture where key = 'a_can'),
      (select attempt_id from public.repository_analyses where id = (select id from tests_fixture where key = 'a_can')),
      'worker-c',
      (select n from tests_ints where key = 'epoch'),
      'succeeded',
      '{"title":"After cancel","summary":"","description":"","technologies":[],"keyFeatures":[]}'::jsonb
    );
  exception when others then
    if sqlerrm in ('invalid input', 'stale analysis attempt', 'analysis lease expired') then
      v_denied := true;
    else
      raise;
    end if;
  end;
  if not v_denied or exists (
    select 1 from public.portfolio_projects
    where source_analysis_id = (select id from tests_fixture where key = 'a_can')
  ) then
    raise exception 'cancel finalize materialized a project';
  end if;
  insert into tests_results values ('FINALIZE_cancel_no_project', true, 'ok');
exception when others then
  insert into tests_results values ('FINALIZE_cancel_no_project', false, sqlerrm);
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare v_res record;
begin
  select * into v_res from public.reserve_repository_analysis(
    null, 102, 'acme/fail', 'sha-fail', 'fin-fail', 'prompt-v1'
  );
  insert into tests_fixture values ('a_fail', v_res.analysis_id);
end $$;
reset role;

set local role postgres;
do $$
declare
  v_lease record;
  v_proj uuid;
begin
  select * into v_lease from public.acquire_repository_analysis_lease(
    (select id from tests_fixture where key = 'a_fail'), 'worker-f', 90
  );
  v_proj := public.finalize_repository_analysis(
    (select id from tests_fixture where key = 'a_fail'),
    v_lease.attempt_id, 'worker-f',
    (select n from tests_ints where key = 'epoch'),
    'failed', null, null, null, 'model died', 'test', 'prompt-v1', 1, 1, 0.01
  );
  if v_proj is not null or exists (
    select 1 from public.portfolio_projects
    where source_analysis_id = (select id from tests_fixture where key = 'a_fail')
  ) then
    raise exception 'failed finalize created a project';
  end if;
  insert into tests_results values ('FINALIZE_failed_no_project', true, 'ok');
exception when others then
  insert into tests_results values ('FINALIZE_failed_no_project', false, sqlerrm);
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare v_res record;
begin
  select * into v_res from public.reserve_repository_analysis(
    null, 103, 'acme/rb', 'sha-rb', 'fin-rb', 'prompt-v1'
  );
  insert into tests_fixture values ('a_rb', v_res.analysis_id);
end $$;
reset role;

set local role postgres;
do $$
declare
  v_lease record;
  v_denied boolean := false;
begin
  select * into v_lease from public.acquire_repository_analysis_lease(
    (select id from tests_fixture where key = 'a_rb'), 'worker-r', 90
  );
  begin
    perform public.finalize_repository_analysis(
      (select id from tests_fixture where key = 'a_rb'),
      v_lease.attempt_id, 'worker-r',
      (select n from tests_ints where key = 'epoch'),
      'succeeded',
      jsonb_build_object(
        'title', repeat('x', 101),
        'summary', '',
        'description', '',
        'technologies', jsonb_build_array(),
        'keyFeatures', jsonb_build_array()
      )
    );
  exception when others then
    if sqlerrm = 'invalid input' then
      v_denied := true;
    else
      raise;
    end if;
  end;
  if not v_denied then
    raise exception 'overlong draft was accepted';
  end if;
  if exists (
    select 1 from public.repository_analyses
    where id = (select id from tests_fixture where key = 'a_rb') and status = 'succeeded'
  ) then
    raise exception 'bad draft left analysis succeeded';
  end if;
  if exists (
    select 1 from public.repository_analysis_usage
    where analysis_id = (select id from tests_fixture where key = 'a_rb')
      and settlement = 'success'
  ) then
    raise exception 'bad draft settled usage as success';
  end if;
  if exists (
    select 1 from public.portfolio_projects
    where source_analysis_id = (select id from tests_fixture where key = 'a_rb')
  ) then
    raise exception 'bad draft created a project';
  end if;
  insert into tests_results values ('FINALIZE_atomic_rollback', true, 'ok');
exception when others then
  insert into tests_results values ('FINALIZE_atomic_rollback', false, sqlerrm);
end $$;
reset role;

set local role postgres;
do $$
declare
  v_id uuid := (select id from tests_fixture where key = 'a_rb');
  v_a uuid := (select id from tests_fixture where key = 'a');
  v_lease record;
  v_proj uuid;
  v_proj2 uuid;
  v_forged uuid;
  v_sha text;
  v_repo bigint;
  v_title text;
  v_role text;
  v_status text;
begin
  insert into public.portfolio_projects (
    owner_id, title, personal_role, status,
    source_analysis_id, source_repository_id, source_commit_sha
  ) values (
    v_a, 'Cross-owner forge', 'x', 'draft',
    v_id, 103, 'sha-rb'
  ) returning id into v_forged;
  insert into tests_fixture values ('forged_a', v_forged);

  -- lease still live from the failed finalize (validate happens before commit)
  select * into v_lease from public.acquire_repository_analysis_lease(v_id, 'worker-r', 90);
  v_proj := public.finalize_repository_analysis(
    v_id, v_lease.attempt_id, 'worker-r',
    (select n from tests_ints where key = 'epoch'),
    'succeeded',
    '{"title":"Bus tracker","summary":"ETA","description":"GTFS","technologies":["Go"],"keyFeatures":["Map"]}'::jsonb,
    null, '{"fakeSha":"not-authoritative"}'::jsonb, null, 'test', 'prompt-v1', 10, 4, 0.02
  );
  if v_proj is null then
    raise exception 'success finalize returned null project';
  end if;
  select source_commit_sha, source_repository_id, title, personal_role, status
  into v_sha, v_repo, v_title, v_role, v_status
  from public.portfolio_projects where id = v_proj;
  if v_sha is distinct from 'sha-rb' or v_repo is distinct from 103 then
    raise exception 'project used non-reserved source sha/repo';
  end if;
  if v_title is distinct from 'Bus tracker' or v_role is not null or v_status is distinct from 'draft' then
    raise exception 'draft project fields wrong';
  end if;
  if (select project_id from public.repository_analyses where id = v_id) is distinct from v_proj then
    raise exception 'analysis.project_id not linked';
  end if;
  if v_proj is not distinct from v_forged
     or (select owner_id from public.portfolio_projects where id = v_proj)
        is distinct from (select id from tests_fixture where key = 'c') then
    raise exception 'finalize linked a cross-owner forged source row';
  end if;
  insert into tests_results values ('FINALIZE_reserved_source', true, 'ok');
  insert into tests_results values ('FINALIZE_cross_owner_source', true, 'ok');

  v_proj2 := public.finalize_repository_analysis(
    v_id, v_lease.attempt_id, 'worker-r',
    (select n from tests_ints where key = 'epoch'),
    'succeeded',
    '{"title":"HACKED","summary":"x","description":"x","technologies":["Rust"],"keyFeatures":["No"]}'::jsonb
  );
  if v_proj2 is distinct from v_proj then
    raise exception 'idempotent finalize returned a new project';
  end if;
  if (select title from public.portfolio_projects where id = v_proj) is distinct from 'Bus tracker' then
    raise exception 'idempotent finalize overwrote manual/draft fields';
  end if;
  if (select count(*) from public.portfolio_projects p
      where p.source_analysis_id = v_id
        and p.owner_id = (select id from tests_fixture where key = 'c')) <> 1 then
    raise exception 'idempotent finalize inserted a second owner project';
  end if;
  if not exists (
    select 1 from public.portfolio_projects p
    where p.id = v_forged
      and p.owner_id = v_a
      and p.title = 'Cross-owner forge'
      and p.source_analysis_id = v_id
  ) then
    raise exception 'finalize dropped or mutated the cross-owner forged row';
  end if;
  insert into tests_results values ('FINALIZE_idempotent_replay', true, 'ok');
exception when others then
  insert into tests_results values ('FINALIZE_reserved_source', false, sqlerrm)
  on conflict (finding) do update set passed = false, note = excluded.note;
  insert into tests_results values ('FINALIZE_cross_owner_source', false, sqlerrm)
  on conflict (finding) do update set passed = false, note = excluded.note;
  insert into tests_results values ('FINALIZE_idempotent_replay', false, sqlerrm)
  on conflict (finding) do update set passed = false, note = excluded.note;
  raise;
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare v_res record;
begin
  select * into v_res from public.reserve_repository_analysis(
    null, 104, 'acme/dc', 'sha-dc', 'fin-dc', 'prompt-v1'
  );
  if v_res.analysis_id is null then
    raise exception 'disconnect reserve returned null analysis_id';
  end if;
  insert into tests_fixture values ('a_dc', v_res.analysis_id);
  insert into tests_results values ('FINALIZE_disconnect_reserve', true, 'ok');
exception when others then
  insert into tests_results values ('FINALIZE_disconnect_reserve', false, sqlerrm);
  raise;
end $$;
reset role;

set local role postgres;
do $$
declare
  v_id uuid := (select id from tests_fixture where key = 'a_dc');
  v_lease record;
begin
  if v_id is null then
    raise exception 'disconnect analysis fixture missing';
  end if;
  select * into v_lease from public.acquire_repository_analysis_lease(v_id, 'worker-d', 90);
  if v_lease.attempt_id is null then
    raise exception 'disconnect lease returned null attempt';
  end if;
exception when others then
  insert into tests_results values ('FINALIZE_disconnect_reserve', false, sqlerrm)
  on conflict (finding) do update set passed = false, note = excluded.note;
  raise;
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'c';
do $$
begin
  perform public.disconnect_github_connection();
end $$;
reset role;

set local role postgres;
do $$
declare
  v_proj uuid;
  v_denied boolean := false;
  v_id uuid := (select id from tests_fixture where key = 'a_dc');
begin
  begin
    v_proj := public.finalize_repository_analysis(
      v_id,
      (select attempt_id from public.repository_analyses where id = v_id),
      'worker-d',
      (select n from tests_ints where key = 'epoch'),
      'succeeded',
      '{"title":"After dc","summary":"","description":"","technologies":[],"keyFeatures":[]}'::jsonb
    );
  exception when others then
    if sqlerrm in ('github connection inactive', 'invalid input', 'stale analysis attempt') then
      v_denied := true;
    else
      raise;
    end if;
  end;
  if not v_denied or exists (
    select 1 from public.portfolio_projects where source_analysis_id = v_id
  ) then
    raise exception 'disconnect finalize materialized a project';
  end if;
  insert into tests_results values ('FINALIZE_disconnect_no_project', true, 'ok');
exception when others then
  insert into tests_results values ('FINALIZE_disconnect_no_project', false, sqlerrm);
end $$;
reset role;

-- Reconnect for snapshot tests.
set local role postgres;
do $$
declare
  v_c uuid := (select id from tests_fixture where key = 'c');
  v_conn uuid;
begin
  v_conn := public.upsert_github_connection(v_c, 7777, 'fin_c');
  update tests_fixture set id = v_conn where key = 'conn';
  update tests_ints set n = (
    select epoch from public.github_connections where id = v_conn
  ) where key = 'epoch';
end $$;
reset role;

set local role postgres;
do $$
declare
  v_from date := tests.official_from();
  v_to date := tests.official_to();
  v_conn uuid := (select id from tests_fixture where key = 'conn');
  v_epoch int := (select n from tests_ints where key = 'epoch');
  v_days jsonb;
  v_wrote int;
  v_prior int;
  v_denied boolean := false;
  v_hit date := v_from + 10;
begin
  -- oversized array rejected before unnest
  v_denied := false;
  begin
    perform public.replace_github_contribution_snapshot(
      v_conn, v_epoch, (select jsonb_agg(0) from generate_series(1, 400)), v_from, v_to
    );
  exception when others then
    if sqlerrm = 'invalid input' then v_denied := true; else raise; end if;
  end;
  if not v_denied then
    raise exception 'oversized snapshot accepted';
  end if;

  -- invalid range (not official window)
  v_denied := false;
  begin
    perform public.replace_github_contribution_snapshot(
      v_conn, v_epoch, tests.full_days(v_from, v_to), v_from + 1, v_to
    );
  exception when others then
    if sqlerrm = 'invalid input' then v_denied := true; else raise; end if;
  end;
  if not v_denied then
    raise exception 'non-official range accepted';
  end if;

  -- partial
  v_denied := false;
  begin
    perform public.replace_github_contribution_snapshot(
      v_conn, v_epoch,
      jsonb_build_array(jsonb_build_object('date', to_char(v_from, 'YYYY-MM-DD'), 'count', 1, 'level', 1)),
      v_from, v_to
    );
  exception when others then
    if sqlerrm = 'invalid input' then v_denied := true; else raise; end if;
  end;
  if not v_denied then
    raise exception 'partial snapshot accepted';
  end if;

  -- duplicate date (length 365, unique 364)
  v_denied := false;
  v_days := tests.full_days(v_from, v_to);
  v_days := v_days - 1;
  v_days := v_days || jsonb_build_array(v_days->0);
  begin
    perform public.replace_github_contribution_snapshot(v_conn, v_epoch, v_days, v_from, v_to);
  exception when others then
    if sqlerrm = 'invalid input' then v_denied := true; else raise; end if;
  end;
  if not v_denied then
    raise exception 'duplicate snapshot accepted';
  end if;

  -- epoch
  v_denied := false;
  begin
    perform public.replace_github_contribution_snapshot(
      v_conn, v_epoch + 9, tests.full_days(v_from, v_to), v_from, v_to
    );
  exception when others then
    if sqlerrm = 'stale connection epoch' then v_denied := true; else raise; end if;
  end;
  if not v_denied then
    raise exception 'stale epoch snapshot accepted';
  end if;

  if exists (select 1 from public.github_contribution_days where connection_id = v_conn) then
    raise exception 'failed snapshots wrote days';
  end if;
  insert into tests_results values ('SNAP_invalid_partial_dup_epoch', true, 'ok');

  v_wrote := public.replace_github_contribution_snapshot(
    v_conn, v_epoch, tests.full_days(v_from, v_to), v_from, v_to
  );
  if v_wrote <> 365 then
    raise exception 'full snapshot wrote %', v_wrote;
  end if;
  if (select count(*) from public.github_contribution_days where connection_id = v_conn) <> 365 then
    raise exception 'full snapshot row count mismatch';
  end if;
  insert into tests_results values ('SNAP_full_365', true, 'ok');

  v_prior := (select contribution_count from public.github_contribution_days
              where connection_id = v_conn and contribution_date = v_hit);
  v_wrote := public.replace_github_contribution_snapshot(
    v_conn, v_epoch, tests.full_days(v_from, v_to, v_hit, 7, 3), v_from, v_to
  );
  if (select contribution_count from public.github_contribution_days
      where connection_id = v_conn and contribution_date = v_hit) is distinct from 7 then
    raise exception 'same-day refresh did not update count (prior %)', v_prior;
  end if;
  if (select last_sync_error from public.github_connections where id = v_conn) is not null then
    raise exception 'snapshot left a sync error';
  end if;
  if (select sync_cursor from public.github_connections where id = v_conn) is not null then
    raise exception 'snapshot left a sync cursor';
  end if;
  insert into tests_results values ('SNAP_same_day_refresh', true, 'ok');

  v_denied := false;
  begin
    perform public.replace_github_contribution_snapshot(
      v_conn, v_epoch,
      tests.full_days(v_from, v_to) || jsonb_build_array(jsonb_build_object('date', 'nope', 'count', 1, 'level', 1)),
      v_from, v_to
    );
  exception when others then
    if sqlerrm = 'invalid input' then v_denied := true; else raise; end if;
  end;
  if not v_denied then
    raise exception 'malformed extra day accepted';
  end if;
  if (select contribution_count from public.github_contribution_days
      where connection_id = v_conn and contribution_date = v_hit) is distinct from 7 then
    raise exception 'malformed snapshot overwrote prior days';
  end if;
  insert into tests_results values ('SNAP_keeps_prior', true, 'ok');
exception when others then
  insert into tests_results values ('SNAP_invalid_partial_dup_epoch', false, sqlerrm)
  on conflict (finding) do update set passed = false, note = excluded.note;
  insert into tests_results values ('SNAP_full_365', false, sqlerrm)
  on conflict (finding) do update set passed = false, note = excluded.note;
  insert into tests_results values ('SNAP_same_day_refresh', false, sqlerrm)
  on conflict (finding) do update set passed = false, note = excluded.note;
  insert into tests_results values ('SNAP_keeps_prior', false, sqlerrm)
  on conflict (finding) do update set passed = false, note = excluded.note;
end $$;
reset role;

set local role postgres;
select finding, case when passed then 'PASS' else 'FAIL' end as result, note
from tests_results
order by finding;

do $$
declare v_failed int;
begin
  select count(*) into v_failed from tests_results where not passed;
  if v_failed > 0 then
    raise exception '% assertion(s) failed — see table above.', v_failed;
  end if;
end $$;

rollback;
