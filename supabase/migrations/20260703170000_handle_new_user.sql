-- handle_new_user: create the public.profiles row for every new auth.users row.
-- Fires on signup and claims the username that signUp() stashes in metadata
-- (options.data.username -> raw_user_meta_data->>'username'). Without this trigger
-- a confirmed auth user has no profile, and every page that reads profiles 404s.
--
-- Why this migration exists (issue #1, "USER CREATION BROKEN"): signups were
-- failing with the generic Supabase "Database error saving new user". That
-- message surfaces whenever this trigger's INSERT raises, and the usual root
-- cause is the function lacking the privilege to write past Row Level Security
-- on public.profiles. SECURITY DEFINER is the canonical fix — the function runs
-- as its owner, so the controlled insert is allowed even though profiles has RLS
-- and the signing-up user has no session yet. `set search_path = ''` pins every
-- object to an explicit schema so a caller-controlled path can't redirect it.
--
-- The insert lists only the NOT NULL columns (id, username); every other
-- profiles column is nullable or defaulted and is filled in later from the
-- edit-profile form. username is lowercased to match the server-side validation
-- and the DB charset/reserved CHECKs.
--
-- Idempotent: CREATE OR REPLACE the function, then drop + recreate the trigger,
-- so re-running the migration is a no-op.

create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $function$
begin
  insert into public.profiles (id, username)
  values (new.id, lower(new.raw_user_meta_data->>'username'));
  return new;
end;
$function$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
