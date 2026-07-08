-- Avatars bucket is public (objects served via public URL, RLS-independent).
-- The broad authenticated SELECT policy let any logged-in user .list()/enumerate
-- every avatar object path (= every user id). Scope SELECT to the owner's own
-- path prefix (<uid>/...). Rendering is unaffected (public URL bypasses RLS);
-- upload/update/delete are already owner-scoped.
drop policy if exists "avatars public read" on storage.objects;

create policy "avatars owner select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );
