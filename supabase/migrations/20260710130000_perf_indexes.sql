-- get_blocked_ids has a `where blocked_id = auth.uid()` branch (block_system.sql);
-- blocks only has an index leading with blocker_id, so this branch scans.
create index if not exists blocks_blocked_id_idx on public.blocks (blocked_id);

-- app/(app)/quote/[id]/page.tsx filters comments by `.eq("repost_id", id)`;
-- comments.repost_id (added in quote_engagement.sql) has no index.
create index if not exists comments_repost_id_idx on public.comments (repost_id) where repost_id is not null;

-- profile + Following-tab query reposts via `.in("user_id", ...)`; the only
-- constraint on reposts is unique(post_id, user_id), which leads with post_id.
create index if not exists reposts_user_id_idx on public.reposts (user_id);
