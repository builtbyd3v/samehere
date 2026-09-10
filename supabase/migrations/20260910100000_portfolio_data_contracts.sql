-- Portfolio / GitHub-analysis data contracts.
-- Prepared locally. Not applied. Live .env.local is not a disposable target.
--
-- Caps (UTC month / UTC day) live in reserve_repository_analysis:
--   success 1 free / 10 Pro; attempts 8 free / 24 Pro; lease 90s.
-- Clients cannot pass tier, cap, owner, or charged amount.

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create function public.portfolio_http_url_ok(p text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p is null or (char_length(p) <= 2048 and p ~* '^https?://\S+$');
$$;

create function public.portfolio_section_order_ok(p text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p is not null
    and cardinality(p) = 6
    and p <@ array['intro','projects','activity','experience','education','posts']::text[]
    and array['intro','projects','activity','experience','education','posts']::text[] <@ p;
$$;

create function public.portfolio_text_array_ok(p text[], p_max int, p_item_max int)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p is not null
    and cardinality(p) <= p_max
    and not exists (
      select 1 from unnest(p) as t
      where t is null or length(btrim(t)) = 0 or char_length(t) > p_item_max
    );
$$;

create function public.portfolio_analysis_caps()
returns table (
  month_timezone text,
  free_success_per_month int,
  pro_success_per_month int,
  free_attempts_per_day int,
  pro_attempts_per_day int,
  lease_seconds int,
  queued_seconds int
)
language sql
immutable
set search_path = ''
as $$
  -- Keep identical to ANALYSIS_QUOTA in types/portfolio.ts.
  select 'UTC', 1, 10, 8, 24, 90, 120;
$$;

create function public.portfolio_publicly_readable_to(p_owner uuid, p_viewer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_owner
      and p.is_private = false
      and p.is_suspended = false
      and (
        p_viewer is null
        or not exists (
          select 1 from public.blocks b
          where (b.blocker_id = p_viewer and b.blocked_id = p_owner)
             or (b.blocker_id = p_owner and b.blocked_id = p_viewer)
        )
      )
  );
$$;

create function public.portfolio_publicly_readable(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.portfolio_publicly_readable_to(p_owner, auth.uid());
$$;

revoke all on function public.portfolio_http_url_ok(text) from public;
revoke all on function public.portfolio_section_order_ok(text[]) from public;
revoke all on function public.portfolio_text_array_ok(text[], int, int) from public;
revoke all on function public.portfolio_analysis_caps() from public;
revoke all on function public.portfolio_publicly_readable_to(uuid, uuid) from public, anon, authenticated;
revoke all on function public.portfolio_publicly_readable(uuid) from public;
grant execute on function public.portfolio_http_url_ok(text) to anon, authenticated;
grant execute on function public.portfolio_section_order_ok(text[]) to anon, authenticated;
grant execute on function public.portfolio_text_array_ok(text[], int, int) to anon, authenticated;
grant execute on function public.portfolio_analysis_caps() to authenticated;
grant execute on function public.portfolio_publicly_readable_to(uuid, uuid) to service_role;
grant execute on function public.portfolio_publicly_readable(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- posts.context_label + profiles.open_to
-- ---------------------------------------------------------------------------
alter table public.posts
  add column if not exists context_label text;

alter table public.posts
  add constraint posts_context_label_allowed
  check (context_label is null or context_label in ('building', 'learning', 'stuck'));

create or replace function public.guard_post_context_label_only()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if current_user in ('authenticated', 'anon') then
    new.id := old.id;
    new.user_id := old.user_id;
    new.content := old.content;
    new.created_at := old.created_at;
    new.hidden := old.hidden;
    new.media := old.media;
    new.post_type := old.post_type;
  end if;
  return new;
end;
$function$;

drop trigger if exists guard_post_context_label_only on public.posts;
create trigger guard_post_context_label_only
  before update on public.posts
  for each row execute function public.guard_post_context_label_only();

revoke all on function public.guard_post_context_label_only() from public;

drop policy if exists "users update own post label" on public.posts;
create policy "users update own post label" on public.posts
for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant update (context_label) on public.posts to authenticated;

alter table public.profiles
  add column if not exists open_to text[] not null default '{}';

alter table public.profiles
  add constraint profiles_open_to_allowed
  check (
    open_to <@ array['collaborate', 'study', 'feedback']::text[]
    and cardinality(open_to) <= 3
  );

grant select (open_to) on public.profiles to authenticated, anon;

-- ---------------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------------
create table public.portfolio_settings (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  publish_intro boolean not null default false,
  publish_projects boolean not null default false,
  publish_activity boolean not null default false,
  publish_experience boolean not null default false,
  publish_education boolean not null default false,
  publish_posts boolean not null default false,
  allow_indexing boolean not null default false,
  section_order text[] not null default array['intro','projects','activity','experience','education','posts']::text[],
  updated_at timestamptz not null default now(),
  version int not null default 1,
  constraint portfolio_settings_section_order_ok
    check (public.portfolio_section_order_ok(section_order))
);

create function public.touch_portfolio_settings()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$function$;

create trigger touch_portfolio_settings
  before update on public.portfolio_settings
  for each row execute function public.touch_portfolio_settings();

revoke all on function public.touch_portfolio_settings() from public;

create function public.portfolio_activity_readable(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    left join public.portfolio_settings s on s.owner_id = p.id
    where p.id = p_owner
      and coalesce(s.publish_activity, false)
      and p.is_private = false
      and p.is_suspended = false
      and (
        auth.uid() is null
        or p_owner not in (select public.get_blocked_ids())
      )
      and (
        p.heatmap_visibility = 'public'
        or (
          auth.uid() is not null
          and exists (
            select 1 from public.follows f
            where f.following_id = p_owner
              and f.follower_id = auth.uid()
              and f.status = 'accepted'
          )
        )
      )
  );
$$;

revoke all on function public.portfolio_activity_readable(uuid) from public;
grant execute on function public.portfolio_activity_readable(uuid) to anon, authenticated;

create table public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  summary text check (summary is null or char_length(summary) <= 500),
  description text check (description is null or char_length(description) <= 4000),
  personal_role text check (personal_role is null or char_length(personal_role) <= 1000),
  technologies text[] not null default '{}',
  key_features text[] not null default '{}',
  repo_url text,
  demo_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order int not null default 0,
  published_at timestamptz,
  source_repository_id bigint,
  source_commit_sha text,
  source_analysis_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_projects_technologies_ok
    check (public.portfolio_text_array_ok(technologies, 12, 40)),
  constraint portfolio_projects_features_ok
    check (public.portfolio_text_array_ok(key_features, 6, 160)),
  constraint portfolio_projects_repo_url_ok
    check (public.portfolio_http_url_ok(repo_url)),
  constraint portfolio_projects_demo_url_ok
    check (public.portfolio_http_url_ok(demo_url)),
  constraint portfolio_projects_publish_role
    check (status = 'draft' or char_length(btrim(coalesce(personal_role, ''))) > 0)
);

create function public.touch_portfolio_project()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.status = 'published' then
    if new.published_at is null then
      new.published_at := now();
    end if;
  else
    new.published_at := null;
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

create trigger touch_portfolio_project
  before insert or update on public.portfolio_projects
  for each row execute function public.touch_portfolio_project();

revoke all on function public.touch_portfolio_project() from public;

create index portfolio_projects_owner_sort_idx
  on public.portfolio_projects (owner_id, sort_order, id);
create index portfolio_projects_owner_published_idx
  on public.portfolio_projects (owner_id)
  where status = 'published';

create table public.github_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  github_user_id bigint not null,
  github_login text not null check (char_length(github_login) between 1 and 80),
  epoch int not null default 1 check (epoch >= 1),
  status text not null default 'connected'
    check (status in ('connected', 'reauthorization_needed', 'disconnected')),
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  sync_cursor text,
  last_sync_error text,
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index github_connections_active_user_idx
  on public.github_connections (github_user_id)
  where status <> 'disconnected';

create table public.github_contribution_days (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.github_connections(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  contribution_date date not null,
  contribution_count int not null default 0 check (contribution_count >= 0),
  contribution_level int not null default 0 check (contribution_level between 0 and 4),
  fetched_at timestamptz not null default now(),
  unique (connection_id, contribution_date)
);

create index github_contribution_days_owner_date_idx
  on public.github_contribution_days (owner_id, contribution_date);

create table public.repository_analyses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.portfolio_projects(id) on delete set null,
  connection_id uuid not null references public.github_connections(id) on delete cascade,
  connection_epoch int not null,
  repository_id bigint not null,
  repository_full_name text,
  commit_sha text not null,
  request_key text not null,
  prompt_version text not null,
  status text not null default 'queued'
    check (status in (
      'queued', 'reading_repository', 'analyzing', 'saving_draft',
      'succeeded', 'failed', 'cancelled'
    )),
  attempt_id uuid not null default gen_random_uuid(),
  parent_analysis_id uuid references public.repository_analyses(id) on delete set null,
  parent_attempt_id uuid,
  lease_owner text,
  lease_expires_at timestamptz,
  draft jsonb,
  evidence jsonb,
  coverage jsonb,
  model text,
  token_input int,
  token_output int,
  estimated_cost_usd numeric(12, 6),
  safe_error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (owner_id, request_key)
);

create unique index repository_analyses_one_active_owner
  on public.repository_analyses (owner_id)
  where status in ('queued', 'reading_repository', 'analyzing', 'saving_draft');

create index repository_analyses_reuse_idx
  on public.repository_analyses (owner_id, repository_id, commit_sha, prompt_version)
  where status = 'succeeded';

create table public.repository_analysis_usage (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  month date not null,
  analysis_id uuid not null unique references public.repository_analyses(id) on delete cascade,
  reserved_at timestamptz not null default now(),
  settled_at timestamptz,
  settlement text not null default 'pending'
    check (settlement in ('pending', 'success', 'released', 'abuse')),
  counts_toward_success boolean not null default false,
  token_input int,
  token_output int,
  estimated_cost_usd numeric(12, 6),
  model text,
  prompt_version text
);

create index repository_analysis_usage_owner_month_idx
  on public.repository_analysis_usage (owner_id, month);

create table public.portfolio_daily_metrics (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.portfolio_projects(id) on delete cascade,
  metric_date date not null,
  view_count int not null default 0 check (view_count >= 0),
  click_count int not null default 0 check (click_count >= 0)
);

create unique index portfolio_daily_metrics_profile_day
  on public.portfolio_daily_metrics (owner_id, metric_date)
  where project_id is null;

create unique index portfolio_daily_metrics_project_day
  on public.portfolio_daily_metrics (owner_id, project_id, metric_date)
  where project_id is not null;

alter table public.portfolio_projects
  add constraint portfolio_projects_source_analysis_fkey
  foreign key (source_analysis_id) references public.repository_analyses(id) on delete set null;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table private.github_credentials (
  connection_id uuid primary key references public.github_connections(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  connection_epoch int not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  expires_at timestamptz,
  key_version int not null default 1,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------
alter table public.portfolio_settings enable row level security;
alter table public.portfolio_projects enable row level security;
alter table public.github_connections enable row level security;
alter table public.github_contribution_days enable row level security;
alter table public.repository_analyses enable row level security;
alter table public.repository_analysis_usage enable row level security;
alter table public.portfolio_daily_metrics enable row level security;
alter table private.github_credentials enable row level security;

revoke all on table public.portfolio_settings from public, anon, authenticated;
revoke all on table public.portfolio_projects from public, anon, authenticated;
revoke all on table public.github_connections from public, anon, authenticated;
revoke all on table public.github_contribution_days from public, anon, authenticated;
revoke all on table public.repository_analyses from public, anon, authenticated;
revoke all on table public.repository_analysis_usage from public, anon, authenticated;
revoke all on table public.portfolio_daily_metrics from public, anon, authenticated;
revoke all on table private.github_credentials from public, anon, authenticated;
grant all on table private.github_credentials to service_role;

grant select, insert, update, delete on table public.portfolio_settings to authenticated;
grant select, insert, update, delete on table public.portfolio_projects to authenticated;
grant select (
  id, owner_id, github_user_id, github_login, epoch, status,
  connected_at, last_synced_at, last_sync_error, last_error_at,
  created_at, updated_at
) on public.github_connections to authenticated;
grant select on table public.github_contribution_days to authenticated;
grant select on table public.repository_analyses to authenticated;
grant select on table public.portfolio_daily_metrics to authenticated;

create policy "portfolio_settings owner all" on public.portfolio_settings
  for all
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "portfolio_projects owner write" on public.portfolio_projects
  for insert
  with check ((select auth.uid()) = owner_id);

create policy "portfolio_projects owner update" on public.portfolio_projects
  for update
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "portfolio_projects owner delete" on public.portfolio_projects
  for delete
  using ((select auth.uid()) = owner_id);

-- Owner-only table SELECT. Other users use get_public_portfolio_projects.
create policy "portfolio_projects select" on public.portfolio_projects
  for select
  using ((select auth.uid()) = owner_id);

create policy "github_connections owner select" on public.github_connections
  for select
  using ((select auth.uid()) = owner_id);

-- Owner-only table SELECT. Other users use get_public_github_contributions.
create policy "github_contribution_days select" on public.github_contribution_days
  for select
  using ((select auth.uid()) = owner_id);

create policy "repository_analyses owner select" on public.repository_analyses
  for select
  using ((select auth.uid()) = owner_id);

create policy "portfolio_daily_metrics owner select" on public.portfolio_daily_metrics
  for select
  using ((select auth.uid()) = owner_id);

-- usage + credentials: zero client policies (service_role / definer only)

-- ---------------------------------------------------------------------------
-- public projection RPCs (re-check visibility in-body)
-- ---------------------------------------------------------------------------
create function public.get_public_portfolio(p_username text)
returns table (
  owner_id uuid,
  username text,
  is_private boolean,
  allow_indexing boolean,
  publish_intro boolean,
  publish_projects boolean,
  publish_activity boolean,
  publish_experience boolean,
  publish_education boolean,
  publish_posts boolean,
  activity_visible boolean,
  section_order text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.username,
    p.is_private,
    (not p.is_private) and coalesce(s.allow_indexing, false),
    (not p.is_private) and coalesce(s.publish_intro, false),
    (not p.is_private) and coalesce(s.publish_projects, false),
    (not p.is_private) and coalesce(s.publish_activity, false),
    (not p.is_private) and coalesce(s.publish_experience, false),
    (not p.is_private) and coalesce(s.publish_education, false),
    (not p.is_private) and coalesce(s.publish_posts, false),
    public.portfolio_activity_readable(p.id),
    coalesce(s.section_order, array['intro','projects','activity','experience','education','posts']::text[])
  from public.profiles p
  left join public.portfolio_settings s on s.owner_id = p.id
  where lower(p.username) = lower(p_username)
    and p.is_suspended = false
    and (
      auth.uid() is null
      or p.id not in (select public.get_blocked_ids())
    );
$$;

create function public.get_public_portfolio_projects(p_username text)
returns table (
  id uuid,
  owner_id uuid,
  title text,
  summary text,
  description text,
  personal_role text,
  technologies text[],
  key_features text[],
  repo_url text,
  demo_url text,
  published_at timestamptz,
  sort_order int
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pr.id, pr.owner_id, pr.title, pr.summary, pr.description, pr.personal_role,
    pr.technologies, pr.key_features, pr.repo_url, pr.demo_url,
    pr.published_at, pr.sort_order
  from public.portfolio_projects pr
  join public.profiles p on p.id = pr.owner_id
  join public.portfolio_settings s on s.owner_id = pr.owner_id
  where lower(p.username) = lower(p_username)
    and pr.status = 'published'
    and s.publish_projects
    and public.portfolio_publicly_readable(pr.owner_id)
  order by pr.sort_order, pr.id;
$$;

create function public.get_public_portfolio_experience(p_username text)
returns table (
  id uuid,
  kind text,
  org text,
  role text,
  term text,
  note text,
  start_date date,
  end_date date,
  is_current boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.kind, e.org, e.role, e.term, e.note, e.start_date, e.end_date, e.is_current
  from public.experiences e
  join public.profiles p on p.id = e.user_id
  join public.portfolio_settings s on s.owner_id = e.user_id
  where lower(p.username) = lower(p_username)
    and s.publish_experience
    and public.portfolio_publicly_readable(e.user_id)
  order by e.start_date desc nulls last, e.id;
$$;

create function public.get_public_portfolio_education(p_username text)
returns table (
  id uuid,
  school text,
  degree text,
  field text,
  class_year text,
  start_date date,
  end_date date,
  is_current boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select ed.id, ed.school, ed.degree, ed.field, ed.class_year, ed.start_date, ed.end_date, ed.is_current
  from public.education ed
  join public.profiles p on p.id = ed.user_id
  join public.portfolio_settings s on s.owner_id = ed.user_id
  where lower(p.username) = lower(p_username)
    and s.publish_education
    and public.portfolio_publicly_readable(ed.user_id)
  order by ed.start_date desc nulls last, ed.id;
$$;

create function public.get_public_github_contributions(p_username text)
returns table (
  connection_id uuid,
  owner_id uuid,
  contribution_date date,
  contribution_count int,
  contribution_level int,
  fetched_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select d.connection_id, d.owner_id, d.contribution_date,
         d.contribution_count, d.contribution_level, d.fetched_at
  from public.github_contribution_days d
  join public.profiles p on p.id = d.owner_id
  join public.github_connections c on c.id = d.connection_id
  where lower(p.username) = lower(p_username)
    and c.status = 'connected'
    and public.portfolio_activity_readable(d.owner_id)
  order by d.contribution_date;
$$;

drop function if exists public.get_public_profile(text);
create function public.get_public_profile(p_username text)
returns table(
  id uuid, username text, display_name text, avatar_url text, banner_url text,
  accent_color text, is_pro boolean, is_founder boolean, is_campus_founder boolean,
  is_private boolean, heatmap_visibility text,
  year text, major text, bio text, goals text, school text,
  verified_student boolean, is_bot boolean, open_to text[]
)
language sql security definer set search_path = '' stable as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    case when p.is_suspended then null
         when public.is_pro_now(p.is_pro, p.pro_until) then p.banner_url end,
    case when p.is_suspended then null
         when public.is_pro_now(p.is_pro, p.pro_until) then p.accent_color end,
    public.is_pro_now(p.is_pro, p.pro_until) and not p.is_suspended,
    p.is_founder,
    p.is_campus_founder,
    p.is_private,
    p.heatmap_visibility,
    case when p.is_private or p.is_suspended then null else p.year end,
    case when p.is_private or p.is_suspended then null else p.major end,
    case when p.is_private or p.is_suspended then null else p.bio end,
    case when p.is_private or p.is_suspended then null else p.goals end,
    case when p.is_private or p.is_suspended or p.hide_school then null else ps.school end,
    p.verified_student,
    p.is_bot,
    case when p.is_private or p.is_suspended then null else p.open_to end
  from public.profiles p
  left join public.profile_school ps on ps.profile_id = p.id
  where lower(p.username) = lower(p_username)
    and (
      auth.uid() is null
      or p.id not in (select public.get_blocked_ids())
    );
$$;

drop function if exists public.get_public_post(uuid);
create function public.get_public_post(p_id uuid)
returns table(
  id uuid, content text, created_at timestamptz,
  author_id uuid, author_username text, author_display_name text, author_avatar_url text,
  author_is_pro boolean, author_is_founder boolean, author_is_campus_founder boolean,
  samehere_count bigint, repost_count bigint,
  author_verified_student boolean, author_is_bot boolean, context_label text
)
language sql security definer set search_path = '' stable as $$
  select
    po.id,
    po.content,
    po.created_at,
    a.id,
    a.username,
    a.display_name,
    a.avatar_url,
    public.is_pro_now(a.is_pro, a.pro_until),
    a.is_founder,
    a.is_campus_founder,
    (select count(*) from public.reactions r where r.post_id = po.id and r.type = 'samehere'),
    (select count(*) from public.reposts   rp where rp.post_id = po.id),
    a.verified_student,
    a.is_bot,
    po.context_label
  from public.posts po
  join public.profiles a on a.id = po.user_id
  where po.id = p_id
    and a.is_private = false
    and a.is_suspended = false
    and po.hidden = false
    and (
      auth.uid() is null
      or a.id not in (select public.get_blocked_ids())
    );
$$;

revoke all on function public.get_public_portfolio(text) from public;
revoke all on function public.get_public_portfolio_projects(text) from public;
revoke all on function public.get_public_portfolio_experience(text) from public;
revoke all on function public.get_public_portfolio_education(text) from public;
revoke all on function public.get_public_github_contributions(text) from public;
revoke all on function public.get_public_profile(text) from public;
revoke all on function public.get_public_post(uuid) from public;
grant execute on function public.get_public_portfolio(text) to anon, authenticated;
grant execute on function public.get_public_portfolio_projects(text) to anon, authenticated;
grant execute on function public.get_public_portfolio_experience(text) to anon, authenticated;
grant execute on function public.get_public_portfolio_education(text) to anon, authenticated;
grant execute on function public.get_public_github_contributions(text) to anon, authenticated;
grant execute on function public.get_public_profile(text) to anon, authenticated;
grant execute on function public.get_public_post(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- owner + processor RPCs
-- ---------------------------------------------------------------------------
create function public.upsert_github_connection(
  p_owner_id uuid,
  p_github_user_id bigint,
  p_github_login text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_owner_id is null or p_github_user_id is null or btrim(coalesce(p_github_login, '')) = '' then
    raise exception 'invalid input';
  end if;

  insert into public.github_connections (owner_id, github_user_id, github_login, epoch, status)
  values (p_owner_id, p_github_user_id, btrim(p_github_login), 1, 'connected')
  on conflict (owner_id) do update set
    github_user_id = excluded.github_user_id,
    github_login = excluded.github_login,
    epoch = public.github_connections.epoch + 1,
    status = 'connected',
    last_sync_error = null,
    last_error_at = null,
    connected_at = now(),
    updated_at = now()
  returning id into v_id;

  delete from private.github_credentials where connection_id = v_id;
  return v_id;
end;
$$;

create function public.mark_github_connection_status(
  p_connection_id uuid,
  p_expected_epoch int,
  p_status text,
  p_safe_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('connected', 'reauthorization_needed') then
    raise exception 'invalid input';
  end if;
  update public.github_connections
  set status = p_status,
      last_sync_error = p_safe_error,
      last_error_at = case when p_safe_error is null then last_error_at else now() end,
      updated_at = now()
  where id = p_connection_id
    and epoch = p_expected_epoch;
  if not found then
    if exists (select 1 from public.github_connections where id = p_connection_id) then
      raise exception 'stale connection epoch';
    end if;
    raise exception 'not found';
  end if;
end;
$$;

create function public.upsert_github_contribution_day(
  p_connection_id uuid,
  p_expected_epoch int,
  p_date date,
  p_count int,
  p_level int
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_status text;
  v_epoch int;
begin
  select owner_id, status, epoch into v_owner, v_status, v_epoch
  from public.github_connections
  where id = p_connection_id
  for update;
  if v_owner is null then
    raise exception 'not found';
  end if;
  if v_epoch is distinct from p_expected_epoch then
    raise exception 'stale connection epoch';
  end if;
  if v_status <> 'connected' then
    raise exception 'github connection inactive';
  end if;
  insert into public.github_contribution_days (
    connection_id, owner_id, contribution_date, contribution_count, contribution_level, fetched_at
  ) values (p_connection_id, v_owner, p_date, p_count, p_level, now())
  on conflict (connection_id, contribution_date) do update set
    contribution_count = excluded.contribution_count,
    contribution_level = excluded.contribution_level,
    fetched_at = now();
end;
$$;

create function public.disconnect_github_connection()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if public.current_is_suspended() then
    raise exception 'account suspended';
  end if;

  update public.github_connections
  set epoch = epoch + 1,
      status = 'disconnected',
      updated_at = now()
  where owner_id = v_user
  returning id into v_id;

  if v_id is null then
    raise exception 'not found';
  end if;

  delete from private.github_credentials where connection_id = v_id;

  update public.repository_analyses
  set parent_attempt_id = attempt_id,
      attempt_id = gen_random_uuid(),
      status = 'cancelled',
      lease_owner = null,
      lease_expires_at = null,
      completed_at = now(),
      updated_at = now(),
      safe_error = 'github connection disconnected'
  where owner_id = v_user
    and status in ('queued', 'reading_repository', 'analyzing', 'saving_draft');

  update public.repository_analysis_usage u
  set settlement = 'released',
      settled_at = now(),
      counts_toward_success = false
  from public.repository_analyses a
  where u.analysis_id = a.id
    and a.owner_id = v_user
    and u.settlement = 'pending';
end;
$$;

create function public.reserve_repository_analysis(
  p_project_id uuid,
  p_repository_id bigint,
  p_repository_full_name text,
  p_commit_sha text,
  p_request_key text,
  p_prompt_version text
)
returns table (
  analysis_id uuid,
  reused boolean,
  status text,
  request_key text,
  attempt_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_pro boolean;
  v_success_cap int;
  v_attempt_cap int;
  v_month date := date_trunc('month', timezone('UTC', now()))::date;
  v_today date := (timezone('UTC', now()))::date;
  v_success_count int;
  v_attempt_count int;
  v_conn public.github_connections%rowtype;
  v_existing public.repository_analyses%rowtype;
  v_id uuid;
  v_attempt uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if public.current_is_suspended() then
    raise exception 'account suspended';
  end if;
  if p_repository_id is null
     or btrim(coalesce(p_commit_sha, '')) = ''
     or btrim(coalesce(p_request_key, '')) = ''
     or btrim(coalesce(p_prompt_version, '')) = '' then
    raise exception 'invalid input';
  end if;

  perform pg_advisory_xact_lock(hashtext('repo_analysis_quota'), hashtext(v_user::text));

  if p_project_id is not null and not exists (
    select 1 from public.portfolio_projects pr
    where pr.id = p_project_id and pr.owner_id = v_user
  ) then
    raise exception 'not owner';
  end if;

  select * into v_conn
  from public.github_connections
  where owner_id = v_user
  for update;
  if not found or v_conn.status <> 'connected' then
    raise exception 'github connection inactive';
  end if;

  -- RETURNS TABLE OUT names (status/request_key/attempt_id/analysis_id)
  -- shadow table columns unless every SQL ref is table-qualified.
  select * into v_existing
  from public.repository_analyses a
  where a.owner_id = v_user and a.request_key = p_request_key;
  if found then
    analysis_id := v_existing.id;
    reused := v_existing.status = 'succeeded';
    status := v_existing.status;
    request_key := v_existing.request_key;
    attempt_id := v_existing.attempt_id;
    return next;
    return;
  end if;

  select * into v_existing
  from public.repository_analyses a
  where a.owner_id = v_user
    and a.repository_id = p_repository_id
    and a.commit_sha = p_commit_sha
    and a.prompt_version = p_prompt_version
    and a.status = 'succeeded'
  order by a.completed_at desc nulls last
  limit 1;
  if found then
    analysis_id := v_existing.id;
    reused := true;
    status := v_existing.status;
    request_key := v_existing.request_key;
    attempt_id := v_existing.attempt_id;
    return next;
    return;
  end if;

  if exists (
    select 1 from public.repository_analyses a
    where a.owner_id = v_user
      and a.status in ('queued', 'reading_repository', 'analyzing', 'saving_draft')
  ) then
    raise exception 'analysis already in progress';
  end if;

  select public.is_pro_now(is_pro, pro_until) into v_pro
  from public.profiles where id = v_user;
  select
    case when coalesce(v_pro, false) then c.pro_success_per_month else c.free_success_per_month end,
    case when coalesce(v_pro, false) then c.pro_attempts_per_day else c.free_attempts_per_day end
  into v_success_cap, v_attempt_cap
  from public.portfolio_analysis_caps() c;

  select count(*) into v_attempt_count
  from public.repository_analyses a
  where a.owner_id = v_user
    and (timezone('UTC', a.created_at))::date = v_today;

  if v_attempt_count >= v_attempt_cap then
    raise exception 'daily analysis attempt cap exceeded';
  end if;

  select count(*) into v_success_count
  from public.repository_analysis_usage u
  where u.owner_id = v_user
    and u.month = v_month
    and u.counts_toward_success;

  if v_success_count >= v_success_cap then
    raise exception 'analysis quota exceeded';
  end if;

  insert into public.repository_analyses as a (
    owner_id, project_id, connection_id, connection_epoch, repository_id,
    repository_full_name, commit_sha, request_key, prompt_version, status,
    lease_expires_at
  ) values (
    v_user, p_project_id, v_conn.id, v_conn.epoch, p_repository_id,
    nullif(btrim(coalesce(p_repository_full_name, '')), ''), p_commit_sha,
    p_request_key, p_prompt_version, 'queued',
    now() + make_interval(secs => (select queued_seconds from public.portfolio_analysis_caps()))
  ) returning a.id, a.attempt_id into v_id, v_attempt;

  insert into public.repository_analysis_usage (owner_id, month, analysis_id, prompt_version)
  values (v_user, v_month, v_id, p_prompt_version);

  analysis_id := v_id;
  reused := false;
  status := 'queued';
  request_key := p_request_key;
  attempt_id := v_attempt;
  return next;
end;
$$;

create function public.retry_repository_analysis(p_analysis_id uuid)
returns table (
  analysis_id uuid,
  reused boolean,
  status text,
  request_key text,
  attempt_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_pro boolean;
  v_success_cap int;
  v_attempt_cap int;
  v_month date := date_trunc('month', timezone('UTC', now()))::date;
  v_today date := (timezone('UTC', now()))::date;
  v_success_count int;
  v_attempt_count int;
  v_row public.repository_analyses%rowtype;
  v_conn public.github_connections%rowtype;
  v_id uuid;
  v_attempt uuid := gen_random_uuid();
  v_key text;
  v_queued int;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if public.current_is_suspended() then
    raise exception 'account suspended';
  end if;

  perform pg_advisory_xact_lock(hashtext('repo_analysis_quota'), hashtext(v_user::text));

  select * into v_row
  from public.repository_analyses
  where id = p_analysis_id
  for update;
  if not found then
    raise exception 'not found';
  end if;
  if v_row.owner_id <> v_user then
    raise exception 'not owner';
  end if;
  if v_row.status not in ('failed', 'cancelled')
     and not (
       v_row.status in ('queued', 'reading_repository', 'analyzing', 'saving_draft')
       and (v_row.lease_expires_at is null or v_row.lease_expires_at <= now())
     ) then
    raise exception 'invalid input';
  end if;

  select * into v_conn
  from public.github_connections
  where id = v_row.connection_id
  for update;
  if not found or v_conn.status <> 'connected' then
    raise exception 'github connection inactive';
  end if;

  if exists (
    select 1 from public.repository_analyses a
    where a.owner_id = v_user
      and a.id <> p_analysis_id
      and a.status in ('queued', 'reading_repository', 'analyzing', 'saving_draft')
  ) then
    raise exception 'analysis already in progress';
  end if;

  select public.is_pro_now(is_pro, pro_until) into v_pro
  from public.profiles where id = v_user;
  select
    case when coalesce(v_pro, false) then c.pro_success_per_month else c.free_success_per_month end,
    case when coalesce(v_pro, false) then c.pro_attempts_per_day else c.free_attempts_per_day end,
    c.queued_seconds
  into v_success_cap, v_attempt_cap, v_queued
  from public.portfolio_analysis_caps() c;

  select count(*) into v_attempt_count
  from public.repository_analyses a
  where a.owner_id = v_user
    and (timezone('UTC', a.created_at))::date = v_today;
  if v_attempt_count >= v_attempt_cap then
    raise exception 'daily analysis attempt cap exceeded';
  end if;

  select count(*) into v_success_count
  from public.repository_analysis_usage u
  where u.owner_id = v_user
    and u.month = v_month
    and u.counts_toward_success;
  if v_success_count >= v_success_cap then
    raise exception 'analysis quota exceeded';
  end if;

  if v_row.status in ('queued', 'reading_repository', 'analyzing', 'saving_draft') then
    update public.repository_analyses as a
    set status = 'cancelled',
        lease_owner = null,
        completed_at = now(),
        updated_at = now(),
        safe_error = 'analysis lease expired'
    where a.id = p_analysis_id;
    update public.repository_analysis_usage as u
    set settlement = 'released',
        settled_at = now(),
        counts_toward_success = false
    where u.analysis_id = p_analysis_id
      and u.settlement = 'pending';
  end if;

  v_id := gen_random_uuid();
  v_key := v_row.request_key || '#retry#' || v_id::text;

  insert into public.repository_analyses as a (
    id, owner_id, project_id, connection_id, connection_epoch, repository_id,
    repository_full_name, commit_sha, request_key, prompt_version, status,
    attempt_id, parent_analysis_id, parent_attempt_id, lease_expires_at
  ) values (
    v_id, v_user, v_row.project_id, v_conn.id, v_conn.epoch, v_row.repository_id,
    v_row.repository_full_name, v_row.commit_sha, v_key, v_row.prompt_version, 'queued',
    v_attempt, p_analysis_id, v_row.attempt_id,
    now() + make_interval(secs => v_queued)
  );

  insert into public.repository_analysis_usage (owner_id, month, analysis_id, prompt_version)
  values (v_user, v_month, v_id, v_row.prompt_version);

  analysis_id := v_id;
  reused := false;
  status := 'queued';
  request_key := v_key;
  attempt_id := v_attempt;
  return next;
end;
$$;

create function public.cancel_repository_analysis(p_analysis_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_row public.repository_analyses%rowtype;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select * into v_row
  from public.repository_analyses
  where id = p_analysis_id
  for update;
  if not found then
    raise exception 'not found';
  end if;
  if v_row.owner_id <> v_user then
    raise exception 'not owner';
  end if;
  if v_row.status = 'succeeded' then
    raise exception 'invalid input';
  end if;

  update public.repository_analyses
  set parent_attempt_id = attempt_id,
      attempt_id = gen_random_uuid(),
      status = 'cancelled',
      lease_owner = null,
      lease_expires_at = null,
      completed_at = now(),
      updated_at = now()
  where id = p_analysis_id;

  update public.repository_analysis_usage
  set settlement = 'released',
      settled_at = now(),
      counts_toward_success = false
  where analysis_id = p_analysis_id
    and settlement = 'pending';
end;
$$;

create function public.get_repository_analysis_usage_month()
returns table (
  month date,
  success_count int,
  attempt_count int,
  success_cap int,
  daily_attempt_count int,
  daily_attempt_cap int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_pro boolean;
  v_month date := date_trunc('month', timezone('UTC', now()))::date;
  v_today date := (timezone('UTC', now()))::date;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  select public.is_pro_now(is_pro, pro_until) into v_pro
  from public.profiles where id = v_user;
  month := v_month;
  select count(*) into success_count
  from public.repository_analysis_usage u
  where u.owner_id = v_user and u.month = v_month and u.counts_toward_success;
  select count(*) into attempt_count
  from public.repository_analyses a
  where a.owner_id = v_user
    and date_trunc('month', timezone('UTC', a.created_at))::date = v_month;
  select
    case when coalesce(v_pro, false) then c.pro_success_per_month else c.free_success_per_month end,
    case when coalesce(v_pro, false) then c.pro_attempts_per_day else c.free_attempts_per_day end
  into success_cap, daily_attempt_cap
  from public.portfolio_analysis_caps() c;
  select count(*) into daily_attempt_count
  from public.repository_analyses a
  where a.owner_id = v_user
    and (timezone('UTC', a.created_at))::date = v_today;
  return next;
end;
$$;

create function public.acquire_repository_analysis_lease(
  p_analysis_id uuid,
  p_worker_id text,
  p_ttl_seconds int default 90
)
returns table (
  analysis_id uuid,
  attempt_id uuid,
  lease_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.repository_analyses%rowtype;
  v_epoch int;
  v_status text;
  v_expires timestamptz;
  v_ttl int := greatest(coalesce(p_ttl_seconds, (select lease_seconds from public.portfolio_analysis_caps())), 1);
begin
  if btrim(coalesce(p_worker_id, '')) = '' then
    raise exception 'invalid input';
  end if;

  select * into v_row
  from public.repository_analyses
  where id = p_analysis_id
  for update;
  if not found then
    raise exception 'not found';
  end if;
  if v_row.status not in ('queued', 'reading_repository', 'analyzing', 'saving_draft') then
    raise exception 'invalid input';
  end if;
  if v_row.lease_expires_at is null or v_row.lease_expires_at <= now() then
    raise exception 'analysis lease expired';
  end if;

  select c.epoch, c.status into v_epoch, v_status
  from public.github_connections c
  where c.id = v_row.connection_id;
  if v_epoch is distinct from v_row.connection_epoch or v_status <> 'connected' then
    raise exception 'github connection inactive';
  end if;

  if v_row.lease_owner is not null and v_row.lease_owner <> p_worker_id then
    raise exception 'analysis lease held';
  end if;

  v_expires := now() + make_interval(secs => v_ttl);
  update public.repository_analyses as a
  set lease_owner = p_worker_id,
      lease_expires_at = v_expires,
      started_at = coalesce(a.started_at, now()),
      updated_at = now()
  where a.id = p_analysis_id;

  analysis_id := p_analysis_id;
  attempt_id := v_row.attempt_id;
  lease_expires_at := v_expires;
  return next;
end;
$$;

create function public.heartbeat_repository_analysis_lease(
  p_analysis_id uuid,
  p_attempt_id uuid,
  p_worker_id text,
  p_ttl_seconds int default 90
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.repository_analyses%rowtype;
  v_expires timestamptz;
  v_epoch int;
  v_status text;
begin
  select * into v_row
  from public.repository_analyses
  where id = p_analysis_id
  for update;
  if not found then
    raise exception 'not found';
  end if;
  if v_row.status not in ('queued', 'reading_repository', 'analyzing', 'saving_draft') then
    raise exception 'invalid input';
  end if;
  if v_row.attempt_id is distinct from p_attempt_id
     or v_row.lease_owner is distinct from p_worker_id then
    raise exception 'stale analysis attempt';
  end if;
  if v_row.lease_expires_at is null or v_row.lease_expires_at <= now() then
    raise exception 'analysis lease expired';
  end if;
  select c.epoch, c.status into v_epoch, v_status
  from public.github_connections c
  where c.id = v_row.connection_id;
  if v_epoch is distinct from v_row.connection_epoch or v_status <> 'connected' then
    raise exception 'github connection inactive';
  end if;
  v_expires := now() + make_interval(secs => greatest(coalesce(p_ttl_seconds, 90), 1));
  update public.repository_analyses
  set lease_expires_at = v_expires, updated_at = now()
  where id = p_analysis_id;
  return v_expires;
end;
$$;

create function public.advance_repository_analysis_stage(
  p_analysis_id uuid,
  p_attempt_id uuid,
  p_worker_id text,
  p_connection_epoch int,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.repository_analyses%rowtype;
  v_epoch int;
  v_conn_status text;
  v_from int;
  v_to int;
begin
  if p_status not in ('queued', 'reading_repository', 'analyzing', 'saving_draft') then
    raise exception 'invalid input';
  end if;
  select * into v_row
  from public.repository_analyses
  where id = p_analysis_id
  for update;
  if not found then
    raise exception 'not found';
  end if;
  if v_row.status in ('succeeded', 'failed', 'cancelled') then
    raise exception 'invalid input';
  end if;
  if v_row.attempt_id is distinct from p_attempt_id
     or v_row.lease_owner is distinct from p_worker_id then
    raise exception 'stale analysis attempt';
  end if;
  if v_row.lease_expires_at is null or v_row.lease_expires_at <= now() then
    raise exception 'analysis lease expired';
  end if;
  select c.epoch, c.status into v_epoch, v_conn_status
  from public.github_connections c
  where c.id = v_row.connection_id;
  if v_epoch is distinct from p_connection_epoch
     or v_epoch is distinct from v_row.connection_epoch
     or v_conn_status <> 'connected' then
    raise exception 'github connection inactive';
  end if;
  v_from := case v_row.status
    when 'queued' then 0
    when 'reading_repository' then 1
    when 'analyzing' then 2
    when 'saving_draft' then 3
  end;
  v_to := case p_status
    when 'queued' then 0
    when 'reading_repository' then 1
    when 'analyzing' then 2
    when 'saving_draft' then 3
  end;
  if v_to <> v_from + 1 then
    raise exception 'invalid input';
  end if;
  update public.repository_analyses
  set status = p_status, updated_at = now()
  where id = p_analysis_id;
end;
$$;

create function public.commit_repository_analysis(
  p_analysis_id uuid,
  p_attempt_id uuid,
  p_worker_id text,
  p_connection_epoch int,
  p_status text,
  p_draft jsonb default null,
  p_evidence jsonb default null,
  p_coverage jsonb default null,
  p_safe_error text default null,
  p_model text default null,
  p_prompt_version text default null,
  p_token_input int default null,
  p_token_output int default null,
  p_estimated_cost_usd numeric default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.repository_analyses%rowtype;
  v_epoch int;
  v_conn_status text;
begin
  if p_status not in ('succeeded', 'failed', 'cancelled') then
    raise exception 'invalid input';
  end if;

  select * into v_row
  from public.repository_analyses
  where id = p_analysis_id
  for update;
  if not found then
    raise exception 'not found';
  end if;
  if v_row.status in ('succeeded', 'failed', 'cancelled') then
    raise exception 'invalid input';
  end if;
  if v_row.attempt_id is distinct from p_attempt_id
     or v_row.lease_owner is distinct from p_worker_id then
    raise exception 'stale analysis attempt';
  end if;
  if v_row.lease_expires_at is null or v_row.lease_expires_at <= now() then
    raise exception 'analysis lease expired';
  end if;

  select c.epoch, c.status into v_epoch, v_conn_status
  from public.github_connections c
  where c.id = v_row.connection_id;
  if v_epoch is distinct from p_connection_epoch
     or v_epoch is distinct from v_row.connection_epoch
     or v_conn_status <> 'connected' then
    raise exception 'github connection inactive';
  end if;

  update public.repository_analyses
  set status = p_status,
      draft = case when p_status = 'succeeded' then p_draft else draft end,
      evidence = case when p_status = 'succeeded' then p_evidence else evidence end,
      coverage = case when p_status = 'succeeded' then p_coverage else coverage end,
      safe_error = p_safe_error,
      model = coalesce(p_model, model),
      prompt_version = coalesce(p_prompt_version, prompt_version),
      token_input = coalesce(p_token_input, token_input),
      token_output = coalesce(p_token_output, token_output),
      estimated_cost_usd = coalesce(p_estimated_cost_usd, estimated_cost_usd),
      lease_owner = null,
      lease_expires_at = null,
      completed_at = now(),
      updated_at = now()
  where id = p_analysis_id;

  update public.repository_analysis_usage
  set settlement = case when p_status = 'succeeded' then 'success' else 'released' end,
      counts_toward_success = (p_status = 'succeeded'),
      settled_at = now(),
      token_input = coalesce(p_token_input, token_input),
      token_output = coalesce(p_token_output, token_output),
      estimated_cost_usd = coalesce(p_estimated_cost_usd, estimated_cost_usd),
      model = coalesce(p_model, model),
      prompt_version = coalesce(p_prompt_version, prompt_version)
  where analysis_id = p_analysis_id
    and settlement = 'pending';
end;
$$;

create function public.increment_portfolio_daily_metric(
  p_owner_id uuid,
  p_project_id uuid,
  p_kind text,
  p_viewer_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (timezone('UTC', now()))::date;
begin
  -- service_role only. Not a public counter; caller must dedup/rate-limit.
  if p_kind not in ('view', 'click') or p_owner_id is null then
    return false;
  end if;
  if p_viewer_id is not null and p_viewer_id = p_owner_id then
    return false;
  end if;
  if p_viewer_id is not null and exists (
    select 1 from public.profiles v where v.id = p_viewer_id and v.is_bot
  ) then
    return false;
  end if;
  if not public.portfolio_publicly_readable_to(p_owner_id, p_viewer_id) then
    return false;
  end if;

  if p_kind = 'click' then
    if p_project_id is null or not exists (
      select 1
      from public.portfolio_projects pr
      join public.portfolio_settings s on s.owner_id = pr.owner_id
      where pr.id = p_project_id
        and pr.owner_id = p_owner_id
        and pr.status = 'published'
        and s.publish_projects
    ) then
      return false;
    end if;
    insert into public.portfolio_daily_metrics (owner_id, project_id, metric_date, click_count)
    values (p_owner_id, p_project_id, v_today, 1)
    on conflict (owner_id, project_id, metric_date)
      where project_id is not null
    do update set click_count = public.portfolio_daily_metrics.click_count + 1;
    return true;
  end if;

  insert into public.portfolio_daily_metrics (owner_id, project_id, metric_date, view_count)
  values (p_owner_id, null, v_today, 1)
  on conflict (owner_id, metric_date)
    where project_id is null
  do update set view_count = public.portfolio_daily_metrics.view_count + 1;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- credential RPCs: public wrappers over private.github_credentials
-- service_role only. Schema private stays off PostgREST.
-- ---------------------------------------------------------------------------
create function public.upsert_github_credentials(
  p_connection_id uuid,
  p_owner_id uuid,
  p_connection_epoch int,
  p_access_token_encrypted text,
  p_refresh_token_encrypted text,
  p_expires_at timestamptz,
  p_key_version int
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_connection_id is null or p_owner_id is null
     or p_connection_epoch is null
     or btrim(coalesce(p_access_token_encrypted, '')) = ''
     or p_key_version is null then
    raise exception 'invalid input';
  end if;
  if not exists (
    select 1 from public.github_connections c
    where c.id = p_connection_id
      and c.owner_id = p_owner_id
      and c.epoch = p_connection_epoch
      and c.status = 'connected'
  ) then
    if exists (
      select 1 from public.github_connections c
      where c.id = p_connection_id and c.owner_id = p_owner_id
    ) then
      raise exception 'stale connection epoch';
    end if;
    raise exception 'not found';
  end if;
  insert into private.github_credentials (
    connection_id, owner_id, connection_epoch, access_token_encrypted,
    refresh_token_encrypted, expires_at, key_version, updated_at
  ) values (
    p_connection_id, p_owner_id, p_connection_epoch, p_access_token_encrypted,
    p_refresh_token_encrypted, p_expires_at, p_key_version, now()
  )
  on conflict (connection_id) do update set
    owner_id = excluded.owner_id,
    connection_epoch = excluded.connection_epoch,
    access_token_encrypted = excluded.access_token_encrypted,
    refresh_token_encrypted = excluded.refresh_token_encrypted,
    expires_at = excluded.expires_at,
    key_version = excluded.key_version,
    updated_at = now();
end;
$$;

create function public.get_github_credentials(p_connection_id uuid)
returns table (
  connection_id uuid,
  owner_id uuid,
  connection_epoch int,
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at timestamptz,
  key_version int
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.connection_id, c.owner_id, c.connection_epoch,
         c.access_token_encrypted, c.refresh_token_encrypted,
         c.expires_at, c.key_version
  from private.github_credentials c
  where c.connection_id = p_connection_id;
$$;

create function public.delete_github_credentials(p_connection_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.github_credentials where connection_id = p_connection_id;
$$;

revoke all on function public.upsert_github_connection(uuid, bigint, text) from public, anon, authenticated;
revoke all on function public.mark_github_connection_status(uuid, int, text, text) from public, anon, authenticated;
revoke all on function public.upsert_github_contribution_day(uuid, int, date, int, int) from public, anon, authenticated;
revoke all on function public.acquire_repository_analysis_lease(uuid, text, int) from public, anon, authenticated;
revoke all on function public.heartbeat_repository_analysis_lease(uuid, uuid, text, int) from public, anon, authenticated;
revoke all on function public.advance_repository_analysis_stage(uuid, uuid, text, int, text) from public, anon, authenticated;
revoke all on function public.commit_repository_analysis(uuid, uuid, text, int, text, jsonb, jsonb, jsonb, text, text, text, int, int, numeric) from public, anon, authenticated;
revoke all on function public.upsert_github_credentials(uuid, uuid, int, text, text, timestamptz, int) from public, anon, authenticated;
revoke all on function public.get_github_credentials(uuid) from public, anon, authenticated;
revoke all on function public.delete_github_credentials(uuid) from public, anon, authenticated;
revoke all on function public.increment_portfolio_daily_metric(uuid, uuid, text, uuid) from public, anon, authenticated;

grant execute on function public.upsert_github_connection(uuid, bigint, text) to service_role;
grant execute on function public.mark_github_connection_status(uuid, int, text, text) to service_role;
grant execute on function public.upsert_github_contribution_day(uuid, int, date, int, int) to service_role;
grant execute on function public.acquire_repository_analysis_lease(uuid, text, int) to service_role;
grant execute on function public.heartbeat_repository_analysis_lease(uuid, uuid, text, int) to service_role;
grant execute on function public.advance_repository_analysis_stage(uuid, uuid, text, int, text) to service_role;
grant execute on function public.commit_repository_analysis(uuid, uuid, text, int, text, jsonb, jsonb, jsonb, text, text, text, int, int, numeric) to service_role;
grant execute on function public.upsert_github_credentials(uuid, uuid, int, text, text, timestamptz, int) to service_role;
grant execute on function public.get_github_credentials(uuid) to service_role;
grant execute on function public.delete_github_credentials(uuid) to service_role;
grant execute on function public.increment_portfolio_daily_metric(uuid, uuid, text, uuid) to service_role;

revoke all on function public.disconnect_github_connection() from public, anon;
revoke all on function public.reserve_repository_analysis(uuid, bigint, text, text, text, text) from public, anon;
revoke all on function public.retry_repository_analysis(uuid) from public, anon;
revoke all on function public.cancel_repository_analysis(uuid) from public, anon;
revoke all on function public.get_repository_analysis_usage_month() from public, anon;

grant execute on function public.disconnect_github_connection() to authenticated;
grant execute on function public.reserve_repository_analysis(uuid, bigint, text, text, text, text) to authenticated;
grant execute on function public.retry_repository_analysis(uuid) to authenticated;
grant execute on function public.cancel_repository_analysis(uuid) to authenticated;
grant execute on function public.get_repository_analysis_usage_month() to authenticated;
