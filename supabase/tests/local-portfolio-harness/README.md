# local-portfolio-harness

Repeatable disposable PostgreSQL check for the real portfolio migration + SQL test.

## Run

```sh
bash supabase/tests/local-portfolio-harness/run.sh
```

Locked target: unix socket `/tmp/samehere-postgres-socket`, port `55439`, user `postgres`, no password, no TCP. Creates `pfh_<utc>_<pid>_chain` and maybe `_fix`. Does not read `.env` / `.env.local`. Refuses URL args and foreign `PGHOST`/`PGPORT`/`PGUSER`.

Binaries: `/tmp/samehere-postgres-tools/usr/lib/postgresql/16/bin` with `LD_LIBRARY_PATH=/tmp/samehere-postgres-tools/usr/lib/x86_64-linux-gnu`.

## What it applies

1. `sql/platform.sql` — mocked platform-only: roles `anon` / `authenticated` / `service_role` / `authenticator`; `auth.users` + `auth.uid()` / `auth.role()` / `auth.jwt()` / `auth.email()`; `storage.buckets` / `storage.objects` / `storage.foldername`; `supabase_realtime` publication. No GoTrue, Storage API, email, or workers.
2. Dummy SQL-only `pg_cron` (jobs stored, **never executed**) only after `pg_config --sharedir` or the relocated prefix resolves under `/tmp/samehere-postgres-tools`. Native `pg_cron.control` is left untouched. Discovery failure is explicit; no `SHOW sharedir`.
3. Chronological: timestamps `< 20260910100000`, then real `20260910100000_portfolio_data_contracts.sql`, then real `portfolio_data_test.sql` + concurrency. Then timestamps `> 20260910100000` (real `20260910110000_social_discovery_and_retirement.sql`) and real `social_discovery_test.sql`. Never applies later files before portfolio.
4. If the pre-portfolio chain cannot replay, apply `sql/consumed_schema.sql` then the same real portfolio SQL, then the same later real social files (no mocked social SQL).
5. After the real portfolio SQL test passes: `concurrency_check.py` two live `psql` xacts (see prior notes). Then a **separate social stage**. Prior `last-run/` is moved to `last-run.prev`.

## Fidelity limits

- Platform stubs are not hosted Supabase. RLS/auth behave like PostgREST JWT GUCs on a native cluster, not GoTrue.
- Dummy `pg_cron` is not the C extension and starts no scheduler.
- Fixture path is narrower than the full app schema (no clubs/DMs/jobs/storage-policy history). A green fixture run does **not** prove every historical migration applies.
- Harness never rewrites production SQL to obtain green tests.

## Evidence

`last-run/SUMMARY.md` plus logs. Copied to `$BB_THREAD_STORAGE/local-portfolio-harness/<run-id>/` when that env var is set.
