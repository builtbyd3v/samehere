-- The semester plan is a ONE-TIME charge, so no Stripe subscription exists and
-- no customer.subscription.deleted event will ever arrive to revoke Pro. The
-- webhook stamps pro_until; this job is what actually ends the term.
--
-- Monthly subscribers also carry pro_until (the current period end). Their
-- renewal arrives as customer.subscription.updated, which pushes pro_until
-- forward. The 1-day grace below keeps a late/retried renewal webhook from
-- letting this job revoke a paying subscriber between renewal and delivery.
--
-- Runs as `postgres`, so guard_profile_privileged() (which only freezes these
-- columns for the `authenticated` / `anon` roles) does not block the write.

create extension if not exists pg_cron;

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
     and pro_until < now() - interval '1 day';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Never callable over the REST API — this is a cron entry point, not an RPC.
revoke all on function public.expire_lapsed_pro() from public, anon, authenticated;

-- ponytail: nightly, not exact-to-the-minute. A lapsed user keeps Pro for up to
-- ~24h past pro_until. Tighten the schedule only if that ever matters.
select cron.unschedule('expire-lapsed-pro')
  where exists (select 1 from cron.job where jobname = 'expire-lapsed-pro');

select cron.schedule(
  'expire-lapsed-pro',
  '17 5 * * *',
  $$select public.expire_lapsed_pro()$$
);
