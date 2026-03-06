#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  Innerflect — Interactive Menu
#  Works on: Termux (Android), WSL2, Ubuntu, Raspberry Pi
#  Usage:  bash ~/public-site/termux-setup/menu.sh
#          vx              (if installed via setup-termux.sh)
# ═══════════════════════════════════════════════════════════════

SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$SITE_DIR/config/.env"
[ -f "$ENV_FILE" ] && . "$ENV_FILE"

NGROK_DOMAIN="${NGROK_DOMAIN:-}"
WEB_PORT="${WEB_PORT:-8090}"
API_PORT="${API_PORT:-8000}"
LIVE_URL="${NGROK_DOMAIN:+https://$NGROK_DOMAIN}"
LIVE_URL="${LIVE_URL:-http://localhost:$WEB_PORT}"

# ── Colors ─────────────────────────────────────────────────────
P='\033[0;35m'; G='\033[0;32m'; Y='\033[1;33m'
R='\033[0;31m'; C='\033[0;36m'; B='\033[1m'; N='\033[0m'
DIM='\033[2m'

# ── Helpers ────────────────────────────────────────────────────
is_up()   { curl -sf --connect-timeout 2 "http://127.0.0.1:$1" >/dev/null 2>&1; }
ngrok_up(){ ps aux 2>/dev/null | grep -v grep | grep -q '[n]grok'; }

svc_badge() {
  local port="$1"
  if is_up "$port"; then
    printf "${G}● LIVE${N}"
  else
    printf "${R}● DOWN${N}"
  fi
}

draw_header() {
  clear
  echo -e "${P}${B}"
  echo "  ╔══════════════════════════════════════════╗"
  echo "  ║        🔥  Innerflect control panel        ║"
  echo "  ╚══════════════════════════════════════════╝${N}"
  echo ""
  printf "  Web      "; svc_badge "${WEB_PORT}/health"; echo ""
  printf "  API      "; svc_badge "${API_PORT}/api/health"; echo ""
  # PostgreSQL (Termux only)
  if command -v pg_ctl >/dev/null 2>&1; then
    printf "  Postgres "
    pg_ctl -D "${PREFIX:-/usr}/var/lib/postgresql" status >/dev/null 2>&1 \
      && echo -e "${G}● LIVE${N}" || echo -e "${R}● DOWN${N}"
  fi
  printf "  Tunnel   "; ngrok_up && echo -e "${G}● LIVE${N}" || \
    (ps aux 2>/dev/null | grep -v grep | grep -q 'tailscale funnel' \
      && echo -e "${G}● LIVE (Tailscale)${N}" || echo -e "${R}● DOWN${N}")
  echo ""
  echo -e "  ${DIM}URL:${N} ${C}${B}$LIVE_URL${N}"
  echo ""
}

draw_menu() {
  echo -e "  ${B}What do you want to do?${N}"
  echo ""
  echo -e "  ${G}${B}[1]${N} 🚀  Start everything"
  echo -e "  ${R}${B}[2]${N} 🛑  Stop everything"
  echo -e "  ${Y}${B}[3]${N} 🔄  Restart everything"
  echo -e "  ${C}${B}[4]${N} 📋  View API log"
  echo -e "  ${C}${B}[5]${N} 📋  View Caddy log"
  echo -e "  ${C}${B}[6]${N} 📋  View tunnel log"
  echo -e "  ${C}${B}[7]${N} 📋  View watchdog log"
  echo -e "  ${C}${B}[8]${N} 🌐  Open site URL"
  echo -e "  ${C}${B}[9]${N} 📡  Tunnel status"
  echo -e "  ${P}${B}[s]${N} ⚙️   Run setup"
  echo -e "  ${DIM}[0]  Exit${N}"
  echo ""
  printf "  ${B}→ ${N}"
}

do_start() {
  echo ""; echo -e "${G}Starting Innerflect...${N}"
  bash "$SITE_DIR/start.sh"
  echo ""; read -r -p "  Press Enter to continue..." _
}

do_stop() {
  echo ""; echo -e "${R}Stopping Innerflect...${N}"
  bash "$SITE_DIR/stop.sh"
  echo ""; read -r -p "  Press Enter to continue..." _
}

do_restart() {
  echo ""; echo -e "${Y}Restarting Innerflect...${N}"
  bash "$SITE_DIR/stop.sh"
  sleep 2
  bash "$SITE_DIR/start.sh"
  echo ""; read -r -p "  Press Enter to continue..." _
}

do_log() {
  echo -e "${C}Showing $1 (Ctrl+C to stop)...${N}"; echo ""
  tail -f "$SITE_DIR/logs/$1" 2>/dev/null || echo "  No log yet."
}

do_url() {
  echo ""
  echo -e "  🌐 ${G}${B}$LIVE_URL${N}"
  if command -v termux-open-url >/dev/null 2>&1; then
    read -r -p "  Open in browser? [y/N] " c
    [[ "$c" =~ ^[Yy]$ ]] && termux-open-url "$LIVE_URL"
  fi
  echo ""; read -r -p "  Press Enter to continue..." _
}

do_tunnel() {
  echo ""
  echo -e "  ${B}Tunnel:${N} ${C}$NGROK_DOMAIN${N}"
  ngrok_up && echo -e "  Status: ${G}RUNNING${N}" || echo -e "  Status: ${R}DOWN${N}"
  echo ""; tail -5 "$SITE_DIR/logs/tunnel.log" 2>/dev/null | sed 's/^/  /'
  echo ""; read -r -p "  Press Enter to continue..." _
}

# ── Main loop ──────────────────────────────────────────────────
while true; do
  draw_header
  draw_menu
  read -r -n1 choice
  echo ""
  case "$choice" in
    1) do_start ;;
    2) do_stop  ;;
    3) do_restart ;;
    4) do_log "api.log" ;;
    5) do_log "caddy.log" ;;
    6) do_log "tunnel.log" ;;
    7) do_log "watchdog.log" ;;
    8) do_url ;;
    9) do_tunnel ;;
    s|S) bash "$SITE_DIR/termux-setup/setup-termux.sh" ;;
    0|q|Q) echo ""; echo -e "  ${DIM}bye!${N}"; echo ""; break ;;
    *) ;;
  esac
done

SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$SITE_DIR/config/.env"
[ -f "$ENV_FILE" ] && . "$ENV_FILE"

NGROK_DOMAIN="${NGROK_DOMAIN:-}"
WEB_PORT="${WEB_PORT:-8090}"
LIVE_URL="${NGROK_DOMAIN:+https://$NGROK_DOMAIN}"
LIVE_URL="${LIVE_URL:-http://localhost:$WEB_PORT}"

# ── Colors ─────────────────────────────────────────────────────
P='\033[0;35m'; G='\033[0;32m'; Y='\033[1;33m'
R='\033[0;31m'; C='\033[0;36m'; B='\033[1m'; N='\033[0m'
DIM='\033[2m'

# ── Helpers ────────────────────────────────────────────────────
is_up()  { curl -sf --connect-timeout 2 "http://127.0.0.1:$1" > /dev/null 2>&1; }
pid_of() { cat "$SITE_DIR/logs/$1.pid" 2>/dev/null || echo ""; }
running(){ local p; p=$(pid_of "$1"); [ -n "$p" ] && kill -0 "$p" 2>/dev/null; }

svc_badge() {
  local name="$1" port="$2"
  if is_up "$port"; then
    printf "${G}● LIVE${N}  "
  elif running "$name"; then
    printf "${Y}● STARTING${N}  "
  else
    printf "${R}● DOWN${N}  "
  fi
}

draw_header() {
  clear
  echo -e "${P}${B}"
  echo "  ╔══════════════════════════════════════════╗"
  echo "  ║        💬  Innerflect control panel        ║"
  echo "  ╚══════════════════════════════════════════╝${N}"
  echo ""
  # Status row
  printf "  Web    "; svc_badge caddy "$WEB_PORT/health"; echo ""
  printf "  API    "; svc_badge api "${API_PORT:-8000}/api/health"; echo ""
  printf "  Chat   "; svc_badge chat "${CHAT_PORT:-8001}/chat/api/health"; echo ""
  printf "  Tunnel "; running tunnel && echo -e "${G}● LIVE${N}" || echo -e "${R}● DOWN${N}"
  echo ""
  echo -e "  ${DIM}URL: ${N}${C}${B}$LIVE_URL${N}"
  echo -e "  ${DIM}Chat:${N}${C}${B}$LIVE_URL/chat/${N}"
  echo ""
}

draw_menu() {
  echo -e "  ${B}What do you want to do?${N}"
  echo ""
  echo -e "  ${G}${B}[1]${N} 🚀  Start everything"
  echo -e "  ${R}${B}[2]${N} 🛑  Stop everything"
  echo -e "  ${Y}${B}[3]${N} 🔄  Restart everything"
  echo -e "  ${C}${B}[4]${N} 📊  Status check"
  echo -e "  ${C}${B}[5]${N} 📋  View live logs"
  echo -e "  ${C}${B}[6]${N} 💬  View chat logs"
  echo -e "  ${C}${B}[7]${N} 🌐  Open site URL"
  echo -e "  ${C}${B}[8]${N} 📡  Show tunnel URL"
  echo -e "  ${P}${B}[9]${N} ⚙️   Run setup (first time)"
  echo -e "  ${DIM}[0]  Exit${N}"
  echo ""
  printf "  ${B}→ ${N}"
}

do_start() {
  echo ""
  echo -e "${G}Starting Innerflect...${N}"
  bash "$SITE_DIR/start.sh"
  echo ""
  read -r -p "  Press Enter to continue..." _
}

do_stop() {
  echo ""
  echo -e "${R}Stopping Innerflect...${N}"
  bash "$SITE_DIR/stop.sh"
  echo ""
  read -r -p "  Press Enter to continue..." _
}

do_restart() {
  echo ""
  echo -e "${Y}Restarting Innerflect...${N}"
  bash "$SITE_DIR/stop.sh"
  sleep 2
  bash "$SITE_DIR/start.sh"
  echo ""
  read -r -p "  Press Enter to continue..." _
}

do_status() {
  echo ""
  bash "$SITE_DIR/start.sh" --status
  echo ""
  read -r -p "  Press Enter to continue..." _
}

do_logs() {
  local log="$1"
  echo -e "${C}Showing last 40 lines of $log (Ctrl+C to exit)...${N}"
  echo ""
  tail -f "$SITE_DIR/logs/$log" 2>/dev/null || echo "  No log yet."
}

do_url() {
  echo ""
  echo -e "  ${B}Your permanent URL:${N}"
  echo ""
  echo -e "  🌐 Main:  ${G}${B}$LIVE_URL${N}"
  echo -e "  💬 Chat:  ${G}${B}$LIVE_URL/chat/${N}"
  echo ""
  # On Termux, try to open in browser
  if command -v termux-open-url > /dev/null 2>&1; then
    read -r -p "  Open in browser? [y/N] " choice
    [[ "$choice" =~ ^[Yy]$ ]] && termux-open-url "$LIVE_URL"
  fi
  echo ""
  read -r -p "  Press Enter to continue..." _
}

do_tunnel_info() {
  echo ""
  echo -e "  ${B}Tunnel info:${N}"
  echo -e "  Domain:  ${C}$NGROK_DOMAIN${N}"
  TPID=$(pid_of tunnel)
  [ -n "$TPID" ] && echo -e "  PID:     ${G}$TPID${N}" || echo -e "  PID:     ${R}not running${N}"
  echo ""
  echo -e "  ${DIM}Last tunnel log lines:${N}"
  tail -5 "$SITE_DIR/logs/tunnel.log" 2>/dev/null | sed 's/^/  /'
  echo ""
  read -r -p "  Press Enter to continue..." _
}

# ── Main loop ──────────────────────────────────────────────────
while true; do
  draw_header
  draw_menu
  read -r -n1 choice
  echo ""
  case "$choice" in
    1) do_start    ;;
    2) do_stop     ;;
    3) do_restart  ;;
    4) do_status   ;;
    5) do_logs "caddy.log" ;;
    6) do_logs "chat.log"  ;;
    7) do_url      ;;
    8) do_tunnel_info ;;
    9) bash "$SITE_DIR/termux-setup/setup-termux.sh" ;;
    0|q|Q) echo ""; echo -e "  ${DIM}bye!${N}"; echo ""; break ;;
    *) ;;
  esac
done
