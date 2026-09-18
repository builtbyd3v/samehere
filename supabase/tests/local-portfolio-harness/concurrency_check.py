#!/usr/bin/env python3
"""Two-session overlap checks for reserve/retry. No dblink. pfh_* DBs only."""
from __future__ import annotations

import argparse
import os
import re
import select
import subprocess
import sys
import time
import uuid
from pathlib import Path

LOCKED_PGHOST = "/tmp/samehere-postgres-socket"
LOCKED_PGPORT = "55439"
LOCKED_PGUSER = "postgres"
DB_RE = re.compile(r"^pfh_[0-9]{8}_[0-9]{6}_[0-9]+_(chain|fix)$")
ACTIVE_STATUSES = "('queued', 'reading_repository', 'analyzing', 'saving_draft')"
LOSE_MSG = "analysis already in progress"
STATEMENT_TIMEOUT = "8s"
LOCK_TIMEOUT = "8s"
IDLE_TIMEOUT = "12s"
PROC_TIMEOUT = 15.0
READY_TIMEOUT = 5.0
HOLD_TIMEOUT = 6.0


def refuse(msg: str) -> None:
    print(f"refuse: {msg}", file=sys.stderr)
    raise SystemExit(2)


def guard_env(db: str) -> None:
    for banned in (
        "DATABASE_URL",
        "SUPABASE_DB_URL",
        "POSTGRES_URL",
        "DIRECT_URL",
        "PGPASSWORD",
        "PGSERVICEFILE",
        "PGSERVICE",
    ):
        os.environ.pop(banned, None)
    host = os.environ.get("PGHOST", LOCKED_PGHOST)
    port = os.environ.get("PGPORT", LOCKED_PGPORT)
    user = os.environ.get("PGUSER", LOCKED_PGUSER)
    if host != LOCKED_PGHOST:
        refuse(f"PGHOST={host} is not {LOCKED_PGHOST}")
    if port != LOCKED_PGPORT:
        refuse(f"PGPORT={port} is not {LOCKED_PGPORT}")
    if user != LOCKED_PGUSER:
        refuse(f"PGUSER={user} is not {LOCKED_PGUSER}")
    if not host.startswith("/"):
        refuse("PGHOST must be a unix socket directory")
    if "." in host:
        refuse(f"PGHOST looks like a hostname: {host}")
    sock = Path(host) / f".s.PGSQL.{port}"
    if not sock.is_socket():
        refuse(f"socket {sock} missing")
    if not DB_RE.match(db):
        refuse(f"database '{db}' is not a disposable pfh_* harness db")
    os.environ["PGHOST"] = LOCKED_PGHOST
    os.environ["PGPORT"] = LOCKED_PGPORT
    os.environ["PGUSER"] = LOCKED_PGUSER
    os.environ["PGSSLMODE"] = "disable"


def psql_bin(explicit: str | None) -> str:
    raw = explicit or os.environ.get("PG_BIN", "/tmp/samehere-postgres-tools/usr/lib/postgresql/16/bin")
    path = str(Path(raw) / "psql") if not raw.endswith("psql") else raw
    if not os.access(path, os.X_OK):
        refuse(f"psql missing: {path}")
    return path


def psql_argv(psql: str, db: str) -> list[str]:
    return [
        psql,
        "--no-password",
        "--no-psqlrc",
        "-X",
        "-v",
        "ON_ERROR_STOP=1",
        "-P",
        "pager=off",
        "-A",
        "-t",
        "-q",
        "-d",
        db,
    ]


def run_sql(psql: str, db: str, sql: str, timeout: float = PROC_TIMEOUT) -> str:
    r = subprocess.run(
        psql_argv(psql, db),
        input=sql.encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
        check=False,
    )
    out = (r.stdout or b"").decode("utf-8", "replace").strip()
    if r.returncode != 0:
        raise RuntimeError(out or f"psql exit {r.returncode}")
    return out


def as_ok(val: str) -> bool:
    return val.strip().lower() in {"t", "true", "1", "yes"}


class PsqlSession:
    def __init__(self, psql: str, db: str) -> None:
        self.proc = subprocess.Popen(
            psql_argv(psql, db),
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=0,
        )
        self.buf = b""
        if self.proc.stdin is None or self.proc.stdout is None:
            raise RuntimeError("psql pipes missing")

    def send(self, sql: str) -> None:
        raw = sql.encode("utf-8")
        if not raw.endswith(b"\n"):
            raw += b"\n"
        assert self.proc.stdin is not None
        os.write(self.proc.stdin.fileno(), raw)

    def wait_token(self, token: str, timeout: float) -> str:
        needle = token.encode("utf-8")
        fd = self.proc.stdout.fileno()
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            idx = self.buf.find(needle)
            if idx >= 0:
                end = self.buf.find(b"\n", idx)
                end = len(self.buf) if end < 0 else end + 1
                consumed = self.buf[:end]
                self.buf = self.buf[end:]
                return consumed.decode("utf-8", "replace")
            remain = max(0.0, deadline - time.monotonic())
            ready, _, _ = select.select([fd], [], [], remain)
            if not ready:
                continue
            chunk = os.read(fd, 4096)
            if not chunk:
                break
            self.buf += chunk
        so_far = self.buf.decode("utf-8", "replace")
        raise TimeoutError(f"timeout waiting for {token!r}; so far={so_far!r}")

    def close_stdin(self) -> None:
        if self.proc.stdin and not self.proc.stdin.closed:
            try:
                self.proc.stdin.close()
            except OSError:
                pass

    def kill(self) -> None:
        if self.proc.poll() is not None:
            return
        try:
            self.send("rollback;\n")
        except OSError:
            pass
        self.proc.kill()
        try:
            self.proc.wait(timeout=2)
        except subprocess.TimeoutExpired:
            pass


def seed_owner(psql: str, db: str, username: str, gh_id: int) -> str:
    sql = f"""
    \\set VERBOSITY verbose
    grant temporary on database {db} to authenticated;
    create table if not exists harness_conc_owners (
      username text primary key,
      id uuid not null
    );
    do $$
    declare
      v_id uuid := gen_random_uuid();
    begin
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
        '{username}@school.edu', '', now(),
        '{{"provider":"email","providers":["email"]}}',
        jsonb_build_object('username', '{username}'),
        now(), now(), '', '', '', ''
      );
      perform public.upsert_github_connection(v_id, {gh_id}, '{username}');
      insert into harness_conc_owners(username, id) values ('{username}', v_id);
    end $$;
    select id::text from harness_conc_owners where username = '{username}';
    """
    uid = run_sql(psql, db, sql)
    if not re.fullmatch(r"[0-9a-f-]{36}", uid.splitlines()[-1]):
        raise RuntimeError(f"seed failed for {username}: {uid!r}")
    return uid.splitlines()[-1]


def seed_failed_analysis(psql: str, db: str, uid: str, request_key: str) -> str:
    sql = f"""
    \\set VERBOSITY verbose
    begin;
    select set_config('role', 'authenticated', true);
    select set_config('request.jwt.claims',
      json_build_object('sub', '{uid}', 'role', 'authenticated')::text, true);
    select analysis_id::text from public.reserve_repository_analysis(
      null, 71001, 'acme/conc-seed', 'sha-seed', '{request_key}', 'prompt-v1'
    );
    commit;
    """
    analysis_id = run_sql(psql, db, sql).splitlines()[-1]
    run_sql(
        psql,
        db,
        f"""
        update public.repository_analyses
           set status = 'failed', completed_at = now(), updated_at = now()
         where id = '{analysis_id}'::uuid;
        update public.repository_analysis_usage
           set settlement = 'released', settled_at = now(), counts_toward_success = false
         where analysis_id = '{analysis_id}'::uuid;
        """,
    )
    return analysis_id


def counts(psql: str, db: str, uid: str) -> tuple[int, int, int]:
    raw = run_sql(
        psql,
        db,
        f"""
        select
          (select count(*) from public.repository_analyses
            where owner_id = '{uid}'::uuid
              and status in {ACTIVE_STATUSES})::text
          || ' ' ||
          (select count(*) from public.repository_analysis_usage
            where owner_id = '{uid}'::uuid and settlement = 'pending')::text
          || ' ' ||
          (select count(*) from public.repository_analyses
            where owner_id = '{uid}'::uuid)::text;
        """,
    )
    a, p, n = raw.splitlines()[-1].split()
    return int(a), int(p), int(n)


def lock_dump(psql: str, db: str) -> str:
    return run_sql(
        psql,
        db,
        """
        select coalesce(a.application_name, '') || '|granted=' || l.granted::text
          || '|type=' || l.locktype
        from pg_locks l
        join pg_stat_activity a on a.pid = l.pid
        where l.locktype = 'advisory' or a.application_name like 'pfh-conc-%'
        order by 1;
        """,
    )


def advisory_state(psql: str, db: str, app: str, granted: bool) -> bool:
    flag = "true" if granted else "false"
    raw = run_sql(
        psql,
        db,
        f"""
        select exists (
          select 1
          from pg_locks l
          join pg_stat_activity a on a.pid = l.pid
          where l.locktype = 'advisory'
            and a.application_name = '{app}'
            and l.granted is {flag}
        )::text;
        """,
    )
    return as_ok(raw.splitlines()[-1])


def wait_until(fn, timeout: float, what: str) -> None:
    deadline = time.monotonic() + timeout
    last = None
    while time.monotonic() < deadline:
        try:
            if fn():
                return
        except Exception as e:
            last = e
        time.sleep(0.05)
    extra = f" last={last}" if last else ""
    raise TimeoutError(f"timeout waiting for {what}{extra}")


def begin_as_user(uid: str, app: str) -> str:
    return f"""
begin;
set local statement_timeout = '{STATEMENT_TIMEOUT}';
set local lock_timeout = '{LOCK_TIMEOUT}';
set local idle_in_transaction_session_timeout = '{IDLE_TIMEOUT}';
set local application_name = '{app}';
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims',
  json_build_object('sub', '{uid}', 'role', 'authenticated')::text, true);
create temporary table conc_out (
  side text primary key,
  ok boolean not null,
  sqlstate text not null,
  msg text not null,
  analysis_id uuid
);
grant select, insert, update, delete on conc_out to authenticated, anon, service_role;
\\echo READY
"""


def call_sql(label: str, body: str) -> str:
    return f"""
do $$
declare
  v_id uuid;
begin
  {body}
  insert into conc_out(side, ok, sqlstate, msg, analysis_id)
  values ('{label}', true, '00000', 'ok', v_id);
exception when others then
  insert into conc_out(side, ok, sqlstate, msg, analysis_id)
  values ('{label}', false, sqlstate, sqlerrm, null);
end $$;
select side || '|' || (case when ok then 'true' else 'false' end)
  || '|' || sqlstate || '|' || msg || '|' || coalesce(analysis_id::text, '')
from conc_out;
\\echo CALL_DONE
"""


def commit_sql() -> str:
    return "commit;\n\\echo DONE\n"


def overlap_pair(
    psql: str, db: str, uid: str, left_sql: str, right_sql: str, log: list[str]
) -> tuple[str, str]:
    nonce = uuid.uuid4().hex[:8]
    app_l = f"pfh-conc-L-{nonce}"
    app_r = f"pfh-conc-R-{nonce}"
    left = PsqlSession(psql, db)
    right = PsqlSession(psql, db)
    left_blob = ""
    right_blob = ""
    try:
        left.send(begin_as_user(uid, app_l))
        right.send(begin_as_user(uid, app_r))
        left.wait_token("READY", READY_TIMEOUT)
        right.wait_token("READY", READY_TIMEOUT)

        left.send(call_sql("L", left_sql))
        left_blob = left.wait_token("CALL_DONE", PROC_TIMEOUT)
        wait_until(
            lambda: advisory_state(psql, db, app_l, True),
            HOLD_TIMEOUT,
            f"{app_l} holds advisory",
        )

        right.send(call_sql("R", right_sql))
        wait_until(
            lambda: advisory_state(psql, db, app_r, False),
            HOLD_TIMEOUT,
            f"{app_r} waits advisory (overlap)",
        )
        log.append(f"overlap_gate {app_l} held, {app_r} waiting")

        left.send(commit_sql())
        left.wait_token("DONE", PROC_TIMEOUT)
        right_blob = right.wait_token("CALL_DONE", PROC_TIMEOUT)
        right.send(commit_sql())
        right.wait_token("DONE", PROC_TIMEOUT)
        left.close_stdin()
        right.close_stdin()
        if left.proc.wait(timeout=3) != 0 or right.proc.wait(timeout=3) != 0:
            raise RuntimeError(
                f"psql worker exit L={left.proc.returncode} R={right.proc.returncode}"
            )
        return left_blob, right_blob
    except Exception:
        try:
            log.append(f"lock_dump={lock_dump(psql, db)}")
        except Exception as dump_err:
            log.append(f"lock_dump_failed={dump_err}")
        try:
            left.send(commit_sql())
        except OSError:
            pass
        left.kill()
        right.kill()
        raise


def parse_out(blob: str) -> dict[str, str]:
    for line in blob.splitlines():
        if "|" in line and line.split("|", 1)[0] in {"L", "R"}:
            side, ok, state, msg, aid = (line.split("|") + [""])[:5]
            return {
                "side": side,
                "ok": "true" if as_ok(ok) else "false",
                "sqlstate": state,
                "msg": msg,
                "analysis_id": aid,
            }
    raise RuntimeError(f"no conc_out row in:\n{blob}")


def fail(evidence: list[str], finding: str, note: str) -> None:
    evidence.append(f"FAIL {finding} {note}")
    raise SystemExit(1)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", required=True)
    ap.add_argument("--evidence", required=True)
    ap.add_argument("--psql", default=None)
    args = ap.parse_args()
    guard_env(args.db)
    psql = psql_bin(args.psql)
    log: list[str] = [
        f"db={args.db}",
        f"pghost={os.environ['PGHOST']}",
        f"started={time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}",
    ]
    ev_path = Path(args.evidence)
    ev_path.parent.mkdir(parents=True, exist_ok=True)

    def flush() -> None:
        ev_path.write_text("\n".join(log) + "\n", encoding="utf-8")

    try:
        uid = seed_owner(psql, args.db, "pfhconcrr", 91001)
        log.append(f"seed_rr={uid}")
        left = """
          select analysis_id into v_id from public.reserve_repository_analysis(
            null, 72001, 'acme/rr-l', 'sha-rr-l', 'req-rr-l', 'prompt-v1');
        """
        right = """
          select analysis_id into v_id from public.reserve_repository_analysis(
            null, 72002, 'acme/rr-r', 'sha-rr-r', 'req-rr-r', 'prompt-v1');
        """
        out_a, out_b = overlap_pair(psql, args.db, uid, left, right, log)
        la, rb = parse_out(out_a), parse_out(out_b)
        log.append(f"CONC_reserve_reserve L={la}")
        log.append(f"CONC_reserve_reserve R={rb}")
        wins = [x for x in (la, rb) if as_ok(x["ok"])]
        losses = [x for x in (la, rb) if not as_ok(x["ok"])]
        if len(wins) != 1 or len(losses) != 1:
            fail(log, "CONC_reserve_reserve", f"want 1 win/1 loss got wins={wins} losses={losses}")
        if losses[0]["msg"] != LOSE_MSG:
            fail(
                log,
                "CONC_reserve_reserve",
                f"loser msg={losses[0]['msg']!r} sqlstate={losses[0]['sqlstate']}",
            )
        active, pending, n = counts(psql, args.db, uid)
        log.append(f"CONC_reserve_reserve counts active={active} pending={pending} rows={n}")
        if active != 1 or pending != 1 or n != 1:
            fail(log, "CONC_reserve_reserve", f"want 1 active+1 pending+1 row got {active}/{pending}/{n}")
        log.append("PASS CONC_reserve_reserve")

        uid = seed_owner(psql, args.db, "pfhconcdup", 91002)
        log.append(f"seed_dup={uid}")
        same = """
          select analysis_id into v_id from public.reserve_repository_analysis(
            null, 73001, 'acme/dup', 'sha-dup', 'req-dup', 'prompt-v1');
        """
        out_a, out_b = overlap_pair(psql, args.db, uid, same, same, log)
        la, rb = parse_out(out_a), parse_out(out_b)
        log.append(f"CONC_dup_request_key L={la}")
        log.append(f"CONC_dup_request_key R={rb}")
        if not as_ok(la["ok"]) or not as_ok(rb["ok"]):
            fail(log, "CONC_dup_request_key", f"both should succeed/reuse got {la} {rb}")
        if not la["analysis_id"] or la["analysis_id"] != rb["analysis_id"]:
            fail(log, "CONC_dup_request_key", f"duplicate request_key created extra id {la} {rb}")
        active, pending, n = counts(psql, args.db, uid)
        log.append(f"CONC_dup_request_key counts active={active} pending={pending} rows={n}")
        if active != 1 or pending != 1 or n != 1:
            fail(log, "CONC_dup_request_key", f"want 1 active+1 pending+1 row got {active}/{pending}/{n}")
        log.append("PASS CONC_dup_request_key")

        uid = seed_owner(psql, args.db, "pfhconctr", 91003)
        failed_id = seed_failed_analysis(psql, args.db, uid, "req-tr-parent")
        log.append(f"seed_tr={uid} failed={failed_id}")
        left = f"""
          select analysis_id into v_id from public.retry_repository_analysis('{failed_id}'::uuid);
        """
        right = """
          select analysis_id into v_id from public.reserve_repository_analysis(
            null, 74001, 'acme/tr', 'sha-tr', 'req-tr-new', 'prompt-v1');
        """
        out_a, out_b = overlap_pair(psql, args.db, uid, left, right, log)
        la, rb = parse_out(out_a), parse_out(out_b)
        log.append(f"CONC_retry_reserve L={la}")
        log.append(f"CONC_retry_reserve R={rb}")
        wins = [x for x in (la, rb) if as_ok(x["ok"])]
        losses = [x for x in (la, rb) if not as_ok(x["ok"])]
        if len(wins) != 1 or len(losses) != 1:
            fail(log, "CONC_retry_reserve", f"want 1 win/1 loss got wins={wins} losses={losses}")
        if losses[0]["msg"] != LOSE_MSG:
            fail(
                log,
                "CONC_retry_reserve",
                f"loser msg={losses[0]['msg']!r} sqlstate={losses[0]['sqlstate']}",
            )
        active, pending, n = counts(psql, args.db, uid)
        log.append(f"CONC_retry_reserve counts active={active} pending={pending} rows={n}")
        if active != 1 or pending != 1:
            fail(log, "CONC_retry_reserve", f"want 1 active+1 pending got {active}/{pending} rows={n}")
        log.append("PASS CONC_retry_reserve")
        log.append("PASS all two-session concurrency checks")
        flush()
        print("\n".join(x for x in log if x.startswith("PASS ") or x.startswith("FAIL ")))
        return 0
    except SystemExit as e:
        flush()
        if e.code not in (0, None):
            print(log[-1] if log else "FAIL", file=sys.stderr)
        raise
    except Exception as e:
        log.append(f"FAIL CONC_harness {type(e).__name__}: {e}")
        flush()
        print(log[-1], file=sys.stderr)
        return 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.TimeoutExpired as e:
        print(f"FAIL CONC_harness timeout: {e}", file=sys.stderr)
        raise SystemExit(1)
