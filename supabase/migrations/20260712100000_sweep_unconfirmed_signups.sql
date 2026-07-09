-- Username squatting (CLAUDE.md, Security item 10).
--
-- handle_new_user() claims the username the moment auth.users gets a row, which
-- is before the email is confirmed. Anyone with a throwaway .edu address can
-- therefore hold `nike`, `admin_`, or a real student's name forever by signing
-- up and never clicking the link. Nothing ever reaped the row.
--
-- Of the three options in CLAUDE.md item 10 -- create the profile on
-- confirmation, allow renames, or sweep unconfirmed signups -- this takes the
-- sweep. Creating the profile on confirmation would break every path that
-- assumes a profile exists immediately after signup (the referral attribution
-- already had to be moved to confirmation for exactly that reason), and renames
-- are a product decision, not a security fix.
--
-- 72 hours, against a confirmation link that GoTrue expires at 24. Nothing a
-- real user could still act on is destroyed; a squatter's hold on a username
-- drops from forever to three days.
--
-- ponytail: a daily cron sweep, not a reservation system. If squatting becomes
-- an actual problem rather than a theoretical one, shorten the window before
-- building anything.

-- 1. auth.users deletes must reach profiles, or the sweep raises on the FK.
--    Everything downstream (posts, comments, follows, ...) already cascades off
--    profiles, so this one edge completes the chain. It is also what makes
--    delete_my_account()'s eventual auth-user purge work.
alter table public.profiles drop constraint profiles_id_fkey;
alter table public.profiles
  add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade;

-- 2. The sweep. SECURITY DEFINER because auth.users is not writable by any API
--    role -- and must never become so. Revoked from every API role below; the
--    only caller is cron, which runs as the postgres role that owns this.
create or replace function public.sweep_unconfirmed_signups()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  swept integer;
begin
  with gone as (
    delete from auth.users
    where email_confirmed_at is null
      and phone_confirmed_at is null
      and created_at < now() - interval '72 hours'
    returning 1
  )
  select count(*) into swept from gone;

  return swept;
end;
$$;

revoke all on function public.sweep_unconfirmed_signups() from public, anon, authenticated;

comment on function public.sweep_unconfirmed_signups() is
  'Frees usernames held by signups that never confirmed their email. Cron-only; see 20260712100000.';

-- 3. Daily, offset from expire-lapsed-pro so the two never contend.
select cron.unschedule('sweep-unconfirmed-signups')
where exists (select 1 from cron.job where jobname = 'sweep-unconfirmed-signups');

select cron.schedule(
  'sweep-unconfirmed-signups',
  '41 4 * * *',
  $cron$select public.sweep_unconfirmed_signups()$cron$
);
