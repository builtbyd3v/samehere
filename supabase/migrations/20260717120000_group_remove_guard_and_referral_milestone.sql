-- Plan 006: fix two definer-function gaps found in review.
--
-- (1) remove_group_member (20260716200000_group_membership.sql) checked only
-- "caller == created_by", never "caller is still an active member" -- unlike
-- its sibling add_group_member, which does check membership via
-- is_conversation_member. leave_conversation lets the creator leave a group
-- without ever reassigning created_by, so a creator who has left keeps the
-- power to remove members forever. Recreated in full (newest definition,
-- 20260716200000) with the same membership guard add_group_member already
-- has, inserted after the "not authenticated" check and before the
-- creator-equality check.
--
-- (2) trg_referral_campus_founder (newest definition: 20260713184000_referral_
-- qualification.sql) granted the 6-month Pro referral reward only when the
-- running qualified-referral count hit exactly 100. Under Read Committed
-- concurrency, two qualifying transactions can each read a count of 99 and
-- the running total skips past the milestone (e.g. straight to 101) without
-- either transaction ever observing the exact value -- the earned grant is
-- silently never issued, with no retry path. The adjacent campus-founder
-- branch already uses a >= comparison at its own threshold; switching the
-- Pro grant to the same style fixes the race, and the existing
-- not-currently-Pro guard (`is_pro = false or pro_until < now()`) keeps a
-- >= comparison idempotent -- it does not re-grant on every subsequent
-- referral once Pro has been granted. The campus-founder branch is
-- untouched; the trigger binding itself is untouched (create or replace
-- preserves it).

-- ============================================================
-- remove_group_member: recreated from 20260716200000_group_membership.sql
-- verbatim, plus the membership guard.
-- ============================================================
create or replace function public.remove_group_member(p_conversation_id uuid, p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_created_by uuid;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;

  select created_by into v_created_by
  from public.conversations
  where id = p_conversation_id and kind = 'group';

  if v_created_by is null then
    raise exception 'not a group conversation';
  end if;

  if not public.is_conversation_member(p_conversation_id) then
    raise exception 'not a member of this conversation';
  end if;

  if v_me <> v_created_by then
    raise exception 'only the group creator can remove members';
  end if;

  if p_member_id = v_created_by then
    raise exception 'cannot remove the group creator';
  end if;

  update public.conversation_members
  set left_at = now()
  where conversation_id = p_conversation_id
    and user_id = p_member_id
    and left_at is null;
end;
$$;

revoke all on function public.remove_group_member(uuid, uuid) from public;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;
-- `revoke all from public` does not strip anon by itself in this project
-- (default-privileges trap -- anon/authenticated are granted at the schema
-- level, not via PUBLIC); name anon explicitly.
revoke execute on function public.remove_group_member(uuid, uuid) from anon;

-- ============================================================
-- trg_referral_campus_founder: recreated from 20260713184000_referral_
-- qualification.sql verbatim, except the Pro-grant threshold check switches
-- from an exact-equality comparison to >= (see header comment for why).
-- Not RPC-callable (trigger-bound only); the trigger itself is unchanged.
-- ============================================================
create or replace function public.trg_referral_campus_founder()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  v_count bigint;
begin
  select count(*) into v_count from public.referrals
   where referrer_id = new.referrer_id and qualified_at is not null;

  if v_count >= 50 then
    update public.profiles set is_campus_founder = true
    where id = new.referrer_id and is_campus_founder = false;
  end if;

  -- Never clobber an active Stripe subscriber: only grant when the referrer
  -- isn't currently Pro. >= (not =) because Read Committed concurrency lets
  -- two qualifying transactions both read v_count = 99 and the count skip
  -- past 100 without either observing it exactly -- the not-currently-Pro
  -- guard below keeps >= idempotent (no re-grant once Pro is already set).
  if v_count >= 100 then
    update public.profiles
       set is_pro = true,
           pro_until = now() + interval '6 months',
           pro_source = 'referral'
     where id = new.referrer_id
       and (is_pro = false or pro_until < now());
  end if;

  return new;
end;
$function$;
