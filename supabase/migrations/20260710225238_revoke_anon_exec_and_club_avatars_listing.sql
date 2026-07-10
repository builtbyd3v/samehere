-- 1. Revoke anon EXECUTE on internal SECURITY DEFINER fns (default-privileges regrant regression)
revoke execute on function public.admin_list_reports() from anon;
revoke execute on function public.current_is_admin() from anon;
revoke execute on function public.current_is_suspended() from anon;
revoke execute on function public.get_blocked_ids() from anon;
revoke execute on function public.get_founder_spots_left() from anon;
revoke execute on function public.get_my_billing() from anon;
revoke execute on function public.is_conversation_member(uuid) from anon;
revoke execute on function public.leave_conversation(uuid) from anon;
revoke execute on function public.reactivate_on_message() from anon;
revoke execute on function public.reports_assert_target() from anon;

-- 2. club-avatars bucket allows full object listing (public SELECT with no scoping).
-- Bucket is public + rendered via getPublicUrl (RLS-independent), objects stored at <clubId>/...
-- Scope SELECT so listing isn't open, mirroring avatars bucket fix (20260708174554).
drop policy if exists "club avatars public read" on storage.objects;

create policy "club avatars scoped select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'club-avatars'
    and public.club_role(((storage.foldername(name))[1])::uuid) is not null
  );
