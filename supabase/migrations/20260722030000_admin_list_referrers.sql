-- ============ Admin: top referrers ============
-- referrals RLS only lets a caller see rows where they are referrer or
-- referred, so admin cannot read the whole table with a session client.
-- Same SECURITY DEFINER pattern as every other admin_* read (admin_list_reports,
-- admin_list_feedback): self-gate on current_is_admin(), bypass RLS + profiles
-- column ACLs from inside the function. Beta scale, so cap at 50 rows.

create or replace function public.admin_list_referrers()
returns table (
  username text, invited bigint, qualified bigint
) language plpgsql security definer set search_path = '' as $$
begin
  if not public.current_is_admin() then raise exception 'not authorized'; end if;
  return query
  select p.username,
         count(*) as invited,
         count(*) filter (where r.qualified_at is not null) as qualified
  from public.referrals r
  join public.profiles p on p.id = r.referrer_id
  group by p.username
  -- order by the aggregate expression, NOT by the "invited" alias: this is a
  -- RETURNS TABLE function, so "invited" is also a plpgsql OUT variable and
  -- referencing it here hits the variable/column ambiguity rule (42702).
  -- count(*) names no variable, so it is unambiguous.
  order by count(*) desc, p.username asc
  limit 50;
end $$;

-- Same execute backstop as every admin_* function, plus the anon-by-name
-- fix documented in 20260722000000_revoke_anon_admin_feedback_execute.sql:
-- Supabase's schema-level DEFAULT PRIVILEGES grant EXECUTE to anon on every
-- new function in public, and "revoke ... from public" does not strip a
-- role-specific anon grant, so anon must be revoked explicitly here too.
revoke execute on function public.admin_list_referrers() from public;
revoke execute on function public.admin_list_referrers() from anon;
grant execute on function public.admin_list_referrers() to authenticated, service_role;
