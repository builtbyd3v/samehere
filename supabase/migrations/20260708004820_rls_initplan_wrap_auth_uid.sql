-- Perf: ~45 RLS policies call auth.uid() bare, re-evaluated per row. Wrapping as
-- (select auth.uid()) lets the planner evaluate it once per statement (Supabase
-- auth_rls_initplan lint). Generated from live policy defs so expressions are
-- never hand-retyped: read each policy's exact qual/with_check from pg_policies,
-- wrap only the auth.*() calls, re-apply via ALTER POLICY. Only policies that
-- actually contain an auth.*() call are touched. Idempotent on already-wrapped
-- policies is NOT guaranteed — run once.
do $$
declare
  r record;
  new_qual text;
  new_check text;
  stmt text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and ( coalesce(qual, '')       ~ 'auth\.(uid|role|jwt|email)\('
         or coalesce(with_check, '') ~ 'auth\.(uid|role|jwt|email)\(' )
  loop
    new_qual  := regexp_replace(r.qual,      'auth\.(uid|role|jwt|email)\(\)', '(select auth.\1())', 'g');
    new_check := regexp_replace(r.with_check, 'auth\.(uid|role|jwt|email)\(\)', '(select auth.\1())', 'g');
    stmt := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    if r.qual is not null then
      stmt := stmt || format(' using (%s)', new_qual);
    end if;
    if r.with_check is not null then
      stmt := stmt || format(' with check (%s)', new_check);
    end if;
    execute stmt;
  end loop;
end $$;
