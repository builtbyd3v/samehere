-- E3: web-push subscriptions (one row per device endpoint).
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

-- Stripe billing columns. Set only by the webhook (service_role); guarded below
-- so a client cannot self-extend Pro.
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists pro_until timestamptz;

-- Extend the privileged-column guard to also pin stripe_customer_id + pro_until
-- for normal API roles. SECURITY DEFINER fns + service_role can still set them.
create or replace function public.guard_profile_privileged()
returns trigger language plpgsql as $function$
begin
  if current_user in ('authenticated', 'anon') then
    new.is_pro := old.is_pro;
    new.is_founder := old.is_founder;
    new.is_campus_founder := old.is_campus_founder;
    new.stripe_customer_id := old.stripe_customer_id;
    new.pro_until := old.pro_until;
  end if;
  return new;
end;
$function$;
