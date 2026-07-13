-- Plan 041: referral arrival notification. referrals rows + get_referral_stats
-- counters exist (20260711160000_referrals_require_confirmation.sql attributes
-- a referral on email confirmation) but the referrer never learns a friend
-- actually joined -- the viral loop has no reward moment. Fire a notification
-- at ARRIVAL (confirmed join), not at qualification (Social Butterfly / 100
-- confirmed referrals is a separate, unrelated milestone -- out of scope here).

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('follow', 'follow_request', 'comment', 'reaction', 'mention', 'referral_joined'));

-- handle_email_confirmed: byte-for-byte from 20260711160000, plus one
-- insert_notification call (recipient = referrer, actor = the new arrival)
-- right after the referrals row is attributed. insert_notification already
-- self-skips (can't happen here -- v_referrer <> new.id is already checked)
-- and both-direction block-skips, so no extra guard is needed here.
create or replace function public.handle_email_confirmed()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  v_ref text := lower(trim(coalesce(new.raw_user_meta_data ->> 'ref_code', '')));
  v_referrer uuid;
begin
  if length(v_ref) = 0 then return new; end if;
  select id into v_referrer from public.profiles where referral_code = v_ref;
  if v_referrer is not null and v_referrer <> new.id then
    insert into public.referrals (referred_id, referrer_id)
    values (new.id, v_referrer) on conflict (referred_id) do nothing;
    if found then
      perform public.insert_notification(v_referrer, new.id, 'referral_joined');
    end if;
  end if;
  return new;
end;
$function$;

-- Trigger-bound only, same ACL as the original (house pattern: CREATE OR
-- REPLACE resets EXECUTE to PUBLIC, so re-revoke every time).
revoke execute on function public.handle_email_confirmed() from public, anon, authenticated;
