-- Defense in depth: block inserting an 'accepted' follow into a PRIVATE account
-- directly. Private targets may only be inserted as 'pending'. (The app uses the
-- request_follow function below, which bypasses RLS with the correct status.)
drop policy "user follows user" on public.follows;
create policy "user follows user" on public.follows for insert
  with check (
    auth.uid() = follower_id
    and (
      status = 'pending'
      or not exists (select 1 from public.profiles where id = following_id and is_private)
    )
  );

-- Follow a user. Private target -> 'pending', public -> 'accepted'. The follower
-- can never force 'accepted' on a private account because status is computed here.
-- Awards a connection point to the follower when an accepted follow is created.
-- ponytail: "connection" is awarded to whoever establishes the accepted follow
-- (here the follower; in accept_follow, the accepter). Loosely honors the
-- "mutual" spec; deduped to 1/day. Award both parties if that ever matters.
create or replace function public.request_follow(p_target uuid)
returns text
language plpgsql security definer set search_path to ''
as $$
declare
  v_me uuid := auth.uid();
  v_private boolean;
  v_status text;
  v_inserted int;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if v_me = p_target then raise exception 'cannot follow yourself'; end if;
  select is_private into v_private from public.profiles where id = p_target;
  if not found then raise exception 'no such user'; end if;

  v_status := case when v_private then 'pending' else 'accepted' end;
  insert into public.follows (follower_id, following_id, status)
  values (v_me, p_target, v_status)
  on conflict (follower_id, following_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted > 0 and v_status = 'accepted' then
    perform public.log_contribution('connection', jsonb_build_object('with', p_target));
  end if;
  return v_status;
end;
$$;

-- Target accepts a pending request. Only the followee (auth.uid() = following_id)
-- can move pending -> accepted. Awards the accepter a connection point.
create or replace function public.accept_follow(p_follower uuid)
returns void
language plpgsql security definer set search_path to ''
as $$
declare
  v_me uuid := auth.uid();
  v_updated int;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  update public.follows set status = 'accepted'
   where follower_id = p_follower and following_id = v_me and status = 'pending';
  get diagnostics v_updated = row_count;
  if v_updated > 0 then
    perform public.log_contribution('connection', jsonb_build_object('with', p_follower));
  end if;
end;
$$;

-- Target rejects a pending request (deletes it). Only the followee can.
create or replace function public.reject_follow(p_follower uuid)
returns void
language plpgsql security definer set search_path to ''
as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  delete from public.follows
   where follower_id = p_follower and following_id = v_me and status = 'pending';
end;
$$;

grant execute on function public.request_follow(uuid) to authenticated;
grant execute on function public.accept_follow(uuid) to authenticated;
grant execute on function public.reject_follow(uuid) to authenticated;
