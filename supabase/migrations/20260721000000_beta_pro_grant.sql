-- ============ Beta Pro grant: everyone during invite-only is Pro ============
-- While INVITE_ONLY=1 gates signup (plan 042), every account is a hand-invited
-- beta tester. Granting them Pro removes the AI daily caps (3-5/day -> 150/day),
-- puts them on the Pro model tier, and silences upsell UI during feedback
-- collection. The grant is tagged pro_source='beta' so it is revocable in one
-- statement and never touches paying users.
--
-- Lifecycle: this grant is coupled to the INVITE_ONLY env flag. When the flag
-- is flipped off (go-public), run the revert in the same sitting:
--   1. update public.profiles set is_pro = false, pro_source = null
--      where pro_source = 'beta';
--   2. re-apply handle_new_user WITHOUT the is_pro/pro_source columns below
--      (base definition: 20260713100000_open_signup_verified_student.sql).
-- Until then, expire_lapsed_pro() ignores these rows (it sweeps 'one_time'
-- and 'referral' — see 20260713170000 — never 'beta'), and a beta user who
-- really subscribes gets pro_source overwritten to 'subscription' by the
-- Stripe webhook, which is correct.

-- (1) 'beta' becomes a legal grant source.
alter table public.profiles drop constraint if exists profiles_pro_source_check;
alter table public.profiles
  add constraint profiles_pro_source_check
  check (pro_source is null or pro_source in ('subscription', 'one_time', 'referral', 'beta'));

comment on column public.profiles.pro_source is
  'How the current Pro grant was made. subscription = Stripe governs expiry via '
  'customer.subscription.*. one_time = semester purchase and referral = milestone '
  'reward; both swept by expire_lapsed_pro() once pro_until lapses. beta = '
  'invite-only tester grant, revoked in bulk when INVITE_ONLY flips off. '
  'NULL = comped/manual, never expires.';

-- (2) Backfill: every existing non-Pro account is a beta tester.
update public.profiles
   set is_pro = true, pro_source = 'beta'
 where not is_pro;

-- (3) handle_new_user grants Pro on signup. Body is the 20260713100000
-- definition verbatim; the only change is the two extra insert columns.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare
  v_username text := new.raw_user_meta_data ->> 'username';
  v_domain text := lower(split_part(new.email, '@', 2));
  v_base text;
  v_candidate text;
  v_tries int := 0;
begin
  if v_username is null
     or v_username !~ '^[a-z0-9_]{3,20}$'
     or v_username in ('edit','api','dashboard','feed','post','login',
                        'signup','auth','admin','profile','search','saved')
  then
    v_base := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g');
    v_base := left(v_base, 15);
    if length(v_base) < 3 then
      v_base := left('user' || v_base, 15);
    end if;
    if v_base in ('edit','api','dashboard','feed','post','login',
                   'signup','auth','admin','profile','search','saved') then
      v_base := v_base || '_';
    end if;

    v_candidate := v_base;
    while exists (select 1 from public.profiles where username = v_candidate) and v_tries < 10 loop
      v_tries := v_tries + 1;
      v_candidate := v_base || '_' || lpad(floor(random() * 10000)::int::text, 4, '0');
    end loop;
    if exists (select 1 from public.profiles where username = v_candidate) then
      v_candidate := 'user_' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    end if;
    v_username := v_candidate;
  end if;

  insert into public.profiles (id, username, referral_code, email_domain, is_founder, verified_student, is_pro, pro_source)
  values (new.id, v_username, v_username, v_domain,
          (select count(*) from public.profiles where is_founder) < 100,
          v_domain ~ '\.edu$',
          true, 'beta');
  return new;
end;
$function$;
