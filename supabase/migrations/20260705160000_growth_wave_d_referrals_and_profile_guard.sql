-- ============ Referral system (D2) ============
alter table public.profiles add column if not exists referral_code text unique;
alter table public.profiles add column if not exists is_campus_founder boolean not null default false;

-- Backfill: each existing user's code defaults to their (unique, lowercase) username.
update public.profiles set referral_code = username where referral_code is null;

-- One referral row per referred user (who referred whom). Writes only via the
-- definer handle_new_user trigger below; no user-facing insert policy.
create table if not exists public.referrals (
  referred_id uuid primary key references public.profiles(id) on delete cascade,
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists referrals_referrer_idx on public.referrals(referrer_id);
alter table public.referrals enable row level security;
create policy "referrer or referred read" on public.referrals for select
  using (auth.uid() = referrer_id or auth.uid() = referred_id);

-- New-user trigger: set referral_code = username, and record attribution if the
-- signup carried a ref_code in auth metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  v_username text := new.raw_user_meta_data ->> 'username';
  v_ref text := lower(trim(coalesce(new.raw_user_meta_data ->> 'ref_code', '')));
  v_referrer uuid;
begin
  insert into public.profiles (id, username, referral_code)
  values (new.id, v_username, v_username);

  if length(v_ref) > 0 then
    select id into v_referrer from public.profiles where referral_code = v_ref;
    if v_referrer is not null and v_referrer <> new.id then
      insert into public.referrals (referred_id, referrer_id)
      values (new.id, v_referrer) on conflict (referred_id) do nothing;
    end if;
  end if;
  return new;
end;
$function$;

-- Award Campus Founder when a referrer reaches 100 successful referrals.
create or replace function public.trg_referral_campus_founder()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if (select count(*) from public.referrals where referrer_id = new.referrer_id) >= 100 then
    update public.profiles set is_campus_founder = true
    where id = new.referrer_id and is_campus_founder = false;
  end if;
  return new;
end;
$function$;
drop trigger if exists referrals_campus_founder on public.referrals;
create trigger referrals_campus_founder after insert on public.referrals
  for each row execute function public.trg_referral_campus_founder();

-- Own referral code + count + badge, for the referral dashboard.
create or replace function public.get_referral_stats()
returns table(code text, referral_count bigint, is_campus_founder boolean)
language plpgsql security definer set search_path to '' as $function$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  return query
  select p.referral_code,
         (select count(*) from public.referrals r where r.referrer_id = v_me),
         p.is_campus_founder
  from public.profiles p where p.id = v_me;
end;
$function$;

-- Change own referral code (validated + uniqueness-checked). Lowercased.
create or replace function public.set_referral_code(p_code text)
returns text language plpgsql security definer set search_path to '' as $function$
declare v_me uuid := auth.uid(); v_code text := lower(trim(p_code));
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if v_code !~ '^[a-z0-9_]{3,20}$' then raise exception 'invalid_code'; end if;
  if exists (select 1 from public.profiles where referral_code = v_code and id <> v_me) then
    raise exception 'code_taken';
  end if;
  update public.profiles set referral_code = v_code where id = v_me;
  return v_code;
end;
$function$;

grant execute on function public.get_referral_stats() to authenticated;
grant execute on function public.set_referral_code(text) to authenticated;

-- ============ Security fix: guard privileged profile columns ============
-- The profiles UPDATE policy allows a user to set ANY of their own columns, so a
-- crafted client call could self-grant is_pro / is_founder / is_campus_founder.
-- This trigger pins those columns to their prior values when the caller is a
-- normal API role (authenticated/anon); SECURITY DEFINER functions (run as owner)
-- and service_role (future Stripe webhook) can still set them.
create or replace function public.guard_profile_privileged()
returns trigger language plpgsql as $function$
begin
  if current_user in ('authenticated', 'anon') then
    new.is_pro := old.is_pro;
    new.is_founder := old.is_founder;
    new.is_campus_founder := old.is_campus_founder;
  end if;
  return new;
end;
$function$;
drop trigger if exists profiles_guard_privileged on public.profiles;
create trigger profiles_guard_privileged before update on public.profiles
  for each row execute function public.guard_profile_privileged();
