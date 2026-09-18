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

-- search_posts is intentionally not touched here. Bet 1 (20260918011000_bet1_discovery_rpcs)
-- replaces the 3-arg RPC with search_posts(text, int, int, text); re-creating the 3-arg
-- shape after that leaves two overloads and every 3-arg call fails with
-- "function public.search_posts(text, integer, integer) is not unique".
-- 20260918031000_search_posts_looking_for_team_label owns the single 4-arg RPC
-- (looking_for_team allowlist + team_event_name in the search text).
