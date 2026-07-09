-- Contribution v2 regression harness.
-- Run:   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/contribution_v2_test.sql
-- Never mutates data: one transaction, rolled back at the end, win or lose.
--
-- Two constraints shape this file:
--   * auth.users inserts fire handle_new_user, which creates public.profiles
--     for us. Never insert a profile by hand.
--   * rl_check_posts rejects the 6th post by one user inside a minute, so every
--     post is inserted with created_at one hour ago. The award still lands on
--     today's date -- posts_award_contribution keys on now(), not created_at.

begin;

create schema if not exists tests;

-- Assertion 10 calls tests.uid() while wearing the `authenticated` role, so that
-- role needs USAGE on this schema and SELECT on the temp fixture table. Temp
-- tables are owned by the connecting superuser and grant nothing by default;
-- without these two lines the first impersonated statement dies with
-- "permission denied for schema tests". Same lesson as rls_test.sql:40.
grant usage on schema tests to authenticated;

create or replace function tests.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create temporary table t_results (name text primary key, passed boolean not null, note text);
create temporary table t_ids (k text primary key, id uuid not null);
grant select on t_ids to authenticated;

create or replace function tests.points(u uuid, a text) returns int language sql as $$
  select coalesce(sum(points), 0)::int from public.contribution_log
  where user_id = u and action_type = a;
$$;

create or replace function tests.check(p_name text, p_got anyelement, p_want anyelement) returns void
language plpgsql as $$
begin
  insert into t_results values (p_name, p_got is not distinct from p_want,
    format('got %s, want %s', p_got, p_want));
end;
$$;

-- Fixture: two confirmed .edu users. handle_new_user creates their profiles.
do $$
declare
  v_alice uuid := gen_random_uuid();
  v_bob uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values
    ('00000000-0000-0000-0000-000000000000', v_alice, 'authenticated', 'authenticated',
     'contrib-test-alice@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'contrib_alice'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_bob, 'authenticated', 'authenticated',
     'contrib-test-bob@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'contrib_bob'), now(), now(), '', '', '', '');

  insert into t_ids values ('alice', v_alice), ('bob', v_bob);
end $$;

create or replace function tests.uid(p_k text) returns uuid language sql as $$
  select id from t_ids where k = p_k;
$$;

-- Every post below is backdated past the rate-limit window.
create or replace function tests.post(p_user uuid, p_content text, p_media jsonb default '[]'::jsonb,
                                      p_prompt boolean default false)
returns uuid language sql as $$
  insert into public.posts (user_id, content, media, answers_prompt, created_at)
  values (p_user, p_content, p_media, p_prompt, now() - interval '1 hour')
  returning id;
$$;

-- ---------- 1. two qualifying posts in one day -> 8 (volume counts) ----------
select tests.post(tests.uid('alice'), repeat('xy', 100));
select tests.post(tests.uid('alice'), repeat('zw', 100));
select tests.check('01_volume_counts', tests.points(tests.uid('alice'), 'post'), 8);

-- ---------- 2. a 700-char post -> 6, not 4 (effort scales) ----------
select tests.post(tests.uid('bob'), repeat('qr', 350));
select tests.check('02_substantial_post', tests.points(tests.uid('bob'), 'post'), 6);

-- ---------- 3 & 4. comment dedupe keys on the ROOT post ----------
create temporary table t_posts as
  select id, row_number() over (order by id) as n
  from public.posts where user_id = tests.uid('alice');

insert into public.comments (post_id, user_id, content)
  select id, tests.uid('bob'), repeat('cd', 30) from t_posts where n = 1;
insert into public.comments (post_id, user_id, content)
  select id, tests.uid('bob'), repeat('ef', 30) from t_posts where n = 1;
select tests.check('03_same_post_pays_once', tests.points(tests.uid('bob'), 'comment'), 3);

insert into public.comments (post_id, user_id, content)
  select id, tests.uid('bob'), repeat('gh', 30) from t_posts where n = 2;
select tests.check('04_different_posts_pay_twice', tests.points(tests.uid('bob'), 'comment'), 6);

-- ---------- 5. commenting on your own post earns 0 ----------
insert into public.comments (post_id, user_id, content)
  select id, tests.uid('alice'), repeat('ij', 30) from t_posts where n = 1;
select tests.check('05_own_post_comment_zero', tests.points(tests.uid('alice'), 'comment'), 0);

-- ---------- 6. run-collapse defeats 'a' x 700 (bob's total is unchanged) ----------
select tests.post(tests.uid('bob'), repeat('a', 700));
select tests.check('06_run_collapse', tests.points(tests.uid('bob'), 'post'), 6);

-- ---------- 7. media bonus (+1 on a qualifying post) ----------
select tests.post(tests.uid('bob'), repeat('mn', 100),
  jsonb_build_array(jsonb_build_object('path', tests.uid('bob')::text || '/y.webp', 'type', 'image')));
select tests.check('07_media_bonus', tests.points(tests.uid('bob'), 'post_media'), 1);

-- ---------- 8. weekly prompt pays once per week, not once per post ----------
select tests.post(tests.uid('bob'), repeat('op', 100), '[]'::jsonb, true);
select tests.post(tests.uid('bob'), repeat('st', 100), '[]'::jsonb, true);
select tests.check('08_weekly_prompt_once', tests.points(tests.uid('bob'), 'weekly_prompt'), 2);

-- ---------- 9. quote-repost pays 3, keyed on the quoted post ----------
insert into public.reposts (user_id, post_id, quote_text)
  select tests.uid('bob'), id, repeat('kl', 30) from t_posts where n = 2;
select tests.check('09_quote_repost', tests.points(tests.uid('bob'), 'quote'), 3);

-- ---------- 10. mutual follow pays BOTH sides, 5 each ----------
select tests.as_user(tests.uid('alice'));
select public.request_follow(tests.uid('bob'));
select tests.as_user(tests.uid('bob'));
select public.request_follow(tests.uid('alice'));
reset role;
select tests.check('10a_connection_alice', tests.points(tests.uid('alice'), 'connection'), 5);
select tests.check('10b_connection_bob',   tests.points(tests.uid('bob'), 'connection'), 5);
select tests.check('10c_connection_source',
  (select count(*)::int from public.contribution_log
   where action_type = 'connection' and user_id = tests.uid('alice')
     and source_id = tests.uid('bob')), 1);

-- ---------- 11. referral pays the referrer once, not once per post ----------
insert into public.referrals (referred_id, referrer_id) values (tests.uid('bob'), tests.uid('alice'));
select tests.post(tests.uid('bob'), repeat('uv', 100));
select tests.post(tests.uid('bob'), repeat('wx', 100));
select tests.check('11_referral_once', tests.points(tests.uid('alice'), 'referral'), 3);

-- ---------- 12. courses awarded once, ever ----------
update public.profiles set courses = array['TIP102'] where id = tests.uid('alice');
update public.profiles set courses = array['TIP102', 'CS 101'] where id = tests.uid('alice');
select tests.check('12_courses_once', tests.points(tests.uid('alice'), 'courses'), 1);

-- ---------- 13. deleting today's post revokes only that post's rows ----------
delete from public.posts where user_id = tests.uid('bob') and media <> '[]'::jsonb;
select tests.check('13a_media_revoked', tests.points(tests.uid('bob'), 'post_media'), 0);
select tests.check('13b_other_posts_survive',
  (select count(*)::int from public.contribution_log
   where user_id = tests.uid('bob') and action_type = 'post') > 0, true);

-- ---------- 14. a 30-day-old award is never revoked ----------
update public.contribution_log set date = (now() at time zone 'America/New_York')::date - 30
  where user_id = tests.uid('alice') and action_type = 'post';
delete from public.posts where user_id = tests.uid('alice');
select tests.check('14_old_award_survives',
  (select count(*)::int from public.contribution_log
   where user_id = tests.uid('alice') and action_type = 'post'), 2);

-- ---------- 15. no API role may execute an award function ----------
select tests.check('15_no_api_execute',
  (select bool_or(has_function_privilege('authenticated', p.oid, 'execute')
                  or has_function_privilege('anon', p.oid, 'execute'))
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('_log_contribution', 'qualifying_length', 'revoke_contribution_same_day',
                       'posts_award_contribution', 'comments_award_contribution',
                       'reposts_award_contribution', 'profiles_award_contribution')),
  false);

-- ---------- summary ----------
select name, case when passed then 'PASS' else 'FAIL' end as result, note
from t_results order by name;

do $$
declare v_failed int;
begin
  select count(*) into v_failed from t_results where not passed;
  if v_failed > 0 then
    raise exception 'contribution_v2: % assertion(s) failed', v_failed;
  end if;
  raise notice 'contribution_v2: all assertions passed';
end $$;

rollback;
