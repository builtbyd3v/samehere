-- Web push removed entirely (plan 024 + the message-push follow-up reverted).
-- No client code subscribes, sends, or reads anymore -- the table, its owner
-- RLS policy, and its user index all drop with it (owned objects).
drop table if exists public.push_subscriptions cascade;
