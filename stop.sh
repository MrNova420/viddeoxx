#!/usr/bin/env bash
# ═══════════════════════════════════════════════
#  Innerflect — stop.sh
#  Works on: WSL2, Termux (Android), Ubuntu
# ═══════════════════════════════════════════════

SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$SITE_DIR/config/.env" ] && . "$SITE_DIR/config/.env"

API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-8090}"
WATCHDOG_DISABLE="/tmp/innerflect-watchdog-disabled"

G='\033[0;32m' Y='\033[1;33m' R='\033[0;31m' NC='\033[0m'
ok()   { echo -e "${G}  ✓${NC} $*"; }
warn() { echo -e "${Y}  !${NC} $*"; }

# Disable watchdog first so it doesn't auto-restart what we're stopping
touch "$WATCHDOG_DISABLE"
ok "Disabled watchdog auto-restart"

# Kill by PID file
stop_svc() {
  local name="$1"
  local pidfile="$SITE_DIR/logs/${name}.pid"
  local p
  p="$(cat "$pidfile" 2>/dev/null)"
  if [ -n "$p" ] && kill -0 "$p" 2>/dev/null; then
    kill "$p" 2>/dev/null && ok "Stopped $name (pid $p)" || warn "Failed to stop $name"
    sleep 1
    kill -0 "$p" 2>/dev/null && kill -9 "$p" 2>/dev/null
    rm -f "$pidfile"
  else
    warn "$name was not running"
  fi
}

# Kill any process listening on a port (portable — no lsof needed)
kill_port() {
  local port="$1"
  local pids
  # Try ss (Linux/WSL), then netstat (Termux/older)
  pids=$(ss -tlnp 2>/dev/null | grep ":${port} " | grep -oE 'pid=[0-9]+' | grep -oE '[0-9]+')
  [ -z "$pids" ] && pids=$(netstat -tlnp 2>/dev/null | grep ":${port} " | awk '{print $7}' | cut -d/ -f1 | grep -E '^[0-9]+$')
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill 2>/dev/null
    ok "Killed remaining processes on port $port"
  fi
}

echo ""
echo "  Stopping Innerflect..."
echo ""
stop_svc tunnel
stop_svc caddy
stop_svc api

# Kill ngrok by name (portable)
if ps aux 2>/dev/null | grep -v grep | grep -q '[n]grok'; then
  ps aux 2>/dev/null | grep -v grep | grep '[n]grok' | awk '{print $2}' | xargs kill 2>/dev/null
  ok "Stopped ngrok"
fi

# Clean up any leftover processes on ports
kill_port "$API_PORT"
kill_port "$WEB_PORT"

echo ""
warn "Watchdog disabled — services will NOT auto-restart"
echo "  To re-enable: rm $WATCHDOG_DISABLE"
echo "  To restart:   bash $SITE_DIR/start.sh"
echo ""
