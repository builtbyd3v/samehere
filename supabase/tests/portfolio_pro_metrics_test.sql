-- Pro metrics / section-order / named-visitor retirement.
-- Requires 20260910100000 + 20260910120000. Disposable clone only.
-- Run: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/portfolio_pro_metrics_test.sql

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
create temporary table tests_results (finding text primary key, passed boolean not null, note text);
grant select, insert, update, delete on tests_fixture to authenticated, anon, service_role;
grant select, insert, update, delete on tests_results to authenticated, anon, service_role;

set local role postgres;
do $$
declare
  v_free uuid := gen_random_uuid();
  v_pro uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values
    ('00000000-0000-0000-0000-000000000000', v_free, 'authenticated', 'authenticated',
     'pm-free@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'pm_free'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_pro, 'authenticated', 'authenticated',
     'pm-pro@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'pm_pro'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_other, 'authenticated', 'authenticated',
     'pm-other@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'pm_other'), now(), now(), '', '', '', '');

  update public.profiles set username = 'pm_free', is_private = false, is_pro = false, pro_until = null where id = v_free;
  update public.profiles set username = 'pm_pro', is_private = false, is_pro = true, pro_until = null where id = v_pro;
  update public.profiles set username = 'pm_other', is_private = false, is_pro = true, pro_until = null where id = v_other;
  insert into tests_fixture values ('free', v_free), ('pro', v_pro), ('other', v_other);
end $$;

select tests.as_user(id) from tests_fixture where key = 'free';
do $$
declare
  v_free uuid := (select id from tests_fixture where key = 'free');
  v_denied boolean := false;
begin
  insert into public.portfolio_settings (owner_id) values (v_free);
  begin
    update public.portfolio_settings
      set section_order = array['projects','intro','activity','experience','education','posts']::text[]
    where owner_id = v_free;
  exception when others then
    if sqlerrm like '%section order requires pro%' then v_denied := true; else raise; end if;
  end;
  if not v_denied then
    raise exception 'free user wrote a custom section_order';
  end if;
  if (select section_order[1] from public.portfolio_settings where owner_id = v_free) <> 'intro' then
    raise exception 'free default section_order lost';
  end if;
  update public.portfolio_settings set publish_intro = true where owner_id = v_free;
  if not (select publish_intro from public.portfolio_settings where owner_id = v_free) then
    raise exception 'free publication flag edit failed';
  end if;
  insert into tests_results values ('ORDER_free_default_and_flags', true, 'ok');
exception when others then
  insert into tests_results values ('ORDER_free_default_and_flags', false, sqlerrm);
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'pro';
do $$
declare
  v_pro uuid := (select id from tests_fixture where key = 'pro');
  v_custom text[] := array['projects','intro','activity','posts','education','experience']::text[];
  v_row text[];
begin
  insert into public.portfolio_settings (owner_id, section_order, publish_projects)
  values (v_pro, v_custom, true);
  select section_order into v_row from public.portfolio_settings where owner_id = v_pro;
  if v_row is distinct from v_custom then
    raise exception 'pro custom section_order not saved';
  end if;
  insert into tests_results values ('ORDER_pro_custom_insert', true, 'ok');
exception when others then
  insert into tests_results values ('ORDER_pro_custom_insert', false, sqlerrm);
end $$;
reset role;

set local role postgres;
do $$
declare
  v_pro uuid := (select id from tests_fixture where key = 'pro');
  v_public text[];
  v_saved text[];
begin
  update public.profiles set is_pro = true, pro_until = now() - interval '1 day' where id = v_pro;
  select section_order into v_saved from public.portfolio_settings where owner_id = v_pro;
  if v_saved[1] <> 'projects' then
    raise exception 'saved custom order wiped on expiry';
  end if;
  select section_order into v_public from public.get_public_portfolio('pm_pro');
  if v_public[1] <> 'intro' then
    raise exception 'expired public order did not fall back to canonical: %', v_public;
  end if;
  insert into tests_results values ('ORDER_expired_render_fallback', true, 'ok');
exception when others then
  insert into tests_results values ('ORDER_expired_render_fallback', false, sqlerrm);
end $$;

select tests.as_user(id) from tests_fixture where key = 'pro';
do $$
declare
  v_pro uuid := (select id from tests_fixture where key = 'pro');
  v_denied boolean := false;
begin
  update public.portfolio_settings set publish_intro = true where owner_id = v_pro;
  if (select section_order[1] from public.portfolio_settings where owner_id = v_pro) <> 'projects' then
    raise exception 'flag edit dropped saved order after expiry';
  end if;
  begin
    update public.portfolio_settings
      set section_order = array['posts','intro','projects','activity','experience','education']::text[]
    where owner_id = v_pro;
  exception when others then
    if sqlerrm like '%section order requires pro%' then v_denied := true; else raise; end if;
  end;
  if not v_denied then
    raise exception 'expired pro changed section_order';
  end if;
  insert into tests_results values ('ORDER_expired_flags_keep_saved', true, 'ok');
exception when others then
  insert into tests_results values ('ORDER_expired_flags_keep_saved', false, sqlerrm);
end $$;
reset role;

set local role postgres;
do $$
declare
  v_pro uuid := (select id from tests_fixture where key = 'pro');
  v_public text[];
begin
  update public.profiles set is_pro = true, pro_until = null where id = v_pro;
  select section_order into v_public from public.get_public_portfolio('pm_pro');
  if v_public[1] <> 'projects' then
    raise exception 'renewal did not restore saved order: %', v_public;
  end if;
  insert into tests_results values ('ORDER_renewal_restores', true, 'ok');
exception when others then
  insert into tests_results values ('ORDER_renewal_restores', false, sqlerrm);
end $$;

set local role postgres;
do $$
declare
  v_pro uuid := (select id from tests_fixture where key = 'pro');
begin
  insert into public.portfolio_daily_metrics (owner_id, project_id, metric_date, view_count)
  values (v_pro, null, (timezone('UTC', now()))::date, 3);
end $$;

select tests.as_user(id) from tests_fixture where key = 'pro';
do $$
declare
  v_pro uuid := (select id from tests_fixture where key = 'pro');
  v_cnt int;
begin
  select count(*) into v_cnt from public.portfolio_daily_metrics where owner_id = v_pro;
  if v_cnt <> 1 then
    raise exception 'current pro could not select own metrics: %', v_cnt;
  end if;
  insert into tests_results values ('METRIC_pro_owner_select', true, 'ok');
exception when others then
  insert into tests_results values ('METRIC_pro_owner_select', false, sqlerrm);
end $$;

do $$
declare
  v_pro uuid := (select id from tests_fixture where key = 'pro');
  v_denied boolean := false;
begin
  begin
    insert into public.portfolio_daily_metrics (owner_id, project_id, metric_date, view_count)
    values (v_pro, null, (timezone('UTC', now()))::date + 1, 1);
  exception
    when insufficient_privilege then
      v_denied := true;
  end;
  if not v_denied then
    raise exception 'authenticated inserted portfolio_daily_metrics';
  end if;
  insert into tests_results values ('METRIC_client_insert_denied', true, 'ok');
exception when others then
  insert into tests_results values ('METRIC_client_insert_denied', false, sqlerrm);
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'other';
do $$
declare
  v_cnt int;
begin
  select count(*) into v_cnt
  from public.portfolio_daily_metrics
  where owner_id = (select id from tests_fixture where key = 'pro');
  if v_cnt <> 0 then
    raise exception 'cross-owner saw metrics: %', v_cnt;
  end if;
  insert into tests_results values ('METRIC_cross_owner_denied', true, 'ok');
exception when others then
  insert into tests_results values ('METRIC_cross_owner_denied', false, sqlerrm);
end $$;
reset role;

select tests.as_anon();
do $$
begin
  perform 1 from public.portfolio_daily_metrics;
  insert into tests_results values ('METRIC_anon_denied', false, 'anon selected metrics');
exception
  when insufficient_privilege then
    insert into tests_results values ('METRIC_anon_denied', true, 'ok');
  when others then
    insert into tests_results values ('METRIC_anon_denied', false, sqlerrm);
end $$;
reset role;

set local role postgres;
do $$
declare
  v_pro uuid := (select id from tests_fixture where key = 'pro');
  v_cnt int;
begin
  update public.profiles set is_pro = true, pro_until = now() - interval '1 day' where id = v_pro;
end $$;

select tests.as_user(id) from tests_fixture where key = 'pro';
do $$
declare
  v_cnt int;
begin
  select count(*) into v_cnt from public.portfolio_daily_metrics;
  if v_cnt <> 0 then
    raise exception 'expired pro selected metrics: %', v_cnt;
  end if;
  insert into tests_results values ('METRIC_expired_select_denied', true, 'ok');
exception when others then
  insert into tests_results values ('METRIC_expired_select_denied', false, sqlerrm);
end $$;
reset role;

set local role postgres;
update public.profiles set is_pro = true, pro_until = null where id = (select id from tests_fixture where key = 'pro');

select tests.as_user(id) from tests_fixture where key = 'free';
do $$
declare
  v_denied boolean := false;
begin
  begin
    perform public.record_profile_view((select id from tests_fixture where key = 'pro'));
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'authenticated executed record_profile_view';
  end if;
  v_denied := false;
  begin
    perform public.get_profile_views((select id from tests_fixture where key = 'free'));
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'authenticated executed get_profile_views';
  end if;
  insert into tests_results values ('VIEW_rpc_client_denied', true, 'ok');
exception when others then
  insert into tests_results values ('VIEW_rpc_client_denied', false, sqlerrm);
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'free';
do $$
declare
  v_denied boolean := false;
begin
  begin
    perform public.record_portfolio_daily_metric_once(
      (select id from tests_fixture where key = 'pro'), null, 'view', null, repeat('a', 64)
    );
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'authenticated executed record_portfolio_daily_metric_once';
  end if;
  insert into tests_results values ('ONCE_client_denied', true, 'ok');
exception when others then
  insert into tests_results values ('ONCE_client_denied', false, sqlerrm);
end $$;
reset role;

select tests.as_service();
do $$
declare
  v_pro uuid := (select id from tests_fixture where key = 'pro');
  v_free uuid := (select id from tests_fixture where key = 'free');
  v_proj uuid;
  v_hash text := repeat('b', 64);
  v_ok boolean;
  v_before int;
  v_views int;
  v_expired_left int;
begin
  insert into public.portfolio_projects (owner_id, title, personal_role, status)
  values (v_pro, 'Pub', 'I built it', 'published')
  returning id into v_proj;

  select coalesce((
    select view_count
    from public.portfolio_daily_metrics
    where owner_id = v_pro
      and project_id is null
      and metric_date = (timezone('UTC', now()))::date
  ), 0) into v_before;

  v_ok := public.record_portfolio_daily_metric_once(v_pro, null, 'view', v_free, v_hash);
  if not v_ok then raise exception 'first public view rejected'; end if;
  select view_count into v_views
  from public.portfolio_daily_metrics
  where owner_id = v_pro
    and project_id is null
    and metric_date = (timezone('UTC', now()))::date;
  if v_views <> v_before + 1 then
    raise exception 'first view count % wanted %', v_views, v_before + 1;
  end if;

  v_ok := public.record_portfolio_daily_metric_once(v_pro, null, 'view', v_free, v_hash);
  if v_ok then raise exception 'duplicate view incremented'; end if;
  select view_count into v_views
  from public.portfolio_daily_metrics
  where owner_id = v_pro
    and project_id is null
    and metric_date = (timezone('UTC', now()))::date;
  if v_views <> v_before + 1 then
    raise exception 'duplicate view count %', v_views;
  end if;

  v_ok := public.record_portfolio_daily_metric_once(v_pro, v_proj, 'click', v_pro, repeat('c', 64));
  if v_ok then raise exception 'owner click incremented'; end if;

  update public.profiles set is_private = true where id = v_free;
  v_ok := public.record_portfolio_daily_metric_once(v_free, null, 'view', v_pro, repeat('d', 64));
  if v_ok then raise exception 'private profile view incremented'; end if;

  insert into private.portfolio_metric_receipts (
    session_hash, owner_id, project_id, kind, metric_date, expires_at
  ) values (
    repeat('e', 64), v_pro, null, 'view', (timezone('UTC', now()))::date - 3,
    now() - interval '1 hour'
  );
  perform public.record_portfolio_daily_metric_once(v_pro, null, 'view', v_free, repeat('f', 64));
  select count(*) into v_expired_left
  from private.portfolio_metric_receipts
  where expires_at < now();
  if v_expired_left <> 0 then
    raise exception 'expired receipts from other sessions remained: %', v_expired_left;
  end if;

  insert into tests_results values ('ONCE_dedup_visibility_cleanup', true, 'ok');
exception when others then
  insert into tests_results values ('ONCE_dedup_visibility_cleanup', false, sqlerrm);
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
