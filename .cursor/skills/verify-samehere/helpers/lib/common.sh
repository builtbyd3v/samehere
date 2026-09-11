# Shared path and state helpers for control-samehere. Sourced, not executed.

helpers_dir() {
  cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd
}

skill_dir() {
  cd "$(helpers_dir)/.." && pwd
}

repo_root() {
  local d
  d="$(cd "$(skill_dir)/../../.." && pwd)"
  if [[ -f "$d/package.json" ]] && grep -q '"name": "samehere"' "$d/package.json"; then
    printf '%s\n' "$d"
    return 0
  fi
  d="$(pwd)"
  while [[ "$d" != "/" ]]; do
    if [[ -f "$d/package.json" ]] && grep -q '"name": "samehere"' "$d/package.json"; then
      printf '%s\n' "$d"
      return 0
    fi
    d="$(dirname "$d")"
  done
  echo "control-samehere: cannot find the samehere package.json" >&2
  return 1
}

state_dir() {
  printf '%s\n' "${SAMEHERE_VERIFY_STATE_DIR:-$(skill_dir)/.run}"
}

artifacts_dir() {
  printf '%s\n' "${SAMEHERE_VERIFY_ARTIFACTS_DIR:-$(skill_dir)/artifacts}"
}

state_file() {
  printf '%s/%s\n' "$(state_dir)" "$1"
}

read_state() {
  local key="$1"
  local file
  file="$(state_file "$key")"
  if [[ -f "$file" ]]; then
    cat "$file"
  fi
}

write_state() {
  local key="$1"
  local value="$2"
  mkdir -p "$(state_dir)"
  printf '%s\n' "$value" > "$(state_file "$key")"
}

default_host() {
  printf '%s\n' "${SAMEHERE_VERIFY_HOST:-127.0.0.1}"
}

default_port() {
  printf '%s\n' "${SAMEHERE_VERIFY_PORT:-4173}"
}

base_url() {
  local host port
  host="$(read_state host)"
  port="$(read_state port)"
  host="${host:-$(default_host)}"
  port="${port:-$(default_port)}"
  printf 'http://%s:%s\n' "$host" "$port"
}

placeholder_supabase_url() {
  printf '%s\n' "https://verify-placeholder.supabase.co"
}

placeholder_anon_key() {
  # Well-formed JWT so @supabase/ssr will construct a client. Signature is unused.
  printf '%s\n' "eyJhbGciOiJub25lIn0.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9."
}

pid_alive() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

port_pids() {
  local port="$1"
  {
    python3 - "$port" <<'PY'
import os, sys
port = sys.argv[1]
hex_port = f"{int(port):04X}"
inodes = set()
for path in ("/proc/net/tcp", "/proc/net/tcp6"):
    try:
        lines = open(path, encoding="utf-8").read().splitlines()[1:]
    except OSError:
        continue
    for line in lines:
        parts = line.split()
        if len(parts) < 10 or parts[3] != "0A":
            continue
        if parts[1].split(":")[-1].upper() == hex_port:
            inodes.add(parts[9])
if not inodes:
    sys.exit(0)
seen = set()
for pid in os.listdir("/proc"):
    if not pid.isdigit():
        continue
    fd_dir = f"/proc/{pid}/fd"
    try:
        fds = os.listdir(fd_dir)
    except OSError:
        continue
    for fd in fds:
        try:
            target = os.readlink(f"{fd_dir}/{fd}")
        except OSError:
            continue
        if target.startswith("socket:[") and target[8:-1] in inodes:
            if pid not in seen:
                print(pid)
                seen.add(pid)
            break
PY
    if command -v netstat >/dev/null 2>&1; then
      netstat -ltnp 2>/dev/null | awk -v port="$port" '
        $6 == "LISTEN" {
          n = split($4, a, ":")
          if (a[n] == port) {
            split($7, b, "/")
            if (b[1] ~ /^[0-9]+$/) print b[1]
          }
        }'
    fi
  } | sort -u
}

kill_descendants() {
  local pid="$1" child
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do
    kill_descendants "$child"
  done
  if pid_alive "$pid"; then
    kill "$pid" 2>/dev/null || true
  fi
}

kill_pid_tree() {
  local pid="$1"
  if ! pid_alive "$pid"; then
    return 0
  fi
  local pgid
  pgid="$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ')"
  if [[ -n "$pgid" ]]; then
    kill -- "-$pgid" 2>/dev/null || true
  fi
  kill_descendants "$pid"
  sleep 0.4
  if [[ -n "$pgid" ]] && pid_alive "$pid"; then
    kill -9 -- "-$pgid" 2>/dev/null || true
  fi
  if pid_alive "$pid"; then
    kill -9 "$pid" 2>/dev/null || true
  fi
}

require_state() {
  local pid
  pid="$(read_state pid)"
  if [[ -z "$pid" ]]; then
    echo "control-samehere doctor: no launch state. Run launch first." >&2
    return 1
  fi
  if ! pid_alive "$pid"; then
    echo "control-samehere doctor: recorded pid $pid is not running." >&2
    return 1
  fi
  return 0
}
