-- RLS regression harness — FIX_PLAN.md Wave 0.3.
-- Spec: REVIEW.md (findings C1, C2, H1, H2, M3, M4).
--
-- One failing assertion per finding, run against TODAY's database (before any
-- fix lands). C1, C2, H1, H2, M3 (x2) are expected to FAIL today — that is
-- the intended, correct outcome: it proves the hole is real. When a fix
-- migration lands, its assertion flips to PASS with zero edits to this file.
-- M4 is also expected to FAIL today (fabricated follower_id on accept).
-- Two known-sound behaviors are asserted PASS as regression guards.
--
-- Run:   psql "$SUPABASE_DB_URL" -f supabase/tests/rls_test.sql
-- CI use (once fixes have landed and this should gate green/red):
--        psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
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

-- ============ fixtures (seeded as the connecting superuser, bypasses RLS) ============
-- A: private account, owns a private post + one post-media object, and
--    comments/reacts on a public post by C (used for the M3 block-mirroring check).
-- B: the attacker / blocked user.
-- C: a public, unrelated third account.
do $$
declare
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
  v_c uuid := gen_random_uuid();
  v_post_private uuid;
  v_post_public uuid;
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

  insert into tests_fixture (key, id) values
    ('a', v_a), ('b', v_b), ('c', v_c),
    ('post_private', v_post_private), ('post_public', v_post_public);
end $$;

-- ============ C1 — a non-.edu account can actually be created ============
-- The real finding is "auth.signUp() with a gmail address creates a verified
-- account", so exercise the thing itself: insert a non-.edu auth.users row (as
-- superuser here — auth.signUp is superuser-equivalent for row creation) and
-- assert handle_new_user aborts the transaction. Today the trigger never reads
-- new.email, so the insert commits -> FAIL. The function-existence proxy below
-- (C1_helper) stays as a secondary, human-readable signal.
-- NOTE: the fixture users use @school.edu on purpose, so they still seed cleanly
-- once this gate lands. Do NOT "tidy" them to @example.com — that would break
-- the whole file the day C1 is fixed.
do $$
declare
  v_raised boolean := false;
  v_state  text;
begin
  begin
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      'rls-test-attacker@gmail.com', '', now(), '{"provider":"email","providers":["email"]}',
      jsonb_build_object('username', 'rls_test_attacker'), now(), now(), '', '', '', ''
    );
  exception when others then
    v_raised := true;
    v_state  := sqlstate; -- pin the REASON, not just "an error happened"
  end;
  if not v_raised then
    raise exception 'C1 REGRESSION: a non-.edu (gmail) account was created — handle_new_user does not gate on new.email, so auth.signUp() with the public anon key bypasses the .edu check entirely';
  end if;
  -- handle_new_user gates with `raise ... using errcode = ''22023''` (see
  -- 20260711100000_close_edu_gate.sql). Anyone changing that errcode must update
  -- this line. A different code = it raised for the wrong reason (username
  -- collision, a new NOT NULL column on auth.users, a GoTrue schema change), and
  -- accepting that as PASS would falsely certify a gate that does not exist.
  if v_state <> '22023' then
    raise exception 'C1 WRONG REASON: signup raised SQLSTATE % — expected 22023 from the .edu gate, not an unrelated error', v_state;
  end if;
  insert into tests_results values ('C1', true, 'ok');
exception when others then
  insert into tests_results values ('C1', false, sqlerrm);
end $$;

-- ============ C1_helper — the DB-side domain check exists and rejects gmail ============
do $$
begin
  if to_regprocedure('public.is_allowed_signup_email(text)') is null then
    raise exception 'C1_helper NOT FIXED: public.is_allowed_signup_email(text) does not exist — no DB-side .edu check to back the trigger';
  end if;
  if (select public.is_allowed_signup_email('x@gmail.com')) then
    raise exception 'C1_helper REGRESSION: is_allowed_signup_email(''x@gmail.com'') returned true for a non-.edu address';
  end if;
  insert into tests_results values ('C1_helper', true, 'ok');
exception when others then
  insert into tests_results values ('C1_helper', false, sqlerrm);
end $$;

-- ============ H1 — log_contribution is directly callable by any logged-in user ============
do $$
declare
  v_oid oid := to_regprocedure('public.log_contribution(text,jsonb)');
begin
  -- Passes in both worlds: the function is dropped (v_oid is null), OR it still
  -- exists but is not EXECUTE-able by authenticated. Fails only if a logged-in
  -- client can still call it directly to mint points.
  if v_oid is not null and has_function_privilege('authenticated', v_oid, 'execute') then
    raise exception 'H1 REGRESSION: authenticated role can EXECUTE public.log_contribution(text,jsonb) directly — a client can call it with a fabricated character_count and mint heatmap/streak/leaderboard points with no real post/comment behind them';
  end if;
  insert into tests_results values ('H1', true, 'ok');
exception when others then
  insert into tests_results values ('H1', false, sqlerrm);
end $$;

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
-- {uid}/ folder. The `posts_media_paths_owned` CHECK constraint (added by a
-- sibling agent) must reject it. Today, with no constraint, the insert commits
-- -> FAIL, which is the proof that the path check is app-only.
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

-- ============ decouple M4 from H2 ============
-- H2's insert of (follower=B, following=A) SUCCEEDS today (that's the hole).
-- follows has unique(follower_id, following_id), so M4's `update ... set
-- follower_id = B` below would hit that surviving row and fail on a UNIQUE
-- violation — reporting M4 FAIL for the wrong reason, and hiding itself once
-- H2 is fixed. Delete the H2 row as superuser so M4 tests only the M4 defect.
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

-- ============ regression guard (should PASS today): logged-out caller sees zero posts ============
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

-- ============ regression guard (should PASS today): non-follower sees zero private-account posts ============
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

-- ============ report ============
-- Print the PASS/FAIL table FIRST so the operator sees exactly which assertions
-- failed, then raise so psql exits non-zero and the harness actually gates.
set local role postgres;
select finding, case when passed then 'PASS' else 'FAIL' end as result, note
from tests_results
order by finding;

-- Gate on exit code. `raise exception` (not `warning`) is what makes psql return
-- 1 — a warning prints and still exits 0, gating nothing. Today, with the six
-- holes open, this raises -> exit 1, and the file loudly says the holes are real.
-- Once every fix lands, no rows fail -> no raise -> exit 0.
-- The raise aborts the transaction, which rolls back the fixtures anyway, so the
-- explicit `rollback` below only runs on the all-pass path. Both paths mutate
-- nothing. Run with -v ON_ERROR_STOP=1 in CI so the raise is the gate.
do $$
declare v_failed int;
begin
  select count(*) into v_failed from tests_results where not passed;
  if v_failed > 0 then
    raise exception '% assertion(s) failed — see table above. Expected today (pre-fix): C1, C2, C2_forgery, H1, H2, M3_comments, M3_reactions, M4 all FAIL until their fixes land.', v_failed;
  end if;
end $$;

-- Reached only when every assertion passed (the raise above aborts otherwise).
rollback;
