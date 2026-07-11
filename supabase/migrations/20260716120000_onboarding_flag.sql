-- Plan 021: first-run onboarding wizard. Nullable flag on profiles — NULL
-- means "not onboarded yet". Set by the viewer's own row update when they
-- finish or skip the wizard (ordinary owner-write RLS covers the UPDATE,
-- same as every other profile field).

alter table public.profiles add column if not exists onboarded_at timestamptz;

-- Own-row read (page.tsx checks it to skip the wizard for already-onboarded
-- users). SELECT on profiles is column-scoped since
-- 20260711150000_lock_down_profile_columns.sql, so a new column needs an
-- explicit grant or authenticated selects 42501. Not granted to anon — this
-- is only ever read from an authenticated session.
grant select (onboarded_at) on public.profiles to authenticated;
