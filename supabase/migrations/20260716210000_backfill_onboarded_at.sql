-- Fix: app/auth/callback/route.ts (OAuth landing) is about to start routing
-- users with onboarded_at is null to /onboarding, same as the email-confirm
-- route already does. onboarded_at (20260716120000_onboarding_flag.sql) is a
-- brand-new nullable column and is null for every EXISTING user (the wizard
-- shipped after they signed up) -- without this backfill, every current user
-- would get force-routed into onboarding on their next OAuth login. Mark all
-- current users as already-onboarded; only genuinely new signups (created
-- after this backfill runs) will see the wizard.
update public.profiles set onboarded_at = now() where onboarded_at is null;
