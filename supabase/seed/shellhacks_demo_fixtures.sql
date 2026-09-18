-- =============================================================================
-- ShellHacks live-demo fixtures (INSERT-ONLY, idempotent)
-- =============================================================================
-- Creates 5 labeled demo profiles + Stuck / Looking-for-team posts for the
-- overnight Bet 1 / Bet 2 / Bet 4B surfaces.
--
-- SAFE TO COMMIT. NOT SAFE TO RUN ON HOSTED PROD.
--
-- Never run against hosted project gannghfikhikdeqvyrwc.
-- Never `supabase db reset` / `db push` as a side effect of this file.
-- This script does not DELETE/TRUNCATE/UPDATE any non-demo rows.
--
-- Prerequisites on the TARGET database (branch / local / preview only):
--   - profiles.study_mode (Bet 1 / profiles_study_mode)
--   - posts.context_label allowlist includes looking_for_team (Bet 4B)
--   - posts.team_event_* columns (Bet 4B)
--
-- Run (psql as a role that can write auth.users — typically postgres / service):
--
--   select set_config('samehere.allow_demo_seed', 'true', true);
--   select set_config('samehere.demo_seed_target', 'branch', true);
--   \i supabase/seed/shellhacks_demo_fixtures.sql
--
-- Or:
--   psql "$BRANCH_DB_URL" -v ON_ERROR_STOP=1 \
--     -c "select set_config('samehere.allow_demo_seed','true',true);" \
--     -c "select set_config('samehere.demo_seed_target','branch',true);" \
--     -f supabase/seed/shellhacks_demo_fixtures.sql
-- =============================================================================

do $$
declare
  v_allow text := current_setting('samehere.allow_demo_seed', true);
  v_target text := current_setting('samehere.demo_seed_target', true);
begin
  if v_allow is distinct from 'true' then
    raise exception
      'Refusing ShellHacks demo seed: set samehere.allow_demo_seed=true for this session first. Never run on hosted prod gannghfikhikdeqvyrwc.';
  end if;
  if v_target is distinct from 'branch' and v_target is distinct from 'local' then
    raise exception
      'Refusing ShellHacks demo seed: set samehere.demo_seed_target to branch or local (got %). Hosted prod is forbidden.',
      coalesce(v_target, '<unset>');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'study_mode'
  ) then
    raise exception 'profiles.study_mode missing — apply Bet 1 migration on this branch DB first';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'posts' and column_name = 'team_event_name'
  ) then
    raise exception 'posts.team_event_* missing — apply Bet 4B looking_for_team on this branch DB first';
  end if;
end $$;

-- Fixed UUIDs so re-runs stay idempotent. Namespace: a1111111-…-11110N
-- Emails use a reserved invalid TLD so they never collide with real inboxes.
do $$
declare
  v_maya   uuid := 'a1111111-1111-4111-8111-111111111101';
  v_jordan uuid := 'a1111111-1111-4111-8111-111111111102';
  v_sam    uuid := 'a1111111-1111-4111-8111-111111111103';
  v_alex   uuid := 'a1111111-1111-4111-8111-111111111104';
  v_riley  uuid := 'a1111111-1111-4111-8111-111111111105';
  v_instance uuid := '00000000-0000-0000-0000-000000000000';
begin
  -- ---- auth.users (handle_new_user creates profiles) ----
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  values
    (v_instance, v_maya, 'authenticated', 'authenticated',
     'demo_sh_maya@demo.shellhacks.samehere.invalid', '', now(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'demo_sh_maya'), now(), now(), '', '', '', ''),
    (v_instance, v_jordan, 'authenticated', 'authenticated',
     'demo_sh_jordan@demo.shellhacks.samehere.invalid', '', now(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'demo_sh_jordan'), now(), now(), '', '', '', ''),
    (v_instance, v_sam, 'authenticated', 'authenticated',
     'demo_sh_sam@demo.shellhacks.samehere.invalid', '', now(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'demo_sh_sam'), now(), now(), '', '', '', ''),
    (v_instance, v_alex, 'authenticated', 'authenticated',
     'demo_sh_alex@demo.shellhacks.samehere.invalid', '', now(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'demo_sh_alex'), now(), now(), '', '', '', ''),
    (v_instance, v_riley, 'authenticated', 'authenticated',
     'demo_sh_riley@demo.shellhacks.samehere.invalid', '', now(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('username', 'demo_sh_riley'), now(), now(), '', '', '', '')
  on conflict (id) do nothing;

  -- ---- profile facets (study_mode + open_to + demo chrome) ----
  update public.profiles p set
    display_name = v.display_name,
    year = v.year,
    major = v.major,
    bio = v.bio,
    goals = v.goals,
    open_to = v.open_to,
    study_mode = v.study_mode,
    is_private = false,
    is_bot = true,
    onboarded_at = coalesce(p.onboarded_at, now()),
    heatmap_visibility = 'public',
    hide_school = false
  from (values
    (v_maya,   'Maya Chen',      'junior',    'Computer Science',
     'Online CS junior grinding LeetCode + a side Next.js portfolio. Happy to study together for ShellHacks week.',
     'Land a summer internship and ship one polished project this semester.',
     array['study']::text[], 'online'),
    (v_jordan, 'Jordan Rivera',  'senior',    'Software Engineering',
     'FIU senior. Building in public, looking for a ShellHacks teammate who likes TypeScript and late-night pizza.',
     'Ship a hackathon project that actually demos cleanly on stage.',
     array['collaborate']::text[], 'on_campus'),
    (v_sam,    'Sam Okonkwo',    'sophomore', 'Information Technology',
     'Self-taught path into backend. Stuck on system-design tradeoffs and want peers who will rubber-duck with me.',
     'Get unstuck on databases and design a service that survives traffic spikes.',
     array['study','feedback']::text[], 'self_taught'),
    (v_alex,   'Alex Nguyen',    'sophomore', 'Computer Science',
     'Hybrid schedule — campus labs + remote nights. Looking for a ShellHacks team that needs a frontend person.',
     'Find teammates before Friday kickoff and practice the 90-second pitch.',
     array['collaborate','study']::text[], 'hybrid'),
    (v_riley,  'Riley Park',     'grad',      'Data Science',
     'Bootcamp graduate pivoting into ML + product. Can help with data pipelines; need a designer/frontend partner.',
     'Demo a small ML feature that judges can understand in under a minute.',
     array['collaborate','feedback']::text[], 'bootcamp')
  ) as v(id, display_name, year, major, bio, goals, open_to, study_mode)
  where p.id = v.id;

  insert into public.profile_school (profile_id, school)
  values
    (v_maya,   'Florida International University'),
    (v_jordan, 'Florida International University'),
    (v_sam,    'Florida International University'),
    (v_alex,   'Florida International University'),
    (v_riley,  'Florida International University')
  on conflict (profile_id) do update set school = excluded.school;

  -- Publish intro so logged-out share shows study_mode + open_to chips.
  insert into public.portfolio_settings (
    owner_id, publish_intro, publish_projects, publish_activity,
    publish_experience, publish_education, publish_posts, allow_indexing
  )
  values
    (v_maya,   true, false, false, false, false, false, false),
    (v_jordan, true, false, false, false, false, false, false),
    (v_sam,    true, false, false, false, false, false, false),
    (v_alex,   true, false, false, false, false, false, false),
    (v_riley,  true, false, false, false, false, false, false)
  on conflict (owner_id) do update set publish_intro = true;

  -- ---- posts (fixed ids for idempotency) ----
  -- Stuck
  insert into public.posts (id, user_id, content, context_label, created_at)
  values (
    'b2222222-2222-4222-8222-222222222201',
    v_maya,
    $c$Stuck on React Server Components vs client boundaries for our ShellHacks app.

I keep putting "use client" too high in the tree and the feed feels sluggish. Looking for someone who has shipped an App Router social feed and can walk me through where they draw the line between server data loaders and interactive bits. Same here if you have hit this wall.$c$,
    'stuck',
    now() - interval '40 minutes'
  )
  on conflict (id) do nothing;

  insert into public.posts (id, user_id, content, context_label, created_at)
  values (
    'b2222222-2222-4222-8222-222222222202',
    v_sam,
    $c$Stuck on Postgres RLS for a student social feed.

I understand policies in theory, but my "posts visible by privacy" rule either leaks private accounts or hides everything. Need a study buddy who has debugged RLS with auth.uid() and SECURITY DEFINER helpers. Happy to screenshare a sanitized schema and trade notes for an hour.$c$,
    'stuck',
    now() - interval '25 minutes'
  )
  on conflict (id) do nothing;

  insert into public.posts (id, user_id, content, context_label, created_at)
  values (
    'b2222222-2222-4222-8222-222222222203',
    v_riley,
    $c$Stuck packaging a tiny ML demo for non-ML judges.

I have a working classifier notebook, but the story falls apart when I try to turn it into a one-minute product pitch. Looking for someone who has demoed AI features without drowning the room in metrics. Same here if you want to practice the talk track together tonight.$c$,
    'stuck',
    now() - interval '12 minutes'
  )
  on conflict (id) do nothing;

  -- Looking for team (ShellHacks)
  insert into public.posts (
    id, user_id, content, context_label,
    team_event_name, team_event_date, team_event_mode, created_at
  )
  values (
    'b2222222-2222-4222-8222-222222222211',
    v_jordan,
    $c$Looking for a ShellHacks teammate who likes TypeScript + clean demos.

I can own backend + auth (Supabase) and keep the pitch tight. Ideal partner: frontend or design, okay with remote sync before Friday, and wants a project that still works when Wi-Fi gets weird in the venue. Message me if you want to pair for ShellHacks.$c$,
    'looking_for_team',
    'ShellHacks',
    date '2026-09-26',
    'remote',
    now() - interval '55 minutes'
  )
  on conflict (id) do nothing;

  insert into public.posts (
    id, user_id, content, context_label,
    team_event_name, team_event_date, team_event_mode, created_at
  )
  values (
    'b2222222-2222-4222-8222-222222222212',
    v_alex,
    $c$Looking for team — ShellHacks, frontend seat open.

I am solid on Next.js UI and motion, lighter on ML. Prefer in-person at FIU so we can whiteboard the flow before kickoff. If you have an idea around campus life, study matching, or accessibility, DM me and we can lock a team of 2–3.$c$,
    'looking_for_team',
    'ShellHacks',
    date '2026-09-26',
    'in_person',
    now() - interval '18 minutes'
  )
  on conflict (id) do nothing;

  insert into public.posts (
    id, user_id, content, context_label,
    team_event_name, team_event_date, team_event_mode, created_at
  )
  values (
    'b2222222-2222-4222-8222-222222222213',
    v_riley,
    $c$Looking for team — ShellHacks data / ML lane.

I can bring a small model + evaluation story; I need a product person or designer who will keep the UI honest. Remote-friendly. Goal is a judge-friendly demo, not a research paper. Message if you want to build something students would actually open twice.$c$,
    'looking_for_team',
    'ShellHacks',
    date '2026-09-26',
    'remote',
    now() - interval '8 minutes'
  )
  on conflict (id) do nothing;
end $$;

-- Smoke counts (read-only)
select
  (select count(*) from public.profiles where username like 'demo_sh_%') as demo_profiles,
  (select count(*) from public.posts where id::text like 'b2222222-2222-4222-8222-%' and context_label = 'stuck') as stuck_posts,
  (select count(*) from public.posts where id::text like 'b2222222-2222-4222-8222-%' and context_label = 'looking_for_team') as team_posts;
