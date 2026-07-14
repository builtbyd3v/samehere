-- Education iteration 2:
--   * school_domain (captured from the school autocomplete list) -> used to
--     build a school logo URL,
--   * class_year (optional standing: freshman..grad) moved off the profile and
--     onto the current education entry,
--   * allow owners to UPDATE their own education rows (v1 was delete + re-add;
--     the UPDATE grant was stripped then, restore it now). Experiences already
--     has UPDATE granted.

alter table public.education
  add column school_domain text check (school_domain is null or char_length(school_domain) <= 255),
  add column class_year text check (class_year is null or char_length(class_year) <= 20);

-- Restore UPDATE for owners (RLS "education owner all" already gates it to
-- auth.uid() = user_id; the grant is the second lock). Kept off the default
-- surface, so grant it explicitly here.
grant update on table public.education to authenticated;
