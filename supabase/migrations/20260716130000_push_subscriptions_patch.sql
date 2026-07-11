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

-- Subscribe/unsubscribe run under this owner-only RLS from the user's own
-- session — no elevated access needed there.
--
-- The push SEND, however, reads a DIFFERENT user's subscriptions (the actor
-- triggers the notification; the recipient owns the subscription rows), which
-- crosses the owner-only RLS. That cross-user read + the dead-endpoint prune
-- are done server-side via the sanctioned service_role admin client
-- (lib/supabase/admin.ts, lib/push.ts), NOT a SECURITY DEFINER RPC — a definer
-- callable by any authenticated user for an arbitrary user_id would leak every
-- user's endpoint + keys and enable a cross-user disable-push DoS.
