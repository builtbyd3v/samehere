-- Task D1: job board infra — public.job_listings (ingested by an admin-client
-- cron, no client writes), plus per-user job_fit / job_pitch AI caches
-- (mirrors ai_connection_prompts — 20260703180000_ai_infra.sql). Adds two
-- use_ai_quota kinds: job_fit (free 3 / pro 150) and job_pitch (Pro-only,
-- free 0 / pro 150).

-- ============================================================
-- job_listings: ingest cron writes with the admin/service client, which
-- bypasses RLS entirely -- so there are no insert/update/delete policies
-- here on purpose. Every signed-in user can read the active board.
-- ============================================================
create table public.job_listings (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('simplify', 'greenhouse', 'manual')),
  external_id text not null,
  org text not null,
  title text not null,
  kind text not null check (kind in ('internship', 'new_grad')),
  locations text,
  term text,
  url text not null,
  posted_at timestamptz,
  last_seen_at timestamptz not null default now(),
  active boolean not null default true,
  unique (source, external_id)
);

create index job_listings_active_posted_at_idx on public.job_listings (active, posted_at desc);

alter table public.job_listings enable row level security;

create policy "job_listings read" on public.job_listings
  for select to authenticated
  using (true);

revoke all on table public.job_listings from anon;
grant select on table public.job_listings to authenticated;

-- ============================================================
-- job_fit / job_pitch: per-(user, listing) AI cache, same shape as
-- ai_connection_prompts -- owner-only, no cross-user read.
-- ============================================================
create table public.job_fit (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.job_listings(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.job_fit enable row level security;

create policy "job_fit owner all" on public.job_fit
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on table public.job_fit from anon;
grant select, insert, update, delete on table public.job_fit to authenticated;

create table public.job_pitches (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.job_listings(id) on delete cascade,
  pitch text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.job_pitches enable row level security;

create policy "job_pitches owner all" on public.job_pitches
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on table public.job_pitches from anon;
grant select, insert, update, delete on table public.job_pitches to authenticated;

-- ai_usage.kind CHECK (20260708191603_ai_usage_kind_add_people_search.sql)
-- only allows the 6 existing kinds -- job_fit/job_pitch inserts inside
-- use_ai_quota would hit the CHECK and raise, not silently no-op. Add both.
alter table public.ai_usage drop constraint ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind = any (array[
    'connection_prompt'::text,
    'composer_nudge'::text,
    'profile_nudge'::text,
    'improve_post'::text,
    'icebreaker'::text,
    'people_search'::text,
    'job_fit'::text,
    'job_pitch'::text
  ]));

-- ============================================================
-- use_ai_quota: add job_fit / job_pitch kinds. Latest definition is
-- 20260715100000_raise_free_people_search_cap.sql (people_search 5/150,
-- everything else 3/150) -- CREATE OR REPLACE keeps the same signature
-- (p_kind text), so no drop needed, but per that migration's note the ACL
-- still needs the explicit re-grant tail every time this function is
-- recreated (CREATE OR REPLACE resets EXECUTE to PUBLIC).
--
-- job_fit: free 3 / pro 150, same as the other free-tier AI kinds.
-- job_pitch: Pro-only feature -- free 0 (never allowed), pro 150.
create or replace function public.use_ai_quota(p_kind text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_pro boolean;
  v_cap int;
  v_today date := (now() at time zone 'America/New_York')::date;
  v_count int;
begin
  if v_user is null then
    return false;
  end if;

  select public.is_pro_now(is_pro, pro_until) into v_pro
  from public.profiles where id = v_user;

  v_cap := case
    when p_kind = 'people_search' then case when v_pro then 150 else 5 end
    when p_kind = 'job_fit' then case when v_pro then 150 else 3 end
    when p_kind = 'job_pitch' then case when v_pro then 150 else 0 end
    else case when v_pro then 150 else 3 end
  end;

  insert into public.ai_usage (user_id, date, kind, count)
  values (v_user, v_today, p_kind, 1)
  on conflict (user_id, date, kind)
  do update set count = ai_usage.count + 1
  returning count into v_count;

  return v_count <= v_cap;
end;
$$;

revoke all on function public.use_ai_quota(text) from public, anon;
grant execute on function public.use_ai_quota(text) to authenticated;
