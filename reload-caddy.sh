#!/usr/bin/env bash
# Reload Caddy config — always passes required env vars
SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$SITE_DIR/config/.env" ] && . "$SITE_DIR/config/.env"
SITE_DIR="$SITE_DIR" \
WEB_PORT="${WEB_PORT:-8090}" \
API_PORT="${API_PORT:-8000}" \
"$SITE_DIR/caddy" reload --config "$SITE_DIR/Caddyfile" --adapter caddyfile
echo "Caddy reloaded ✓"
