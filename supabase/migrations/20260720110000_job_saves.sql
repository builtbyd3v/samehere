-- Plan 041: job saves. Jobs are multi-session hunting but had no save
-- primitive -- the 7-day active-listing sweep (ingest cron flips active=false
-- once a source stops surfacing a listing) can vaporize a listing a student
-- meant to apply to later. Mirrors job_fit's shape (20260719130000_job_listings.sql):
-- per-(user, listing) row, owner-only, PK doubles as the uniqueness constraint.
create table public.job_saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.job_listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index job_saves_user_created_idx on public.job_saves (user_id, created_at desc);

alter table public.job_saves enable row level security;

create policy "job_saves owner all" on public.job_saves
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on table public.job_saves from anon;
grant select, insert, delete on table public.job_saves to authenticated;
-- Default-privileges trap: schema-level defaults grant ALL (incl. TRUNCATE and
-- UPDATE) to authenticated on new tables regardless of the grant list above.
-- Strip everything outside the intended surface explicitly.
revoke truncate, update, references, trigger on table public.job_saves from authenticated;
