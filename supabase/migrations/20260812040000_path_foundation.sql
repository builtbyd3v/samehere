-- WS1: zero-to-internship path foundation — columns, progress tables,
-- content substrates (§5A), RLS, and AI quota kinds for intake / projects /
-- interview practice. No seed rows; clients own progress; curated catalogs
-- are authenticated SELECT on published=true only.

-- ============================================================
-- profiles.open_to_help — opt-in peer help on job detail
-- ============================================================
alter table public.profiles
  add column if not exists open_to_help boolean not null default false;

-- Column-scoped SELECT grant (profiles column-grants trap —
-- 20260711150000 / 20260716160000). Peers filter on this from job pages.
grant select (open_to_help) on public.profiles to authenticated;

-- ============================================================
-- experiences.company_slug — optional link into job_companies
-- ============================================================
alter table public.experiences
  add column if not exists company_slug text
  references public.job_companies(slug) on delete set null;

create index if not exists experiences_company_slug_idx
  on public.experiences (company_slug);

-- ============================================================
-- skill_tracks — curated stage tracks (authenticated read published)
-- ============================================================
create table public.skill_tracks (
  id text primary key,
  title text not null,
  body jsonb not null,
  published boolean not null default true
);

alter table public.skill_tracks enable row level security;

create policy "skill_tracks published read" on public.skill_tracks
  for select to authenticated
  using (published = true);

revoke all on table public.skill_tracks from anon;
grant select on table public.skill_tracks to authenticated;

-- ============================================================
-- path_projects — native project catalog
-- ============================================================
create table public.path_projects (
  slug text primary key,
  title text not null,
  difficulty text not null,
  time_hours int[2] not null,
  languages text[] not null default '{}',
  stack text[] not null default '{}',
  domain text not null,
  body jsonb not null,
  fits_stages text[] not null default '{}',
  target_role_tags text[] not null default '{}',
  published boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint path_projects_time_hours_len check (array_length(time_hours, 1) = 2)
);

alter table public.path_projects enable row level security;

create policy "path_projects published read" on public.path_projects
  for select to authenticated
  using (published = true);

revoke all on table public.path_projects from anon;
grant select on table public.path_projects to authenticated;

-- ============================================================
-- intake_responses — append-only raw intake (unique user_id + version)
-- ============================================================
create table public.intake_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  version int not null,
  answers jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, version)
);

alter table public.intake_responses enable row level security;

create policy "intake_responses owner all" on public.intake_responses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on table public.intake_responses from anon;
grant select, insert, update, delete on table public.intake_responses to authenticated;

-- ============================================================
-- learner_profiles — current diagnosis + optional skill track/stage
-- ============================================================
create table public.learner_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  version int not null,
  diagnosis jsonb not null,
  skill_track_id text null references public.skill_tracks(id) on delete set null,
  skill_stage_id text null,
  updated_at timestamptz not null default now()
);

alter table public.learner_profiles enable row level security;

create policy "learner_profiles owner all" on public.learner_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on table public.learner_profiles from anon;
grant select, insert, update, delete on table public.learner_profiles to authenticated;

-- ============================================================
-- path_plans — active PathPlanUi + rationale
-- ============================================================
create table public.path_plans (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  ui jsonb not null,
  rationale text,
  source_intake_id uuid references public.intake_responses(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.path_plans enable row level security;

create policy "path_plans owner all" on public.path_plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on table public.path_plans from anon;
grant select, insert, update, delete on table public.path_plans to authenticated;

-- ============================================================
-- path_tasks — per-user checklist items
-- ============================================================
create table public.path_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  module_id text not null,
  title text not null,
  detail text,
  status text not null check (status in ('todo', 'doing', 'done', 'skipped')),
  sort_index int not null default 0,
  due_on date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index path_tasks_user_id_status_idx on public.path_tasks (user_id, status);

alter table public.path_tasks enable row level security;

create policy "path_tasks owner all" on public.path_tasks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on table public.path_tasks from anon;
grant select, insert, update, delete on table public.path_tasks to authenticated;

-- ============================================================
-- applications — internship/job tracker
-- ============================================================
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid null references public.job_listings(id) on delete set null,
  org text not null,
  role text not null,
  status text not null check (status in (
    'wishlist', 'applied', 'oa', 'interview', 'offer', 'rejected', 'withdrawn'
  )),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_user_id_status_idx on public.applications (user_id, status);

alter table public.applications enable row level security;

create policy "applications owner all" on public.applications
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on table public.applications from anon;
grant select, insert, update, delete on table public.applications to authenticated;

-- ============================================================
-- user_projects — assigned/progress against path_projects
-- ============================================================
create table public.user_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_slug text not null references public.path_projects(slug) on delete cascade,
  status text not null check (status in ('assigned', 'doing', 'done', 'skipped')),
  checklist_state jsonb not null default '{}'::jsonb,
  linked_path_task_id uuid null references public.path_tasks(id) on delete set null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, project_slug)
);

create index user_projects_user_id_status_idx on public.user_projects (user_id, status);

alter table public.user_projects enable row level security;

create policy "user_projects owner all" on public.user_projects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on table public.user_projects from anon;
grant select, insert, update, delete on table public.user_projects to authenticated;

-- ============================================================
-- company_interview_banks — curated Q banks keyed by job_companies.slug
-- ============================================================
create table public.company_interview_banks (
  company_slug text primary key references public.job_companies(slug) on delete cascade,
  process_summary text not null,
  questions jsonb not null,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.company_interview_banks enable row level security;

create policy "company_interview_banks published read" on public.company_interview_banks
  for select to authenticated
  using (published = true);

revoke all on table public.company_interview_banks from anon;
grant select on table public.company_interview_banks to authenticated;

-- ============================================================
-- interview_practice — owner written answers + AI feedback
-- ============================================================
create table public.interview_practice (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_slug text not null references public.company_interview_banks(company_slug) on delete cascade,
  question_id text not null,
  answer text,
  ai_feedback text,
  created_at timestamptz not null default now()
);

alter table public.interview_practice enable row level security;

create policy "interview_practice owner all" on public.interview_practice
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on table public.interview_practice from anon;
grant select, insert, update, delete on table public.interview_practice to authenticated;

-- ============================================================
-- ai_usage.kind — extend CHECK for path quota kinds (keep existing)
-- ============================================================
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
    'job_pitch'::text,
    'intake_diagnosis'::text,
    'rediagnosis'::text,
    'project_plan'::text,
    'interview_prep'::text,
    'interview_feedback'::text,
    'path_task_nudge'::text
  ]));

-- ============================================================
-- use_ai_quota — keep existing caps; add path kinds from §8
-- Latest prior body: 20260719130000_job_listings.sql
-- ============================================================
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
    when p_kind = 'intake_diagnosis' then case when v_pro then 150 else 1 end
    when p_kind = 'rediagnosis' then case when v_pro then 150 else 0 end
    when p_kind = 'project_plan' then case when v_pro then 150 else 1 end
    when p_kind = 'interview_prep' then case when v_pro then 150 else 0 end
    when p_kind = 'interview_feedback' then case when v_pro then 150 else 2 end
    when p_kind = 'path_task_nudge' then case when v_pro then 150 else 1 end
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
