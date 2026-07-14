-- ============ Beta feedback review on /admin ============
-- The feedback table has collected bug/idea/other submissions since launch
-- hygiene, but nothing ever read it back — reviewing meant the SQL editor.
-- For the invite-only beta the feedback button IS the bug tracker, so give
-- /admin a review queue: list unresolved, mark done. Mirrors the
-- admin_list_reports / admin_resolve_report pattern exactly.

alter table public.feedback add column if not exists resolved_at timestamptz;

create or replace function public.admin_list_feedback()
returns table (
  feedback_id uuid, category text, message text, created_at timestamptz,
  author_username text
) language plpgsql security definer set search_path = '' as $$
begin
  if not public.current_is_admin() then raise exception 'not authorized'; end if;
  return query
  select f.id, f.category, f.message, f.created_at, p.username
  from public.feedback f
  left join public.profiles p on p.id = f.user_id
  where f.resolved_at is null
  order by f.created_at desc;
end $$;

create or replace function public.admin_resolve_feedback(p_feedback_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.current_is_admin() then raise exception 'not authorized'; end if;
  update public.feedback set resolved_at = now() where id = p_feedback_id;
end $$;

-- Same execute backstop as every admin_* function: revoke default PUBLIC
-- execute, grant authenticated (self-gated by current_is_admin) + service_role.
revoke execute on function public.admin_list_feedback() from public;
grant execute on function public.admin_list_feedback() to authenticated, service_role;
revoke execute on function public.admin_resolve_feedback(uuid) from public;
grant execute on function public.admin_resolve_feedback(uuid) to authenticated, service_role;
