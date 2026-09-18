-- Hot-path indexes confirmed missing after applying the tracked chain on
-- local Postgres (2026-09-18). Already present and not recreated:
--   blocks(blocker_id), blocks(blocked_id), profiles(username) unique
-- reactions: unique (post_id, user_id, type) + repost variant only;
-- no user_id-leading index. follows unique leads with follower_id but
-- omits status. get_public_profile matches lower(username).

create index if not exists follows_follower_id_status_idx
  on public.follows (follower_id, status);

create index if not exists reactions_post_id_type_idx
  on public.reactions (post_id, type);

create index if not exists reactions_user_id_idx
  on public.reactions (user_id);

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));
