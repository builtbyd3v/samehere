-- RLS regression harness — FIX_PLAN.md Wave 0.3, extended for the hardening
-- round that followed REVIEW.md (2026-07-09).
--
-- Every finding below (C1, C2, H1, H2, H5, H5b, M3, M4, M5, M8) has a landed,
-- applied-to-prod fix (see the migrations from 20260711100000 onward). This
-- file now asserts the world AS IT IS: every row in the PASS/FAIL table at
-- the bottom is expected to read PASS, and a clean run exits 0. A FAIL here
-- means a fixed hole regressed — treat it as a live incident, not a
-- known-red test.
--
-- Run:   psql "$SUPABASE_DB_URL" -f supabase/tests/rls_test.sql
-- CI:    psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
-- Never mutates data: everything below runs inside one transaction that is
-- rolled back at the end, win or lose.

begin;

-- ============ impersonation harness (mirrors what PostgREST sets per request) ============
create schema if not exists tests;

create or replace function tests.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create or replace function tests.as_anon() returns void language sql as $$
  select set_config('role', 'anon', true),
         set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
$$;

create temporary table tests_fixture (key text primary key, id uuid not null);
create temporary table tests_results (finding text primary key, passed boolean not null, note text);

-- Every assertion below runs some of its body as `authenticated` or `anon`
-- (tests.as_user / tests.as_anon), and reads its fixture ids and writes its
-- result while wearing that role. Temp tables are owned by the connecting
-- superuser and grant nothing by default, so without these the very first
-- impersonated block dies with "permission denied for table tests_fixture".
-- Found the first time this file was actually executed. Do not remove.
grant select, insert, update, delete on tests_fixture to authenticated, anon;
grant select, insert, update, delete on tests_results to authenticated, anon;

-- ============ fixtures (seeded as the connecting superuser, bypasses RLS) ============
-- A: private account, owns a private post + one post-media object, and
--    comments/reacts on a public post by C (used for the M3 block-mirroring check).
-- B: the attacker / blocked user. Owns a public post and a repost of C's
--    public post (used by H5), and is the sender of a DM to A over a
--    pre-seeded conversation (used by H5b / M8).
-- C: a public, unrelated third account. Owns a public post (post_public) and
--    an admin-hidden post (post_hidden, used by the public-surface checks).
do $$
declare
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
  v_c uuid := gen_random_uuid();
  v_post_private uuid;
  v_post_public uuid;
  v_post_b uuid;
  v_repost_b uuid;
  v_post_hidden uuid;
  v_conv uuid;
  v_msg uuid;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values
    ('00000000-0000-0000-0000-000000000000', v_a, 'authenticated', 'authenticated',
     'rls-test-a@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'rls_test_a'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_b, 'authenticated', 'authenticated',
     'rls-test-b@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'rls_test_b'), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_c, 'authenticated', 'authenticated',
     'rls-test-c@school.edu', '', now(), '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'rls_test_c'), now(), now(), '', '', '', '');
  -- handle_new_user trigger auto-creates the matching public.profiles rows.

  update public.profiles set is_private = true where id = v_a;

  insert into public.posts (id, user_id, content, media)
  values (
    gen_random_uuid(), v_a, 'private post by A',
    jsonb_build_array(jsonb_build_object('path', v_a::text || '/secret.jpg', 'type', 'image'))
  )
  returning id into v_post_private;

  -- C2 fixture: the media object the private post claims to own.
  insert into storage.objects (bucket_id, name) values ('post-media', v_a::text || '/secret.jpg');

  insert into public.posts (id, user_id, content)
  values (gen_random_uuid(), v_c, 'public post by C')
  returning id into v_post_public;

  insert into public.comments (post_id, user_id, content) values (v_post_public, v_a, 'comment by A on C''s post');
  insert into public.reactions (post_id, user_id, type) values (v_post_public, v_a, 'like');

  -- H5 fixture: B's own public post + a repost of C's public post, so a
  -- block's effect on BOTH surfaces can be asserted.
  insert into public.posts (user_id, content) values (v_b, 'public post by B') returning id into v_post_b;
  insert into public.reposts (post_id, user_id) values (v_post_public, v_b) returning id into v_repost_b;

  -- public-surface fixture: an admin-hidden post by a public author.
  -- get_public_post must return zero rows for it even though C is public.
  insert into public.posts (user_id, content, hidden) values (v_c, 'hidden post by C', true) returning id into v_post_hidden;

  -- H5b / M8 fixture: a DM thread with one message from B to A, seeded
  -- BEFORE any block exists (get_or_create_dm would itself refuse once
  -- blocked — inserting directly as superuser sidesteps that entirely).
  insert into public.conversations default values returning id into v_conv;
  insert into public.conversation_members (conversation_id, user_id) values (v_conv, v_a), (v_conv, v_b);
  insert into public.dm_pairs (user_a, user_b, conversation_id) values (least(v_a, v_b), greatest(v_a, v_b), v_conv);
  insert into public.messages (conversation_id, sender_id, content)
  values (v_conv, v_b, 'harassing message from B to A')
  returning id into v_msg;

  insert into tests_fixture (key, id) values
    ('a', v_a), ('b', v_b), ('c', v_c),
    ('post_private', v_post_private), ('post_public', v_post_public),
    ('post_b', v_post_b), ('repost_b', v_repost_b), ('post_hidden', v_post_hidden),
    ('conv_ab', v_conv), ('msg_b_to_a', v_msg);
end $$;

-- ============ C1 — open signup: any email creates an account, unverified ============
-- 20260713100000 reversed the .edu gate. A gmail signup must now SUCCEED, land
-- with verified_student = false, and record its email_domain. A signup with NO
-- username metadata (the OAuth shape) must succeed too, with a generated handle
-- that satisfies the username CHECK. Both rows are deleted at the end (cascade
-- clears profiles).
-- NOTE: the fixture users keep @school.edu addresses — that now also exercises
-- the verified_student backfill/trigger (see C1_verified below).
do $$
declare
  v_id1 uuid := gen_random_uuid();
  v_id2 uuid := gen_random_uuid();
  v_p   public.profiles%rowtype;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id1, 'authenticated', 'authenticated',
    'rls-test-open@gmail.com', '', now(), '{"provider":"email","providers":["email"]}',
    jsonb_build_object('username', 'rls_test_open'), now(), now(), '', '', '', ''
  );
  select * into v_p from public.profiles where id = v_id1;
  if not found then
    raise exception 'C1 REGRESSION: gmail signup created no profile — handle_new_user still gates on .edu';
  end if;
  if v_p.verified_student then
    raise exception 'C1 REGRESSION: a gmail signup landed with verified_student = true';
  end if;
  if v_p.email_domain <> 'gmail.com' then
    raise exception 'C1 REGRESSION: email_domain recorded as %, expected gmail.com', v_p.email_domain;
  end if;

  -- OAuth shape: no username in metadata -> generated handle passing the CHECK.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id2, 'authenticated', 'authenticated',
    'RLS.Test-OAuth+x@gmail.com', '', now(), '{"provider":"google","providers":["google"]}',
    '{}'::jsonb, now(), now(), '', '', '', ''
  );
  select * into v_p from public.profiles where id = v_id2;
  if not found then
    raise exception 'C1 REGRESSION: OAuth-shaped signup (no username metadata) created no profile';
  end if;
  if v_p.username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'C1 REGRESSION: generated username % violates the charset/length CHECK', v_p.username;
  end if;

  delete from auth.users where id in (v_id1, v_id2);
  insert into tests_results values ('C1', true, 'ok');
exception when others then
  delete from auth.users where id in (v_id1, v_id2);
  insert into tests_results values ('C1', false, sqlerrm);
end $$;

-- ============ C1_helper — the dead gate machinery is actually gone ============
do $$
begin
  if to_regprocedure('public.is_allowed_signup_email(text)') is not null then
    raise exception 'C1_helper REGRESSION: public.is_allowed_signup_email(text) still exists — 20260713100000 should have dropped it with the gate';
  end if;
  if to_regclass('public.signup_allowlist') is not null then
    raise exception 'C1_helper REGRESSION: public.signup_allowlist still exists — dead once the gate is open';
  end if;
  insert into tests_results values ('C1_helper', true, 'ok');
exception when others then
  insert into tests_results values ('C1_helper', false, sqlerrm);
end $$;

-- ============ C1_verified — .edu fixtures are verified; the flag is client-frozen ============
-- Backfill/trigger: the @school.edu fixture users must carry verified_student =
-- true. Freeze: a logged-in user flipping their OWN verified_student must be
-- silently reverted by guard_profile_privileged (same contract as is_pro).
select tests.as_user(id) from tests_fixture where key = 'b';
do $$
declare
  v_b uuid := (select id from tests_fixture where key = 'b');
  v_flag boolean;
begin
  select verified_student into v_flag from public.profiles where id = v_b;
  if not v_flag then
    raise exception 'C1_verified REGRESSION: fixture b signed up @school.edu but verified_student is false — signup trigger/backfill missing';
  end if;
  update public.profiles set verified_student = false where id = v_b;
  select verified_student into v_flag from public.profiles where id = v_b;
  if not v_flag then
    raise exception 'C1_verified REGRESSION: an authenticated user changed their own verified_student — guard_profile_privileged does not freeze it';
  end if;
  insert into tests_results values ('C1_verified', true, 'ok');
exception when others then
  insert into tests_results values ('C1_verified', false, sqlerrm);
end $$;
reset role;

-- ============ profiles_column_grants — no silently-unreadable columns ============
-- profiles SELECT is COLUMN-granted (20260711150000/150200): a new column is
-- invisible to client roles until granted, and because the app's select lists
-- name columns explicitly, one missing grant 42501s EVERY query that touches
-- the table (broke the whole logged-in app when verified_student landed
-- ungranted — see 20260713160000). Assert: every profiles column is SELECT-
-- granted to BOTH anon and authenticated, except the deliberately withheld
-- privileged seven. A new privileged column must be added to the list below;
-- a new public column must be granted in its migration.
do $$
declare
  -- wants_pro dropped with the Pro waitlist (20260713181000).
  v_withheld text[] := array['is_admin','is_suspended','stripe_customer_id','pro_source',
                             'last_subscription_event_at','email_domain'];
  v_missing text;
begin
  select string_agg(c.column_name || ':' || r.role, ', ') into v_missing
  from information_schema.columns c
  cross join (values ('anon'), ('authenticated')) as r(role)
  where c.table_schema = 'public' and c.table_name = 'profiles'
    and c.column_name <> all (v_withheld)
    and not exists (
      select 1 from information_schema.column_privileges p
      where p.table_schema = 'public' and p.table_name = 'profiles'
        and p.column_name = c.column_name and p.grantee = r.role
        and p.privilege_type = 'SELECT'
    );
  if v_missing is not null then
    raise exception 'profiles_column_grants REGRESSION: ungranted non-privileged column(s): % — every client select naming them 42501s', v_missing;
  end if;
  insert into tests_results values ('profiles_column_grants', true, 'ok');
exception when others then
  insert into tests_results values ('profiles_column_grants', false, sqlerrm);
end $$;

-- ============ H1 — contribution points cannot be minted by a direct RPC call ============
-- log_contribution(text,jsonb) was DROPPED by 20260711110100_contribution_from_rows.sql.
-- Points are now a byproduct of AFTER INSERT/UPDATE triggers reading the real
-- row (posts_award_contribution / comments_award_contribution /
-- profiles_award_contribution), which call the internal primitive
-- _log_contribution(uuid,text,int,jsonb) — SECURITY DEFINER, revoked from
-- public/anon/authenticated, reachable only from inside another definer
-- function's body (as the function owner), never directly over PostgREST.
-- Assert both halves: the old forgeable RPC is gone, and its replacement is
-- not directly callable either.
do $$
declare
  v_old_oid oid := to_regprocedure('public.log_contribution(text,jsonb)');
  v_new_oid oid := to_regprocedure('public._log_contribution(uuid,text,int,jsonb)');
begin
  if v_old_oid is not null then
    raise exception 'H1 REGRESSION: public.log_contribution(text,jsonb) still exists — the forgeable client-callable RPC was supposed to be dropped by 20260711110100';
  end if;
  if v_new_oid is null then
    raise exception 'H1 SETUP: public._log_contribution(uuid,text,int,jsonb) does not exist — the expected replacement primitive is missing';
  end if;
  if has_function_privilege('authenticated', v_new_oid, 'execute') then
    raise exception 'H1 REGRESSION: authenticated role can EXECUTE public._log_contribution(uuid,text,int,jsonb) directly — a client could call it with a fabricated action_type/points and mint heatmap/streak/leaderboard points with no real post/comment/connection behind them';
  end if;
  insert into tests_results values ('H1', true, 'ok');
exception when others then
  insert into tests_results values ('H1', false, sqlerrm);
end $$;

-- ============ H1_positive — a real post correctly earns/loses its point; a short one earns nothing ============
select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare
  v_c uuid := (select id from tests_fixture where key = 'c');
  v_today date := (now() at time zone 'America/New_York')::date;
  v_short_id uuid;
  v_long_id uuid;
  v_cnt int;
  v_points int;
begin
  -- a short (well under 150 chars) post earns nothing.
  insert into public.posts (user_id, content) values (v_c, 'too short to earn a heatmap point') returning id into v_short_id;
  select count(*) into v_cnt from public.contribution_log
   where user_id = v_c and date = v_today and action_type = 'post';
  if v_cnt <> 0 then
    raise exception 'H1_positive REGRESSION: a short post created % contribution_log row(s) — short posts must earn zero points', v_cnt;
  end if;

  -- a 200-char (>=150) post earns exactly one row worth 5 points.
  insert into public.posts (user_id, content) values (v_c, repeat('x', 200)) returning id into v_long_id;
  select count(*), max(points) into v_cnt, v_points from public.contribution_log
   where user_id = v_c and date = v_today and action_type = 'post';
  if v_cnt <> 1 or v_points <> 5 then
    raise exception 'H1_positive REGRESSION: a 200-char post produced % contribution_log row(s) with points=% — expected exactly 1 row with points=5', v_cnt, v_points;
  end if;

  -- deleting the qualifying post revokes the same-day point.
  delete from public.posts where id = v_long_id;
  select count(*) into v_cnt from public.contribution_log
   where user_id = v_c and date = v_today and action_type = 'post';
  if v_cnt <> 0 then
    raise exception 'H1_positive REGRESSION: deleting the qualifying post left % contribution_log row(s) behind — revoke_contribution_same_day did not clean up', v_cnt;
  end if;

  insert into tests_results values ('H1_positive', true, 'ok');
exception when others then
  insert into tests_results values ('H1_positive', false, sqlerrm);
end $$;
reset role;

-- ============ setup: A blocks B ============
select tests.as_user(id) from tests_fixture where key = 'a';
do $$
begin
  perform public.block_user((select id from tests_fixture where key = 'b'));
end $$;
reset role;

-- ============ H2 — a block does not stop a direct `follows` insert ============
select tests.as_user(id) from tests_fixture where key = 'b';
do $$
declare
  v_a uuid := (select id from tests_fixture where key = 'a');
  v_b uuid := (select id from tests_fixture where key = 'b');
  v_inserted boolean := false;
  v_state text;
begin
  begin
    insert into public.follows (follower_id, following_id, status) values (v_b, v_a, 'pending');
    v_inserted := true;
  exception when others then
    v_inserted := false;
    v_state := sqlstate; -- pin the reason: must be the RLS block clause, not something else
  end;
  if v_inserted then
    raise exception 'H2 REGRESSION: blocked user B inserted a follows row targeting A directly — the "user follows user" INSERT policy has no block clause (only the request_follow() wrapper checks blocks)';
  end if;
  -- The fix is a bidirectional block clause in the "user follows user" INSERT
  -- `with check`, so a rejection must be an RLS violation: SQLSTATE 42501
  -- ("new row violates row-level security policy"). WATCH OUT: follows has a
  -- `rl_check_follows` BEFORE INSERT rate-limit trigger that raises P0001 — if
  -- that fired instead, the insert would also fail, but for the WRONG reason,
  -- and blindly reading any error as PASS would mask a still-missing block
  -- clause. This is a single insert, so the limiter should not fire; pinning
  -- 42501 makes sure we only accept the rejection we actually want.
  if v_state <> '42501' then
    raise exception 'H2 WRONG REASON: follows insert raised SQLSTATE % — expected 42501 (RLS block clause); P0001 would mean the rl_check_follows rate limiter fired, not the block', v_state;
  end if;
  insert into tests_results values ('H2', true, 'ok');
exception when others then
  insert into tests_results values ('H2', false, sqlerrm);
end $$;
reset role;

-- ============ C2 — any authenticated user can list/sign private post-media ============
select tests.as_user(id) from tests_fixture where key = 'b';
do $$
declare
  v_a uuid := (select id from tests_fixture where key = 'a');
  v_cnt int;
begin
  select count(*) into v_cnt
  from storage.objects
  where bucket_id = 'post-media'
    and (storage.foldername(name))[1] = v_a::text;
  if v_cnt <> 0 then
    raise exception 'C2 REGRESSION: user B can list % private post-media object(s) owned by A (bucket SELECT policy is `auth.role() = ''authenticated''`, no ownership/post-visibility check)', v_cnt;
  end if;
  insert into tests_results values ('C2', true, 'ok');
exception when others then
  insert into tests_results values ('C2', false, sqlerrm);
end $$;
reset role;

-- ============ C2_forgery — a post's media paths must live under the author's own folder ============
-- The TypeScript-only path check (app/(app)/feed/actions.ts:72) is not a
-- security control: as B, insert a post whose media path points into A's
-- {uid}/ folder. The `posts_media_paths_owned` CHECK constraint must reject it.
select tests.as_user(id) from tests_fixture where key = 'b';
do $$
declare
  v_a uuid := (select id from tests_fixture where key = 'a');
  v_b uuid := (select id from tests_fixture where key = 'b');
  v_committed boolean := false;
  v_state text;
begin
  begin
    insert into public.posts (user_id, content, media)
    values (
      v_b, 'forged',
      jsonb_build_array(jsonb_build_object('path', v_a::text || '/secret.jpg', 'type', 'image'))
    );
    v_committed := true;
  exception when others then
    v_committed := false;
    v_state := sqlstate; -- pin the reason: must be the CHECK, not e.g. the rate limiter
  end;
  if v_committed then
    raise exception 'C2_forgery REGRESSION: B created a post whose media path lives in A''s folder — no posts_media_paths_owned CHECK constrains media paths to the author''s own {uid}/ folder, so the app-layer path check is the only guard';
  end if;
  -- The fix is the `posts_media_paths_owned` CHECK constraint, so a rejection
  -- must be SQLSTATE 23514 (check_violation). posts also has an rl_check_posts
  -- BEFORE INSERT rate-limit trigger (raises P0001); a single insert won't trip
  -- it, but pinning 23514 guarantees we accept only the CHECK's rejection and
  -- never mistake an unrelated failure for the constraint doing its job.
  if v_state <> '23514' then
    raise exception 'C2_forgery WRONG REASON: posts insert raised SQLSTATE % — expected 23514 (posts_media_paths_owned CHECK), not an unrelated error', v_state;
  end if;
  insert into tests_results values ('C2_forgery', true, 'ok');
exception when others then
  insert into tests_results values ('C2_forgery', false, sqlerrm);
end $$;
reset role;

-- ============ M3 — blocks are not mirrored onto comments / reactions ============
select tests.as_user(id) from tests_fixture where key = 'b';
do $$
declare
  v_a uuid := (select id from tests_fixture where key = 'a');
  v_post uuid := (select id from tests_fixture where key = 'post_public');
  v_cnt int;
begin
  select count(*) into v_cnt from public.comments where post_id = v_post and user_id = v_a;
  if v_cnt <> 0 then
    raise exception 'M3 REGRESSION: B still sees % of blocked user A''s comment(s) on a post B can see — "comments mirror post visibility" has no block clause', v_cnt;
  end if;
  insert into tests_results values ('M3_comments', true, 'ok');
exception when others then
  insert into tests_results values ('M3_comments', false, sqlerrm);
end $$;

do $$
declare
  v_a uuid := (select id from tests_fixture where key = 'a');
  v_post uuid := (select id from tests_fixture where key = 'post_public');
  v_cnt int;
begin
  select count(*) into v_cnt from public.reactions where post_id = v_post and user_id = v_a;
  if v_cnt <> 0 then
    raise exception 'M3 REGRESSION: B still sees % of blocked user A''s reaction(s) on a post B can see — "reactions mirror post visibility" has no block clause', v_cnt;
  end if;
  insert into tests_results values ('M3_reactions', true, 'ok');
exception when others then
  insert into tests_results values ('M3_reactions', false, sqlerrm);
end $$;
reset role;

-- ============ H5 setup: isolate "author blocked viewer" direction ============
-- 20260711110000's own header explains the exact defect: the pre-fix posts
-- policy checked blocks via a raw `blocks` subquery, which runs under the
-- CALLER's own RLS. `blocks` has one SELECT policy — owner read
-- (auth.uid() = blocker_id) — so the caller only ever sees rows THEY
-- authored. If the AUTHOR (not the viewer) is the one who placed the block,
-- that row belongs to the author; the viewer can't see it under blocks' own
-- RLS, so the `not exists` check silently passed. Isolate that exact
-- direction: drop the "A blocks B" fixture row so ONLY "B blocks A" exists,
-- then prove A still sees none of B's posts/reposts.
set local role postgres;
delete from public.blocks
 where blocker_id = (select id from tests_fixture where key = 'a')
   and blocked_id = (select id from tests_fixture where key = 'b');
reset role;

select tests.as_user(id) from tests_fixture where key = 'b';
do $$ begin perform public.block_user((select id from tests_fixture where key = 'a')); end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'a';
do $$
declare
  v_b uuid := (select id from tests_fixture where key = 'b');
  v_posts int;
  v_reposts int;
begin
  select count(*) into v_posts from public.posts where user_id = v_b;
  select count(*) into v_reposts from public.reposts where user_id = v_b;
  if v_posts <> 0 or v_reposts <> 0 then
    raise exception 'H5 REGRESSION: B blocked A (author-initiated block — the direction the old raw `blocks` subquery missed), but A can still see % of B''s post(s) and % of B''s repost(s)', v_posts, v_reposts;
  end if;
  insert into tests_results values ('H5', true, 'ok');
exception when others then
  insert into tests_results values ('H5', false, sqlerrm);
end $$;
reset role;

-- ============ H5_reverse: the other direction (viewer-initiated block) still holds ============
set local role postgres;
delete from public.blocks
 where blocker_id = (select id from tests_fixture where key = 'b')
   and blocked_id = (select id from tests_fixture where key = 'a');
reset role;

select tests.as_user(id) from tests_fixture where key = 'a';
do $$ begin perform public.block_user((select id from tests_fixture where key = 'b')); end $$;
reset role;

select tests.as_user(id) from tests_fixture where key = 'a';
do $$
declare
  v_b uuid := (select id from tests_fixture where key = 'b');
  v_posts int;
begin
  select count(*) into v_posts from public.posts where user_id = v_b;
  if v_posts <> 0 then
    raise exception 'H5_reverse REGRESSION: A blocked B (viewer-initiated), but A can still see % of B''s post(s)', v_posts;
  end if;
  insert into tests_results values ('H5_reverse', true, 'ok');
exception when others then
  insert into tests_results values ('H5_reverse', false, sqlerrm);
end $$;
reset role;
-- state after this point: A blocks B (matches the rest of the file's
-- assumption, same as before H5 ran).

-- ============ H5b — a block stops the SEND, not just the read ============
-- Live body used a raw JOIN against `blocks`, which — same mechanism as
-- H5 — runs under the SENDER's own RLS and only ever sees blocks the sender
-- authored. "A blocked B" is a row B never authored, so it was invisible to
-- B's own read of `blocks`, and B's send sailed through. Fixed by routing
-- through get_blocked_ids() (SECURITY DEFINER, bidirectional).
select tests.as_user(id) from tests_fixture where key = 'b';
do $$
declare
  v_conv uuid := (select id from tests_fixture where key = 'conv_ab');
  v_inserted boolean := false;
  v_state text;
begin
  begin
    insert into public.messages (conversation_id, sender_id, content)
    values (v_conv, (select auth.uid()), 'trying to message despite the block');
    v_inserted := true;
  exception when others then
    v_inserted := false;
    v_state := sqlstate;
  end;
  if v_inserted then
    raise exception 'H5b REGRESSION: B (blocked by A) inserted a message into their shared conversation — the messages INSERT with_check''s blocks JOIN only ever sees blocks the SENDER authored, so "A blocked B" never matched';
  end if;
  if v_state <> '42501' then
    raise exception 'H5b WRONG REASON: message insert raised SQLSTATE % — expected 42501 (RLS block clause on "member send message")', v_state;
  end if;
  insert into tests_results values ('H5b', true, 'ok');
exception when others then
  insert into tests_results values ('H5b', false, sqlerrm);
end $$;
reset role;

-- ============ M8_multi_target — a report must reference exactly one target ============
select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare
  v_post uuid := (select id from tests_fixture where key = 'post_public');
  v_b uuid := (select id from tests_fixture where key = 'b');
  v_raised boolean := false;
  v_state text;
begin
  begin
    insert into public.reports (reporter_id, reason, target_type, post_id, reported_user_id)
    values ((select auth.uid()), 'multi-target forgery', 'post', v_post, v_b);
  exception when others then
    v_raised := true;
    v_state := sqlstate;
  end;
  if not v_raised then
    raise exception 'M8_multi_target REGRESSION: a report row was created with two non-null targets (post_id AND reported_user_id) — reports_assert_target''s num_nonnulls check is not enforced';
  end if;
  -- reports_assert_target raises a plain `raise exception` with no errcode,
  -- so Postgres assigns the generic P0001 (raise_exception).
  if v_state <> 'P0001' then
    raise exception 'M8_multi_target WRONG REASON: insert raised SQLSTATE % — expected P0001 (reports_assert_target''s plain raise exception)', v_state;
  end if;
  insert into tests_results values ('M8_multi_target', true, 'ok');
exception when others then
  insert into tests_results values ('M8_multi_target', false, sqlerrm);
end $$;
reset role;

-- ============ M8_snapshot setup: B reports C's public post with a forged snapshot ============
select tests.as_user(id) from tests_fixture where key = 'b';
do $$
declare
  v_report_id uuid;
begin
  insert into public.reports (reporter_id, reason, target_type, post_id, snapshot)
  values (
    (select auth.uid()), 'spam', 'post',
    (select id from tests_fixture where key = 'post_public'),
    'FORGED SNAPSHOT TEXT'
  )
  returning id into v_report_id;
  insert into tests_fixture (key, id) values ('report_post', v_report_id);
end $$;
reset role;

-- ============ M8_snapshot — the trigger, not the client, writes snapshot ============
set local role postgres;
do $$
declare
  v_snapshot text;
begin
  select snapshot into v_snapshot from public.reports
   where id = (select id from tests_fixture where key = 'report_post');
  if v_snapshot is distinct from 'public post by C' then
    raise exception 'M8_snapshot REGRESSION: client-supplied snapshot survived the insert — expected the trigger to overwrite it with the real post content, got %', v_snapshot;
  end if;
  insert into tests_results values ('M8_snapshot', true, 'ok');
exception when others then
  insert into tests_results values ('M8_snapshot', false, sqlerrm);
end $$;
reset role;

-- ============ M8_no_column_privilege — authenticated cannot select reports.snapshot ============
do $$
begin
  if has_column_privilege('authenticated', 'public.reports', 'snapshot', 'select') then
    raise exception 'M8_no_column_privilege REGRESSION: authenticated has SELECT on reports.snapshot — a reporter could read back evidence they should not see, undermining the reporter/admin boundary';
  end if;
  insert into tests_results values ('M8_no_column_privilege', true, 'ok');
exception when others then
  insert into tests_results values ('M8_no_column_privilege', false, sqlerrm);
end $$;

-- ============ M8_block_then_report — the flow that matters most ============
-- A has blocked B (state carried from H5_reverse). A must still be able to
-- report B's message — a block is the victim's OWN action and must not
-- disarm their ability to report. reports_assert_target's message branch
-- re-checks conversation membership only, deliberately ignoring blocks.
select tests.as_user(id) from tests_fixture where key = 'a';
do $$
declare
  v_msg uuid := (select id from tests_fixture where key = 'msg_b_to_a');
  v_report_id uuid;
begin
  insert into public.reports (reporter_id, reason, target_type, message_id)
  values ((select auth.uid()), 'harassment via DM', 'message', v_msg)
  returning id into v_report_id;
  insert into tests_fixture (key, id) values ('report_msg', v_report_id);
  insert into tests_results values ('M8_block_then_report', true, 'ok');
exception when others then
  insert into tests_results values ('M8_block_then_report', false, sqlerrm);
end $$;
reset role;

-- ============ M8_evidence_survives — deleting the message does not destroy the report ============
set local role postgres;
do $$
declare
  v_msg_id uuid := (select id from tests_fixture where key = 'msg_b_to_a');
  v_report uuid := (select id from tests_fixture where key = 'report_msg');
  v_after_message_id uuid;
  v_after_snapshot text;
begin
  delete from public.messages where id = v_msg_id;

  select message_id, snapshot into v_after_message_id, v_after_snapshot
  from public.reports where id = v_report;

  if v_after_message_id is not null then
    raise exception 'M8_evidence_survives REGRESSION: report.message_id still points at a deleted message (expected ON DELETE SET NULL), got %', v_after_message_id;
  end if;
  if v_after_snapshot is distinct from 'harassing message from B to A' then
    raise exception 'M8_evidence_survives REGRESSION: snapshot does not match the original message content, got %', v_after_snapshot;
  end if;

  insert into tests_results values ('M8_evidence_survives', true, 'ok');
exception when others then
  insert into tests_results values ('M8_evidence_survives', false, sqlerrm);
end $$;
reset role;

-- ============ decouple M4 from H2 ============
-- Pre-fix, H2's insert of (follower=B, following=A) SUCCEEDED (that was the
-- hole), and follows has unique(follower_id, following_id), so M4's `update
-- ... set follower_id = B` below would hit that surviving row and fail on a
-- UNIQUE violation — reporting M4 FAIL for the wrong reason. Post-fix, H2's
-- insert is rejected by RLS and no row survives, so this delete is now a
-- harmless no-op — but it is left in place (rather than removed) so this
-- file keeps working regardless of which side of the H2 fix it runs against.
-- DO NOT remove this delete: it is the seam between the two findings.
set local role postgres;
delete from public.follows
 where follower_id = (select id from tests_fixture where key = 'b')
   and following_id = (select id from tests_fixture where key = 'a');
reset role;

-- ============ setup: C sends A (private) a pending follow request ============
select tests.as_user(id) from tests_fixture where key = 'c';
do $$
begin
  perform public.request_follow((select id from tests_fixture where key = 'a'));
end $$;
reset role;

-- ============ M4 — the target of a follow request can rewrite who the follower is ============
select tests.as_user(id) from tests_fixture where key = 'a';
do $$
declare
  v_a uuid := (select id from tests_fixture where key = 'a');
  v_b uuid := (select id from tests_fixture where key = 'b');
  v_c uuid := (select id from tests_fixture where key = 'c');
  v_updated int;
begin
  update public.follows set follower_id = v_b
   where follower_id = v_c and following_id = v_a;
  get diagnostics v_updated = row_count;
  if v_updated <> 0 then
    raise exception 'M4 REGRESSION: A (the follow target) updated follower_id on C''s pending request and fabricated "B follows A" without B''s consent — the UPDATE with_check only pins following_id';
  end if;
  insert into tests_results values ('M4', true, 'ok');
exception when others then
  insert into tests_results values ('M4', false, sqlerrm);
end $$;
reset role;

-- ============ M5 setup: suspend B ============
set local role postgres;
update public.profiles set is_suspended = true where id = (select id from tests_fixture where key = 'b');
reset role;

select tests.as_user(id) from tests_fixture where key = 'b';
do $$
begin
  perform public.record_profile_view((select id from tests_fixture where key = 'c'));
end $$;
reset role;

-- ============ M5_profile_view — a suspended user cannot record_profile_view ============
set local role postgres;
do $$
declare
  v_cnt int;
begin
  select count(*) into v_cnt from public.profile_views
   where viewer_id = (select id from tests_fixture where key = 'b')
     and viewed_id = (select id from tests_fixture where key = 'c');
  if v_cnt <> 0 then
    raise exception 'M5_profile_view REGRESSION: a suspended user''s record_profile_view() call still landed them in the target''s who-viewed-you list (% row(s))', v_cnt;
  end if;
  insert into tests_results values ('M5_profile_view', true, 'ok');
exception when others then
  insert into tests_results values ('M5_profile_view', false, sqlerrm);
end $$;
reset role;

-- ============ M5_write — a suspended user cannot insert a post (regression guard) ============
select tests.as_user(id) from tests_fixture where key = 'b';
do $$
declare
  v_inserted boolean := false;
  v_state text;
begin
  begin
    insert into public.posts (user_id, content) values ((select auth.uid()), 'trying to post while suspended');
    v_inserted := true;
  exception when others then
    v_inserted := false;
    v_state := sqlstate;
  end;
  if v_inserted then
    raise exception 'M5_write REGRESSION: a suspended user inserted a post';
  end if;
  if v_state <> '42501' then
    raise exception 'M5_write WRONG REASON: post insert raised SQLSTATE % — expected 42501 (current_is_suspended() clause on "authed users create posts")', v_state;
  end if;
  insert into tests_results values ('M5_write', true, 'ok');
exception when others then
  insert into tests_results values ('M5_write', false, sqlerrm);
end $$;
reset role;

-- ============ regression guard (should PASS): logged-out caller sees zero posts ============
select tests.as_anon();
do $$
declare v_cnt int;
begin
  select count(*) into v_cnt from public.posts;
  if v_cnt <> 0 then
    raise exception 'REGRESSION: anon (logged-out) caller can select % post row(s) — posts SELECT must require auth.uid() is not null', v_cnt;
  end if;
  insert into tests_results values ('anon_sees_no_posts', true, 'ok');
exception when others then
  insert into tests_results values ('anon_sees_no_posts', false, sqlerrm);
end $$;
reset role;

-- ============ regression guard (should PASS): non-follower sees zero private-account posts ============
select tests.as_user(id) from tests_fixture where key = 'c';
do $$
declare
  v_a uuid := (select id from tests_fixture where key = 'a');
  v_cnt int;
begin
  select count(*) into v_cnt from public.posts where user_id = v_a;
  if v_cnt <> 0 then
    raise exception 'REGRESSION: non-follower C can select % post(s) belonging to private account A', v_cnt;
  end if;
  insert into tests_results values ('non_follower_sees_no_private_posts', true, 'ok');
exception when others then
  insert into tests_results values ('non_follower_sees_no_private_posts', false, sqlerrm);
end $$;
reset role;

-- ============ public_surface — anon reads exactly what get_public_* intends, nothing more ============
-- get_public_profile / get_public_post / get_public_profile_counts are the
-- DELIBERATE anon-facing surface added by 20260711140000. The base tables
-- must NOT have moved: anon still gets zero rows off `posts` directly.
select tests.as_anon();
do $$
declare
  v_post_public uuid := (select id from tests_fixture where key = 'post_public');
  v_post_hidden uuid := (select id from tests_fixture where key = 'post_hidden');
  v_post_private uuid := (select id from tests_fixture where key = 'post_private');
  v_cnt int;
begin
  select count(*) into v_cnt from public.get_public_profile('rls_test_c');
  if v_cnt <> 1 then
    raise exception 'public_surface REGRESSION: get_public_profile(''rls_test_c'') returned % row(s) as anon, expected 1', v_cnt;
  end if;

  select count(*) into v_cnt from public.get_public_post(v_post_public);
  if v_cnt <> 1 then
    raise exception 'public_surface REGRESSION: get_public_post() on a visible public post returned % row(s) as anon, expected 1', v_cnt;
  end if;

  select count(*) into v_cnt from public.get_public_post(v_post_hidden);
  if v_cnt <> 0 then
    raise exception 'public_surface REGRESSION: get_public_post() on an admin-hidden post returned % row(s) as anon, expected 0', v_cnt;
  end if;

  select count(*) into v_cnt from public.get_public_post(v_post_private);
  if v_cnt <> 0 then
    raise exception 'public_surface REGRESSION: get_public_post() on a private author''s post returned % row(s) as anon, expected 0', v_cnt;
  end if;

  select count(*) into v_cnt from public.get_public_post(gen_random_uuid());
  if v_cnt <> 0 then
    raise exception 'public_surface REGRESSION: get_public_post() on a nonexistent id returned % row(s) as anon, expected 0', v_cnt;
  end if;

  select count(*) into v_cnt from public.posts;
  if v_cnt <> 0 then
    raise exception 'public_surface REGRESSION: anon can select % row(s) directly off public.posts — the new anon-granted get_public_* RPCs must not widen the base table''s SELECT policy', v_cnt;
  end if;

  insert into tests_results values ('public_surface', true, 'ok');
exception when others then
  insert into tests_results values ('public_surface', false, sqlerrm);
end $$;
reset role;

-- ============ get_public_profile_privacy — a private account exposes identity only ============
select tests.as_anon();
do $$
declare
  r record;
  v_sig text := pg_get_function_result(to_regprocedure('public.get_public_profile(text)'));
begin
  select * into r from public.get_public_profile('rls_test_a');
  if r.bio is not null or r.goals is not null or r.school is not null
     or r.year is not null or r.major is not null then
    raise exception 'get_public_profile_privacy REGRESSION: a private account''s bio/goals/school/year/major leaked to an anonymous caller (bio=%, goals=%, school=%, year=%, major=%)', r.bio, r.goals, r.school, r.year, r.major;
  end if;
  if v_sig ilike '%skills%' or v_sig ilike '%courses%' then
    raise exception 'get_public_profile_privacy REGRESSION: get_public_profile''s return type still includes skills/courses — %', v_sig;
  end if;
  insert into tests_results values ('get_public_profile_privacy', true, 'ok');
exception when others then
  insert into tests_results values ('get_public_profile_privacy', false, sqlerrm);
end $$;
reset role;

-- ============ storage_post_media_policy_count — exactly one post-media SELECT policy ============
-- Two migrations (20260703170000, 20260705190000, 20260711100100) each
-- dropped-then-recreated the post-media SELECT policy under a different
-- name. If any drop was missed, Postgres ORs the surviving permissive
-- policies and silently widens access back open — count is the guard.
set local role postgres;
do $$
declare
  v_cnt int;
begin
  select count(*) into v_cnt
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and cmd = 'SELECT' and policyname like 'post-media%';
  if v_cnt <> 1 then
    raise exception 'storage_post_media_policy_count REGRESSION: found % SELECT polic(ies) on storage.objects named post-media% — expected exactly 1', v_cnt;
  end if;
  insert into tests_results values ('storage_post_media_policy_count', true, 'ok');
exception when others then
  insert into tests_results values ('storage_post_media_policy_count', false, sqlerrm);
end $$;
reset role;

-- ============ report ============
-- Print the PASS/FAIL table FIRST so the operator sees exactly which assertions
-- failed, then raise so psql exits non-zero and the harness actually gates.
set local role postgres;
select finding, case when passed then 'PASS' else 'FAIL' end as result, note
from tests_results
order by finding;

-- Gate on exit code. `raise exception` (not `warning`) is what makes psql return
-- 1 — a warning prints and still exits 0, gating nothing. Every fix landed, so
-- this should find zero failing rows -> no raise -> exit 0. A FAIL means a
-- shipped fix regressed.
do $$
declare v_failed int;
begin
  select count(*) into v_failed from tests_results where not passed;
  if v_failed > 0 then
    raise exception '% assertion(s) failed — see table above. Every assertion in this file is expected to PASS: C1, C1_helper, H1, H1_positive, H2, C2, C2_forgery, M3_comments, M3_reactions, H5, H5_reverse, H5b, M8_multi_target, M8_snapshot, M8_no_column_privilege, M8_block_then_report, M8_evidence_survives, M4, M5_profile_view, M5_write, anon_sees_no_posts, non_follower_sees_no_private_posts, public_surface, get_public_profile_privacy, storage_post_media_policy_count.', v_failed;
  end if;
end $$;

-- Reached only when every assertion passed (the raise above aborts otherwise).
rollback;
