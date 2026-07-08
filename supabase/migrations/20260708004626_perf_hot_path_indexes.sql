-- posts had zero indexes beyond PK → full seq scan + sort on every feed load.
create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_user_id_created_at_idx on public.posts (user_id, created_at desc);

-- comments(count) is embedded in the post select everywhere posts render; post_id
-- was unindexed → scan-per-post.
create index if not exists comments_post_id_idx on public.comments (post_id);

-- get_profile_counts + follower lists filter follows by following_id; the only
-- follows index leads with follower_id (wrong direction for this).
create index if not exists follows_following_id_status_idx on public.follows (following_id, status);

-- leaderboard scans contribution_log by date range across all users; the unique
-- index leads with user_id, useless for the date filter.
create index if not exists contribution_log_date_idx on public.contribution_log (date);

-- the batched connection-prompt cache read filters ai_connection_prompts by
-- candidate_id (FK was unindexed).
create index if not exists ai_connection_prompts_candidate_id_idx on public.ai_connection_prompts (candidate_id);
