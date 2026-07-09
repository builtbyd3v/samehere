-- M8 (+ H5b): a harassed student has no recourse.
--   H5b  the block never stopped the SEND. The messages INSERT with_check read
--        public.blocks DIRECTLY via a JOIN, and a policy subquery runs under the
--        CALLER's RLS. blocks has one SELECT policy -- "owner read" USING
--        (auth.uid() = blocker_id) -- so the sender only ever sees rows THEY
--        authored. "B blocked A" is a row B wrote; A cannot see it, the NOT
--        EXISTS matches zero rows -> true, and A's send passes. This is the
--        exact H5 mechanism fixed in 20260711110000 for posts/reposts/comments/
--        reactions/follows/messages-SELECT; the messages INSERT was missed.
--        Fix: route the block check through public.get_blocked_ids()
--        (SECURITY DEFINER, bypasses blocks RLS, bidirectional) -- the same
--        shape the SELECT policy already uses.
--   M8a  reports could only target a post, and the FK cascaded -- deleting the
--        reported post DESTROYED the report (this is live: reports_post_id_fkey
--        is already ON DELETE CASCADE). Add reported_user_id + message_id + a
--        target_type + a server-captured `snapshot` (written by the trigger, never
--        by the client, and unreadable by the reporter -- see the column grants),
--        flip every target FK to
--        ON DELETE SET NULL so a report OUTLIVES its target, and enforce
--        "exactly one target, matching target_type" with a BEFORE INSERT trigger
--        (a plain CHECK can't hold once SET NULL nulls an id post-hoc). Extend
--        admin_list_reports() to render all three and fall back to the snapshot.
--   M8b  DMs were inescapable (no way to leave). Add a left_at-based leave.
--        We deliberately do NOT add a message DELETE policy: an earlier review
--        framed DM immutability as a defect, but for a harassment product an
--        un-deletable DM record is a FEATURE -- a harasser must not be able to
--        delete the abusive message a victim just reported. (The report snapshot
--        above is the second line of defence if that ever changes.)
--   M8b-blackhole  get_or_create_dm only un-leaves the SENDER, so a message sent
--        TO someone who left vanished silently (their left_at stayed set, the
--        thread stayed hidden). We re-activate the RECIPIENT on any inbound
--        message (AFTER INSERT trigger clears their left_at) -- the Messenger
--        model: leave hides the thread until someone speaks again. Safe because
--        the messages INSERT policy above already rejects a blocked sender, so a
--        harasser cannot use it to force back in. Block = "never contact me";
--        leave = "clear my inbox".

-- ============ H5b: messages INSERT respects blocks (bidirectional) ============
-- sender_id, is_conversation_member(), and current_is_suspended() preserved
-- verbatim; only the blocks JOIN is swapped for the definer NOT IN against the
-- OTHER member (cm2.user_id <> me), mirroring the SELECT policy above it.
drop policy if exists "member send message" on public.messages;
create policy "member send message" on public.messages
for insert with check (
  (select auth.uid()) = sender_id
  and public.is_conversation_member(conversation_id)
  and not exists (
    select 1 from public.conversation_members cm2
    where cm2.conversation_id = messages.conversation_id
      and cm2.user_id <> (select auth.uid())
      and cm2.user_id in (select public.get_blocked_ids())
  )
  and not public.current_is_suspended()
);

-- ============ M8a: reports target a post/user/message AND outlive it ============
-- New target FKs use ON DELETE SET NULL (NOT cascade): the report row survives
-- when its target is deleted; the id just goes null and the snapshot carries the
-- evidence.
alter table public.reports
  add column reported_user_id uuid references public.profiles(id) on delete set null,
  add column message_id uuid references public.messages(id) on delete set null;

-- Flip the PRE-EXISTING post FK from CASCADE to SET NULL (this is the live hole:
-- deleting a reported post currently deletes the report). Drop + re-add.
alter table public.reports drop constraint if exists reports_post_id_fkey;
alter table public.reports
  add constraint reports_post_id_fkey
  foreign key (post_id) references public.posts(id) on delete set null;

-- target_type: which kind of thing this report is about. Backfill 'post' -- every
-- existing row was written by ReportForm, which only ever set post_id. Add
-- nullable, backfill, then enforce NOT NULL + domain.
alter table public.reports add column target_type text;
update public.reports set target_type = 'post' where target_type is null;
alter table public.reports alter column target_type set not null;
alter table public.reports
  add constraint reports_target_type_check check (target_type in ('post','user','message'));

-- snapshot: the reported content, captured SERVER-SIDE by the trigger below. It
-- is never supplied or influenced by the client (the trigger overwrites it
-- unconditionally), so it can be neither forged nor omitted -- which matters
-- because ON DELETE SET NULL means the snapshot is the ONLY evidence left once
-- the target is deleted, exactly when nobody can cross-check it.
alter table public.reports add column snapshot text;

-- The reporter must NOT be able to read the snapshot back. The trigger below is
-- SECURITY DEFINER and deliberately reads past the reporter's OWN block clause so
-- that block-then-report works. Without this revoke that becomes a disclosure
-- oracle: a blocked user reports a post they can no longer see, then selects the
-- snapshot out of their own reporter-owned report row. RLS is row-level and cannot
-- express "every column but this one", so use column privileges. Postgres treats a
-- table-level SELECT grant as covering all columns, so the table grant must be
-- revoked and re-granted per column.
revoke select on public.reports from anon, authenticated;
grant select (id, reporter_id, post_id, reported_user_id, message_id,
              reason, detail, status, created_at, target_type)
  on public.reports to authenticated;
-- snapshot is readable only by admin_list_reports(), a SECURITY DEFINER owned by
-- the table owner, whose privileges column grants do not restrict.

-- BEFORE INSERT trigger: (1) enforces the one-target invariant (a CHECK can't --
-- it would be violated the moment ON DELETE SET NULL nulls the only id), and
-- (2) captures the snapshot from the real row.
--
-- WHY SECURITY DEFINER (and not the invoker read one might expect): an invoker
-- read runs under the reporter's own SELECT RLS, whose block clause
-- (get_blocked_ids(), bidirectional) HIDES the target the instant the reporter
-- blocks its author -- so "victim blocks harasser, then reports" (the common
-- order) would raise 'cannot see it'. A block is the reporter's own action and
-- must not disarm reporting. So we read as DEFINER and re-authorize by hand,
-- ignoring blocks but nothing else -- which keeps every property an invoker read
-- would have given AND fixes block-then-report:
--   * no forgery  -- the DB writes the real row content, client value discarded.
--   * no oracle   -- each branch re-checks legitimate access (post visibility
--                    MINUS the block conjunct / conversation membership), so a
--                    guessed uuid the reporter never had access to still raises.
--   * closes the "report a uuid you can't see" gap -- now free (not found -> raise).
-- auth.uid() (not new.reporter_id) drives authorization; the reports INSERT
-- with_check pins reporter_id = auth.uid() anyway, but reading auth.uid()
-- directly is correct regardless of trigger/with_check ordering.
create or replace function public.reports_assert_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv uuid;
begin
  if num_nonnulls(new.post_id, new.reported_user_id, new.message_id) <> 1 then
    raise exception 'a report must reference exactly one target';
  end if;

  if new.target_type = 'post' then
    if new.post_id is null then raise exception 'target_type post requires post_id'; end if;
    -- mirrors the posts SELECT policy MINUS its get_blocked_ids() conjunct.
    -- ponytail: hand-mirrored; if the posts visibility policy changes, revisit.
    select p.content into new.snapshot
    from public.posts p
    where p.id = new.post_id
      and (
        exists (select 1 from public.profiles pr where pr.id = p.user_id and pr.is_private = false)
        or p.user_id = auth.uid()
        or exists (
          select 1 from public.follows f
          where f.following_id = p.user_id and f.follower_id = auth.uid() and f.status = 'accepted'
        )
      )
      and (not p.hidden or p.user_id = auth.uid() or public.current_is_admin());
    if not found then raise exception 'cannot report a post you cannot see'; end if;

  elsif new.target_type = 'message' then
    if new.message_id is null then raise exception 'target_type message requires message_id'; end if;
    select m.content, m.conversation_id into new.snapshot, v_conv
    from public.messages m where m.id = new.message_id;
    if not found then raise exception 'no such message'; end if;
    -- membership, NOT the message SELECT policy: a member may report a message
    -- even after blocking the sender (block hides it from the inbox but must not
    -- forfeit reporting). left_at ignored on purpose -- leaving a thread does not
    -- surrender the right to report what was said in it.
    if not exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = v_conv and cm.user_id = auth.uid()
    ) then
      raise exception 'cannot report a message from a conversation you are not in';
    end if;

  elsif new.target_type = 'user' then
    if new.reported_user_id is null then raise exception 'target_type user requires reported_user_id'; end if;
    new.snapshot := null;  -- user reports carry no content snapshot

  else
    raise exception 'unknown target_type %', new.target_type;
  end if;

  return new;
end $$;

create trigger reports_assert_target_trg
  before insert on public.reports
  for each row execute function public.reports_assert_target();

-- admin_list_reports: RETURNS TABLE shape changes, so DROP then recreate (CREATE
-- OR REPLACE cannot alter the return type). current_is_admin() gate preserved.
-- Post/message fields are null when the target was deleted (SET NULL) or is a
-- different kind; `snapshot` is the evidence that survives. author_id is the
-- offending user derived from whichever target is still linked (post author /
-- reported user / message sender), and is null once the target is gone. LEFT
-- JOINs run as the admin caller, so nothing is hidden.
drop function if exists public.admin_list_reports();
create or replace function public.admin_list_reports()
returns table (
  report_id uuid, reason text, detail text, created_at timestamptz,
  target_type text, snapshot text,
  post_id uuid, post_content text, post_hidden boolean,
  message_id uuid, message_content text,
  author_id uuid, author_username text, author_suspended boolean,
  reporter_username text
) language plpgsql security definer set search_path = '' as $$
begin
  if not public.current_is_admin() then raise exception 'not authorized'; end if;
  return query
  select r.id, r.reason, r.detail, r.created_at,
         r.target_type, r.snapshot,
         p.id, p.content, p.hidden,
         m.id, m.content,
         au.id, au.username, au.is_suspended,
         ru.username
  from public.reports r
  left join public.posts p on p.id = r.post_id
  left join public.messages m on m.id = r.message_id
  left join public.profiles au on au.id = coalesce(p.user_id, r.reported_user_id, m.sender_id)
  left join public.profiles ru on ru.id = r.reporter_id
  where r.status = 'open'
  order by r.created_at desc;
end $$;

-- Recreating the function reinstates Postgres's default PUBLIC execute; restore
-- the backstop from 20260708004649 (revoke PUBLIC, grant authenticated +
-- service_role). Still self-gated by current_is_admin() regardless.
revoke execute on function public.admin_list_reports() from public;
grant execute on function public.admin_list_reports() to authenticated, service_role;

-- ============ M8b: DMs are escapable (leave), and immutable by design ========
-- No message DELETE policy is added -- see the header. Immutability protects the
-- evidence a report points at.
--
-- Leaving = a left_at timestamp on the caller's OWN membership row, NOT a row
-- delete. A row delete drops the conversation out of the REMAINING member's
-- inbox (list_dm_inbox joins conversation_members cm2 on user_id <> me with an
-- INNER join) and orphans the leaver (get_or_create_dm returns the existing
-- dm_pairs conv without re-adding membership). left_at avoids both: the peer's
-- row is never touched, so their inbox/thread keep the full history, and only
-- the leaver's own row is marked.
alter table public.conversation_members add column left_at timestamptz;

-- is_conversation_member now means "ACTIVE member": adding `left_at is null` makes
-- the leaver fail every membership gate (message SELECT/INSERT, conversation and
-- member reads) while the peer -- whose row is untouched -- is unaffected. Body
-- otherwise verbatim; search_path '' preserved.
create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id
      and user_id = auth.uid()
      and left_at is null
  );
$$;

-- Leave the conversation. No-op if not a member / already left / anon.
create or replace function public.leave_conversation(p_conversation_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.conversation_members
  set left_at = now()
  where conversation_id = p_conversation_id
    and user_id = auth.uid()
    and left_at is null;
$$;

revoke execute on function public.leave_conversation(uuid) from public;
grant execute on function public.leave_conversation(uuid) to authenticated, service_role;

-- list_dm_inbox: hide conversations the caller has left (their own membership row
-- carries left_at). The peer-side join (cm2) is intentionally NOT filtered by
-- left_at, so a member who left still shows as the peer for whoever stayed.
--
-- Body is verbatim from 20260711120200 (the H3' avatar-gate pass), NOT from
-- 20260703240000: that later migration widened the return type with peer_is_pro
-- and routed it through is_pro_now(is_pro, pro_until). CREATE OR REPLACE cannot
-- change a RETURNS TABLE shape, so dropping peer_is_pro here would fail on apply.
-- Only the `left_at is null` filter in my_convs is new.
create or replace function public.list_dm_inbox()
returns table (
  conversation_id uuid,
  peer_id uuid,
  peer_username text,
  peer_display_name text,
  peer_avatar_url text,
  peer_is_pro boolean,
  last_message text,
  last_message_at timestamptz,
  last_sender_id uuid,
  unread_count bigint
)
language sql
security definer
set search_path = ''
stable
as $$
  with my_convs as (
    select cm.conversation_id, cm.last_read_at
    from public.conversation_members cm
    where cm.user_id = auth.uid()
      and cm.left_at is null
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
    public.is_pro_now(pr.is_pro, pr.pro_until),
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

-- get_or_create_dm: re-messaging an existing thread after leaving must rejoin the
-- caller (clear their left_at), otherwise the returned conversation is one they
-- can no longer read or send to. Body otherwise verbatim from 20260703240000.
create or replace function public.get_or_create_dm(p_recipient uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
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
    update public.conversation_members
    set left_at = null
    where conversation_id = v_conv and user_id = v_me and left_at is not null;
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

-- Re-activate the RECIPIENT on any inbound message: clear the left_at of every
-- other member so a message sent to someone who left is not silently lost (the
-- black hole). get_or_create_dm already un-leaves the SENDER; this covers the
-- other side. No-op for members who never left (left_at already null). Safe:
-- the messages INSERT policy rejects a blocked sender, so this cannot be abused
-- to force back into a thread the recipient blocked.
create or replace function public.reactivate_on_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversation_members
  set left_at = null
  where conversation_id = new.conversation_id
    and user_id <> new.sender_id
    and left_at is not null;
  return new;
end $$;

create trigger messages_reactivate_recipient
  after insert on public.messages
  for each row execute function public.reactivate_on_message();
