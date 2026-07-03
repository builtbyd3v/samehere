-- Founder badge (v1): first-100 permanent marker, any plan, not Pro-gated.
alter table public.profiles
  add column if not exists is_founder boolean not null default false;
