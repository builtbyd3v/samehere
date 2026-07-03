-- Post media: media rides the post row as jsonb, inherits post-visibility RLS.
alter table public.posts
  add column if not exists media jsonb not null default '[]'::jsonb;

-- Private bucket for post media. Single 100MB size cap (Supabase allows one
-- limit per bucket); per-type image cap is client-side UX. MIME allowlist is
-- the hard gate: images (jpg/png/webp/gif) + video (mp4/webm) only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  false,
  104857600,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS on storage.objects for post-media.
-- Writes pinned to the user's own {uid}/ folder (path first segment = auth.uid()).
-- SELECT = any authenticated session, so the viewer's server session can mint a
-- signed URL. Privacy holds because post-RLS gates who ever receives the path;
-- paths are unguessable and signed URLs are short-TTL.
create policy "post-media authed select"
  on storage.objects for select
  using ( bucket_id = 'post-media' and auth.role() = 'authenticated' );

create policy "post-media owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post-media owner update"
  on storage.objects for update
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post-media owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
