-- ============ is_pro_now(): one Pro-liveness rule for SQL (finding H3') ============
-- isPro() in TS is `is_pro && (pro_until is null || pro_until > now())`. The same
-- rule was about to be copy-pasted into the guard's cosmetics gate and four avatar
-- RPCs. Duplicated rules rot (see finding C2: the avatars bucket fix that was never
-- carried to post-media). One helper, called everywhere the flag gates a privilege.
--
-- STABLE, not IMMUTABLE: it reads now(), so its result changes within a transaction
-- boundary — IMMUTABLE would be wrong and could be cached across the pro_until
-- crossover. pro_until IS NULL = a comped/manual grant that never expires.
-- Pure arg logic, touches no table, so the default PUBLIC execute grant is safe.
create or replace function public.is_pro_now(p_is_pro boolean, p_pro_until timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(p_is_pro, false) and (p_pro_until is null or p_pro_until > now());
$$;
