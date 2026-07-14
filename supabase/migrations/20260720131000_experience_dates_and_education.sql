-- Work experience overhaul:
--   * structured start/end dates on experiences (replacing freeform `term`,
--     which is kept as a read-only legacy fallback for pre-existing rows),
--   * a wider description cap (the UI relabels `note` -> "Description" and
--     supports one-bullet-per-line),
--   * a new `education` table -- a separate profile section, same visibility
--     and RLS shape as `experiences`.

-- ============================================================
-- experiences: structured dates + wider description
-- ============================================================
-- Month+year granularity; day component is always 01. end_date NULL = "Present".
alter table public.experiences
  add column start_date date,
  add column end_date date;

-- Bump the note ("Description") cap 280 -> 600 so multi-line bullet text fits.
-- Prod is dashboard-built (its check constraint name may differ from this
-- reconstruction file), so discover the note check by definition rather than
-- assuming a name; the CI replay harness hits the same path.
do $$
declare c text;
begin
  select conname into c from pg_constraint
   where conrelid = 'public.experiences'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%note%';
  if c is not null then
    execute 'alter table public.experiences drop constraint ' || quote_ident(c);
  end if;
end $$;

alter table public.experiences
  add constraint experiences_note_check check (note is null or char_length(note) <= 600);

-- New columns are covered by the existing table-level grant to `authenticated`
-- (grants are table-scoped here, not column-scoped) -- no per-column grant
-- needed, unlike the profiles column-grant trap.

-- ============================================================
-- education: new profile section (mirrors experiences)
-- ============================================================
create table public.education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  school text not null check (char_length(school) <= 80),
  degree text check (degree is null or char_length(degree) <= 80),
  field text check (field is null or char_length(field) <= 80),
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

alter table public.education enable row level security;

-- Cap 5 rows/user. Plain (non-definer) trigger fn: runs as the calling role,
-- and the owner SELECT policy below lets a user count their own rows -- same
-- shape as experiences_cap, no privilege escalation needed.
create function public.education_cap()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if (select count(*) from public.education where user_id = new.user_id) >= 5 then
    raise exception 'limit: at most 5 education entries per user';
  end if;
  return new;
end;
$function$;

create trigger education_cap_trg
  before insert on public.education
  for each row execute function public.education_cap();

revoke all on function public.education_cap() from public;

-- RLS: owner ALL (auth.uid() = user_id both sides); SELECT to any signed-in
-- user (mirrors bio/experiences visibility -- no privacy tier on this table).
create policy "education owner all" on public.education
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "education read" on public.education
  for select to authenticated
  using (true);

revoke all on table public.education from anon;
grant select, insert, delete on table public.education to authenticated;
-- Default-privileges trap: schema-level defaults grant ALL (incl. TRUNCATE and
-- UPDATE) to authenticated on new tables regardless of the grant list above.
-- v1 is delete + re-add (no inline edit), so strip everything outside the
-- intended surface explicitly.
revoke truncate, update, references, trigger on table public.education from authenticated;
