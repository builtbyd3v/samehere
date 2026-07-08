-- Adaptive weekly prompt: one AI-generated question per ISO week, seeded by the
-- current date so it fits the season. Generated once and cached here; everyone
-- sees the same prompt. Authed-READ only, NO client write path — generation +
-- insert happen server-side via the service-role admin client (on-conflict-do-
-- nothing = race-safe), so no authed user can poison the global prompt via RPC.
create table public.weekly_prompts (
  week_key text primary key,
  prompt text not null,
  created_at timestamptz not null default now()
);
alter table public.weekly_prompts enable row level security;
create policy "authed read weekly prompts" on public.weekly_prompts
  for select using (auth.uid() is not null);
