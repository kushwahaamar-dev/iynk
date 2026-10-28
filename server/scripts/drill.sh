#!/usr/bin/env bash
# Operations drill: backup, restore, upgrade with a migration, rollback and graceful shutdown, all in a temp directory.
#   bash server/scripts/drill.sh
# Prints one PASS or FAIL line per check and exits non-zero if any check failed. Needs Node 24 and curl.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORK="$(mktemp -d)"
chmod 700 "$WORK"
CLIENT="$ROOT/server/scripts/drill-client.mjs"
PIDS=()
FAILED=0
PORT=0
SERVER_PID=0

cleanup() {
  local pid
  for pid in ${PIDS[@]+"${PIDS[@]}"}; do kill "$pid" 2>/dev/null || true; done
  rm -rf "$WORK"
}
trap cleanup EXIT

report() {
  if [ "$1" = ok ]; then printf 'PASS  %s\n' "$2"; else printf 'FAIL  %s\n' "$2"; FAILED=1; fi
}

check() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then report ok "$name"; else report bad "$name"; fi
}

free_port() {
  node -e '
    const net = require("node:net");
    const tryPort = () => {
      const port = 47000 + Math.floor(Math.random() * 1000);
      const probe = net.createServer().once("error", tryPort).listen(port, "127.0.0.1", () => probe.close(() => console.log(port)));
    };
    tryPort();
  '
}

# server_env <data dir>: fills ENVV with a command prefix that gives one server its environment and inherits nothing but PATH.
server_env() {
  ENVV=(env -i PATH="$PATH" HOME="$WORK" IYNK_DATA_DIR="$1" IYNK_PUBLIC_URL="http://localhost:$PORT"
    IYNK_ALLOWED_ORIGINS="http://localhost:$PORT" IYNK_PORT="$PORT" IYNK_HOST=127.0.0.1 IYNK_LOG_LEVEL=warn)
}

cli() {
  local root="$1" data="$2"
  shift 2
  server_env "$data"
  "${ENVV[@]}" node "$root/server/bin/iynk-server.ts" "$@"
}

json_field() {
  node -e 'let s = ""; process.stdin.on("data", (c) => (s += c)).on("end", () => console.log(JSON.parse(s)[process.argv[1]]))' "$1"
}

sql_count() {
  node -e '
    const { DatabaseSync } = require("node:sqlite");
    const db = new DatabaseSync(process.argv[1], { readOnly: true });
    console.log(Object.values(db.prepare(process.argv[2]).get())[0]);
  ' "$1" "$2" 2>/dev/null
}

start_server() {
  local root="$1" data="$2" log="$3"
  PORT="$(free_port)"
  server_env "$data"
  "${ENVV[@]}" node "$root/server/src/main.ts" >"$log" 2>&1 &
  SERVER_PID=$!
  PIDS+=("$SERVER_PID")
  local tries=0
  until curl -sf "http://127.0.0.1:$PORT/healthz" >/dev/null 2>&1; do
    tries=$((tries + 1))
    if [ "$tries" -gt 100 ] || ! kill -0 "$SERVER_PID" 2>/dev/null; then return 1; fi
    sleep 0.1
  done
}

# stop_server: SIGTERM, then wait up to 15 seconds for the process to exit with status 0.
stop_server() {
  local tries=0
  kill -TERM "$SERVER_PID" 2>/dev/null || return 1
  while kill -0 "$SERVER_PID" 2>/dev/null; do
    tries=$((tries + 1))
    if [ "$tries" -gt 150 ]; then return 1; fi
    sleep 0.1
  done
  wait "$SERVER_PID"
}

base() { printf 'http://127.0.0.1:%s' "$PORT"; }

PORT="$(free_port)"
mkdir -m 700 "$WORK/a" "$WORK/b" "$WORK/keys"
DATA_A="$WORK/a/data"
DATA_B="$WORK/b/data"
mkdir -m 700 "$DATA_A"

echo "1. First run: two devices enrolled and paired"
check "check-config accepts the drill settings" cli "$ROOT" "$DATA_A" check-config
CODE_ONE="$(cli "$ROOT" "$DATA_A" init --json | json_field code)"
CODE_TWO="$(cli "$ROOT" "$DATA_A" enrol --json | json_field code)"
check "the server starts" start_server "$ROOT" "$DATA_A" "$WORK/a.log"
ADA="$(node "$CLIENT" enrol "$(base)" "$WORK/keys/ada.json" Ada "$CODE_ONE" 2>&1 || true)"
BOB="$(node "$CLIENT" enrol "$(base)" "$WORK/keys/bob.json" Bob "$CODE_TWO" 2>&1 || true)"
check "both devices enrol" test "${ADA#usr_}" != "$ADA" -a "${BOB#usr_}" != "$BOB"
check "the devices pair" test "$(node "$CLIENT" pair "$(base)" "$WORK/keys/ada.json" "$WORK/keys/bob.json" 2>&1 || true)" = "$ADA"
check "a spent code is refused" test -z "$(node "$CLIENT" enrol "$(base)" "$WORK/keys/eve.json" Eve "$CODE_ONE" 2>/dev/null || true)"

echo "2. Backup while running, restore elsewhere"
BACKUP_NAME="$(cli "$ROOT" "$DATA_A" backup | sed 's/^Backup written to //')"
check "backup writes a file while the server runs" test -s "$BACKUP_NAME"
check "the server stops on SIGTERM" stop_server
check "restore accepts the backup" cli "$ROOT" "$DATA_B" restore "$BACKUP_NAME"
check "the restored server starts" start_server "$ROOT" "$DATA_B" "$WORK/b.log"
check "both identities sign in on the restored server" test \
  "$(node "$CLIENT" login "$(base)" "$WORK/keys/ada.json" 2>&1 || true)" = "$ADA" -a \
  "$(node "$CLIENT" login "$(base)" "$WORK/keys/bob.json" 2>&1 || true)" = "$BOB"
check "the buddy pair survived" test "$(node "$CLIENT" buddies "$(base)" "$WORK/keys/ada.json" 2>&1 || true)" = "$BOB"
stop_server || report bad "the restored server stops"

echo "3. Upgrade with a migration, then roll back"
NEW="$WORK/upgraded"
mkdir -p "$NEW/server" "$NEW/src"
cp -R "$ROOT/server/src" "$ROOT/server/bin" "$ROOT/server/migrations" "$ROOT/server/package.json" "$NEW/server/"
cp -R "$ROOT/src/core" "$ROOT/src/protocol" "$NEW/src/"
echo "CREATE TABLE drill_marker (id INTEGER PRIMARY KEY);" >"$NEW/server/migrations/9999_drill.sql"
check "the upgraded server starts on the old database" start_server "$NEW" "$DATA_B" "$WORK/new.log"
DB_B="$DATA_B/iynk.db"
check "the migration was applied" test "$(sql_count "$DB_B" "SELECT COUNT(*) FROM schema_migrations WHERE version = 9999")" = 1
PRE_BACKUP="$(find "$DATA_B/backups" -name 'pre-9999-*.db' | head -n 1)"
check "a pre-migration backup exists" test -s "${PRE_BACKUP:-/nonexistent}"
check "the data is still there after the upgrade" test "$(node "$CLIENT" buddies "$(base)" "$WORK/keys/bob.json" 2>&1 || true)" = "$ADA"
stop_server || report bad "the upgraded server stops"

OLD_START=0
start_server "$ROOT" "$DATA_B" "$WORK/old-refused.log" && OLD_START=1
if [ "$OLD_START" = 0 ] && grep -q "does not know" "$WORK/old-refused.log"; then
  report ok "the old server refuses a database that is newer than it"
else
  report bad "the old server refuses a database that is newer than it"
  kill "$SERVER_PID" 2>/dev/null || true
fi

cp "$PRE_BACKUP" "$DB_B"
rm -f "$DB_B-wal" "$DB_B-shm"
check "the old server runs on the rolled-back database" start_server "$ROOT" "$DATA_B" "$WORK/old.log"
check "the data survived the rollback" test "$(node "$CLIENT" buddies "$(base)" "$WORK/keys/ada.json" 2>&1 || true)" = "$BOB"

echo "4. Graceful shutdown"
STARTED="$(date +%s)"
DRAIN_ANSWER="$(node "$CLIENT" drain "$(base)" "$SERVER_PID" 2>&1 || true)"
check "healthz answers 503 with draining true while stopping" test "$DRAIN_ANSWER" = '503 {"ok":false,"draining":true,"store":"ok"}'
if wait "$SERVER_PID" 2>/dev/null; then EXIT_OK=1; else EXIT_OK=0; fi
check "the process exits with status 0" test "$EXIT_OK" = 1
check "it exits within 15 seconds" test "$(($(date +%s) - STARTED))" -le 15

echo
if [ "$FAILED" = 0 ]; then echo "All checks passed."; else echo "Some checks failed."; fi
exit "$FAILED"
