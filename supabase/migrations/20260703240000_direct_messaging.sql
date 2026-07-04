-- Direct messaging: 1:1 threads, block-aware, member-only RLS.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dm_pairs (
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade unique,
  primary key (user_a, user_b),
  constraint dm_pairs_ordered check (user_a < user_b)
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_members_user_id_idx on public.conversation_members(user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx on public.messages(conversation_id, created_at desc);

-- Membership check bypasses RLS (avoids infinite recursion in member policies).
create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id and user_id = auth.uid()
  );
$$;

revoke all on function public.is_conversation_member(uuid) from public;
grant execute on function public.is_conversation_member(uuid) to authenticated;

-- Bump conversation sort key on new message.
create or replace function public.bump_conversation_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_bump_conversation
  after insert on public.messages
  for each row execute function public.bump_conversation_updated();

alter table public.conversations enable row level security;
alter table public.dm_pairs enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create policy "member read conversation" on public.conversations
  for select using (
    auth.uid() is not null and public.is_conversation_member(id)
  );

create policy "member read peers" on public.conversation_members
  for select using (public.is_conversation_member(conversation_id));

create policy "member read messages" on public.messages
  for select using (
    auth.uid() is not null
    and public.is_conversation_member(conversation_id)
    and not exists (
      select 1
      from public.conversation_members cm2
      join public.blocks b on (
        (b.blocker_id = auth.uid() and b.blocked_id = cm2.user_id)
        or (b.blocker_id = cm2.user_id and b.blocked_id = auth.uid())
      )
      where cm2.conversation_id = messages.conversation_id
        and cm2.user_id <> auth.uid()
    )
  );

create policy "member send message" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and public.is_conversation_member(conversation_id)
    and not exists (
      select 1
      from public.conversation_members cm2
      join public.blocks b on (
        (b.blocker_id = auth.uid() and b.blocked_id = cm2.user_id)
        or (b.blocker_id = cm2.user_id and b.blocked_id = auth.uid())
      )
      where cm2.conversation_id = messages.conversation_id
        and cm2.user_id <> auth.uid()
    )
  );

-- Find or create a 1:1 thread. Rejects self and blocked pairs.
create or replace function public.get_or_create_dm(p_recipient uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_conv uuid;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;
  if v_me = p_recipient then
    raise exception 'cannot message yourself';
  end if;
  if not exists (select 1 from public.profiles where id = p_recipient) then
    raise exception 'no such user';
  end if;

  if exists (
    select 1 from public.blocks
    where (blocker_id = v_me and blocked_id = p_recipient)
       or (blocker_id = p_recipient and blocked_id = v_me)
  ) then
    raise exception 'cannot message blocked user';
  end if;

  if v_me < p_recipient then
    v_a := v_me;
    v_b := p_recipient;
  else
    v_a := p_recipient;
    v_b := v_me;
  end if;

  select conversation_id into v_conv
  from public.dm_pairs
  where user_a = v_a and user_b = v_b;

  if v_conv is not null then
    return v_conv;
  end if;

  insert into public.conversations default values returning id into v_conv;
  insert into public.conversation_members (conversation_id, user_id)
  values (v_conv, v_me), (v_conv, p_recipient);
  insert into public.dm_pairs (user_a, user_b, conversation_id)
  values (v_a, v_b, v_conv);

  return v_conv;
end;
$$;

revoke all on function public.get_or_create_dm(uuid) from public;
grant execute on function public.get_or_create_dm(uuid) to authenticated;

create or replace function public.mark_dm_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update public.conversation_members
  set last_read_at = now()
  where conversation_id = p_conversation_id and user_id = auth.uid();
end;
$$;

revoke all on function public.mark_dm_read(uuid) from public;
grant execute on function public.mark_dm_read(uuid) to authenticated;

-- Inbox for the signed-in user; hides blocked peers.
create or replace function public.list_dm_inbox()
returns table (
  conversation_id uuid,
  peer_id uuid,
  peer_username text,
  peer_display_name text,
  peer_avatar_url text,
  last_message text,
  last_message_at timestamptz,
  last_sender_id uuid,
  unread_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with my_convs as (
    select cm.conversation_id, cm.last_read_at
    from public.conversation_members cm
    where cm.user_id = auth.uid()
  ),
  peers as (
    select mc.conversation_id, mc.last_read_at, cm2.user_id as peer_id
    from my_convs mc
    join public.conversation_members cm2
      on cm2.conversation_id = mc.conversation_id and cm2.user_id <> auth.uid()
    where not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = cm2.user_id)
         or (b.blocker_id = cm2.user_id and b.blocked_id = auth.uid())
    )
  ),
  last_msgs as (
    select distinct on (m.conversation_id)
      m.conversation_id, m.content, m.created_at, m.sender_id
    from public.messages m
    join peers p on p.conversation_id = m.conversation_id
    order by m.conversation_id, m.created_at desc
  )
  select
    p.conversation_id,
    p.peer_id,
    pr.username,
    pr.display_name,
    pr.avatar_url,
    coalesce(lm.content, ''),
    coalesce(lm.created_at, c.updated_at),
    lm.sender_id,
    coalesce((
      select count(*)::bigint
      from public.messages m2
      where m2.conversation_id = p.conversation_id
        and m2.sender_id = p.peer_id
        and (p.last_read_at is null or m2.created_at > p.last_read_at)
    ), 0)
  from peers p
  join public.conversations c on c.id = p.conversation_id
  join public.profiles pr on pr.id = p.peer_id
  left join last_msgs lm on lm.conversation_id = p.conversation_id
  order by coalesce(lm.created_at, c.updated_at) desc nulls last;
$$;

revoke all on function public.list_dm_inbox() from public;
grant execute on function public.list_dm_inbox() to authenticated;
