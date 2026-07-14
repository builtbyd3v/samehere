-- Decouple "actively here" from the end date. A role or enrollment can be
-- current AND have an expected end date (e.g. expected graduation). Previously
-- "current" was inferred from end_date IS NULL, which dropped an active school
-- that had a listed grad date from the auto-tagline. Backfill: rows with no end
-- date were "present", so mark them current.
alter table public.experiences add column is_current boolean not null default false;
alter table public.education add column is_current boolean not null default false;

update public.experiences set is_current = true where end_date is null;
update public.education set is_current = true where end_date is null;
