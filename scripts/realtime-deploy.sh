#!/usr/bin/env bash
# Deploys the iynk room relay (server/realtime) to a VM: rsync the relay and deploy/realtime, write
# deploy/realtime/.env on the VM, then `docker compose up -d --build` there and wait for
# https://<domain>/healthz. Safe to re-run: rsync skips unchanged files and compose recreates only what changed.
#
# Usage:  VULTR_HOST=203.0.113.7 scripts/realtime-deploy.sh [ssh-private-key]
#
#   VULTR_HOST                the VM's IPv4 or hostname (environment or .env.local)
#   SSH_KEY / first argument  private key for the VM (default ~/.ssh/id_ed25519)
#   SSH_USER                  default root (Vultr's default); any other user needs passwordless sudo
#   REALTIME_DOMAIN           default <ip-with-dashes>.sslip.io for an IP, else VULTR_HOST itself
#   REALTIME_ALLOWED_ORIGINS  comma list of site origins; default NEXT_PUBLIC_SITE_URL from .env.local
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"
REMOTE_DIR="/opt/iynk-realtime"

die() {
  echo "realtime-deploy: $*" >&2
  exit 1
}

# One value from .env.local (last assignment wins, surrounding quotes dropped). Nothing is printed.
env_local() {
  [[ -f "$ENV_FILE" ]] || return 0
  sed -n "s/^[[:space:]]*$1=//p" "$ENV_FILE" | tail -n 1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"
}

VULTR_HOST="${VULTR_HOST:-$(env_local VULTR_HOST)}"
[[ -n "$VULTR_HOST" ]] || die "set VULTR_HOST (the VM's IP or hostname) in the environment or .env.local."
[[ "$VULTR_HOST" =~ ^[A-Za-z0-9.-]+$ ]] || die "VULTR_HOST must be an IPv4 address or a hostname."
SSH_KEY="${1:-${SSH_KEY:-$HOME/.ssh/id_ed25519}}"
[[ -f "$SSH_KEY" ]] || die "SSH key not found: $SSH_KEY"
SSH_USER="${SSH_USER:-root}"

if [[ -z "${REALTIME_DOMAIN:-}" ]]; then
  if [[ "$VULTR_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    REALTIME_DOMAIN="${VULTR_HOST//./-}.sslip.io"
  else
    REALTIME_DOMAIN="$VULTR_HOST"
  fi
fi
[[ "$REALTIME_DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]] || die "REALTIME_DOMAIN must be a bare hostname."

ORIGINS="${REALTIME_ALLOWED_ORIGINS:-$(env_local REALTIME_ALLOWED_ORIGINS)}"
if [[ -z "$ORIGINS" ]]; then
  SITE="${NEXT_PUBLIC_SITE_URL:-$(env_local NEXT_PUBLIC_SITE_URL)}"
  [[ -n "$SITE" && "$SITE" != http://localhost* ]] ||
    die "set REALTIME_ALLOWED_ORIGINS (e.g. https://iynk.tech,https://iynk.vercel.app) or a public NEXT_PUBLIC_SITE_URL."
  ORIGINS="${SITE%/}"
fi
[[ "$ORIGINS" =~ ^[A-Za-z0-9:/.,*_-]+$ ]] || die "REALTIME_ALLOWED_ORIGINS must be a comma list of origins without spaces."

TARGET="$SSH_USER@$VULTR_HOST"
SSH_OPTS=(-i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)
SUDO=""
[[ "$SSH_USER" == "root" ]] || SUDO="sudo"
remote() { ssh "${SSH_OPTS[@]}" "$TARGET" "$@"; }

echo "==> Preparing $TARGET (Docker, compose, firewall)"
remote "$SUDO bash -s" <<'BOOTSTRAP'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1 || ! command -v rsync >/dev/null; then
  apt-get update -q
  apt-get install -y -q docker.io docker-compose-v2 rsync
fi
systemctl enable --now docker >/dev/null
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  for rule in 22/tcp 80/tcp 443/tcp 443/udp; do ufw allow "$rule" >/dev/null; done
fi
mkdir -p /opt/iynk-realtime/server/realtime /opt/iynk-realtime/deploy/realtime
BOOTSTRAP

echo "==> Copying the relay"
# rsync splits -e on spaces and honours quotes, so each ssh option is single-quoted.
RSH="ssh"
for opt in "${SSH_OPTS[@]}"; do RSH+=" '${opt//\'/}'"; done
RSYNC=(rsync -az --delete --itemize-changes --exclude node_modules --exclude .env -e "$RSH")
[[ -z "$SUDO" ]] || RSYNC+=(--rsync-path "sudo rsync")
"${RSYNC[@]}" "$ROOT/server/realtime/" "$TARGET:$REMOTE_DIR/server/realtime/" >/dev/null
CHANGED="$("${RSYNC[@]}" "$ROOT/deploy/realtime/" "$TARGET:$REMOTE_DIR/deploy/realtime/")"

printf 'REALTIME_DOMAIN=%s\nREALTIME_ALLOWED_ORIGINS=%s\n' "$REALTIME_DOMAIN" "$ORIGINS" |
  remote "$SUDO tee $REMOTE_DIR/deploy/realtime/.env >/dev/null"

echo "==> Starting the relay and Caddy for $REALTIME_DOMAIN"
remote "cd $REMOTE_DIR/deploy/realtime && $SUDO docker compose up -d --build --remove-orphans"
if grep -q "Caddyfile" <<<"$CHANGED"; then
  remote "cd $REMOTE_DIR/deploy/realtime && $SUDO docker compose restart caddy"
fi

echo "==> Waiting for https://$REALTIME_DOMAIN/healthz (the first certificate can take a minute)"
for _ in $(seq 1 60); do
  if curl -fsS --max-time 5 "https://$REALTIME_DOMAIN/healthz" >/dev/null 2>&1; then
    echo "Relay is up. Set this in Vercel and .env.local:"
    echo "  NEXT_PUBLIC_REALTIME_URL=wss://$REALTIME_DOMAIN/ws"
    exit 0
  fi
  sleep 3
done
die "no healthy answer from https://$REALTIME_DOMAIN/healthz after 3 minutes; check: ssh $TARGET 'cd $REMOTE_DIR/deploy/realtime && docker compose logs --tail 50'"
