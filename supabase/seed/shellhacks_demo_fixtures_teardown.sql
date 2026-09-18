-- =============================================================================
-- ShellHacks demo fixtures TEARDOWN (demo rows only)
-- =============================================================================
-- Deletes ONLY the five fixed demo UUIDs / demo_sh_* posts from this seed.
-- Does not touch any other auth.users or profiles.
--
-- Same opt-in guards as the seed. Never run on hosted prod.
--
--   select set_config('samehere.allow_demo_seed', 'true', true);
--   select set_config('samehere.demo_seed_target', 'branch', true);
--   \i supabase/seed/shellhacks_demo_fixtures_teardown.sql
-- =============================================================================

do $$
declare
  v_allow text := current_setting('samehere.allow_demo_seed', true);
  v_target text := current_setting('samehere.demo_seed_target', true);
begin
  if v_allow is distinct from 'true' then
    raise exception
      'Refusing teardown: set samehere.allow_demo_seed=true. Never run on hosted prod.';
  end if;
  if v_target is distinct from 'branch' and v_target is distinct from 'local' then
    raise exception
      'Refusing teardown: set samehere.demo_seed_target to branch or local.';
  end if;
end $$;

-- Cascade: auth.users delete → profiles → posts / portfolio_settings / school
delete from auth.users
where id in (
  'a1111111-1111-4111-8111-111111111101',
  'a1111111-1111-4111-8111-111111111102',
  'a1111111-1111-4111-8111-111111111103',
  'a1111111-1111-4111-8111-111111111104',
  'a1111111-1111-4111-8111-111111111105'
);

-- Belt-and-suspenders if posts somehow orphaned
delete from public.posts
where id in (
  'b2222222-2222-4222-8222-222222222201',
  'b2222222-2222-4222-8222-222222222202',
  'b2222222-2222-4222-8222-222222222203',
  'b2222222-2222-4222-8222-222222222211',
  'b2222222-2222-4222-8222-222222222212',
  'b2222222-2222-4222-8222-222222222213'
);

select
  (select count(*) from public.profiles where username like 'demo_sh_%') as remaining_demo_profiles,
  (select count(*) from public.posts where id::text like 'b2222222-2222-4222-8222-%') as remaining_demo_posts;
