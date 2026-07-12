-- Latest-tab quote/plain-repost queries (lib/feed-quotes.ts, lib/feed-reposts.ts)
-- filter on quote_text null-ness and order by created_at desc with no user
-- filter; only reposts(user_id) is indexed today, forcing a seq scan + sort.
create index if not exists reposts_created_at_idx
  on public.reposts (created_at desc);
