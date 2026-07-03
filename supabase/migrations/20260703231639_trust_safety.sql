-- blocks
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid references public.profiles(id) on delete cascade,
  blocked_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(blocker_id, blocked_id)
);

alter table public.blocks enable row level security;

create policy "owner read" on public.blocks for select using (auth.uid() = blocker_id);
create policy "owner insert" on public.blocks for insert with check (auth.uid() = blocker_id);
create policy "owner delete" on public.blocks for delete using (auth.uid() = blocker_id);

create index blocks_blocker_id_idx on public.blocks(blocker_id);

-- feedback
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  message text not null,
  category text,
  created_at timestamptz default now()
);

alter table public.feedback enable row level security;

create policy "owner insert" on public.feedback for insert with check (auth.uid() = user_id);
create policy "owner read" on public.feedback for select using (auth.uid() = user_id);

-- reports: add detail column if missing
alter table public.reports add column if not exists detail text;
