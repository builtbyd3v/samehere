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
  if command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :$port" 2>/dev/null | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u
    return
  fi
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
    return
  fi
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
