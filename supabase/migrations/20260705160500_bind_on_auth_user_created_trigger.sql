-- Bind handle_new_user() to auth.users INSERT.
--
-- This trigger is dashboard-era -- created via the Supabase dashboard (like
-- on_auth_user_confirmed, which a later migration formalizes at 20260711160000)
-- -- and no tracked migration ever created it. 00000000000000_baseline's own
-- header flagged this as a required follow-up: without the trigger a fresh
-- replay has auth.users signups NOT populate public.profiles, which breaks
-- supabase/tests/rls_test.sql (it seeds auth.users and relies on the matching
-- profiles rows being auto-created).
--
-- handle_new_user() is first defined by 20260705160000 (this migration is
-- timestamped immediately after) and later create-or-replace'd several times;
-- the trigger binds by function name, so it always invokes the current version.
-- Idempotent (create or replace) and a no-op on the live DB, which already has
-- this trigger.
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
