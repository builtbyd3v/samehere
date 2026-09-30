-- Plan 023: app/(app)/feed/page.tsx sends users whose onboarded_at is null to
-- /onboarding once. The gate that used to read this column was removed on
-- 2026-09-10 (commit 46b228f), so every account created since then still has
-- onboarded_at = null. Mark all existing users as already onboarded so only
-- accounts created after this runs see the redirect. Idempotent: it touches
-- only rows still null, so it is safe whether or not the older backfill
-- (20260716210000_backfill_onboarded_at.sql) is recorded under another version.
-- Operator: apply to prod BEFORE deploying the plan 023 code.
update public.profiles set onboarded_at = now() where onboarded_at is null;
