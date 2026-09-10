#!/usr/bin/env bash
# Disposable local PostgreSQL harness for the portfolio migration + SQL test.
# Never reads .env / .env.local. Never uses TCP, DATABASE_URL, or SUPABASE_DB_URL.
set -euo pipefail

HARNESS_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$HARNESS_DIR/../../.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/supabase/migrations"
PORTFOLIO_MIGRATION="$MIGRATIONS_DIR/20260910100000_portfolio_data_contracts.sql"
PORTFOLIO_TEST="$REPO_ROOT/supabase/tests/portfolio_data_test.sql"
PORTFOLIO_TS="20260910100000"
SOCIAL_TEST="$REPO_ROOT/supabase/tests/social_discovery_test.sql"
PLATFORM_SQL="$HARNESS_DIR/sql/platform.sql"
FIXTURE_SQL="$HARNESS_DIR/sql/consumed_schema.sql"
DUMMY_CRON_DIR="$HARNESS_DIR/sql/dummy_pg_cron"

PG_BIN="${PG_BIN:-/tmp/samehere-postgres-tools/usr/lib/postgresql/16/bin}"
TOOLS_PREFIX="/tmp/samehere-postgres-tools"
export LD_LIBRARY_PATH="${LD_LIBRARY_PATH:-/tmp/samehere-postgres-tools/usr/lib/x86_64-linux-gnu}"
export PATH="$PG_BIN:$PATH"

LOCKED_PGHOST="/tmp/samehere-postgres-socket"
LOCKED_PGPORT="55439"
LOCKED_PGUSER="postgres"

for banned in DATABASE_URL SUPABASE_DB_URL POSTGRES_URL DIRECT_URL PGPASSWORD PGSERVICEFILE PGSERVICE; do
  unset "$banned" || true
done

if [[ "${1:-}" == postgres://* || "${1:-}" == postgresql://* ]]; then
  echo "refuse: connection URL argument (remote/prod risk)" >&2
  exit 2
fi
if [[ -n "${PGHOST:-}" && "$PGHOST" != "$LOCKED_PGHOST" ]]; then
  echo "refuse: PGHOST='$PGHOST' is not the disposable socket $LOCKED_PGHOST" >&2
  exit 2
fi
if [[ -n "${PGPORT:-}" && "$PGPORT" != "$LOCKED_PGPORT" ]]; then
  echo "refuse: PGPORT='$PGPORT' is not disposable port $LOCKED_PGPORT" >&2
  exit 2
fi
if [[ -n "${PGUSER:-}" && "$PGUSER" != "$LOCKED_PGUSER" ]]; then
  echo "refuse: PGUSER='$PGUSER' is not disposable user $LOCKED_PGUSER" >&2
  exit 2
fi

export PGHOST="$LOCKED_PGHOST"
export PGPORT="$LOCKED_PGPORT"
export PGUSER="$LOCKED_PGUSER"
export PGSSLMODE="disable"
unset PGPASSWORD || true

case "$PGHOST" in
  /*) ;;
  *)
    echo "refuse: PGHOST must be a unix socket directory, got '$PGHOST'" >&2
    exit 2
    ;;
esac
if [[ "$PGHOST" == *.* ]]; then
  echo "refuse: PGHOST looks like a hostname: $PGHOST" >&2
  exit 2
fi
if [[ ! -S "$PGHOST/.s.PGSQL.$PGPORT" ]]; then
  echo "refuse: socket $PGHOST/.s.PGSQL.$PGPORT missing" >&2
  exit 2
fi
if [[ ! -x "$PG_BIN/psql" || ! -x "$PG_BIN/createdb" ]]; then
  echo "refuse: psql/createdb missing under $PG_BIN" >&2
  exit 2
fi
if [[ ! -f "$PORTFOLIO_MIGRATION" || ! -f "$PORTFOLIO_TEST" ]]; then
  echo "refuse: real SQL missing" >&2
  exit 2
fi

RUN_ID="pfh_$(date -u +%Y%m%d_%H%M%S)_$$"
if [[ ! "$RUN_ID" =~ ^pfh_[0-9]{8}_[0-9]{6}_[0-9]+$ ]]; then
  echo "refuse: generated db name failed safeguard: $RUN_ID" >&2
  exit 2
fi

ADMIN_DB="postgres"
CHAIN_DB="${RUN_ID}_chain"
FIXTURE_DB="${RUN_ID}_fix"
EVIDENCE="$HARNESS_DIR/last-run"
THREAD_EVIDENCE=""
if [[ -n "${BB_THREAD_STORAGE:-}" ]]; then
  THREAD_EVIDENCE="$BB_THREAD_STORAGE/local-portfolio-harness/$RUN_ID"
  mkdir -p "$THREAD_EVIDENCE"
fi
if [[ -d "$EVIDENCE" ]]; then
  rm -rf "${EVIDENCE}.prev"
  mv "$EVIDENCE" "${EVIDENCE}.prev"
fi
mkdir -p "$EVIDENCE"

psql_v() {
  local db="$1"
  shift
  "$PG_BIN/psql" --no-password --no-psqlrc -X -v ON_ERROR_STOP=1 -d "$db" "$@"
}

apply_sql() {
  local db="$1"
  local file="$2"
  local log="$3"
  {
    echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) apply $file -> $db ==="
    psql_v "$db" <<SQL
\\set VERBOSITY verbose
\\echo applying $file
\\i $file
SQL
  } >"$log" 2>&1
}

mig_ts() {
  local base
  base="$(basename "$1")"
  printf '%s\n' "${base:0:14}"
}

write_mig_include() {
  local dest="$1"
  local op="$2"
  {
    echo "\\set VERBOSITY verbose"
    echo "\\set ON_ERROR_STOP on"
    for mig in "$MIGRATIONS_DIR"/*.sql; do
      ts="$(mig_ts "$mig")"
      case "$op" in
        before)
          [[ "$ts" < "$PORTFOLIO_TS" ]] || continue
          ;;
        after)
          [[ "$ts" > "$PORTFOLIO_TS" ]] || continue
          ;;
        *)
          echo "refuse: bad include op $op" >&2
          exit 2
          ;;
      esac
      echo "\\echo applying $mig"
      echo "\\i $mig"
    done
  } >"$dest"
}

extract_findings() {
  python3 - "$1" <<'PY'
import re, sys
text = open(sys.argv[1], encoding="utf-8", errors="replace").read()
print("RESULT_ROWS:")
for line in text.splitlines():
    if re.search(r"\b(PASS|FAIL)\b", line) and "|" in line:
        print(line.rstrip())
fails = [ln.rstrip() for ln in text.splitlines() if re.search(r"\bFAIL\b", ln) and not ln.startswith("ERROR")]
if fails:
    print("FAIL_ROWS:")
    print("\n".join(fails))
PY
}

extract_error() {
  python3 - "$1" <<'PY'
import re, sys
text = open(sys.argv[1], encoding="utf-8", errors="replace").read()
state = re.search(r"ERROR:\s+([0-9A-Z]{5}):\s+(.*)", text)
if not state:
    m = re.search(r"ERROR:\s+(.*)", text)
    sqlstate, msg = "?", (m.group(1).strip() if m else "no ERROR line")
else:
    sqlstate, msg = state.group(1), state.group(2).strip()
loc = re.search(r"^LOCATION:\s+(.*)$", text, re.M)
line = re.search(r"^LINE (\d+):(.*)$", text, re.M)
files = re.findall(r"^applying (.+)$", text, re.M)
print(f"SQLSTATE={sqlstate}")
print(f"ERROR={msg}")
print(f"LOCATION={loc.group(1).strip() if loc else 'n/a'}")
print(f"LINE={line.group(1) if line else 'n/a'}:{(line.group(2).strip() if line else '')}")
print(f"FILE={files[-1] if files else 'n/a'}")
PY
}

path_under_tools_prefix() {
  local raw="$1"
  local resolved
  [[ -n "$raw" ]] || return 1
  resolved="$(realpath -m -- "$raw")"
  case "$resolved" in
    "$TOOLS_PREFIX"|"$TOOLS_PREFIX"/*)
      printf '%s\n' "$resolved"
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

discover_sharedir() {
  local found=""
  if [[ -x "$PG_BIN/pg_config" ]]; then
    found="$("$PG_BIN/pg_config" --sharedir 2>/dev/null || true)"
    found="${found//$'\n'/}"
    echo "pg_config=$PG_BIN/pg_config" >>"$EVIDENCE/pg-cron.log"
    echo "pg_config_sharedir=$found" >>"$EVIDENCE/pg-cron.log"
  else
    echo "pg_config_missing=$PG_BIN/pg_config" >>"$EVIDENCE/pg-cron.log"
  fi
  if [[ -z "$found" && -d "$TOOLS_PREFIX/usr/share/postgresql/16" ]]; then
    found="$TOOLS_PREFIX/usr/share/postgresql/16"
    echo "sharedir_fallback=relocated_prefix_16" >>"$EVIDENCE/pg-cron.log"
  fi
  if [[ -z "$found" && -d "$TOOLS_PREFIX/usr/share/postgresql" ]]; then
    found="$TOOLS_PREFIX/usr/share/postgresql"
    echo "sharedir_fallback=relocated_prefix" >>"$EVIDENCE/pg-cron.log"
  fi
  if [[ -z "$found" ]]; then
    echo "UNSUPPORTED: sharedir discovery failed (bundled pg_config --sharedir empty, no relocated prefix under $TOOLS_PREFIX)" >>"$EVIDENCE/pg-cron.log"
    return 1
  fi
  printf '%s\n' "$found"
}

install_dummy_pg_cron() {
  local sharedir ext_dir
  : >"$EVIDENCE/pg-cron.log"
  if ! sharedir="$(discover_sharedir)"; then
    return 1
  fi
  if ! sharedir="$(path_under_tools_prefix "$sharedir")"; then
    echo "UNSUPPORTED: sharedir is not under $TOOLS_PREFIX" >>"$EVIDENCE/pg-cron.log"
    return 1
  fi
  echo "sharedir=$sharedir" >>"$EVIDENCE/pg-cron.log"
  if ! ext_dir="$(path_under_tools_prefix "$sharedir/extension")"; then
    echo "UNSUPPORTED: extension path is not under $TOOLS_PREFIX" >>"$EVIDENCE/pg-cron.log"
    return 1
  fi
  echo "extension_dir=$ext_dir" >>"$EVIDENCE/pg-cron.log"
  if [[ -f "$ext_dir/pg_cron.control" ]]; then
    echo "existing_control=$ext_dir/pg_cron.control" >>"$EVIDENCE/pg-cron.log"
    if grep -q 'Harness no-op pg_cron' "$ext_dir/pg_cron.control"; then
      echo "dummy_already_installed=1" >>"$EVIDENCE/pg-cron.log"
      return 0
    fi
    echo "UNSUPPORTED: native pg_cron.control already present; not overwritten" >>"$EVIDENCE/pg-cron.log"
    return 1
  fi
  if ! mkdir -p "$ext_dir"; then
    echo "UNSUPPORTED: mkdir failed for $ext_dir" >>"$EVIDENCE/pg-cron.log"
    return 1
  fi
  if [[ ! -w "$ext_dir" ]]; then
    echo "UNSUPPORTED: cannot write $ext_dir for dummy pg_cron" >>"$EVIDENCE/pg-cron.log"
    return 1
  fi
  cp "$DUMMY_CRON_DIR/pg_cron.control" "$DUMMY_CRON_DIR/pg_cron--1.6.4.sql" "$ext_dir/"
  echo "installed_dummy_control=$ext_dir/pg_cron.control" >>"$EVIDENCE/pg-cron.log"
  return 0
}

create_unique_db() {
  local db="$1"
  if [[ ! "$db" =~ ^pfh_[0-9]{8}_[0-9]{6}_[0-9]+_(chain|fix)$ ]]; then
    echo "refuse: refusing to create non-harness database '$db'" >&2
    exit 2
  fi
  "$PG_BIN/createdb" --no-password -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$db"
}

finish() {
  if [[ -n "$THREAD_EVIDENCE" ]]; then
    cp -a "$EVIDENCE/." "$THREAD_EVIDENCE/"
  fi
}

create_unique_db "$CHAIN_DB"
echo "$CHAIN_DB" >"$EVIDENCE/chain.db"

if ! apply_sql "$CHAIN_DB" "$PLATFORM_SQL" "$EVIDENCE/01-platform-chain.log"; then
  extract_error "$EVIDENCE/01-platform-chain.log" | tee "$EVIDENCE/first-error.txt"
  cat >"$EVIDENCE/SUMMARY.md" <<EOF
# local-portfolio-harness $RUN_ID
phase: platform.sql (chain)
$(cat "$EVIDENCE/first-error.txt")
EOF
  finish
  exit 1
fi

CRON_MODE="uninstalled"
if install_dummy_pg_cron; then
  printf '%s\n' 'create extension if not exists pg_cron;' >"$EVIDENCE/create-pg-cron.sql"
  if apply_sql "$CHAIN_DB" "$EVIDENCE/create-pg-cron.sql" "$EVIDENCE/02-pg-cron-create.log"; then
    CRON_MODE="dummy_sql_extension"
  else
    extract_error "$EVIDENCE/02-pg-cron-create.log" >"$EVIDENCE/pg-cron-create.error"
    CRON_MODE="create_extension_failed"
  fi
else
  CRON_MODE="unsupported_native_or_unwritable"
fi
echo "cron_mode=$CRON_MODE" | tee -a "$EVIDENCE/pg-cron.log"

BASELINE_MODE="skipped"
FIRST_BASELINE_FAIL="none"
write_mig_include "$EVIDENCE/03-baseline-include.sql" before

if [[ "$CRON_MODE" == "dummy_sql_extension" ]]; then
  if apply_sql "$CHAIN_DB" "$EVIDENCE/03-baseline-include.sql" "$EVIDENCE/03-baseline-apply.log"; then
    BASELINE_MODE="ok"
  else
    BASELINE_MODE="failed"
    extract_error "$EVIDENCE/03-baseline-apply.log" | tee "$EVIDENCE/first-baseline-error.txt"
    FIRST_BASELINE_FAIL="$(grep -E '^FILE=' "$EVIDENCE/first-baseline-error.txt" | sed 's/^FILE=//')"
  fi
else
  BASELINE_MODE="skipped_no_pg_cron"
fi

TARGET_DB=""
BASELINE_KIND=""
if [[ "$BASELINE_MODE" == "ok" ]]; then
  TARGET_DB="$CHAIN_DB"
  BASELINE_KIND="full_repo_migrations"
else
  create_unique_db "$FIXTURE_DB"
  echo "$FIXTURE_DB" >"$EVIDENCE/fixture.db"
  if ! apply_sql "$FIXTURE_DB" "$PLATFORM_SQL" "$EVIDENCE/04-platform-fixture.log"; then
    extract_error "$EVIDENCE/04-platform-fixture.log" | tee "$EVIDENCE/first-error.txt"
    cat >"$EVIDENCE/SUMMARY.md" <<EOF
# local-portfolio-harness $RUN_ID
phase: platform.sql (fixture)
baseline_mode: $BASELINE_MODE
first_baseline_fail: $FIRST_BASELINE_FAIL
$(cat "$EVIDENCE/first-error.txt")
EOF
    finish
    exit 1
  fi
  if ! apply_sql "$FIXTURE_DB" "$FIXTURE_SQL" "$EVIDENCE/05-consumed-schema.log"; then
    extract_error "$EVIDENCE/05-consumed-schema.log" | tee "$EVIDENCE/first-error.txt"
    cat >"$EVIDENCE/SUMMARY.md" <<EOF
# local-portfolio-harness $RUN_ID
phase: consumed_schema.sql
baseline_mode: $BASELINE_MODE
first_baseline_fail: $FIRST_BASELINE_FAIL
$(cat "$EVIDENCE/first-error.txt")
EOF
    finish
    exit 1
  fi
  TARGET_DB="$FIXTURE_DB"
  BASELINE_KIND="consumed_schema_fixture"
fi

if ! apply_sql "$TARGET_DB" "$PORTFOLIO_MIGRATION" "$EVIDENCE/06-portfolio-migration.log"; then
  extract_error "$EVIDENCE/06-portfolio-migration.log" | tee "$EVIDENCE/first-error.txt"
  cat >"$EVIDENCE/SUMMARY.md" <<EOF
# local-portfolio-harness $RUN_ID
mode: $BASELINE_KIND
target_db: $TARGET_DB
chain_db: $CHAIN_DB
baseline_mode: $BASELINE_MODE
first_baseline_fail: $FIRST_BASELINE_FAIL
cron_mode: $CRON_MODE
phase: real 20260910100000_portfolio_data_contracts.sql
$(cat "$EVIDENCE/first-error.txt")
EOF
  finish
  echo "HARNESS_TARGET=$TARGET_DB"
  echo "HARNESS_KIND=$BASELINE_KIND"
  echo "HARNESS_PHASE=portfolio_migration"
  cat "$EVIDENCE/first-error.txt"
  exit 1
fi

if ! apply_sql "$TARGET_DB" "$PORTFOLIO_TEST" "$EVIDENCE/07-portfolio-test.log"; then
  extract_error "$EVIDENCE/07-portfolio-test.log" | tee "$EVIDENCE/first-error.txt"
  extract_findings "$EVIDENCE/07-portfolio-test.log" | tee "$EVIDENCE/test-findings.txt"
  cat >"$EVIDENCE/SUMMARY.md" <<EOF
# local-portfolio-harness $RUN_ID
mode: $BASELINE_KIND
target_db: $TARGET_DB
chain_db: $CHAIN_DB
baseline_mode: $BASELINE_MODE
first_baseline_fail: $FIRST_BASELINE_FAIL
cron_mode: $CRON_MODE
phase: real portfolio_data_test.sql
$(cat "$EVIDENCE/first-error.txt")

$(cat "$EVIDENCE/test-findings.txt")
EOF
  finish
  echo "HARNESS_TARGET=$TARGET_DB"
  echo "HARNESS_KIND=$BASELINE_KIND"
  echo "HARNESS_PHASE=portfolio_test"
  cat "$EVIDENCE/first-error.txt"
  echo "--- findings ---"
  cat "$EVIDENCE/test-findings.txt"
  exit 1
fi

extract_findings "$EVIDENCE/07-portfolio-test.log" | tee "$EVIDENCE/test-findings.txt"

if ! python3 "$HARNESS_DIR/concurrency_check.py" \
    --db "$TARGET_DB" \
    --evidence "$EVIDENCE/08-concurrency.log" \
    --psql "$PG_BIN/psql"; then
  cat >"$EVIDENCE/SUMMARY.md" <<EOF
# local-portfolio-harness $RUN_ID
mode: $BASELINE_KIND
target_db: $TARGET_DB
chain_db: $CHAIN_DB
baseline_mode: $BASELINE_MODE
first_baseline_fail: $FIRST_BASELINE_FAIL
cron_mode: $CRON_MODE
phase: two-session concurrency
sql_test: passed
$(cat "$EVIDENCE/08-concurrency.log" 2>/dev/null || echo 'no concurrency log')
EOF
  finish
  echo "HARNESS_TARGET=$TARGET_DB"
  echo "HARNESS_KIND=$BASELINE_KIND"
  echo "HARNESS_PHASE=concurrency"
  echo "HARNESS_EVIDENCE=$EVIDENCE/08-concurrency.log"
  tail -n 20 "$EVIDENCE/08-concurrency.log" 2>/dev/null || true
  exit 1
fi

SOCIAL_STAGE="skipped_no_later_migrations"
write_mig_include "$EVIDENCE/09-later-include.sql" after
if grep -q '^\\i ' "$EVIDENCE/09-later-include.sql"; then
  if ! apply_sql "$TARGET_DB" "$EVIDENCE/09-later-include.sql" "$EVIDENCE/09-later-migrations.log"; then
    extract_error "$EVIDENCE/09-later-migrations.log" | tee "$EVIDENCE/social-first-error.txt"
    SOCIAL_STAGE="later_migration_failed"
    cat >"$EVIDENCE/SUMMARY.md" <<EOF
# local-portfolio-harness $RUN_ID
mode: $BASELINE_KIND
target_db: $TARGET_DB
chain_db: $CHAIN_DB
baseline_mode: $BASELINE_MODE
first_baseline_fail: $FIRST_BASELINE_FAIL
cron_mode: $CRON_MODE
portfolio_stage: passed (migration + assertions + concurrency)
social_stage: $SOCIAL_STAGE
$(cat "$EVIDENCE/social-first-error.txt")
EOF
    finish
    echo "HARNESS_TARGET=$TARGET_DB"
    echo "HARNESS_KIND=$BASELINE_KIND"
    echo "HARNESS_PHASE=social_migration"
    echo "HARNESS_SOCIAL_STAGE=$SOCIAL_STAGE"
    cat "$EVIDENCE/social-first-error.txt"
    exit 1
  fi
  SOCIAL_STAGE="later_migrations_applied"
  if [[ ! -f "$SOCIAL_TEST" ]]; then
    SOCIAL_STAGE="later_applied_test_missing"
    echo "social_discovery_test.sql missing after later migrations" >"$EVIDENCE/social-first-error.txt"
    cat >"$EVIDENCE/SUMMARY.md" <<EOF
# local-portfolio-harness $RUN_ID
mode: $BASELINE_KIND
target_db: $TARGET_DB
portfolio_stage: passed
social_stage: $SOCIAL_STAGE
EOF
    finish
    echo "HARNESS_PHASE=social_test"
    echo "HARNESS_SOCIAL_STAGE=$SOCIAL_STAGE"
    exit 1
  fi
  if ! apply_sql "$TARGET_DB" "$SOCIAL_TEST" "$EVIDENCE/10-social-test.log"; then
    extract_error "$EVIDENCE/10-social-test.log" | tee "$EVIDENCE/social-first-error.txt"
    extract_findings "$EVIDENCE/10-social-test.log" | tee "$EVIDENCE/social-findings.txt"
    SOCIAL_STAGE="social_test_failed"
    cat >"$EVIDENCE/SUMMARY.md" <<EOF
# local-portfolio-harness $RUN_ID
mode: $BASELINE_KIND
target_db: $TARGET_DB
chain_db: $CHAIN_DB
baseline_mode: $BASELINE_MODE
cron_mode: $CRON_MODE
portfolio_stage: passed (migration + assertions + concurrency)
social_stage: $SOCIAL_STAGE
social_migration: real files after $PORTFOLIO_TS, chronological
$(cat "$EVIDENCE/social-first-error.txt")

$(cat "$EVIDENCE/social-findings.txt")
EOF
    finish
    echo "HARNESS_TARGET=$TARGET_DB"
    echo "HARNESS_KIND=$BASELINE_KIND"
    echo "HARNESS_PHASE=social_test"
    echo "HARNESS_SOCIAL_STAGE=$SOCIAL_STAGE"
    cat "$EVIDENCE/social-first-error.txt"
    echo "--- social findings ---"
    cat "$EVIDENCE/social-findings.txt"
    exit 1
  fi
  extract_findings "$EVIDENCE/10-social-test.log" | tee "$EVIDENCE/social-findings.txt"
  SOCIAL_STAGE="passed"
fi

cat >"$EVIDENCE/SUMMARY.md" <<EOF
# local-portfolio-harness $RUN_ID
mode: $BASELINE_KIND
target_db: $TARGET_DB
chain_db: $CHAIN_DB
baseline_mode: $BASELINE_MODE
first_baseline_fail: $FIRST_BASELINE_FAIL
cron_mode: $CRON_MODE
phase: complete
portfolio_stage: passed (migration + assertions + concurrency)
social_stage: $SOCIAL_STAGE
order: timestamps < $PORTFOLIO_TS, then $PORTFOLIO_MIGRATION, then portfolio tests+concurrency, then timestamps > $PORTFOLIO_TS, then $SOCIAL_TEST
concurrency_log: 08-concurrency.log
social_log: 10-social-test.log

command:
  bash supabase/tests/local-portfolio-harness/run.sh

scaffolding:
  sql/platform.sql — roles anon/authenticated/service_role/authenticator,
  auth.users + auth.uid/role/jwt/email, storage.buckets/objects/foldername,
  supabase_realtime publication. No GoTrue, Storage API, email, or job runner.
  sql/dummy_pg_cron — SQL-only CREATE EXTENSION pg_cron catalog; jobs stored,
  never executed.

fidelity:
  full_repo_migrations = platform stubs + real repo migrations in timestamp order.
  consumed_schema_fixture = only tables/functions consumed by the portfolio migration/test.
  Neither equals hosted Supabase.
  Two-session checks seed only pfh_* owners in the disposable DB.
  Social stage uses the real later migration + real social_discovery_test.sql only.
EOF
finish
echo "HARNESS_TARGET=$TARGET_DB"
echo "HARNESS_KIND=$BASELINE_KIND"
echo "HARNESS_PHASE=complete"
echo "HARNESS_SOCIAL_STAGE=$SOCIAL_STAGE"
echo "HARNESS_EVIDENCE=$EVIDENCE"
cat "$EVIDENCE/test-findings.txt"
echo "--- concurrency ---"
grep -E '^(PASS|FAIL) ' "$EVIDENCE/08-concurrency.log" || true
echo "--- social ---"
if [[ -f "$EVIDENCE/social-findings.txt" ]]; then
  cat "$EVIDENCE/social-findings.txt"
else
  echo "social_stage=$SOCIAL_STAGE"
fi
exit 0
