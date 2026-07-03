-- Pro presence (v1): flag + waitlist only, no billing yet.
-- ponytail: flag+gate only, Stripe wiring is v1.1.
alter table public.profiles
  add column if not exists is_pro boolean not null default false,
  add column if not exists wants_pro boolean not null default false;
