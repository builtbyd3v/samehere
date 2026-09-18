-- Reconcile Bet 1 4-arg search_posts p_label allowlist with Bet 4B looking_for_team.
-- After #36 (bet1_discovery_rpcs) + #37 (looking_for_team), hosted still had the
-- original three-label allowlist on the 4-arg overload, plus a leftover 3-arg
-- overload from #37. Collapse to one 4-arg RPC: four labels + event-name search.
-- Merge after #36 and #37. Never db push — apply via MCP apply_migration.

alter table public.posts
  add column if not exists team_event_name text,
  add column if not exists team_event_date date,
  add column if not exists team_event_mode text;

-- Idempotent with #37: fourth label must be legal before p_label can match rows.
alter table public.posts drop constraint if exists posts_context_label_allowed;
alter table public.posts
  add constraint posts_context_label_allowed
  check (
    context_label is null
    or context_label in ('building', 'learning', 'stuck', 'looking_for_team')
  );

grant update (team_event_name, team_event_date, team_event_mode)
  on public.posts to authenticated;

drop function if exists public.search_posts(text, int, int);
drop function if exists public.search_posts(text, int, int, text);

create function public.search_posts(
  p_query text default '',
  p_limit int default 20,
  p_offset int default 0,
  p_label text default null
)
returns table (
  id uuid,
  user_id uuid,
  content text,
  context_label text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tokens text[] := public.search_tokens(p_query);
  v_limit int := least(20, greatest(1, coalesce(p_limit, 20)));
  v_offset int := greatest(0, coalesce(p_offset, 0));
  v_label text := null;
begin
  if auth.uid() is null then
    return;
  end if;
  if p_label in ('building', 'learning', 'stuck', 'looking_for_team') then
    v_label := p_label;
  end if;
  if cardinality(v_tokens) = 0 and v_label is null then
    return;
  end if;

  return query
  with visible as (
    select
      po.id,
      po.user_id,
      po.content,
      po.context_label,
      po.created_at,
      case when cardinality(v_tokens) = 0 then 1 else public.search_term_hits(
        concat_ws(' ', po.content, po.context_label, po.team_event_name),
        v_tokens
      ) end as term_hits
    from public.posts po
    join public.profiles a on a.id = po.user_id
    where po.hidden = false
      and a.is_private = false
      and a.is_suspended = false
      and a.id not in (select public.get_blocked_ids())
      and (v_label is null or po.context_label = v_label)
  )
  select v.id, v.user_id, v.content, v.context_label, v.created_at
  from visible v
  where v.term_hits > 0
  order by v.term_hits desc, v.created_at desc, v.id desc
  limit v_limit
  offset v_offset;
end;
$$;

revoke all on function public.search_posts(text, int, int, text) from public, anon, authenticated;
grant execute on function public.search_posts(text, int, int, text) to authenticated;
