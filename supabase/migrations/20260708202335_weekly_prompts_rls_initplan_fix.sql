-- Perf: wrap auth.uid() in a scalar subselect so it's evaluated once per query,
-- not once per row (advisor auth_rls_initplan). Tiny table, but clean to fix.
drop policy "authed read weekly prompts" on public.weekly_prompts;
create policy "authed read weekly prompts" on public.weekly_prompts
  for select using ((select auth.uid()) is not null);
