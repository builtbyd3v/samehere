-- In-app notifications (lite) + navbar unread totals for DMs.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('follow', 'follow_request', 'comment', 'reaction')),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications(user_id) where read = false;

alter table public.notifications enable row level security;

create policy "owner read notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "owner update notifications" on public.notifications
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger helper: skip self, skip blocks.
create or replace function public.insert_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_type text,
  p_post_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_actor_id is null or p_user_id = p_actor_id then
    return;
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = p_user_id and b.blocked_id = p_actor_id)
       or (b.blocker_id = p_actor_id and b.blocked_id = p_user_id)
  ) then
    return;
  end if;
  insert into public.notifications (user_id, type, actor_id, post_id)
  values (p_user_id, p_type, p_actor_id, p_post_id);
end;
$$;

revoke all on function public.insert_notification(uuid, uuid, text, uuid) from public;

create or replace function public.trg_notify_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      perform public.insert_notification(new.following_id, new.follower_id, 'follow_request', null);
    elsif new.status = 'accepted' then
      perform public.insert_notification(new.following_id, new.follower_id, 'follow', null);
    end if;
  end if;
  return new;
end;
$$;

create trigger follows_notify
  after insert on public.follows
  for each row execute function public.trg_notify_follow();

create or replace function public.trg_notify_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.posts where id = new.post_id;
  perform public.insert_notification(v_owner, new.user_id, 'comment', new.post_id);
  return new;
end;
$$;

create trigger comments_notify
  after insert on public.comments
  for each row execute function public.trg_notify_comment();

create or replace function public.trg_notify_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.posts where id = new.post_id;
  perform public.insert_notification(v_owner, new.user_id, 'reaction', new.post_id);
  return new;
end;
$$;

create trigger reactions_notify
  after insert on public.reactions
  for each row execute function public.trg_notify_reaction();

create or replace function public.get_dm_unread_total()
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select case
    when auth.uid() is null then 0::bigint
    else coalesce((select sum(i.unread_count) from public.list_dm_inbox() i), 0)::bigint
  end;
$$;

revoke all on function public.get_dm_unread_total() from public;
grant execute on function public.get_dm_unread_total() to authenticated;

create or replace function public.get_notification_unread_total()
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select case
    when auth.uid() is null then 0::bigint
    else coalesce((
      select count(*)::bigint
      from public.notifications n
      where n.user_id = auth.uid() and n.read = false
    ), 0)::bigint
  end;
$$;

revoke all on function public.get_notification_unread_total() from public;
grant execute on function public.get_notification_unread_total() to authenticated;

create or replace function public.list_notifications(p_limit int default 50)
returns table (
  id uuid,
  type text,
  post_id uuid,
  read boolean,
  created_at timestamptz,
  actor_id uuid,
  actor_username text,
  actor_display_name text,
  actor_avatar_url text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    n.id,
    n.type,
    n.post_id,
    n.read,
    n.created_at,
    n.actor_id,
    p.username,
    p.display_name,
    p.avatar_url
  from public.notifications n
  join public.profiles p on p.id = n.actor_id
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.list_notifications(int) from public;
grant execute on function public.list_notifications(int) to authenticated;

create or replace function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
  set read = true
  where user_id = auth.uid() and read = false;
$$;

revoke all on function public.mark_all_notifications_read() from public;
grant execute on function public.mark_all_notifications_read() to authenticated;
