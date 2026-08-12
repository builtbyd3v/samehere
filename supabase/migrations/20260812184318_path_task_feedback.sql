-- One auditable outcome for each recommendation a user rates.
-- The composite foreign key prevents a user from attaching feedback to
-- another user's task even if they learn its UUID.

alter table public.path_tasks
  add constraint path_tasks_id_user_id_key unique (id, user_id);

create table public.path_task_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  path_task_id uuid not null,
  outcome text not null check (outcome in ('helped', 'not_relevant', 'stuck')),
  note text null check (
    note is null
    or (outcome = 'stuck' and char_length(note) between 1 and 400)
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, path_task_id),
  foreign key (path_task_id, user_id)
    references public.path_tasks (id, user_id)
    on delete cascade
);

create index path_task_feedback_user_updated_idx
  on public.path_task_feedback (user_id, updated_at desc);

alter table public.path_task_feedback enable row level security;

create policy "path_task_feedback owner all"
  on public.path_task_feedback
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.path_task_feedback from anon;
grant select, insert, update, delete
  on table public.path_task_feedback
  to authenticated;
