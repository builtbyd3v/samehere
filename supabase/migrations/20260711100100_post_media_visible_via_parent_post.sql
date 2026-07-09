-- Security fix (finding C2): post-media storage objects were listable/signable
-- by ANY authenticated user, not just people who may see the parent post.
--
-- What the old policy actually granted: "post-media authed select"
-- (20260703170000_post_media.sql) used `auth.role() = 'authenticated'` with no
-- ownership or post-visibility check. storage.objects SELECT is the exact
-- permission behind both storage.from('post-media').list() and
-- createSignedUrl()/createSignedUrls() (signing reads the object row through
-- this same policy before minting a URL). So any logged-in account could list
-- every path in the bucket and sign a URL for any of them.
--
-- The migration's own comment claimed this was safe because "paths are
-- unguessable and signed URLs are short-TTL" — that is not a security
-- property. Unguessable-but-listable is a contradiction: .list() enumerates
-- the paths directly, so nothing needs guessing. TTL only bounds how long a
-- leaked URL works, not who can obtain one. Private accounts' media, blocked
-- users' media, and admin-hidden posts' media were all readable by any
-- authenticated user who bothered to call .list().
--
-- Fix: move the visibility rule out of convention (a comment in
-- lib/media.ts asserting "post-RLS already decided") and into the database,
-- the same fix already applied to the avatars bucket in
-- 20260708174554_avatars_select_owner_scope.sql. A row is selectable only if
-- (a) it's in the caller's own upload folder (needed pre-post-insert, while
-- composing), or (b) some row in public.posts has a media entry whose path
-- matches — and that subquery runs under the caller's own RLS, so it returns
-- rows only for posts the caller is currently allowed to see (same nested-RLS
-- mechanism the comments/reactions "mirror post visibility" policies already
-- rely on, see 20260710120000_rls_block_and_quote_visibility.sql). A post the
-- caller can't select contributes nothing, so its media becomes neither
-- listable nor signable.
--
-- lib/media.ts (attachSignedMedia) and its call sites need no change: they
-- already only ever request signed URLs for media attached to posts already
-- fetched through post-select RLS. This migration just makes storage enforce
-- the same rule storage was always assumed to be enforcing.
--
-- Two independent enforcement points, both required — do NOT "simplify" by
-- deleting either:
--   (i)  the storage SELECT policy below, and
--   (ii) the posts_media_paths_owned CHECK further down.
-- The storage policy alone is still exploitable: its exists() only asks
-- "does SOME post I can see carry this path?". An attacker can insert a post
-- OF THEIR OWN whose media claims a victim's path
-- ([{path:'<victim-uuid>/<file>', type:'image'}]) — the row is theirs, so
-- they can select it, so exists() is true, so createSignedUrl on the victim's
-- object succeeds and C2 is back. The posts INSERT policy (auth.uid()=user_id)
-- never looks at `media`, and app/(app)/feed/actions.ts's "path starts with
-- ${user.id}/" check is TypeScript-only — bypassed by hitting PostgREST
-- directly with the anon key. So the DB itself must reject a post whose media
-- path is not under the author's own folder. The policy's exists() ALSO pins
-- the path's first folder segment to the post author (defence in depth: even a
-- pre-existing forged row can't sign a foreign path).
--
-- Supersedes 20260705190000_security_fixes.sql section 4, which already
-- replaced the original "post-media authed select" with "post-media visibility
-- select". Which of those two old policies is actually live is UNKNOWN — this
-- migration was authored without production DB access, and the migration-order
-- inference "section 4 is deployed" assumes every committed migration was
-- applied, which is exactly what couldn't be confirmed. So both old names are
-- dropped below to be correct either way. This matters because Postgres ORs
-- permissive policies: leaving either old SELECT policy live beside this one
-- would stack a second grant and silently neuter the fix.
--
-- Genuine defects in "post-media visibility select" that this policy fixes:
--   1. Forgery hole. It matched `m ->> 'path' = storage.objects.name` with NO
--      check that the post's author owns the path. An attacker inserts a post
--      OF THEIR OWN claiming a victim's path; posts RLS returns that row (it's
--      theirs); exists() is true; they sign the victim's object. Real — this
--      is why the posts_media_paths_owned CHECK below exists, and why this
--      policy's exists() also pins the path's first folder to p.user_id.
--   2. No own-folder branch. An uploader couldn't select their own object
--      before the post row exists (breaks compose-then-post).
--   3. Maintainability, NOT security. It hand-rolled post visibility
--      (au.is_private=false OR author OR accepted-follow). That is NOT a leak:
--      its exists() reads `from public.posts`, whose own RLS runs under the
--      invoking role and already applies the blocks + hidden clauses from
--      20260710120000 — the hand-rolled conditions are AND-ed on top of an
--      already-filtered set, so redundant, not permissive. The old policy did
--      NOT expose blocked-from or admin-hidden media. But a second hand-kept
--      copy of the visibility rule is how the ORIGINAL 20260703170000 comment
--      ("paths are unguessable") rotted into a false claim. This policy deletes
--      the copy and lets posts RLS be the single source of truth.
drop policy if exists "post-media authed select" on storage.objects;
drop policy if exists "post-media visibility select" on storage.objects;

create policy "post-media visible via parent post"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'post-media'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.posts p
         where p.media @> jsonb_build_array(jsonb_build_object('path', name))
           and (storage.foldername(name))[1] = p.user_id::text
      )
    )
  );

-- Reject posts whose media paths aren't under the author's own {uid}/ folder,
-- so the forged-path row described above can never exist. CHECK can't hold a
-- subquery, so the per-element test lives in an IMMUTABLE helper. starts_with()
-- (not LIKE) so a '%' or '_' in a filename would be matched literally — today
-- filenames are crypto.randomUUID()+ext (no wildcards), but starts_with keeps
-- that from being a load-bearing assumption.
create or replace function public.media_paths_owned(p_media jsonb, p_user uuid)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(bool_and(starts_with(e ->> 'path', p_user::text || '/')), true)
    from jsonb_array_elements(coalesce(p_media, '[]'::jsonb)) e
$$;

-- NOT VALID + VALIDATE (house pattern, see 20260710120000 fix 4b): the ALTER
-- doesn't scan/lock, VALIDATE checks existing rows separately. VALIDATE will
-- fail only if a forged/malformed row already exists (e.g. inserted via
-- PostgREST before this fix); every row written through the app conforms.
alter table public.posts
  add constraint posts_media_paths_owned
  check (public.media_paths_owned(media, user_id)) not valid;

alter table public.posts validate constraint posts_media_paths_owned;

-- ponytail: containment check (`@>`) does a GIN scan per signed object; the
-- index below keeps that cheap. If signing shows up in traces at scale,
-- denormalize into a media(path, post_id) table instead of scanning jsonb.
create index if not exists posts_media_gin on public.posts using gin (media);
