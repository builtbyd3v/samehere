-- ============ End beta Pro grant: going public today ============
-- Reverts the signup-side half of 20260721000000_beta_pro_grant.sql now that
-- INVITE_ONLY is flipped off. New signups must not get Pro. Body is the
-- 20260721000000 definition verbatim; the only change is dropping the
-- is_pro/pro_source insert columns (back to the 20260713100000 shape).
--
-- Note: existing pro_source='beta' rows are untouched here (per the revert
-- runbook in 20260721000000, that backfill revert is a separate statement
-- run outside migrations).
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

  insert into public.profiles (id, username, referral_code, email_domain, is_founder, verified_student)
  values (new.id, v_username, v_username, v_domain,
          (select count(*) from public.profiles where is_founder) < 100,
          v_domain ~ '\.edu$');
  return new;
end;
$function$;
