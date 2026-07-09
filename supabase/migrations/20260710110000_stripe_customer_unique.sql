-- Stripe billing integrity.
--
-- The webhook maps a Stripe customer back to a profile with
-- `.eq('stripe_customer_id', ...)` on subscription.updated / subscription.deleted.
-- Without a uniqueness guarantee that match could hit several rows, so a single
-- subscription event could flip `is_pro` across multiple accounts at once.
--
-- Partial index: `stripe_customer_id` is NULL for every non-paying profile, and
-- NULLs are distinct under a plain unique index anyway, but the WHERE clause
-- keeps the index small (one entry per paying customer, not one per user).

create unique index if not exists profiles_stripe_customer_id_key
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;
