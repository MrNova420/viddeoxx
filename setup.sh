#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════════════════════
#  Innerflect — setup.sh
#  One-command auto setup for any device
#
#  Supports: WSL2/Ubuntu, native Linux, Termux (Android), Raspberry Pi,
#            macOS (Intel + Apple Silicon), any Debian/Ubuntu server
#
#  Usage:
#    bash setup.sh          — full setup (idempotent, safe to re-run)
#    bash setup.sh --update — re-download binaries + reinstall deps only
#    bash setup.sh --cron   — only (re)install cron entries
#    bash setup.sh --ngrok  — only (re)configure ngrok tunnel
# ═════════════════════════════════════════════════════════════════════════════
set -euo pipefail

# ── Self-locate ───────────────────────────────────────────────────────────────
SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Colors ────────────────────────────────────────────────────────────────────
R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m' B='\033[0;34m' C='\033[0;36m'
W='\033[1;37m' NC='\033[0m'
ok()    { echo -e "${G}  ✓${NC} $*"; }
warn()  { echo -e "${Y}  !${NC} $*"; }
err()   { echo -e "${R}  ✗${NC} $*" >&2; }
info()  { echo -e "${B}  →${NC} $*"; }
title() { echo -e "\n${W}▸ $*${NC}"; }
line()  { echo -e "${B}  ────────────────────────────────────────${NC}"; }

banner() {
  echo ""
  echo -e "${C}  ╔══════════════════════════════════════╗${NC}"
  echo -e "${C}  ║   Innerflect — auto setup              ║${NC}"
  echo -e "${C}  ║   portable · self-healing · 24/7     ║${NC}"
  echo -e "${C}  ╚══════════════════════════════════════╝${NC}"
  echo ""
}

# ── Detect environment ────────────────────────────────────────────────────────
detect_env() {
  OS="linux"
  ARCH="$(uname -m)"
  IS_TERMUX=false
  IS_MACOS=false
  IS_WSL=false

  case "$ARCH" in
    x86_64)           ARCH_CADDY="amd64"; ARCH_CF="amd64" ;;
    aarch64|arm64)    ARCH_CADDY="arm64"; ARCH_CF="arm64" ;;
    armv7l|armv6l)    ARCH_CADDY="arm";   ARCH_CF="arm"   ;;
    *)                warn "Unknown arch $ARCH — defaulting to amd64"; ARCH_CADDY="amd64"; ARCH_CF="amd64" ;;
  esac

  if [[ "$(uname -s)" == "Darwin" ]]; then
    OS="darwin"; IS_MACOS=true
    ARCH_CF="${ARCH_CADDY}"
  fi
  if [ -d /data/data/com.termux ] || [ -n "${TERMUX_VERSION:-}" ]; then
    IS_TERMUX=true
  fi
  if grep -qi microsoft /proc/version 2>/dev/null; then
    IS_WSL=true
  fi

  CPU_CORES=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 2)
  RAM_MB=$(free -m 2>/dev/null | awk '/Mem:/{print $2}' || echo 1024)
  WORKERS=$(( CPU_CORES / 2 < 1 ? 1 : CPU_CORES / 2 ))
  [ "$WORKERS" -gt 8 ] && WORKERS=8  # cap — don't over-fork

  ok "OS: $(uname -s) | Arch: $(uname -m) → caddy=$ARCH_CADDY | CPU: $CPU_CORES cores | RAM: ${RAM_MB}MB | Workers: $WORKERS"
  [ "$IS_TERMUX" = "true" ] && ok "Environment: Termux (Android)" || true
  [ "$IS_WSL"    = "true" ] && ok "Environment: WSL2"             || true
  [ "$IS_MACOS"  = "true" ] && ok "Environment: macOS"            || true
}

# ── Install system packages ───────────────────────────────────────────────────
install_system_deps() {
  title "System dependencies"

  if [ "$IS_TERMUX" = "true" ]; then
    info "Termux: installing deps via pkg"
    pkg install -y python curl openssl 2>/dev/null | grep -E "installed|already" || true
    pip install --quiet --upgrade pip 2>/dev/null || true

  elif [ "$IS_MACOS" = "true" ]; then
    if ! command -v brew &>/dev/null; then
      warn "Homebrew not found — skipping system packages (install brew manually if needed)"
    else
      brew install python3 curl 2>/dev/null || true
    fi

  else
    # Debian/Ubuntu/Raspbian
    if command -v apt-get &>/dev/null; then
      info "apt: updating & installing curl, python3, pip"
      sudo apt-get update -qq 2>/dev/null || true
      sudo apt-get install -y -qq curl python3 python3-pip python3-venv 2>/dev/null || true
    fi
  fi

  ok "System deps ready"
}

# ── Python deps ───────────────────────────────────────────────────────────────
install_python_deps() {
  title "Python dependencies"
  PYTHON=$(command -v python3 || command -v python || { err "Python not found"; exit 1; })
  PIP=$(command -v pip3 || command -v pip || { err "pip not found"; exit 1; })

  info "Using $PYTHON"
  $PIP install --quiet -r "$SITE_DIR/api/requirements.txt" 2>&1 | grep -v "already satisfied" | grep -v "^$" || true
  ok "Python deps installed"
}

# ── Download Caddy ────────────────────────────────────────────────────────────
download_caddy() {
  title "Caddy web server"
  CADDY_BIN="$SITE_DIR/caddy"

  if [ -f "$CADDY_BIN" ] && [ "${1:-}" != "--update" ]; then
    VER=$("$CADDY_BIN" version 2>/dev/null | head -1 || echo "unknown")
    ok "Caddy already present ($VER) — skipping download"
    return
  fi

  if [ "$IS_MACOS" = "true" ]; then
    CF_OS="darwin"
  else
    CF_OS="linux"
  fi

  CADDY_URL="https://caddyserver.com/api/download?os=${CF_OS}&arch=${ARCH_CADDY}"
  info "Downloading Caddy for ${CF_OS}/${ARCH_CADDY}..."
  curl -fsSL "$CADDY_URL" -o "$CADDY_BIN" 2>/dev/null \
    || { err "Caddy download failed — check internet connection"; exit 1; }
  chmod +x "$CADDY_BIN"
  VER=$("$CADDY_BIN" version 2>/dev/null | head -1)
  ok "Caddy $VER installed"
}

# ── Setup ngrok ───────────────────────────────────────────────────────────────
setup_ngrok() {
  title "ngrok — free permanent tunnel"
  line

  # Check if ngrok already installed
  NGROK_BIN="$(command -v ngrok 2>/dev/null || echo "")"
  if [ -z "$NGROK_BIN" ]; then
    info "ngrok not found — installing..."
    NGROK_ARCH="amd64"
    case "$(uname -m)" in
      aarch64|arm64) NGROK_ARCH="arm64" ;;
      armv7l|armv6l) NGROK_ARCH="arm"   ;;
    esac

    if [ "$IS_TERMUX" = "true" ]; then
      pkg install -y ngrok 2>/dev/null \
        || { warn "Termux pkg install failed — trying manual download..."; _ngrok_manual_install "$NGROK_ARCH"; }
    elif [ "$IS_MACOS" = "true" ]; then
      command -v brew &>/dev/null && brew install ngrok/ngrok/ngrok \
        || { warn "Homebrew not found — trying manual download..."; _ngrok_manual_install "$NGROK_ARCH"; }
    else
      # Try snap first (Ubuntu/WSL2), then manual
      if command -v snap &>/dev/null; then
        snap install ngrok 2>/dev/null && ok "ngrok installed via snap" \
          || _ngrok_manual_install "$NGROK_ARCH"
      else
        _ngrok_manual_install "$NGROK_ARCH"
      fi
    fi
    NGROK_BIN="$(command -v ngrok 2>/dev/null || echo "")"
  fi

  if [ -n "$NGROK_BIN" ]; then
    ok "ngrok ready: $NGROK_BIN ($(ngrok version 2>/dev/null | head -1))"
  else
    warn "ngrok install failed — you can install manually: https://ngrok.com/download"
    warn "Then re-run: bash setup.sh --ngrok"
    return
  fi

  # Check if already configured
  . "$SITE_DIR/config/.env" 2>/dev/null || true
  if [ -n "${NGROK_DOMAIN:-}" ] && [ -f "$HOME/.config/ngrok/ngrok.yml" ]; then
    ok "ngrok already configured → https://$NGROK_DOMAIN"
    return
  fi

  # Guide user through auth setup
  echo ""
  echo -e "  ${W}ngrok setup — 3 quick steps:${NC}"
  echo ""
  echo -e "  ${B}Step 1${NC} — Create a FREE ngrok account (if you don't have one):"
  echo -e "          ${C}https://dashboard.ngrok.com/signup${NC}"
  echo ""
  echo -e "  ${B}Step 2${NC} — Get your authtoken:"
  echo -e "          ${C}https://dashboard.ngrok.com/get-started/your-authtoken${NC}"
  echo ""
  echo -e "  ${B}Step 3${NC} — Paste your authtoken below (or press Enter to skip):"
  echo -e "  ${Y}(You can also run: ngrok config add-authtoken YOUR_TOKEN)${NC}"
  echo ""
  printf "  Authtoken: "; read -r NGROK_TOKEN

  if [ -n "$NGROK_TOKEN" ]; then
    ngrok config add-authtoken "$NGROK_TOKEN" 2>/dev/null \
      && ok "authtoken saved" \
      || warn "Failed to save authtoken — run: ngrok config add-authtoken $NGROK_TOKEN"
  else
    warn "Skipped — set authtoken later: ngrok config add-authtoken YOUR_TOKEN"
    return
  fi

  # Ask if they have a free static domain
  echo ""
  echo -e "  ${W}Do you have a free ngrok static domain?${NC}"
  echo -e "  ${B}(Get one free at: https://dashboard.ngrok.com/domains)${NC}"
  echo ""
  printf "  Your static domain (e.g. mysite.ngrok-free.app) or press Enter to use random URL: "
  read -r NGROK_STATIC

  if [ -n "$NGROK_STATIC" ]; then
    _write_ngrok_config "$NGROK_STATIC"
    ok "Static domain configured → https://$NGROK_STATIC"
  else
    _write_ngrok_config ""
    warn "Using random URL — it changes on restart. Get a free static domain to avoid this."
  fi
}

_ngrok_manual_install() {
  local arch="$1"
  local url="https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-${arch}.tgz"
  info "Downloading ngrok binary..."
  curl -fsSL "$url" -o /tmp/ngrok.tgz 2>/dev/null \
    && tar -xzf /tmp/ngrok.tgz -C "$HOME" \
    && chmod +x "$HOME/ngrok" \
    && rm /tmp/ngrok.tgz \
    && ok "ngrok installed at $HOME/ngrok" \
    || warn "Manual download failed — install manually: https://ngrok.com/download"
}

_write_ngrok_config() {
  local domain="$1"
  mkdir -p "$HOME/.config/ngrok"
  local yml="$HOME/.config/ngrok/ngrok.yml"

  # Get existing authtoken if present
  local token=""
  token=$(grep "authtoken:" "$yml" 2>/dev/null | awk '{print $2}' || true)

  if [ -n "$domain" ]; then
    cat > "$yml" << YMLEOF
version: "3"
agent:
  authtoken: ${token}

tunnels:
  innerflect:
    proto: http
    addr: ${WEB_PORT:-8090}
    domain: ${domain}
    request_header:
      add:
        - "ngrok-skip-browser-warning: true"
    response_header:
      add:
        - "ngrok-skip-browser-warning: true"
YMLEOF
    # Update .env
    _env_set "NGROK_DOMAIN" "$domain"
    _env_set "DOMAIN" "$domain"
  else
    cat > "$yml" << YMLEOF
version: "3"
agent:
  authtoken: ${token}
YMLEOF
    # Random URL mode — clear domain from .env
    _env_set "NGROK_DOMAIN" ""
    warn "start.sh will use: ngrok http ${WEB_PORT:-8090} for a random URL each restart"
  fi
}

_env_set() {
  local key="$1" val="$2"
  local env_file="$SITE_DIR/config/.env"
  if grep -q "^${key}=" "$env_file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$env_file"
  else
    echo "${key}=${val}" >> "$env_file"
  fi
}

# ── Generate / update config/.env ─────────────────────────────────────────────
write_env() {
  title "Configuration"
  ENV_FILE="$SITE_DIR/config/.env"

  if [ -f "$ENV_FILE" ]; then
    # Update SITE_DIR and WORKERS in place (safe for existing installs)
    sed -i "s|^SITE_DIR=.*|SITE_DIR=$SITE_DIR|" "$ENV_FILE"
    sed -i "s|^WORKERS=.*|WORKERS=$WORKERS|"     "$ENV_FILE"
    ok "config/.env updated (SITE_DIR=$SITE_DIR, WORKERS=$WORKERS)"
  else
    # Fresh install — copy template
    cp "$SITE_DIR/config/.env.template" "$ENV_FILE"
    sed -i "s|^SITE_DIR=PLACEHOLDER|SITE_DIR=$SITE_DIR|" "$ENV_FILE"
    sed -i "s|^WORKERS=2|WORKERS=$WORKERS|"              "$ENV_FILE"
    ok "config/.env created"
  fi

  # Also update Caddyfile log path if it still has old hardcoded path
  if grep -q "/home/mrnova420" "$SITE_DIR/Caddyfile" 2>/dev/null; then
    sed -i "s|/home/mrnova420/public-site|\${SITE_DIR}|g" "$SITE_DIR/Caddyfile"
    info "Caddyfile: replaced hardcoded path with \${SITE_DIR}"
  fi
}

# ── Install cron entries ──────────────────────────────────────────────────────
setup_cron() {
  title "Cron / auto-start"

  CRON_WATCHDOG="* * * * * bash $SITE_DIR/watchdog.sh >> $SITE_DIR/logs/watchdog.log 2>&1"
  CRON_REBOOT="@reboot sleep 15 && bash $SITE_DIR/start.sh >> $SITE_DIR/logs/autostart.log 2>&1"
  CRON_LOGROT="0 4 * * * tail -5000 $SITE_DIR/logs/api.log > $SITE_DIR/logs/api.log.tmp && mv $SITE_DIR/logs/api.log.tmp $SITE_DIR/logs/api.log 2>/dev/null; tail -5000 $SITE_DIR/logs/caddy.log > $SITE_DIR/logs/caddy.log.tmp && mv $SITE_DIR/logs/caddy.log.tmp $SITE_DIR/logs/caddy.log 2>/dev/null"

  # Read current crontab (handle empty)
  CURRENT_CRON=$(crontab -l 2>/dev/null || true)

  NEW_CRON="$CURRENT_CRON"
  ADDED=0

  for entry in "$CRON_WATCHDOG" "$CRON_REBOOT" "$CRON_LOGROT"; do
    # Use a unique marker from each entry for dedup check
    MARKER=$(echo "$entry" | awk '{print $NF}' | sed 's|.*/||')
    if echo "$CURRENT_CRON" | grep -qF "$SITE_DIR/$(echo "$entry" | grep -o '[a-z]*\.sh' | head -1)"; then
      true  # already present
    else
      NEW_CRON="${NEW_CRON}"$'\n'"${entry}"
      ADDED=$((ADDED+1))
    fi
  done

  if [ "$ADDED" -gt 0 ]; then
    echo "$NEW_CRON" | crontab -
    ok "Added $ADDED cron entries (watchdog every 1min + @reboot + log rotation)"
  else
    ok "Cron entries already present — no changes"
  fi

  # Termux: ensure cron daemon is running
  if [ "$IS_TERMUX" = "true" ]; then
    if ! pgrep crond &>/dev/null; then
      crond 2>/dev/null && ok "crond started" || warn "crond not found — install 'cronie' via pkg"
    fi
  fi
}

# ── Dirs + permissions ────────────────────────────────────────────────────────
setup_dirs() {
  mkdir -p "$SITE_DIR"/{www/assets/{css,js,img},api,config,data,logs,bin}
  chmod +x "$SITE_DIR/start.sh" "$SITE_DIR/stop.sh" "$SITE_DIR/watchdog.sh" 2>/dev/null || true
}

# ── (tunnel_wizard replaced by setup_ngrok above) ─────────────────────────────

# ── Final summary ─────────────────────────────────────────────────────────────
print_summary() {
  . "$SITE_DIR/config/.env"
  echo ""
  echo -e "${G}  ════════════════════════════════════════${NC}"
  echo -e "${G}  ✓ Setup complete!${NC}"
  echo -e "${G}  ════════════════════════════════════════${NC}"
  echo ""
  echo -e "  Start:   ${Y}bash $SITE_DIR/start.sh${NC}"
  echo -e "  Stop:    ${Y}bash $SITE_DIR/stop.sh${NC}"
  echo -e "  Status:  ${Y}bash $SITE_DIR/start.sh --status${NC}"
  echo -e "  Local:   ${C}http://localhost:$WEB_PORT${NC}"
  echo ""
  echo -e "  Config:  ${C}$SITE_DIR/config/.env${NC}"
  echo -e "  Logs:    ${C}$SITE_DIR/logs/${NC}"
  echo ""
  echo -e "  ${B}Auto-restart: every 1 min via cron watchdog${NC}"
  echo -e "  ${B}Auto-start on boot: @reboot cron entry${NC}"
  echo ""
}

# ── Main ──────────────────────────────────────────────────────────────────────
banner
detect_env

MODE="${1:-}"

if [ "$MODE" = "--cron" ]; then
  setup_cron; exit 0
fi

if [ "$MODE" = "--ngrok" ]; then
  detect_env
  . "$SITE_DIR/config/.env" 2>/dev/null || true
  WEB_PORT="${WEB_PORT:-8090}"
  setup_ngrok; exit 0
fi

setup_dirs
write_env
install_system_deps
install_python_deps
download_caddy "$MODE"
setup_ngrok
setup_cron
print_summary
