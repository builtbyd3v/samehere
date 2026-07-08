-- ai_usage.kind CHECK only allowed the original 3 kinds. improve_post and
-- icebreaker already pass their own kinds (their quota inserts were silently
-- failing the CHECK — harmless since Pro is uncapped, but never recorded).
-- people_search NEEDS a valid kind because it checks the result to enforce the
-- free 1/day cap. Add all three.
alter table public.ai_usage drop constraint ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind = any (array[
    'connection_prompt'::text,
    'composer_nudge'::text,
    'profile_nudge'::text,
    'improve_post'::text,
    'icebreaker'::text,
    'people_search'::text
  ]));
