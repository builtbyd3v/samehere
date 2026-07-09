-- What granted Pro is a fact, not something to infer.
--
-- 20260710170000 made expire_lapsed_pro() skip rows with a stripe_customer_id,
-- reasoning that "has a customer id" == "is a subscriber, Stripe will expire
-- them for us". That is false the moment a user subscribes monthly, cancels,
-- and later buys the one-time semester: the customer id sticks around from the
-- subscription, so the sweep skips them and their semester term NEVER expires.
-- Confirmed live on @ara's first real semester purchase. Same bad inference
-- made /pro show "Manage billing" for a one-time buyer, opening a portal with
-- no subscription in it.
--
-- Record the grant source explicitly instead.

alter table public.profiles
  add column if not exists pro_source text
  check (pro_source is null or pro_source in ('subscription', 'one_time'));

comment on column public.profiles.pro_source is
  'How the current Pro grant was made. subscription = Stripe governs expiry via '
  'customer.subscription.*. one_time = semester purchase, expire_lapsed_pro() '
  'sweeps it once pro_until lapses. NULL = comped/manual, never expires.';

-- Backfill: a live pro_until with no way to renew is a one-time grant. Comped
-- rows (pro_until null) stay NULL and remain immune to the sweep.
update public.profiles
   set pro_source = 'one_time'
 where is_pro
   and pro_until is not null
   and pro_source is null;

-- Freeze the new column against client writes, same as every other Pro column.
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
    if not coalesce(old.is_pro, false) then
      new.accent_color := old.accent_color;
      new.avatar_is_animated := old.avatar_is_animated;
      new.banner_url := old.banner_url;
    end if;
  end if;
  return new;
end;
$function$;

-- Sweep exactly the one-time grants. Subscribers are expired by Stripe events;
-- comped rows (pro_source null, pro_until null) are never touched.
create or replace function public.expire_lapsed_pro()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.profiles
     set is_pro = false
   where is_pro
     and pro_source = 'one_time'
     and pro_until is not null
     and pro_until < now() - interval '1 day';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_lapsed_pro() from public, anon, authenticated;
