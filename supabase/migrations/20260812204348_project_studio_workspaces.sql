-- Project Studio Wave 1: durable owner-only workspace + file revisions.
-- Composite same-owner FKs bind workspaces to user_projects and files to
-- workspaces so a caller cannot attach rows to another user's assignment
-- even if they learn its UUID.

alter table public.user_projects
  add constraint user_projects_id_user_id_key unique (id, user_id);

create table public.project_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_project_id uuid not null,
  template_version int not null default 1
    check (template_version >= 1),
  revision int not null default 0
    check (revision >= 0),
  active_file text null
    check (
      active_file is null
      or (
        char_length(active_file) between 1 and 240
        and active_file !~ '^/'
        and active_file !~ E'\\000'
        and active_file !~ '(^|/)\.\.(/|$)'
        and active_file !~ '(^|/)\.(/|$)'
        and active_file !~ '//'
        and active_file !~ '/$'
      )
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_project_id),
  unique (id, user_id),
  foreign key (user_project_id, user_id)
    references public.user_projects (id, user_id)
    on delete cascade
);

create index project_workspaces_user_updated_idx
  on public.project_workspaces (user_id, updated_at desc);

create index project_workspaces_user_revision_idx
  on public.project_workspaces (user_id, revision desc);

create table public.project_workspace_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid not null,
  path text not null
    check (
      char_length(path) between 1 and 240
      and path !~ '^/'
      and path !~ E'\\000'
      and path !~ '(^|/)\.\.(/|$)'
      and path !~ '(^|/)\.(/|$)'
      and path !~ '//'
      and path !~ '/$'
    ),
  content text not null
    check (char_length(content) <= 262144),
  revision int not null default 0
    check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, path),
  foreign key (workspace_id, user_id)
    references public.project_workspaces (id, user_id)
    on delete cascade
);

create index project_workspace_files_user_updated_idx
  on public.project_workspace_files (user_id, updated_at desc);

create index project_workspace_files_workspace_revision_idx
  on public.project_workspace_files (workspace_id, revision desc);

alter table public.project_workspaces enable row level security;

create policy "project_workspaces owner all"
  on public.project_workspaces
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.project_workspaces from anon;
grant select, insert, update, delete
  on table public.project_workspaces
  to authenticated;

alter table public.project_workspace_files enable row level security;

create policy "project_workspace_files owner all"
  on public.project_workspace_files
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.project_workspace_files from anon;
grant select, insert, update, delete
  on table public.project_workspace_files
  to authenticated;
