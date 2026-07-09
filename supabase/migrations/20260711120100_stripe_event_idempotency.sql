-- ============ Stripe webhook idempotency + ordering guard (finding M1) ============
-- subscription.updated / subscription.deleted resolved the user by
-- stripe_customer_id and applied blindly. Stripe does not guarantee delivery
-- order and retries any non-2xx, so:
--   - a redelivered subscription.deleted after a re-subscribe revoked a paying
--     customer, and
--   - a stale subscription.updated(active) delivered AFTER subscription.deleted
--     re-granted Pro to a cancelled account.
-- Two guards close this: an event-id dedupe table (exact-redelivery), and a
-- per-row last_subscription_event_at high-water mark (stale-but-distinct event).

-- (a) Processed-event ledger. The webhook inserts event.id here first; a conflict
-- means "already handled" and it bails 200. Definer/service_role only, zero
-- policies — same discipline as ai_usage / profile_views (never client-reachable).
create table if not exists public.stripe_events (
  id text primary key,                 -- Stripe event.id
  type text not null,
  created_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
-- Deliberately zero policies: reachable only by service_role (the webhook).

-- (b) High-water mark of the last subscription event APPLIED to this row. The
-- webhook stamps event.created here and refuses to apply any subscription event
-- older than it, so an out-of-order delivery cannot regress state. NULL = no
-- subscription event applied yet.
alter table public.profiles add column if not exists last_subscription_event_at timestamptz;

-- (c) guard_profile_privileged — body copied VERBATIM from 20260711100000
-- (which froze email_domain), with last_subscription_event_at added to the frozen
-- list so a client can't rewrite the high-water mark and defeat the ordering guard.
-- BEFORE trigger that checks current_user, so it must NOT be SECURITY DEFINER.
-- ALSO (H3'): the cosmetics gate now keys on public.is_pro_now(...) instead of a
-- raw coalesce(old.is_pro) so a LAPSED Pro (flag still true, pro_until elapsed,
-- not yet swept) can no longer edit accent_color / banner / animated avatar — the
-- guard now agrees with isPro() and the avatar RPCs. Comped grants (pro_until null)
-- are unaffected. is_pro itself is still frozen unconditionally just above.
create or replace function public.guard_profile_privileged()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if current_user in ('authenticated', 'anon') then
    new.is_pro := old.is_pro;
    new.is_founder := old.is_founder;
    new.is_campus_founder := old.is_campus_founder;
    new.stripe_customer_id := old.stripe_customer_id;
    new.pro_until := old.pro_until;
    new.pro_source := old.pro_source;
    new.is_admin := old.is_admin;
    new.is_suspended := old.is_suspended;
    new.email_domain := old.email_domain;
    new.last_subscription_event_at := old.last_subscription_event_at;
    if not public.is_pro_now(old.is_pro, old.pro_until) then
      new.accent_color := old.accent_color;
      new.avatar_is_animated := old.avatar_is_animated;
      new.banner_url := old.banner_url;
    end if;
  end if;
  return new;
end;
$function$;
