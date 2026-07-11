-- Plan 014 D2-A: raise free people_search daily cap 1 -> 5 (Pro unchanged at 150).

create or replace function public.use_ai_quota(p_kind text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_pro boolean;
  v_cap int;
  v_today date := (now() at time zone 'America/New_York')::date;
  v_count int;
begin
  if v_user is null then
    return false;
  end if;

  select public.is_pro_now(is_pro, pro_until) into v_pro
  from public.profiles where id = v_user;

  v_cap := case
    when p_kind = 'people_search' then case when v_pro then 150 else 5 end
    else case when v_pro then 150 else 3 end
  end;

  insert into public.ai_usage (user_id, date, kind, count)
  values (v_user, v_today, p_kind, 1)
  on conflict (user_id, date, kind)
  do update set count = ai_usage.count + 1
  returning count into v_count;

  return v_count <= v_cap;
end;
$$;

revoke all on function public.use_ai_quota(text) from public, anon;
grant execute on function public.use_ai_quota(text) to authenticated;
