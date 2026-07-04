-- Reactions, comments, and bookmarks can target a quote repost (reposts row with quote_text).

alter table public.reactions add column if not exists repost_id uuid references public.reposts(id) on delete cascade;
alter table public.comments add column if not exists repost_id uuid references public.reposts(id) on delete cascade;
alter table public.bookmarks add column if not exists repost_id uuid references public.reposts(id) on delete cascade;

alter table public.reactions drop constraint if exists reactions_target_check;
alter table public.reactions add constraint reactions_target_check
  check (
    (post_id is not null and repost_id is null) or
    (post_id is null and repost_id is not null)
  );

alter table public.comments drop constraint if exists comments_target_check;
alter table public.comments add constraint comments_target_check
  check (
    (post_id is not null and repost_id is null) or
    (post_id is null and repost_id is not null)
  );

alter table public.bookmarks drop constraint if exists bookmarks_target_check;
alter table public.bookmarks add constraint bookmarks_target_check
  check (
    (post_id is not null and repost_id is null) or
    (post_id is null and repost_id is not null)
  );

create unique index if not exists reactions_repost_user_type_idx
  on public.reactions (repost_id, user_id, type) where repost_id is not null;

create unique index if not exists bookmarks_user_repost_idx
  on public.bookmarks (user_id, repost_id) where repost_id is not null;
