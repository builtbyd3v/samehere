-- Native path projects write a dossier row with kind=project.
-- Club/job/internship/research stay the helper-matching kinds.

alter table public.experiences drop constraint if exists experiences_kind_check;

alter table public.experiences
  add constraint experiences_kind_check
  check (kind in ('internship', 'job', 'research', 'club_role', 'project'));
