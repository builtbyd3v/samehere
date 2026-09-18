-- Portfolio / analysis contract tests.
-- Requires 20260910100000_portfolio_data_contracts.sql applied.
-- Harness apply/run lives in supabase/tests/local-portfolio-harness (other worker).
-- Run: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/portfolio_data_test.sql
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

create or replace function tests.as_service() returns void language sql as $$
  select set_config('role', 'service_role', true),
         set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
$$;

grant execute on function tests.as_user(uuid) to authenticated, anon, service_role;
grant execute on function tests.as_anon() to authenticated, anon, service_role;
grant execute on function tests.as_service() to authenticated, anon, service_role;

create temporary table tests_fixture (key text primary key, id uuid not null);
create temporary table tests_ints (key text primary key, n int not null);
create temporary table tests_results (finding text primary key, passed boolean not null, note text);
grant select, insert, update, delete on tests_fixture to authenticated, anon, service_role;
grant select, insert, update, delete on tests_ints to authenticated, anon, service_role;
grant select, insert, update, delete on tests_results to authenticated, anon, service_role;

do $$
declare
  v_caps record;
begin
  select * into v_caps from public.portfolio_analysis_caps();
  if v_caps.month_timezone <> 'UTC'
     or v_caps.free_success_per_month <> 1
     or v_caps.pro_success_per_month <> 10
     or v_caps.free_attempts_per_day <> 8
     or v_caps.pro_attempts_per_day <> 24
     or v_caps.lease_seconds <> 90
     or v_caps.queued_seconds <> 120 then
    raise exception 'portfolio_analysis_caps mismatch: %', v_caps;
  end if;
  insert into tests_results values ('CAPS_match', true, 'ok');
exception when others then
  insert into tests_results values ('CAPS_match', false, sqlerrm);
end $$;

do $$
declare
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
  v_c uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values
    ('00000000-0000-0000-0000-000000000000', v_a, 'authenticated', 'authenticated',
     'pf-a@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'pf_test_a'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_b, 'authenticated', 'authenticated',
     'pf-b@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'pf_test_b'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_c, 'authenticated', 'authenticated',
     'pf-c@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'pf_test_c'), now(), now(), '', '', '', '');

  update public.profiles set is_private = true, username = 'pf_test_a' where id = v_a;
  update public.profiles set username = 'pf_test_b' where id = v_b;
  update public.profiles set username = 'pf_test_c', is_private = false where id = v_c;

  insert into tests_fixture (key, id) values ('a', v_a), ('b', v_b), ('c', v_c);
end $$;

-- PORT_owner_project
select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare
  v_c uuid := (select id from tests_fixture where key = 'c');
  v_id uuid;
begin
  insert into public.portfolio_projects (owner_id, title, personal_role, status)
  values (v_c, 'Draft bus', 'I wrote the parser', 'draft')
  returning id into v_id;
  insert into tests_fixture values ('proj_draft', v_id);
  if not exists (select 1 from public.portfolio_projects where id = v_id) then
    raise exception 'owner cannot select own draft';
  end if;
  insert into tests_results values ('PORT_owner_project', true, 'ok');
exception when others then
  insert into tests_results values ('PORT_owner_project', false, sqlerrm);
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'b';
do $$
begin
  if exists (
    select 1 from public.portfolio_projects
    where id = (select id from tests_fixture where key = 'proj_draft')
  ) then
    raise exception 'other user selected unpublished draft';
  end if;
  insert into tests_results values ('PORT_other_draft_denied', true, 'ok');
exception when others then
  insert into tests_results values ('PORT_other_draft_denied', false, sqlerrm);
end $$;
reset role;

-- PORT_anon_table_denied — revoke is 42501, not an empty set.
select tests.as_anon();
do $$
begin
  perform 1 from public.portfolio_projects;
  insert into tests_results values ('PORT_anon_table_denied', false, 'anon selected portfolio_projects');
exception
  when insufficient_privilege then
    insert into tests_results values ('PORT_anon_table_denied', true, 'ok');
  when others then
    insert into tests_results values ('PORT_anon_table_denied', false, sqlerrm);
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare
  v_c uuid := (select id from tests_fixture where key = 'c');
  v_id uuid;
begin
  insert into public.portfolio_settings (owner_id, publish_projects, publish_activity)
  values (v_c, true, true);
  insert into public.portfolio_projects (owner_id, title, personal_role, status, sort_order)
  values (v_c, 'Public bus', 'I wrote the parser', 'published', 1)
  returning id into v_id;
  insert into tests_fixture values ('proj_pub', v_id);
  insert into tests_results values ('PORT_publish_setup', true, 'ok');
exception when others then
  insert into tests_results values ('PORT_publish_setup', false, sqlerrm);
end $$;
reset role;

select tests.as_anon();
do $$
begin
  if not exists (
    select 1 from public.get_public_portfolio_projects('pf_test_c')
    where title = 'Public bus'
  ) then
    raise exception 'anon public RPC missed published project';
  end if;
  if exists (
    select 1 from public.get_public_portfolio_projects('pf_test_c')
    where title = 'Draft bus'
  ) then
    raise exception 'anon public RPC leaked draft';
  end if;
  insert into tests_results values ('PORT_anon_public_rpc', true, 'ok');
exception when others then
  insert into tests_results values ('PORT_anon_public_rpc', false, sqlerrm);
end $$;
reset role;

-- Direct table is owner-only even when published.
select tests.as_user(id) from tests_fixture where key = 'b';
do $$
begin
  if exists (
    select 1 from public.portfolio_projects
    where id = (select id from tests_fixture where key = 'proj_pub')
  ) then
    raise exception 'other user selected published project from table';
  end if;
  if not exists (
    select 1 from public.get_public_portfolio_projects('pf_test_c')
    where title = 'Public bus'
  ) then
    raise exception 'other user RPC missed published project';
  end if;
  insert into tests_results values ('PORT_other_table_owner_only', true, 'ok');
exception when others then
  insert into tests_results values ('PORT_other_table_owner_only', false, sqlerrm);
end $$;
reset role;

set local role postgres;
do $$
begin
  insert into public.portfolio_settings (owner_id, publish_activity)
  values ((select id from tests_fixture where key = 'b'), true);
end $$;
reset role;

select tests.as_anon();
do $$
declare
  v_visible boolean;
begin
  select activity_visible into v_visible from public.get_public_portfolio('pf_test_b');
  if v_visible is not true then
    raise exception 'public publish_activity with no GitHub hid activity section';
  end if;
  if exists (select 1 from public.get_public_github_contributions('pf_test_b')) then
    raise exception 'no-GitHub owner leaked contribution rows';
  end if;
  insert into tests_results values ('PORT_activity_visible_no_github', true, 'ok');
exception when others then
  insert into tests_results values ('PORT_activity_visible_no_github', false, sqlerrm);
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'a';
do $$
declare
  v_a uuid := (select id from tests_fixture where key = 'a');
begin
  insert into public.portfolio_settings (owner_id, publish_projects) values (v_a, true);
  insert into public.portfolio_projects (owner_id, title, personal_role, status)
  values (v_a, 'Secret app', 'I built it', 'published');
  insert into tests_results values ('PORT_private_setup', true, 'ok');
exception when others then
  insert into tests_results values ('PORT_private_setup', false, sqlerrm);
end $$;
reset role;

select tests.as_anon();
do $$
declare
  v_publish boolean;
  v_index boolean;
begin
  if exists (select 1 from public.get_public_portfolio_projects('pf_test_a')) then
    raise exception 'private account leaked published project';
  end if;
  select publish_projects, allow_indexing into v_publish, v_index
  from public.get_public_portfolio('pf_test_a');
  if coalesce(v_publish, false) or coalesce(v_index, false) then
    raise exception 'private account advertised public sections';
  end if;
  insert into tests_results values ('PORT_private_hides', true, 'ok');
exception when others then
  insert into tests_results values ('PORT_private_hides', false, sqlerrm);
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare
  v_c uuid := (select id from tests_fixture where key = 'c');
  v_post uuid;
begin
  update public.profiles set open_to = array['collaborate','study'] where id = v_c;
  insert into public.posts (user_id, content, context_label)
  values (v_c, 'building a heatmap with friends on campus tonight', 'building')
  returning id into v_post;
  insert into tests_fixture values ('post_c', v_post);
  update public.posts set context_label = 'stuck' where id = v_post;
  begin
    update public.posts set content = 'hacked' where id = v_post;
  exception when others then
    null;
  end;
  if exists (select 1 from public.posts where id = v_post and content = 'hacked') then
    raise exception 'post content mutated through label update';
  end if;
  if not exists (select 1 from public.posts where id = v_post and context_label = 'stuck') then
    raise exception 'context_label did not stick';
  end if;
  insert into tests_results values ('PORT_label_and_open_to', true, 'ok');
exception when others then
  insert into tests_results values ('PORT_label_and_open_to', false, sqlerrm);
end $$;
reset role;

-- PROFILE_blocked / POST_blocked
select tests.as_user(id) from tests_fixture where key = 'b';
do $$
declare
  v_c uuid := (select id from tests_fixture where key = 'c');
begin
  perform public.block_user(v_c);
  if exists (select 1 from public.get_public_portfolio_projects('pf_test_c')) then
    raise exception 'blocked viewer read public projects';
  end if;
  if exists (select 1 from public.get_public_profile('pf_test_c')) then
    raise exception 'blocked viewer read public profile';
  end if;
  if exists (
    select 1 from public.get_public_post((select id from tests_fixture where key = 'post_c'))
  ) then
    raise exception 'blocked viewer read public post';
  end if;
  insert into tests_results values ('PORT_blocked', true, 'ok');
exception when others then
  insert into tests_results values ('PORT_blocked', false, sqlerrm);
end $$;
reset role;

set local role postgres;
do $$
begin
  delete from public.blocks
  where blocker_id = (select id from tests_fixture where key = 'b')
    and blocked_id = (select id from tests_fixture where key = 'c');
  update public.profiles set is_suspended = true
  where id = (select id from tests_fixture where key = 'c');
end $$;
reset role;

select tests.as_anon();
do $$
declare
  v_open text[];
  v_bio text;
begin
  if exists (select 1 from public.get_public_portfolio_projects('pf_test_c')) then
    raise exception 'suspended owner still publicly listed';
  end if;
  if exists (
    select 1 from public.get_public_post((select id from tests_fixture where key = 'post_c'))
  ) then
    raise exception 'suspended author post leaked';
  end if;
  select open_to, bio into v_open, v_bio from public.get_public_profile('pf_test_c');
  if not found then
    raise exception 'suspended profile lost identity row';
  end if;
  if v_open is not null or v_bio is not null then
    raise exception 'suspended profile leaked content';
  end if;
  if exists (
    select 1 from public.get_public_profile('pf_test_c')
    where study_mode is not null
  ) then
    raise exception 'suspended profile leaked study_mode';
  end if;
  insert into tests_results values ('PORT_suspended', true, 'ok');
exception when others then
  insert into tests_results values ('PORT_suspended', false, sqlerrm);
end $$;
reset role;

set local role postgres;
do $$
begin
  update public.profiles set is_suspended = false
  where id = (select id from tests_fixture where key = 'c');
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare
  v_b uuid := (select id from tests_fixture where key = 'b');
  v_denied boolean := false;
begin
  begin
    update public.portfolio_projects
    set owner_id = v_b
    where id = (select id from tests_fixture where key = 'proj_pub');
  exception when others then
    v_denied := true;
  end;
  if not v_denied and exists (
    select 1 from public.portfolio_projects
    where id = (select id from tests_fixture where key = 'proj_pub') and owner_id = v_b
  ) then
    raise exception 'owner_id rewrite succeeded';
  end if;
  insert into tests_results values ('PORT_owner_rewrite_denied', true, 'ok');
exception when others then
  insert into tests_results values ('PORT_owner_rewrite_denied', false, sqlerrm);
end $$;
reset role;

-- CRED_client_denied — public wrappers, not private schema.
select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare
  v_denied boolean := false;
begin
  begin
    perform public.get_github_credentials(gen_random_uuid());
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'authenticated executed get_github_credentials';
  end if;
  v_denied := false;
  begin
    perform public.upsert_github_connection(
      (select id from tests_fixture where key = 'c'), 1, 'octocat'
    );
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'authenticated executed upsert_github_connection';
  end if;
  insert into tests_results values ('CRED_client_denied', true, 'ok');
exception when others then
  insert into tests_results values ('CRED_client_denied', false, sqlerrm);
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare
  v_denied boolean := false;
begin
  begin
    perform public.increment_portfolio_daily_metric(
      (select id from tests_fixture where key = 'c'), null, 'view', null
    );
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'authenticated executed increment_portfolio_daily_metric';
  end if;
  insert into tests_results values ('METRIC_client_denied', true, 'ok');
exception when others then
  insert into tests_results values ('METRIC_client_denied', false, sqlerrm);
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'b';
do $$
declare
  v_denied boolean := false;
  v_owner uuid := (select id from tests_fixture where key = 'c');
  v_viewer uuid := (select id from tests_fixture where key = 'a');
begin
  begin
    perform public.portfolio_publicly_readable_to(v_owner, v_viewer);
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'authenticated executed portfolio_publicly_readable_to';
  end if;
  if not public.portfolio_publicly_readable(v_owner) then
    raise exception 'auth-bound portfolio_publicly_readable denied a public owner';
  end if;
  insert into tests_results values ('READABLE_to_client_denied', true, 'ok');
exception when others then
  insert into tests_results values ('READABLE_to_client_denied', false, sqlerrm);
end $$;
reset role;

set local role postgres;
do $$
declare
  v_c uuid := (select id from tests_fixture where key = 'c');
  v_conn uuid;
  v_tok text;
begin
  v_conn := public.upsert_github_connection(v_c, 4242, 'pf_c');
  insert into tests_fixture values ('conn_c', v_conn);
  insert into tests_ints values (
    'conn_epoch',
    (select epoch from public.github_connections where id = v_conn)
  );
  perform public.upsert_github_credentials(
    v_conn, v_c, 1, 'enc-access', 'enc-refresh', now() + interval '1 hour', 1
  );
  select access_token_encrypted into v_tok
  from public.get_github_credentials(v_conn);
  if v_tok is distinct from 'enc-access' then
    raise exception 'service get_github_credentials missed token';
  end if;
  insert into tests_results values ('CRED_service_upsert', true, 'ok');
exception when others then
  insert into tests_results values ('CRED_service_upsert', false, sqlerrm);
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'c';
do $$
begin
  perform 1 from private.github_credentials;
  insert into tests_results values ('CRED_table_denied', false, 'owner selected private.github_credentials');
exception
  when insufficient_privilege then
    insert into tests_results values ('CRED_table_denied', true, 'ok');
  when others then
    insert into tests_results values ('CRED_table_denied', false, sqlerrm);
end $$;
reset role;

-- Sequential one-active checks + RETRY_* (not multi-session).
-- Usage ledger has no client GRANT — stamp/read as postgres.
select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare
  v_first record;
  v_dup record;
  v_blocked boolean := false;
begin
  select * into v_first from public.reserve_repository_analysis(
    null, 99, 'acme/bus', 'abc123', 'req-1', 'prompt-v1'
  );
  insert into tests_fixture values ('analysis_1', v_first.analysis_id);

  begin
    perform public.reserve_repository_analysis(
      null, 100, 'acme/other', 'def456', 'req-2', 'prompt-v1'
    );
  exception when others then
    if sqlerrm = 'analysis already in progress' then
      v_blocked := true;
    else
      raise;
    end if;
  end;
  if not v_blocked then
    raise exception 'concurrent reserve did not fail';
  end if;

  select * into v_dup from public.reserve_repository_analysis(
    null, 99, 'acme/bus', 'abc123', 'req-1', 'prompt-v1'
  );
  if v_dup.analysis_id is distinct from v_first.analysis_id then
    raise exception 'duplicate request_key created a new analysis';
  end if;

  perform public.cancel_repository_analysis(v_first.analysis_id);
  insert into tests_results values ('QUOTA_in_progress_blocks_reserve', true, 'ok');
exception when others then
  insert into tests_results values ('QUOTA_in_progress_blocks_reserve', false, sqlerrm);
end $$;
reset role;

set local role postgres;
do $$
begin
  update public.repository_analysis_usage
  set token_input = 11, token_output = 3, estimated_cost_usd = 0.05
  where analysis_id = (select id from tests_fixture where key = 'analysis_1');
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare
  v_retry record;
  v_retry2 record;
  v_blocked boolean := false;
  v_rows int;
begin
  select * into v_retry from public.retry_repository_analysis(
    (select id from tests_fixture where key = 'analysis_1')
  );
  if v_retry.analysis_id = (select id from tests_fixture where key = 'analysis_1') then
    raise exception 'retry reused the same analysis uuid';
  end if;
  if v_retry.request_key not like '%#retry#%' then
    raise exception 'retry request_key missing #retry# marker';
  end if;
  insert into tests_fixture values ('analysis_retry', v_retry.analysis_id);

  if not exists (
    select 1 from public.repository_analyses
    where id = v_retry.analysis_id
      and parent_analysis_id = (select id from tests_fixture where key = 'analysis_1')
  ) then
    raise exception 'retry missing parent_analysis_id';
  end if;

  begin
    perform public.reserve_repository_analysis(
      null, 101, 'acme/conc', 'sha-c', 'req-conc', 'prompt-v1'
    );
  exception when others then
    if sqlerrm = 'analysis already in progress' then
      v_blocked := true;
    else
      raise;
    end if;
  end;
  if not v_blocked then
    raise exception 'retry plus reserve concurrency passed';
  end if;

  perform public.cancel_repository_analysis(v_retry.analysis_id);
  select * into v_retry2 from public.retry_repository_analysis(v_retry.analysis_id);
  if v_retry2.analysis_id in (
    (select id from tests_fixture where key = 'analysis_1'),
    v_retry.analysis_id
  ) then
    raise exception 'second retry reused a prior uuid';
  end if;
  insert into tests_fixture values ('analysis_retry2', v_retry2.analysis_id);

  select count(*) into v_rows
  from public.repository_analyses
  where owner_id = (select id from tests_fixture where key = 'c');
  if v_rows < 3 then
    raise exception 'retries did not persist separate attempt rows';
  end if;

  insert into tests_results values ('RETRY_new_row', true, 'ok');
  insert into tests_results values ('RETRY_in_progress_blocks_reserve', true, 'ok');
exception when others then
  insert into tests_results values ('RETRY_new_row', false, sqlerrm)
  on conflict (finding) do update set passed = false, note = excluded.note;
  insert into tests_results values ('RETRY_in_progress_blocks_reserve', false, sqlerrm)
  on conflict (finding) do update set passed = false, note = excluded.note;
end $$;
reset role;

set local role postgres;
do $$
declare
  v_old_cost numeric;
begin
  select estimated_cost_usd into v_old_cost
  from public.repository_analysis_usage
  where analysis_id = (select id from tests_fixture where key = 'analysis_1');
  if v_old_cost is distinct from 0.05 then
    raise exception 'retry overwrote prior cost ledger';
  end if;
  insert into tests_results values ('RETRY_costs_retained', true, 'ok');
exception when others then
  insert into tests_results values ('RETRY_costs_retained', false, sqlerrm);
end $$;
reset role;

-- LEASE: no takeover; old worker cannot write after expiry.
select tests.as_service();
do $$
declare
  v_id uuid := (select id from tests_fixture where key = 'analysis_retry2');
  v_lease record;
begin
  select * into v_lease from public.acquire_repository_analysis_lease(v_id, 'worker-a', 90);
  insert into tests_fixture values ('attempt_live', v_lease.attempt_id);
  insert into tests_results values ('LEASE_acquire', true, 'ok');
exception when others then
  insert into tests_results values ('LEASE_acquire', false, sqlerrm);
end $$;
reset role;

set local role postgres;
do $$
begin
  update public.repository_analyses
  set lease_expires_at = now() - interval '1 second'
  where id = (select id from tests_fixture where key = 'analysis_retry2');
end $$;
reset role;

select tests.as_service();
do $$
declare
  v_id uuid := (select id from tests_fixture where key = 'analysis_retry2');
  v_old uuid := (select id from tests_fixture where key = 'attempt_live');
  v_epoch int := (select n from tests_ints where key = 'conn_epoch');
  v_denied boolean := false;
begin
  begin
    perform public.acquire_repository_analysis_lease(v_id, 'worker-b', 90);
  exception when others then
    if sqlerrm = 'analysis lease expired' then
      v_denied := true;
    else
      raise;
    end if;
  end;
  if not v_denied then
    raise exception 'expired lease was reassigned';
  end if;

  v_denied := false;
  begin
    perform public.advance_repository_analysis_stage(
      v_id, v_old, 'worker-a', v_epoch, 'reading_repository'
    );
  exception when others then
    if sqlerrm = 'analysis lease expired' then
      v_denied := true;
    else
      raise;
    end if;
  end;
  if not v_denied then
    raise exception 'expired stage write succeeded';
  end if;

  v_denied := false;
  begin
    perform public.commit_repository_analysis(
      v_id, v_old, 'worker-a', v_epoch, 'failed',
      null, null, null, 'late', 'test', 'prompt-v1', 1, 1, 0.01
    );
  exception when others then
    if sqlerrm = 'analysis lease expired' then
      v_denied := true;
    else
      raise;
    end if;
  end;
  if not v_denied then
    raise exception 'expired worker commit succeeded';
  end if;

  insert into tests_results values ('LEASE_no_takeover', true, 'ok');
  insert into tests_results values ('STAGE_expired', true, 'ok');
exception when others then
  insert into tests_results values ('LEASE_no_takeover', false, sqlerrm)
  on conflict (finding) do update set passed = false, note = excluded.note;
  insert into tests_results values ('STAGE_expired', false, sqlerrm)
  on conflict (finding) do update set passed = false, note = excluded.note;
end $$;
reset role;

-- Cancel the expired in-flight row, then queued-deadline retry.
select tests.as_user(id) from tests_fixture where key = 'c';
do $$
begin
  perform public.cancel_repository_analysis(
    (select id from tests_fixture where key = 'analysis_retry2')
  );
  insert into tests_results values ('LEASE_cancel_setup', true, 'ok');
exception when others then
  insert into tests_results values ('LEASE_cancel_setup', false, sqlerrm);
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare
  v_q record;
begin
  select * into v_q from public.reserve_repository_analysis(
    null, 70, 'acme/queued', 'sha-q', 'req-queued', 'prompt-v1'
  );
  insert into tests_fixture values ('analysis_queued', v_q.analysis_id);
  insert into tests_results values ('QUEUED_reserve', true, 'ok');
exception when others then
  insert into tests_results values ('QUEUED_reserve', false, sqlerrm);
end $$;
reset role;

set local role postgres;
do $$
begin
  update public.repository_analyses
  set lease_expires_at = now() - interval '1 second'
  where id = (select id from tests_fixture where key = 'analysis_queued');
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare
  v_r record;
  v_old uuid := (select id from tests_fixture where key = 'analysis_queued');
begin
  select * into v_r from public.retry_repository_analysis(v_old);
  if v_r.analysis_id = v_old then
    raise exception 'queued-expiry retry reused uuid';
  end if;
  insert into tests_fixture values ('analysis_queued_retry', v_r.analysis_id);
  insert into tests_results values ('QUEUED_expiry_retry', true, 'ok');
exception when others then
  insert into tests_results values ('QUEUED_expiry_retry', false, sqlerrm);
end $$;
reset role;

-- COMMIT_duplicate_terminal + late failure
select tests.as_service();
do $$
declare
  v_id uuid := (select id from tests_fixture where key = 'analysis_queued_retry');
  v_lease record;
  v_epoch int := (select n from tests_ints where key = 'conn_epoch');
  v_denied boolean := false;
begin
  select * into v_lease from public.acquire_repository_analysis_lease(v_id, 'worker-term', 90);
  perform public.commit_repository_analysis(
    v_id, v_lease.attempt_id, 'worker-term', v_epoch, 'succeeded',
    '{"title":"ok","summary":"","description":"","technologies":[],"keyFeatures":[],"uncertaintyNotes":[],"evidence":[]}'::jsonb,
    null, null, null, 'test', 'prompt-v1', 10, 4, 0.02
  );
  begin
    perform public.commit_repository_analysis(
      v_id, v_lease.attempt_id, 'worker-term', v_epoch, 'succeeded',
      '{"title":"again"}'::jsonb, null, null, null, 'test', 'prompt-v1', 1, 1, 0.01
    );
  exception when others then
    if sqlerrm = 'invalid input' then
      v_denied := true;
    else
      raise;
    end if;
  end;
  if not v_denied then
    raise exception 'duplicate success commit accepted';
  end if;
  v_denied := false;
  begin
    perform public.commit_repository_analysis(
      v_id, v_lease.attempt_id, 'worker-term', v_epoch, 'failed',
      null, null, null, 'late', 'test', 'prompt-v1', 1, 1, 0.01
    );
  exception when others then
    if sqlerrm = 'invalid input' then
      v_denied := true;
    else
      raise;
    end if;
  end;
  if not v_denied then
    raise exception 'late failure after success accepted';
  end if;
  insert into tests_results values ('COMMIT_duplicate_terminal', true, 'ok');
  insert into tests_results values ('COMMIT_late_failure', true, 'ok');
exception when others then
  insert into tests_results values ('COMMIT_duplicate_terminal', false, sqlerrm)
  on conflict (finding) do update set passed = false, note = excluded.note;
  insert into tests_results values ('COMMIT_late_failure', false, sqlerrm)
  on conflict (finding) do update set passed = false, note = excluded.note;
end $$;
reset role;

-- RETRY_after_success_capped (free monthly success cap = 1)
select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare
  v_capped boolean := false;
begin
  begin
    perform public.retry_repository_analysis(
      (select id from tests_fixture where key = 'analysis_1')
    );
  exception when others then
    if sqlerrm = 'analysis quota exceeded' then
      v_capped := true;
    else
      raise;
    end if;
  end;
  if not v_capped then
    raise exception 'retry after monthly success was allowed';
  end if;
  insert into tests_results values ('RETRY_after_success_capped', true, 'ok');
exception when others then
  insert into tests_results values ('RETRY_after_success_capped', false, sqlerrm);
end $$;
reset role;

-- RETRY_cross_month — move prior success into last month, retry a cancelled row.
set local role postgres;
do $$
declare
  v_c uuid := (select id from tests_fixture where key = 'c');
  v_last date := (date_trunc('month', timezone('UTC', now())) - interval '1 month')::date;
begin
  update public.repository_analysis_usage
  set month = v_last
  where owner_id = v_c and counts_toward_success;
  update public.repository_analyses
  set created_at = v_last
  where id = (select id from tests_fixture where key = 'analysis_queued_retry');
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare
  v_r record;
begin
  select * into v_r from public.retry_repository_analysis(
    (select id from tests_fixture where key = 'analysis_1')
  );
  if v_r.analysis_id is null then
    raise exception 'cross-month retry failed';
  end if;
  insert into tests_fixture values ('analysis_cross_month', v_r.analysis_id);
  insert into tests_results values ('RETRY_cross_month', true, 'ok');
exception when others then
  insert into tests_results values ('RETRY_cross_month', false, sqlerrm);
end $$;
reset role;

set local role postgres;
do $$
begin
  if not exists (
    select 1 from public.repository_analysis_usage
    where analysis_id = (select id from tests_fixture where key = 'analysis_cross_month')
      and month = date_trunc('month', timezone('UTC', now()))::date
      and settlement = 'pending'
  ) then
    raise exception 'cross-month retry did not open a current-month ledger row';
  end if;
  update tests_results
  set passed = true, note = 'ok'
  where finding = 'RETRY_cross_month' and passed;
exception when others then
  insert into tests_results values ('RETRY_cross_month', false, sqlerrm)
  on conflict (finding) do update set passed = false, note = excluded.note;
end $$;
reset role;

-- EPOCH: contribution/status require matching epoch; disconnect keeps projects.
set local role postgres;
do $$
declare
  v_conn uuid := (select id from tests_fixture where key = 'conn_c');
  v_c uuid := (select id from tests_fixture where key = 'c');
  v_denied boolean := false;
  v_proj int;
begin
  begin
    perform public.upsert_github_contribution_day(v_conn, 99, current_date, 1, 1);
  exception when others then
    if sqlerrm = 'stale connection epoch' then
      v_denied := true;
    else
      raise;
    end if;
  end;
  if not v_denied then
    raise exception 'stale contribution epoch accepted';
  end if;
  perform public.upsert_github_contribution_day(v_conn, 1, current_date, 2, 1);

  perform tests.as_user(v_c);
  perform public.disconnect_github_connection();
  select count(*) into v_proj from public.portfolio_projects where owner_id = v_c;
  if v_proj < 1 then
    raise exception 'disconnect deleted owner projects';
  end if;

  perform set_config('role', 'postgres', true);
  v_conn := public.upsert_github_connection(v_c, 4242, 'pf_c');
  update tests_fixture set id = v_conn where key = 'conn_c';
  update tests_ints set n = (
    select epoch from public.github_connections where id = v_conn
  ) where key = 'conn_epoch';

  v_denied := false;
  begin
    perform public.upsert_github_contribution_day(v_conn, 1, current_date, 3, 1);
  exception when others then
    if sqlerrm = 'stale connection epoch' then
      v_denied := true;
    else
      raise;
    end if;
  end;
  if not v_denied then
    raise exception 'post-reconnect stale epoch write accepted';
  end if;
  perform public.upsert_github_contribution_day(
    v_conn, (select n from tests_ints where key = 'conn_epoch'), current_date, 3, 1
  );
  v_denied := false;
  begin
    perform public.mark_github_connection_status(v_conn, 1, 'reauthorization_needed', 'old');
  exception when others then
    if sqlerrm = 'stale connection epoch' then
      v_denied := true;
    else
      raise;
    end if;
  end;
  if not v_denied then
    raise exception 'stale status epoch accepted';
  end if;
  insert into tests_results values ('EPOCH_writes', true, 'ok');
  insert into tests_results values ('DISCONNECT_keeps_projects', true, 'ok');
exception when others then
  insert into tests_results values ('EPOCH_writes', false, sqlerrm)
  on conflict (finding) do update set passed = false, note = excluded.note;
  insert into tests_results values ('DISCONNECT_keeps_projects', false, sqlerrm)
  on conflict (finding) do update set passed = false, note = excluded.note;
end $$;
reset role;

-- Reauth connection cannot commit.
select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare
  v_res record;
begin
  begin
    perform public.cancel_repository_analysis(
      (select id from tests_fixture where key = 'analysis_cross_month')
    );
  exception when others then
    null;
  end;
  select * into v_res from public.reserve_repository_analysis(
    null, 88, 'acme/reauth', 'sha-re', 'req-reauth', 'prompt-v1'
  );
  insert into tests_fixture values ('analysis_reauth', v_res.analysis_id);
  insert into tests_fixture values ('attempt_reauth', v_res.attempt_id);
  insert into tests_results values ('EPOCH_reauth_setup', true, 'ok');
exception when others then
  insert into tests_results values ('EPOCH_reauth_setup', false, sqlerrm);
end $$;
reset role;

select tests.as_service();
do $$
declare
  v_id uuid := (select id from tests_fixture where key = 'analysis_reauth');
  v_lease record;
  v_epoch int := (select n from tests_ints where key = 'conn_epoch');
  v_denied boolean := false;
begin
  select * into v_lease from public.acquire_repository_analysis_lease(v_id, 'worker-re', 90);
  reset role;
  perform public.mark_github_connection_status(
    (select id from tests_fixture where key = 'conn_c'), v_epoch, 'reauthorization_needed', 'need refresh'
  );
  perform tests.as_service();
  begin
    perform public.heartbeat_repository_analysis_lease(
      v_id, v_lease.attempt_id, 'worker-re', 90
    );
  exception when others then
    if sqlerrm = 'github connection inactive' then
      v_denied := true;
    else
      raise;
    end if;
  end;
  if not v_denied then
    raise exception 'reauth connection accepted a heartbeat';
  end if;
  insert into tests_results values ('HEARTBEAT_reauth_denied', true, 'ok');

  v_denied := false;
  begin
    perform public.commit_repository_analysis(
      v_id, v_lease.attempt_id, 'worker-re', v_epoch, 'succeeded',
      '{"title":"no"}'::jsonb, null, null, null, 'test', 'prompt-v1', 1, 1, 0.01
    );
  exception when others then
    if sqlerrm = 'github connection inactive' then
      v_denied := true;
    else
      raise;
    end if;
  end;
  if not v_denied then
    raise exception 'reauth connection accepted a worker commit';
  end if;
  insert into tests_results values ('EPOCH_reauth_commit', true, 'ok');
exception when others then
  insert into tests_results values ('HEARTBEAT_reauth_denied', false, sqlerrm)
  on conflict (finding) do update set passed = false, note = excluded.note;
  insert into tests_results values ('EPOCH_reauth_commit', false, sqlerrm)
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
