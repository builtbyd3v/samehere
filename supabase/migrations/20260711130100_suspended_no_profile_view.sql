-- Suspended users could still fire record_profile_view (it's a SECURITY
-- DEFINER RPC, callable directly regardless of what page routing allows),
-- landing them in the target's who-viewed-you list. Same principle as the
-- insert policies in 20260706190000: the DB call itself is the boundary,
-- not just the page you got there from.
create or replace function public.record_profile_view(p_viewed uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  if auth.uid() = p_viewed then
    return;
  end if;
  if public.current_is_suspended() then
    return;
  end if;
  insert into public.profile_views (viewer_id, viewed_id)
  values (auth.uid(), p_viewed)
  on conflict (viewer_id, viewed_id)
  do update set created_at = now();
end;
$$;
