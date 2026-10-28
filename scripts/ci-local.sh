#!/usr/bin/env bash
# The one gate. The GitHub workflow runs this file, so the local and hosted checks cannot drift.
#
#   bash scripts/ci-local.sh [--list] [--only a,b] [--skip a,b]
#
# Steps run in the order --list prints them and stop at the first failure.
# Exit 0: every step passed. 1: a step failed, or the arguments name a step that does not exist.
# 2: Node is not major 24 (.nvmrc), or python3 is missing (the figure tests run figures/tools/cfbuild.py).
# CI_SKIP_AUDIT=1 skips the audit step, for offline runs.
# The variables that can switch a real service on are blanked here, so a local .env.local cannot leak in.
set -uo pipefail

cd "$(dirname "$0")/.."

STEPS=(content schema typecheck lint ui no-only copy provenance relay-deps unit perf relay server build e2e secrets audit)

usage_steps() {
  echo "valid steps: ${STEPS[*]}" >&2
}

only=""
skip=""
while [ $# -gt 0 ]; do
  case "$1" in
    --list) printf '%s\n' "${STEPS[@]}"; exit 0 ;;
    --only) only="${2-}"; shift 2 || { echo "--only needs a value" >&2; exit 1; } ;;
    --skip) skip="${2-}"; shift 2 || { echo "--skip needs a value" >&2; exit 1; } ;;
    *) echo "unknown argument: $1" >&2; echo "usage: bash scripts/ci-local.sh [--list] [--only a,b] [--skip a,b]" >&2; exit 1 ;;
  esac
done

has_step() {
  local s
  for s in "${STEPS[@]}"; do [ "$s" = "$1" ] && return 0; done
  return 1
}

for name in ${only//,/ } ${skip//,/ }; do
  if ! has_step "$name"; then
    echo "no step named '$name'" >&2
    usage_steps
    exit 1
  fi
done

case "$(node -v)" in
  v24.*) ;;
  *) echo "Node 24 is required (.nvmrc), found $(node -v)" >&2; exit 2 ;;
esac

if ! python3 --version >/dev/null 2>&1; then
  echo "python3 is required (figure tests run figures/tools/cfbuild.py)" >&2
  exit 2
fi

export NEXT_PUBLIC_REALTIME_URL= IYNK_SERVER_TOKEN= IYNK_AI_ENABLE= IYNK_SEARCH_ENABLE=
export NEXT_DIST_DIR=.next-ci

selected() {
  local name="$1" s
  if [ -n "$only" ]; then
    for s in ${only//,/ }; do [ "$s" = "$name" ] && return 0; done
    return 1
  fi
  for s in ${skip//,/ }; do [ "$s" = "$name" ] && return 1; done
  [ "$name" = audit ] && [ "${CI_SKIP_AUDIT:-}" = 1 ] && return 1
  return 0
}

run_step() {
  case "$1" in
    content) npm run content:check ;;
    schema) npm run schema:check ;;
    typecheck) npm run typecheck ;;
    lint) npm run lint ;;
    ui) node scripts/ui-check.mjs ;;
    no-only) ! git grep -nE --untracked -e "[.]only[(]" -- src figures scripts e2e server ;;
    copy) node scripts/copy-check.mjs ;;
    provenance) npm run provenance:check ;;
    relay-deps) npm ci --prefix server/legacy ;;
    unit) CI=true npx vitest run ;;
    perf) CI=true npm run test:perf ;;
    relay) npm test --prefix server/legacy ;;
    server) npm ci --prefix server && npm run server:typecheck && npm test --prefix server ;;
    build) npm run build ;;
    e2e) E2E_SKIP_BUILD=1 npx playwright test ;;
    secrets) node scripts/secret-scan.mjs --history ;;
    audit) npm audit --omit=dev --audit-level=high ;;
  esac
}

rows=()
status=0
for name in "${STEPS[@]}"; do
  if ! selected "$name"; then
    rows+=("$name|-|skipped")
    continue
  fi
  echo "==> $name"
  started=$SECONDS
  if run_step "$name"; then
    result=passed
  else
    result=FAILED
    status=1
  fi
  rows+=("$name|$((SECONDS - started))|$result")
  [ "$status" -ne 0 ] && break
done

echo
printf '%-12s %8s  %s\n' step seconds result
for row in "${rows[@]}"; do
  IFS='|' read -r name secs result <<<"$row"
  printf '%-12s %8s  %s\n' "$name" "$secs" "$result"
done
exit "$status"
