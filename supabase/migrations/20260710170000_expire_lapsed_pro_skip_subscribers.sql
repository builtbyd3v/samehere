-- expire_lapsed_pro() swept every lapsed row, including monthly subscribers.
-- Those carry pro_until = the current period end, and Stripe is the source of
-- truth for them: renewal arrives as customer.subscription.updated (pushing
-- pro_until forward) and cancellation as customer.subscription.deleted (which
-- clears is_pro directly). If a renewal webhook were ever delayed past the
-- 1-day grace, this job would de-Pro a paying customer until the next event
-- self-healed it.
--
-- Only one-time semester buyers actually need sweeping: the webhook
-- deliberately does not write stripe_customer_id for mode:"payment" sessions
-- (there is no subscription to manage), so `stripe_customer_id is null` is
-- exactly the set Stripe will never tell us about.
--
-- ponytail: a user who buys monthly and LATER buys a semester keeps a customer
-- id, so their semester term would be governed by Stripe events rather than
-- this sweep. Acceptable — they're a subscriber either way. Revisit if we ever
-- let a subscriber stack a one-time term.

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
     and pro_until is not null
     and stripe_customer_id is null
     and pro_until < now() - interval '1 day';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_lapsed_pro() from public, anon, authenticated;
