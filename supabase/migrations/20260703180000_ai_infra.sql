-- AI usage meter: one row per (user, day, kind), atomically incremented. The
-- meter is the Pro free-trial gate.
-- ponytail: coarse per-day counter, not a real limiter; a denied call still bumps
-- the count — fine at v1 scale.
create table if not exists public.ai_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default (now() at time zone 'utc')::date,
  kind text not null check (kind in ('connection_prompt','composer_nudge','profile_nudge')),
  count int not null default 0,
  primary key (user_id, date, kind)
);
alter table public.ai_usage enable row level security;
-- No policies: reached only through the definer function below.

create or replace function public.use_ai_quota(p_kind text, p_cap int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if auth.uid() is null then
    return false;
  end if;
  insert into public.ai_usage (user_id, date, kind, count)
  values (auth.uid(), (now() at time zone 'utc')::date, p_kind, 1)
  on conflict (user_id, date, kind)
  do update set count = ai_usage.count + 1
  returning count into v_count;
  return v_count <= p_cap;
end;
$$;
revoke all on function public.use_ai_quota(text, int) from public;
grant execute on function public.use_ai_quota(text, int) to authenticated;

-- Cached connection prompts: one AI sentence per (viewer, candidate) pair, so we
-- don't re-bill on every render.
-- ponytail: cache by pair, no invalidation; profiles rarely change enough v1.
create table if not exists public.ai_connection_prompts (
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  prompt text not null,
  created_at timestamptz not null default now(),
  primary key (viewer_id, candidate_id)
);
alter table public.ai_connection_prompts enable row level security;
create policy "own cache read" on public.ai_connection_prompts
  for select using (auth.uid() = viewer_id);
create policy "own cache insert" on public.ai_connection_prompts
  for insert with check (auth.uid() = viewer_id);
