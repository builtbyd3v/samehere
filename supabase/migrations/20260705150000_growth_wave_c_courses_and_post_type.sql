-- C3: freeform course tags, mirrors skills text[].
alter table public.profiles add column if not exists courses text[];

-- C4: optional post type. NULL = normal post; 'teammate' = looking-for-teammate.
-- Just a column on posts; existing select/insert RLS is unaffected (author sets it
-- on insert under the existing auth.uid() = user_id check).
alter table public.posts add column if not exists post_type text
  check (post_type is null or post_type in ('teammate'));
