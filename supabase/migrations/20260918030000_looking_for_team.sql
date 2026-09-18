-- Bet 4B: Looking for team experiment.
-- Fourth context_label + optional event name / date / remote|in_person.
-- No event table, no teams, no organizer tooling. Does not reuse leftover
-- posts.post_type = 'teammate'. Does not touch record_profile_view grants.

alter table public.posts
  add column if not exists team_event_name text,
  add column if not exists team_event_date date,
  add column if not exists team_event_mode text;

alter table public.posts drop constraint if exists posts_context_label_allowed;
alter table public.posts
  add constraint posts_context_label_allowed
  check (
    context_label is null
    or context_label in ('building', 'learning', 'stuck', 'looking_for_team')
  );

alter table public.posts drop constraint if exists posts_team_event_mode_allowed;
alter table public.posts
  add constraint posts_team_event_mode_allowed
  check (team_event_mode is null or team_event_mode in ('remote', 'in_person'));

alter table public.posts drop constraint if exists posts_team_event_name_len;
alter table public.posts
  add constraint posts_team_event_name_len
  check (team_event_name is null or char_length(team_event_name) <= 80);

alter table public.posts drop constraint if exists posts_team_event_only_on_label;
alter table public.posts
  add constraint posts_team_event_only_on_label
  check (
    context_label = 'looking_for_team'
    or (
      team_event_name is null
      and team_event_date is null
      and team_event_mode is null
    )
  );

create index if not exists posts_looking_for_team_created_at_idx
  on public.posts (created_at desc, id desc)
  where context_label = 'looking_for_team';

grant update (team_event_name, team_event_date, team_event_mode)
  on public.posts to authenticated;

-- Same 3-arg search_posts shape. Event name is searchable; return columns
-- unchanged so /search does not need a coordinated RPC bump.
create or replace function public.search_posts(
  p_query text,
  p_limit int default 20,
  p_offset int default 0
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
begin
  if auth.uid() is null then
    return;
  end if;
  if cardinality(v_tokens) = 0 then
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
      public.search_term_hits(
        concat_ws(' ', po.content, po.context_label, po.team_event_name),
        v_tokens
      ) as term_hits
    from public.posts po
    join public.profiles a on a.id = po.user_id
    where po.hidden = false
      and a.is_private = false
      and a.is_suspended = false
      and a.id not in (select public.get_blocked_ids())
  )
  select v.id, v.user_id, v.content, v.context_label, v.created_at
  from visible v
  where v.term_hits > 0
  order by v.term_hits desc, v.created_at desc, v.id desc
  limit v_limit
  offset v_offset;
end;
$$;

revoke all on function public.search_posts(text, int, int) from public, anon, authenticated;
grant execute on function public.search_posts(text, int, int) to authenticated;
