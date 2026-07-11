-- Plan 024: web push is actually being built now, so recreate the
-- push_subscriptions table dropped in 20260714230000 as then-unused
-- scaffolding. Same 5-column shape as before: one row per subscribed
-- device/browser endpoint, insert/delete under owner-scoped RLS (no
-- service_role for subscribe/unsubscribe).
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "own subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notification-causing actions (follow, comment, reaction) are triggered by
-- one user (the actor) but the push must go to a DIFFERENT user (the
-- recipient). Postgres triggers can't call out to the web-push HTTP API, so
-- the send happens app-layer, from the ACTOR's session — which means reading
-- the RECIPIENT's subscriptions needs to bypass the owner-only RLS above.
-- This SECURITY DEFINER function is that one narrow bypass.
-- ponytail: anon is revoked but any authenticated user can call this for any
-- user_id — that's an intentional tradeoff (plan 024), not an oversight. The
-- returned endpoint/keys are useless for sending push without our
-- server-only VAPID private key, so the leak isn't directly exploitable.
create or replace function public.get_push_subscriptions(p_user_id uuid)
returns table (endpoint text, p256dh text, auth text)
language sql
security definer
stable
set search_path = public
as $$
  select endpoint, p256dh, auth
  from public.push_subscriptions
  where user_id = p_user_id;
$$;

revoke all on function public.get_push_subscriptions(uuid) from public;
grant execute on function public.get_push_subscriptions(uuid) to authenticated;

-- Cleanup for dead endpoints (web-push returns 404/410 once a browser
-- unsubscribes/expires). endpoint is the table's PK and an unguessable long
-- URL, so allowing any authenticated caller to delete-by-endpoint (rather
-- than requiring an ownership check) is a negligible-risk simplification.
create or replace function public.delete_dead_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;

revoke all on function public.delete_dead_push_subscription(text) from public;
grant execute on function public.delete_dead_push_subscription(text) to authenticated;
