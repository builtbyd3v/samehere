-- push_subscriptions shipped schema-only in growth wave E3 (web-push). No client
-- code ever subscribed, sent, or read from it — no service worker, manifest, or
-- VAPID wiring exists. Verified 0 rows before dropping. Recreating this one
-- 5-column table is trivial if/when PWA + push is actually built.
-- Its RLS policy and user index drop with the table (owned objects); nothing
-- has an FK to it (it references profiles, not the reverse), so no CASCADE.
drop table if exists public.push_subscriptions;
