-- Job board enrichment: richer listing fields from the SimplifyJobs feed
-- (category / sponsorship / degrees), scraped-at-ingest description snippets
-- (Greenhouse / Lever / Ashby public APIs), and a per-company cache
-- (simplify company page: logo + one-line description). All written by the
-- admin-client ingest cron only; clients read.

alter table public.job_listings
  add column category text,
  add column sponsorship text,
  add column degrees text,
  add column description text,
  add column company_slug text;

-- One row per simplify company slug. enriched_at marks the scrape attempt so
-- failures aren't retried on every cron run.
create table public.job_companies (
  slug text primary key,
  name text not null,
  logo_url text,
  description text,
  enriched_at timestamptz
);

alter table public.job_companies enable row level security;

create policy "job_companies read" on public.job_companies
  for select to authenticated
  using (true);

revoke all on table public.job_companies from anon;
grant select on table public.job_companies to authenticated;
