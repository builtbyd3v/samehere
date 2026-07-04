-- Quote repost column (may not have been applied remotely).
alter table public.reposts add column if not exists quote_text text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reposts_quote_text_length'
  ) then
    alter table public.reposts add constraint reposts_quote_text_length
      check (quote_text is null or char_length(quote_text) between 1 and 500);
  end if;
end $$;

-- Reaction subtype on notifications for clearer copy.
alter table public.notifications
  add column if not exists reaction_type text
  check (reaction_type is null or reaction_type in ('like', 'samehere'));

create or replace function public.insert_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_type text,
  p_post_id uuid default null,
  p_reaction_type text default null
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
  insert into public.notifications (user_id, type, actor_id, post_id, reaction_type)
  values (p_user_id, p_type, p_actor_id, p_post_id, p_reaction_type);
end;
$$;

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
  perform public.insert_notification(
    v_owner, new.user_id, 'reaction', new.post_id, new.type
  );
  return new;
end;
$$;

drop function if exists public.list_notifications(int);

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
  actor_avatar_url text,
  reaction_type text
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
    p.avatar_url,
    n.reaction_type
  from public.notifications n
  join public.profiles p on p.id = n.actor_id
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.list_notifications(int) from public;
grant execute on function public.list_notifications(int) to authenticated;
