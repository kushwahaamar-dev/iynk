#!/usr/bin/env bash
# Creates the relay VM on Vultr through API v2: Ubuntu 24.04 LTS x64 in Dallas (dfw) on plan vc2-1c-1gb,
# with your SSH public key installed. Idempotent: when an instance labelled iynk-realtime exists, it
# prints that one and creates nothing. This SPENDS MONEY (vc2-1c-1gb is about $5 a month, or MLH credits):
# run it only after the owner has approved it. Then deploy with scripts/realtime-deploy.sh.
#
# Usage:  scripts/realtime-vultr-create.sh [ssh-public-key]
#
#   VULTR_API_KEY          environment or .env.local; never printed
#   SSH_PUBKEY / argument  default ~/.ssh/id_ed25519.pub
#   VULTR_REGION           default dfw (Dallas)
#   VULTR_PLAN             default vc2-1c-1gb
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"
API="https://api.vultr.com/v2"
LABEL="iynk-realtime"
OS_NAME="Ubuntu 24.04 LTS x64"
REGION="${VULTR_REGION:-dfw}"
PLAN="${VULTR_PLAN:-vc2-1c-1gb}"
PUBKEY_FILE="${1:-${SSH_PUBKEY:-$HOME/.ssh/id_ed25519.pub}}"

die() {
  echo "realtime-vultr-create: $*" >&2
  exit 1
}

env_local() {
  [[ -f "$ENV_FILE" ]] || return 0
  sed -n "s/^[[:space:]]*$1=//p" "$ENV_FILE" | tail -n 1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"
}

command -v jq >/dev/null || die "needs jq."
command -v curl >/dev/null || die "needs curl."
KEY="${VULTR_API_KEY:-$(env_local VULTR_API_KEY)}"
[[ -n "$KEY" ]] || die "VULTR_API_KEY is not set (environment or .env.local); nothing was created."
[[ -f "$PUBKEY_FILE" ]] || die "SSH public key not found: $PUBKEY_FILE (pass a .pub file)."
PUBKEY="$(tr -d '\n' <"$PUBKEY_FILE")"
[[ "$PUBKEY" =~ ^(ssh-ed25519|ssh-rsa|ecdsa-sha2-[a-z0-9]+)\  ]] || die "$PUBKEY_FILE is not an OpenSSH public key."

# The key goes to curl through a private header file, so it never shows up in `ps`.
HEADERS="$(mktemp)"
trap 'rm -f "$HEADERS"' EXIT
chmod 600 "$HEADERS"
printf 'Authorization: Bearer %s\n' "$KEY" >"$HEADERS"
unset KEY

# api METHOD PATH [JSON]: prints the response body, or stops with Vultr's error (its error bodies hold no secrets).
api() {
  local args=(-sS --max-time 30 -X "$1" -H @"$HEADERS" -H "Content-Type: application/json" -w $'\n%{http_code}')
  [[ $# -lt 3 ]] || args+=(--data "$3")
  local out status
  out="$(curl "${args[@]}" "$API$2")" || die "$1 $2: could not reach the Vultr API."
  status="${out##*$'\n'}"
  out="${out%$'\n'*}"
  [[ "$status" == 2* ]] || die "$1 $2 failed with HTTP $status: $out"
  printf '%s' "$out"
}

existing="$(api GET "/instances?label=$LABEL&per_page=500" | jq -c --arg label "$LABEL" '[.instances[] | select(.label == $label)][0] // empty')"
if [[ -n "$existing" ]]; then
  echo "An instance labelled $LABEL already exists; nothing created."
  jq -r '"  id \(.id)\n  ip \(.main_ip)\n  region \(.region), plan \(.plan), status \(.status)/\(.server_status)"' <<<"$existing"
  echo "Deploy with: VULTR_HOST=$(jq -r .main_ip <<<"$existing") scripts/realtime-deploy.sh"
  exit 0
fi

api GET "/regions/$REGION/availability" | jq -e --arg plan "$PLAN" '.available_plans | index($plan)' >/dev/null ||
  die "plan $PLAN is not available in $REGION right now; pick another with VULTR_PLAN."

OS_ID="$(api GET "/os?per_page=500" | jq -r --arg name "$OS_NAME" '[.os[] | select(.name == $name)][0].id // empty')"
[[ -n "$OS_ID" ]] || die "Vultr lists no OS named \"$OS_NAME\"."

# Reuse the key when Vultr already has it; compare type and body, not the comment.
KEY_BODY="$(cut -d' ' -f1-2 <<<"$PUBKEY")"
SSHKEY_ID="$(api GET "/ssh-keys?per_page=500" |
  jq -r --arg body "$KEY_BODY" '[.ssh_keys[] | select((.ssh_key | split(" ")[0:2] | join(" ")) == $body)][0].id // empty')"
if [[ -z "$SSHKEY_ID" ]]; then
  SSHKEY_ID="$(api POST "/ssh-keys" "$(jq -nc --arg name "$LABEL-deploy" --arg key "$PUBKEY" '{name: $name, ssh_key: $key}')" | jq -r '.ssh_key.id')"
  echo "Uploaded SSH key $SSHKEY_ID."
fi

BODY="$(jq -nc --arg region "$REGION" --arg plan "$PLAN" --argjson os "$OS_ID" --arg label "$LABEL" --arg key "$SSHKEY_ID" \
  '{region: $region, plan: $plan, os_id: $os, label: $label, hostname: $label, sshkey_id: [$key],
    backups: "disabled", enable_ipv6: true, tags: ["iynk", "hacktx"]}')"
# The create response carries the root password; only the id is kept.
ID="$(api POST "/instances" "$BODY" | jq -r '.instance.id')"
[[ -n "$ID" && "$ID" != "null" ]] || die "Vultr did not return an instance id."
echo "Created instance $ID ($PLAN, $OS_NAME, $REGION). Waiting for it to boot…"

for _ in $(seq 1 60); do
  instance="$(api GET "/instances/$ID" | jq -c '.instance')"
  ip="$(jq -r .main_ip <<<"$instance")"
  if [[ "$(jq -r .status <<<"$instance")" == "active" && "$(jq -r .server_status <<<"$instance")" == "ok" && "$ip" != "0.0.0.0" ]]; then
    echo "Ready: $ip"
    echo "Deploy with: VULTR_HOST=$ip scripts/realtime-deploy.sh"
    exit 0
  fi
  sleep 5
done
die "instance $ID is not ready after 5 minutes; check it in the Vultr dashboard."
