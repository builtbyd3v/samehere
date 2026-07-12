-- club-avatars hardening, two regressions from 20260714160000:
--
-- 1. That migration recreated the unscoped `"club avatars public read"`
--    SELECT policy that 20260710225238 had already removed in favour of the
--    member-scoped `"club avatars scoped select"`. Postgres ORs permissive
--    policies, so the broad one silently won: any caller (incl. anon) could
--    enumerate the bucket via the storage list API. Public-URL avatar
--    display never depended on this policy (the bucket is `public`), so
--    dropping it changes nothing user-visible.
drop policy if exists "club avatars public read" on storage.objects;

-- 2. The bucket shipped with no size/MIME constraints, unlike avatars (2MB,
--    images only) and post-media. Same limits as the profile avatars bucket.
update storage.buckets
set file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'club-avatars';

-- 3. Member-scoped SELECT policy. Originally created by 20260710225238, but it
--    depends on public.club_role() which is only created (tracked) at
--    20260714140000, so on a fresh replay it could not exist that early. Created
--    here instead — club_role exists by now. Idempotent (drop-if-exists) so it is
--    a no-op on the live DB, which already carries this policy from 20260710225238.
drop policy if exists "club avatars scoped select" on storage.objects;
create policy "club avatars scoped select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'club-avatars'
    and public.club_role(((storage.foldername(name))[1])::uuid) is not null
  );
