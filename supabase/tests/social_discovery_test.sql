-- Social discovery + named-cron retirement tests.
-- Requires:
--   20260910100000_portfolio_data_contracts.sql
--   20260910110000_social_discovery_and_retirement.sql
-- Do not apply via current local-portfolio-harness/run.sh until that script
-- applies this migration AFTER the portfolio file (it currently folds later
-- timestamps into the pre-portfolio baseline loop).
-- Run (after both migrations, disposable DB only):
--   psql "$DISPOSABLE_DB" -v ON_ERROR_STOP=1 -f supabase/tests/social_discovery_test.sql
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

create temporary table tests_fixture (key text primary key, id uuid not null);
create temporary table tests_results (finding text primary key, passed boolean not null, note text);
grant select, insert, update, delete on tests_fixture to authenticated, anon, service_role;
grant select, insert, update, delete on tests_results to authenticated, anon, service_role;

-- SOC_tokens
do $$
begin
  if public.search_tokens('computer science') <> array['computer','science']::text[] then
    raise exception 'token split mismatch: %', public.search_tokens('computer science');
  end if;
  if public.search_tokens('a,b(c)*%') <> array['abc']::text[] then
    raise exception 'unsafe-char strip mismatch';
  end if;
  -- first 8 after empty-token filter (lib/search.ts tokensFor .slice(0, 8))
  if public.search_tokens('one two three four five six seven eight nine ten')
     <> array['one','two','three','four','five','six','seven','eight']::text[] then
    raise exception 'first-8 mismatch: %', public.search_tokens('one two three four five six seven eight nine ten');
  end if;
  if public.search_tokens('one two --- three four five six seven eight nine ten')
     <> array['one','two','three','four','five','six','seven','eight']::text[] then
    raise exception 'first-8 after empty-filter mismatch: %', public.search_tokens('one two --- three four five six seven eight nine ten');
  end if;
  if public.search_tokens('   ') <> '{}'::text[] then
    raise exception 'blank query should be empty tokens';
  end if;
  insert into tests_results values ('SOC_tokens', true, 'ok');
exception when others then
  insert into tests_results values ('SOC_tokens', false, sqlerrm);
end $$;

-- fixtures
do $$
declare
  v_view uuid := gen_random_uuid();
  v_exact uuid := gen_random_uuid();
  v_terms uuid := gen_random_uuid();
  v_priv uuid := gen_random_uuid();
  v_pub uuid := gen_random_uuid();
  v_noprop uuid := gen_random_uuid();
  v_privproj uuid := gen_random_uuid();
  v_block uuid := gen_random_uuid();
  v_susp uuid := gen_random_uuid();
  v_tie_lo uuid := '00000000-0000-0000-0000-000000000001';
  v_tie_hi uuid := '00000000-0000-0000-0000-000000000002';
  i int;
  v_id uuid;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values
    ('00000000-0000-0000-0000-000000000000', v_view, 'authenticated', 'authenticated',
     'soc-view@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'soc_view'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_exact, 'authenticated', 'authenticated',
     'soc-exact@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'soc_exact'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_terms, 'authenticated', 'authenticated',
     'soc-terms@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'soc_terms'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_priv, 'authenticated', 'authenticated',
     'soc-priv@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'soc_priv'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_pub, 'authenticated', 'authenticated',
     'soc-pub@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'soc_pub'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_noprop, 'authenticated', 'authenticated',
     'soc-noprop@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'soc_noprop'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_privproj, 'authenticated', 'authenticated',
     'soc-privproj@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'soc_privproj'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_block, 'authenticated', 'authenticated',
     'soc-block@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'soc_block'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_susp, 'authenticated', 'authenticated',
     'soc-susp@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'soc_susp'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_tie_lo, 'authenticated', 'authenticated',
     'soc-tielo@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'soc_tielo'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_tie_hi, 'authenticated', 'authenticated',
     'soc-tiehi@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'soc_tiehi'), now(), now(), '', '', '', '');

  update public.profiles set
    username = 'soc_view', is_private = false, created_at = '2026-01-01'
    where id = v_view;
  update public.profiles set
    username = 'soc_exact', display_name = 'Exact Person', is_private = false,
    created_at = '2020-01-01'
    where id = v_exact;
  update public.profiles set
    username = 'soc_terms', display_name = 'Term Person', bio = 'soc_exact mention in bio only',
    is_private = false, created_at = '2026-09-01'
    where id = v_terms;
  update public.profiles set
    username = 'soc_priv', is_private = true, bio = 'secretbio rust internals',
    open_to = array['collaborate']::text[], created_at = '2026-06-01'
    where id = v_priv;
  update public.profiles set
    username = 'soc_pub', is_private = false, bio = 'heatmap builder',
    open_to = array['collaborate','study']::text[],
    study_mode = 'online', year = 'junior', major = 'Computer Science',
    created_at = '2026-05-01'
    where id = v_pub;
  update public.profiles set
    username = 'soc_noprop', is_private = false, created_at = '2026-05-02'
    where id = v_noprop;
  update public.profiles set
    username = 'soc_privproj', is_private = true, created_at = '2026-05-03'
    where id = v_privproj;
  update public.profiles set
    username = 'soc_block', is_private = false, bio = 'blocked heatmap',
    created_at = '2026-05-04'
    where id = v_block;
  update public.profiles set
    username = 'soc_susp', is_private = false, bio = 'suspended heatmap',
    is_suspended = true, created_at = '2026-05-05'
    where id = v_susp;
  update public.profiles set
    username = 'soc_tielo', display_name = 'soctie', is_private = false,
    created_at = '2026-04-01'
    where id = v_tie_lo;
  update public.profiles set
    username = 'soc_tiehi', display_name = 'soctie', is_private = false,
    created_at = '2026-04-01'
    where id = v_tie_hi;

  insert into tests_fixture(key, id) values
    ('view', v_view), ('exact', v_exact), ('terms', v_terms), ('priv', v_priv),
    ('pub', v_pub), ('noprop', v_noprop), ('privproj', v_privproj),
    ('block', v_block), ('susp', v_susp), ('tie_lo', v_tie_lo), ('tie_hi', v_tie_hi);

  for i in 1..21 loop
    v_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      'soc-page' || i || '@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
      jsonb_build_object('username', 'socpage' || lpad(i::text, 2, '0')), now(), now(), '', '', '', ''
    );
    update public.profiles set
      username = 'socpage' || lpad(i::text, 2, '0'),
      is_private = false,
      created_at = ('2026-03-01'::timestamptz + (i || ' minutes')::interval)
      where id = v_id;
    insert into tests_fixture values ('page' || i, v_id);
  end loop;

  for i in 1..5 loop
    v_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      'soc-pageblock' || i || '@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
      jsonb_build_object('username', 'socpageb' || i), now(), now(), '', '', '', ''
    );
    update public.profiles set
      username = 'socpageb' || i,
      is_private = false,
      created_at = '2026-08-01'
      where id = v_id;
    insert into tests_fixture values ('pageblock' || i, v_id);
  end loop;
end $$;

-- owner writes: settings, projects, posts
select tests.as_user(id) from tests_fixture where key = 'pub';
do $$
declare
  v_pub uuid := (select id from tests_fixture where key = 'pub');
  v_id uuid;
begin
  insert into public.portfolio_settings (owner_id, publish_projects) values (v_pub, true);
  insert into public.portfolio_projects (owner_id, title, summary, personal_role, status, technologies)
  values (v_pub, 'PubRocket', 'ships a heatmap', 'I built it', 'published', array['rust']::text[])
  returning id into v_id;
  insert into tests_fixture values ('proj_pub', v_id);
  insert into public.portfolio_projects (owner_id, title, personal_role, status)
  values (v_pub, 'DraftRocket', 'I built it', 'draft');
  insert into public.posts (user_id, content, context_label)
  values (v_pub, 'shipping the heatmap tonight', 'building')
  returning id into v_id;
  insert into tests_fixture values ('post_pub', v_id);
  insert into public.posts (user_id, content, context_label, team_event_name)
  values (v_pub, 'need a designer for HackMIT', 'looking_for_team', 'HackMIT')
  returning id into v_id;
  insert into tests_fixture values ('post_team', v_id);
  insert into public.posts (user_id, content)
  values (v_pub, 'hidden heatmap never search')
  returning id into v_id;
  insert into tests_fixture values ('post_hidden', v_id);
end $$;
reset role;

set local role postgres;
update public.posts set hidden = true
where id = (select id from tests_fixture where key = 'post_hidden');
reset role;

select tests.as_user(id) from tests_fixture where key = 'noprop';
do $$
declare
  v_id uuid := (select id from tests_fixture where key = 'noprop');
begin
  insert into public.portfolio_settings (owner_id, publish_projects) values (v_id, false);
  insert into public.portfolio_projects (owner_id, title, personal_role, status)
  values (v_id, 'HiddenRocket', 'I built it', 'published');
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'privproj';
do $$
declare
  v_id uuid := (select id from tests_fixture where key = 'privproj');
begin
  insert into public.portfolio_settings (owner_id, publish_projects) values (v_id, true);
  insert into public.portfolio_projects (owner_id, title, personal_role, status)
  values (v_id, 'PrivRocket', 'I built it', 'published');
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'priv';
do $$
declare
  v_id uuid := (select id from tests_fixture where key = 'priv');
begin
  insert into public.posts (user_id, content)
  values (v_id, 'private heatmap must not appear')
  returning id into v_id;
  insert into tests_fixture values ('post_priv', v_id);
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'block';
do $$
declare
  v_id uuid := (select id from tests_fixture where key = 'block');
  v_proj uuid;
begin
  insert into public.portfolio_settings (owner_id, publish_projects) values (v_id, true);
  insert into public.portfolio_projects (owner_id, title, personal_role, status)
  values (v_id, 'BlockRocket', 'I built it', 'published')
  returning id into v_proj;
  insert into tests_fixture values ('proj_block', v_proj);
  insert into public.posts (user_id, content)
  values (v_id, 'blocked heatmap post')
  returning id into v_id;
  insert into tests_fixture values ('post_block', v_id);
end $$;
reset role;

set local role postgres;
do $$
declare
  v_id uuid;
  v_susp uuid := (select id from tests_fixture where key = 'susp');
begin
  insert into public.posts (user_id, content)
  values (v_susp, 'suspended heatmap post')
  returning id into v_id;
  insert into tests_fixture values ('post_susp', v_id);
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'view';
do $$
declare
  v_block uuid := (select id from tests_fixture where key = 'block');
  i int;
begin
  perform public.block_user(v_block);
  for i in 1..5 loop
    perform public.block_user((select id from tests_fixture where key = 'pageblock' || i));
  end loop;
end $$;
reset role;

-- SOC_anon_denied
select tests.as_anon();
do $$
begin
  if has_function_privilege('anon', 'public.search_people(text,integer,integer,text,text,text,text)', 'execute')
     or has_function_privilege('anon', 'public.search_projects(text,integer,integer)', 'execute')
     or has_function_privilege('anon', 'public.search_posts(text,integer,integer,text)', 'execute')
  then
    raise exception 'anon has execute on a search RPC';
  end if;
  begin
    perform 1 from public.search_people('soc_exact', 20, 0);
    raise exception 'anon executed search_people';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform 1 from public.search_projects('PubRocket', 20, 0);
    raise exception 'anon executed search_projects';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform 1 from public.search_posts('heatmap', 20, 0);
    raise exception 'anon executed search_posts';
  exception when insufficient_privilege then
    null;
  end;
  insert into tests_results values ('SOC_anon_denied', true, 'ok');
exception when others then
  insert into tests_results values ('SOC_anon_denied', false, sqlerrm);
end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'view';

-- SOC_empty
do $$
begin
  if exists (select 1 from public.search_people('   ', 20, 0)) then
    raise exception 'blank query returned rows';
  end if;
  insert into tests_results values ('SOC_empty', true, 'ok');
exception when others then
  insert into tests_results values ('SOC_empty', false, sqlerrm);
end $$;

-- SOC_exact_over_terms
do $$
declare
  v_first uuid;
begin
  select id into v_first from public.search_people('soc_exact', 20, 0) limit 1;
  if v_first is distinct from (select id from tests_fixture where key = 'exact') then
    raise exception 'exact username lost to term hit: %', v_first;
  end if;
  insert into tests_results values ('SOC_exact_over_terms', true, 'ok');
exception when others then
  insert into tests_results values ('SOC_exact_over_terms', false, sqlerrm);
end $$;

-- SOC_tie_id
do $$
declare
  v_ids uuid[];
begin
  select array(select id from public.search_people('soctie', 20, 0)) into v_ids;
  if v_ids[1] is distinct from (select id from tests_fixture where key = 'tie_hi')
     or v_ids[2] is distinct from (select id from tests_fixture where key = 'tie_lo') then
    raise exception 'tie order not recency+id desc: %', v_ids;
  end if;
  insert into tests_results values ('SOC_tie_id', true, 'ok');
exception when others then
  insert into tests_results values ('SOC_tie_id', false, sqlerrm);
end $$;

-- SOC_page_filter_before_limit
do $$
declare
  v_p1 int;
  v_p2 int;
  v_blocked int;
begin
  select count(*) into v_p1 from public.search_people('socpage', 20, 0);
  select count(*) into v_p2 from public.search_people('socpage', 20, 20);
  if v_p1 <> 20 or v_p2 <> 1 then
    raise exception 'pagination counts % / % (want 20 / 1)', v_p1, v_p2;
  end if;
  select count(*) into v_blocked
  from public.search_people('socpage', 20, 0) r
  join tests_fixture f on f.id = r.id
  where f.key like 'pageblock%';
  if v_blocked <> 0 then
    raise exception 'blocked rows occupied a page slot';
  end if;
  if exists (
    select 1 from public.search_people('socpage', 20, 20) r
    join tests_fixture f on f.id = r.id
    where f.key like 'pageblock%'
  ) then
    raise exception 'blocked row leaked onto page 2';
  end if;
  insert into tests_results values ('SOC_page_filter_before_limit', true, 'ok');
exception when others then
  insert into tests_results values ('SOC_page_filter_before_limit', false, sqlerrm);
end $$;

-- SOC_private_identity_only
do $$
declare
  v_open text[];
begin
  if exists (select 1 from public.search_people('secretbio', 20, 0)) then
    raise exception 'private bio leaked through people search';
  end if;
  select open_to into v_open from public.search_people('soc_priv', 20, 0);
  if v_open is not null then
    raise exception 'private open_to exposed: %', v_open;
  end if;
  if not exists (select 1 from public.search_people('soc_priv', 20, 0)) then
    raise exception 'private username identity missing';
  end if;
  insert into tests_results values ('SOC_private_identity_only', true, 'ok');
exception when others then
  insert into tests_results values ('SOC_private_identity_only', false, sqlerrm);
end $$;

-- SOC_projects_visibility
do $$
begin
  if not exists (select 1 from public.search_projects('PubRocket', 20, 0)) then
    raise exception 'published public project missing';
  end if;
  if exists (select 1 from public.search_projects('DraftRocket', 20, 0)) then
    raise exception 'draft project leaked';
  end if;
  if exists (select 1 from public.search_projects('HiddenRocket', 20, 0)) then
    raise exception 'publish_projects=false leaked';
  end if;
  if exists (select 1 from public.search_projects('PrivRocket', 20, 0)) then
    raise exception 'private-owner project leaked';
  end if;
  if exists (select 1 from public.search_projects('BlockRocket', 20, 0)) then
    raise exception 'blocked-owner project leaked';
  end if;
  insert into tests_results values ('SOC_projects_visibility', true, 'ok');
exception when others then
  insert into tests_results values ('SOC_projects_visibility', false, sqlerrm);
end $$;

-- SOC_project_exact_title
do $$
declare
  v_title text;
begin
  select title into v_title from public.search_projects('PubRocket', 20, 0) limit 1;
  if v_title is distinct from 'PubRocket' then
    raise exception 'exact title missed: %', v_title;
  end if;
  insert into tests_results values ('SOC_project_exact_title', true, 'ok');
exception when others then
  insert into tests_results values ('SOC_project_exact_title', false, sqlerrm);
end $$;

-- SOC_people_visible_project_text
do $$
begin
  if not exists (
    select 1 from public.search_people('PubRocket', 20, 0)
    where id = (select id from tests_fixture where key = 'pub')
  ) then
    raise exception 'public owner not found via published project title';
  end if;
  if exists (select 1 from public.search_people('DraftRocket', 20, 0)) then
    raise exception 'draft project title leaked into people search';
  end if;
  if exists (
    select 1 from public.search_people('PrivRocket', 20, 0)
    where id = (select id from tests_fixture where key = 'privproj')
  ) then
    raise exception 'private project title leaked into people search';
  end if;
  insert into tests_results values ('SOC_people_visible_project_text', true, 'ok');
exception when others then
  insert into tests_results values ('SOC_people_visible_project_text', false, sqlerrm);
end $$;

-- SOC_posts_visibility
-- OR term-hits: 'private heatmap' also matches the public heatmap row.
-- Assert forbidden author/id, not an empty result set.
do $$
declare
  v_priv uuid := (select id from tests_fixture where key = 'priv');
  v_block uuid := (select id from tests_fixture where key = 'block');
  v_susp uuid := (select id from tests_fixture where key = 'susp');
  v_post_pub uuid := (select id from tests_fixture where key = 'post_pub');
  v_post_hidden uuid := (select id from tests_fixture where key = 'post_hidden');
  v_post_priv uuid := (select id from tests_fixture where key = 'post_priv');
  v_post_block uuid := (select id from tests_fixture where key = 'post_block');
  v_post_susp uuid := (select id from tests_fixture where key = 'post_susp');
  v_ids uuid[];
  v_authors uuid[];
begin
  select coalesce(array_agg(id), '{}'::uuid[]), coalesce(array_agg(user_id), '{}'::uuid[])
    into v_ids, v_authors
  from public.search_posts('heatmap', 20, 0);

  if not (v_post_pub = any (v_ids)) then
    raise exception 'public post missing: %', v_ids;
  end if;
  if v_post_hidden = any (v_ids) then
    raise exception 'hidden post leaked';
  end if;
  if v_post_priv = any (v_ids) or v_priv = any (v_authors) then
    raise exception 'private-author post leaked';
  end if;
  if v_post_block = any (v_ids) or v_block = any (v_authors) then
    raise exception 'blocked-author post leaked';
  end if;
  if v_post_susp = any (v_ids) or v_susp = any (v_authors) then
    raise exception 'suspended-author post leaked';
  end if;

  if exists (
    select 1 from public.search_posts('private heatmap', 20, 0)
    where user_id = v_priv or id = v_post_priv
  ) then
    raise exception 'private-author post leaked via OR terms';
  end if;
  if exists (
    select 1 from public.search_posts('blocked heatmap', 20, 0)
    where user_id = v_block or id = v_post_block
  ) then
    raise exception 'blocked-author post leaked via OR terms';
  end if;
  if exists (
    select 1 from public.search_posts('suspended', 20, 0)
    where user_id = v_susp or id = v_post_susp
  ) then
    raise exception 'suspended-author post leaked via posts';
  end if;
  if not exists (
    select 1 from public.search_posts('building', 20, 0)
    where id = v_post_pub and context_label = 'building'
  ) then
    raise exception 'context_label not searchable';
  end if;
  insert into tests_results values ('SOC_posts_visibility', true, 'ok');
exception when others then
  insert into tests_results values ('SOC_posts_visibility', false, sqlerrm);
end $$;

-- SOC_looking_for_team_label — 4-arg p_label allowlists looking_for_team; event name searchable
do $$
declare
  v_post_team uuid := (select id from tests_fixture where key = 'post_team');
  v_post_pub uuid := (select id from tests_fixture where key = 'post_pub');
begin
  if exists (select 1 from public.search_posts('', 20, 0)) then
    raise exception 'empty posts query without label returned rows';
  end if;
  if not exists (
    select 1 from public.search_posts('', 20, 0, 'looking_for_team')
    where id = v_post_team and context_label = 'looking_for_team'
  ) then
    raise exception 'looking_for_team label browse missed team post';
  end if;
  if exists (
    select 1 from public.search_posts('', 20, 0, 'looking_for_team')
    where id = v_post_pub
  ) then
    raise exception 'looking_for_team label browse included building post';
  end if;
  if not exists (
    select 1 from public.search_posts('HackMIT', 20, 0)
    where id = v_post_team
  ) then
    raise exception 'team_event_name not searchable';
  end if;
  if exists (
    select 1 from public.search_posts('', 20, 0, 'shipping')
  ) then
    raise exception 'non-allowlisted p_label was accepted';
  end if;
  insert into tests_results values ('SOC_looking_for_team_label', true, 'ok');
exception when others then
  insert into tests_results values ('SOC_looking_for_team_label', false, sqlerrm);
end $$;

-- SOC_suspended_people
do $$
begin
  if exists (select 1 from public.search_people('soc_susp', 20, 0)) then
    raise exception 'suspended identity appeared in people search';
  end if;
  insert into tests_results values ('SOC_suspended_people', true, 'ok');
exception when others then
  insert into tests_results values ('SOC_suspended_people', false, sqlerrm);
end $$;

-- SOC_block_people
do $$
begin
  if exists (select 1 from public.search_people('soc_block', 20, 0)) then
    raise exception 'blocked identity appeared in people search';
  end if;
  insert into tests_results values ('SOC_block_people', true, 'ok');
exception when others then
  insert into tests_results values ('SOC_block_people', false, sqlerrm);
end $$;

-- SOC_browse_filters — empty query + facets; private tags never match
do $$
begin
  if exists (select 1 from public.search_people('', 20, 0)) then
    raise exception 'empty query without filters returned rows';
  end if;
  if not exists (
    select 1 from public.search_people('', 20, 0, 'study', null, null, null)
    where id = (select id from tests_fixture where key = 'pub')
  ) then
    raise exception 'browse study tag missed public';
  end if;
  if exists (
    select 1 from public.search_people('', 20, 0, 'collaborate', null, null, null)
    where id = (select id from tests_fixture where key = 'priv')
  ) then
    raise exception 'private open_to used as browse facet';
  end if;
  if not exists (
    select 1 from public.search_people('', 20, 0, null, 'junior', 'Computer Science', 'online')
    where id = (select id from tests_fixture where key = 'pub')
  ) then
    raise exception 'stage browse missed public';
  end if;
  if exists (
    select 1 from public.search_posts('', 20, 0)
  ) then
    raise exception 'empty posts query without label returned rows';
  end if;
  insert into tests_results values ('SOC_browse_filters', true, 'ok');
exception when others then
  insert into tests_results values ('SOC_browse_filters', false, sqlerrm);
end $$;

-- SOC_suggested_stage — re-rank must not use text[] & (intarray)
do $$
begin
  perform public.get_suggested_profiles(null, 3);
  insert into tests_results values ('SOC_suggested_stage', true, 'ok');
exception when others then
  insert into tests_results values ('SOC_suggested_stage', false, sqlerrm);
end $$;

reset role;

-- SOC_cron_unschedule (named retired only)
do $$
declare
  v_done text[];
  v_keep_exists boolean := false;
begin
  if to_regclass('cron.job') is null then
    insert into tests_results values ('SOC_cron_unschedule', true, 'cron.job absent — skipped insert, fn no-ops');
    return;
  end if;

  perform cron.schedule('weekly-matches', '0 15 * * 1', 'select 1');
  perform cron.schedule('eve', '0 14 * * *', 'select 1');
  perform cron.schedule('jobs-ingest', '0 9 * * *', 'select 1');
  if not exists (select 1 from cron.job where jobname = 'expire-lapsed-pro') then
    perform cron.schedule('expire-lapsed-pro', '0 5 * * *', 'select 1');
  end if;
  v_keep_exists := exists (select 1 from cron.job where jobname = 'expire-lapsed-pro');

  v_done := public.unschedule_retired_social_crons();
  if not ('weekly-matches' = any (v_done) and 'eve' = any (v_done) and 'jobs-ingest' = any (v_done)) then
    raise exception 'did not unschedule retired names: %', v_done;
  end if;
  if exists (select 1 from cron.job where jobname in ('weekly-matches', 'eve', 'jobs-ingest')) then
    raise exception 'retired cron rows remain';
  end if;
  if v_keep_exists and not exists (select 1 from cron.job where jobname = 'expire-lapsed-pro') then
    raise exception 'expire-lapsed-pro was unscheduled';
  end if;
  if exists (select 1 from cron.job where jobname = 'sweep-unconfirmed-signups') then
    null; -- keep if present
  end if;
  insert into tests_results values ('SOC_cron_unschedule', true, 'ok');
exception when others then
  insert into tests_results values ('SOC_cron_unschedule', false, sqlerrm);
end $$;

select finding, passed, note from tests_results order by finding;

do $$
declare
  v_fail int;
begin
  select count(*) into v_fail from tests_results where not passed;
  if v_fail > 0 then
    raise exception '% social discovery assertion(s) failed', v_fail;
  end if;
end $$;

rollback;
