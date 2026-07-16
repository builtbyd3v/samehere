-- Admin hard delete: posts.hidden only ever soft-hides, so there is no path
-- to actually remove content that legally must go (doxxing, CSAM). This adds
-- a real delete of the post row. FKs already cascade the cleanup: bookmarks,
-- comments, notifications, reactions, reposts are ON DELETE CASCADE, and
-- reports.post_id is ON DELETE SET NULL so the report row survives with its
-- server-captured snapshot column as the surviving evidence -- both are
-- existing, intentional design, preserved here unchanged.
--
-- ORDERING: because reports.post_id goes SET NULL on delete, a report can no
-- longer be found by post_id once the post row is gone. The reports update
-- below MUST run before the delete, or the report is silently left open
-- forever with no way to re-associate it.
--
-- Storage cleanup: post-media objects live in the private post-media bucket,
-- storage RLS there is owner-keyed by user id, and this is a plpgsql
-- function with no service-role access to storage -- it cannot delete the
-- objects itself. It captures the media paths before the delete and returns
-- them so the caller (app/(app)/admin/actions.ts) can remove them via
-- createAdminClient(), same precedent as lib/media.ts's signed-URL use of
-- that bucket.
create function public.admin_delete_post(p_post_id uuid)
returns text[] language plpgsql security definer set search_path = '' as $$
declare
  v_paths text[];
begin
  if not public.current_is_admin() then raise exception 'not authorized'; end if;

  select coalesce(array_agg(elem->>'path'), '{}')
  into v_paths
  from public.posts p, jsonb_array_elements(p.media) elem
  where p.id = p_post_id;

  update public.reports set status = 'reviewed' where post_id = p_post_id and status = 'open';

  delete from public.posts where id = p_post_id;

  return coalesce(v_paths, '{}');
end $$;

-- execute backstop: NEW function, so Supabase's schema-level DEFAULT
-- PRIVILEGES already granted EXECUTE to anon at creation (documented in
-- 20260708004722_revoke_anon_execute_rpc_explicit.sql and
-- 20260722000000_revoke_anon_admin_feedback_execute.sql). "revoke ... from
-- public" only strips the PUBLIC pseudo-role grant, not the role-specific
-- anon one, so anon must be named explicitly.
revoke execute on function public.admin_delete_post(uuid) from public;
revoke execute on function public.admin_delete_post(uuid) from anon;
grant execute on function public.admin_delete_post(uuid) to authenticated, service_role;
