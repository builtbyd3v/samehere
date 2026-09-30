-- Plan 017: a referrer earns 1 month of Pro each time 3 people they invited set
-- a stage.
--
-- Adds referrals.reward_granted_at (which referrals were spent on a reward), the
-- referral_reward notification type,an AFTER UPDATE OF stage trigger on
-- profiles that grants the month, and get_referral_reward_progress() for
-- /referrals.
--
-- Rules:
-- - Batch of 3: an invitee counts when their email is confirmed, they are not
--   suspended, their stage is set, and their referral is not yet spent. Each
--   full batch of 3 grants 1 month, then those 3 rows are spent.
-- - Lifetime cap: 6 rewarded months (18 spent referrals) per referrer.
-- - Never fight Stripe: a referrer with an active subscription, or with a Pro
--   grant that never expires (pro_until null), is skipped. The batch stays
--   unspent and is granted on a later stage-set once that Pro ends.
-- - The 100-referral semester reward (trg_referral_campus_founder) is unchanged.

-- 1. Which referrals were spent on a reward.
alter table public.referrals add column if not exists reward_granted_at timestamptz;
grant select (reward_granted_at) on public.referrals to authenticated;

-- 2. New notification type (list copied from
--    20261005090000_stuck_solved_and_helper_nudge.sql, 'referral_reward' appended).
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('follow', 'follow_request', 'comment', 'reaction', 'mention', 'referral_joined', 'stuck_help', 'referral_reward'));

-- 3. One definition of "counts toward the reward": confirmed, not suspended,
--    stage set, not yet spent. Used by the trigger and the progress RPC.
create or replace function public.referral_reward_eligible(p_referrer uuid)
returns table (referred_id uuid, referred_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.referred_id, r.created_at
  from public.referrals r
  join public.profiles p on p.id = r.referred_id
  join auth.users u on u.id = r.referred_id
  where r.referrer_id = p_referrer
    and r.reward_granted_at is null
    and p.stage is not null
    and p.is_suspended = false
    and u.email_confirmed_at is not null;
$$;

revoke all on function public.referral_reward_eligible(uuid) from public, anon, authenticated;

-- 4. The grant.
create or replace function public.grant_referral_stage_reward()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referrer uuid;
  v_is_pro boolean;
  v_pro_until timestamptz;
  v_pro_source text;
  v_batch uuid[];
begin
  select r.referrer_id into v_referrer
  from public.referrals r
  where r.referred_id = new.id and r.reward_granted_at is null;
  if v_referrer is null then
    return new;
  end if;

  -- Lock the referrer row: two invitees setting a stage at the same moment
  -- would otherwise both see 3 and grant twice.
  select p.is_pro, p.pro_until, p.pro_source
    into v_is_pro, v_pro_until, v_pro_source
  from public.profiles p
  where p.id = v_referrer and p.is_suspended = false
  for update;
  if not found then
    return new;
  end if;

  -- Never fight Stripe, never shorten a grant that does not expire. The batch
  -- stays unspent and is granted on a later stage-set once that Pro ends.
  if (v_pro_source = 'subscription' and public.is_pro_now(v_is_pro, v_pro_until))
     or (v_is_pro and v_pro_until is null) then
    return new;
  end if;

  -- ponytail: lifetime cap of 6 rewarded months (18 referrals). Raise it here
  -- if campus ambassadors need more; per-period caps only if farming appears.
  if (select count(*) from public.referrals
      where referrer_id = v_referrer and reward_granted_at is not null) >= 18 then
    return new;
  end if;

  select array_agg(e.referred_id) into v_batch
  from (
    select referred_id
    from public.referral_reward_eligible(v_referrer)
    order by referred_at, referred_id
    limit 3
  ) e;
  if coalesce(array_length(v_batch, 1), 0) < 3 then
    return new;
  end if;

  update public.referrals set reward_granted_at = now()
   where referred_id = any(v_batch);

  update public.profiles
     set is_pro = true,
         pro_until = greatest(coalesce(v_pro_until, now()), now()) + interval '1 month',
         pro_source = case
           when v_pro_source = 'one_time' and public.is_pro_now(v_is_pro, v_pro_until) then 'one_time'
           else 'referral'
         end
   where id = v_referrer;

  perform public.insert_notification(v_referrer, new.id, 'referral_reward');
  return new;
end;
$$;

revoke all on function public.grant_referral_stage_reward() from public, anon, authenticated;

drop trigger if exists profiles_referral_stage_reward on public.profiles;
create trigger profiles_referral_stage_reward
  after update of stage on public.profiles
  for each row
  when (old.stage is null and new.stage is not null)
  execute function public.grant_referral_stage_reward();

-- 5. Own progress for /referrals. Counts only, never ids.
create or replace function public.get_referral_reward_progress()
returns table (ready int, rewards int)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::int from public.referral_reward_eligible(auth.uid())),
    (select (count(*) / 3)::int from public.referrals
      where referrer_id = auth.uid() and reward_granted_at is not null)
  where auth.uid() is not null;
$$;

revoke all on function public.get_referral_reward_progress() from public, anon, authenticated;
grant execute on function public.get_referral_reward_progress() to authenticated;
