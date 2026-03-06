#!/data/data/com.termux/files/usr/bin/bash
# ═══════════════════════════════════════════════════════════════════════
#  Innerflect — Android/Termux Setup
#  Run once:  bash ~/public-site/termux-setup/setup-termux.sh
# ═══════════════════════════════════════════════════════════════════════
P='\033[0;35m'; G='\033[0;32m'; Y='\033[1;33m'
R='\033[0;31m'; C='\033[0;36m'; B='\033[1m'; N='\033[0m'; DIM='\033[2m'

clear
echo -e "${P}${B}"
cat << 'BANNER'
  ╔═══════════════════════════════════════════════════╗
  ║         Innerflect — Self-Host Setup                ║
  ║         Turn this Android into a free server      ║
  ╚═══════════════════════════════════════════════════╝
BANNER
echo -e "${N}"

step()  { echo -e "\n${C}${B}▶ $*${N}"; }
ok()    { echo -e "${G}  ✓ $*${N}"; }
warn()  { echo -e "${Y}  ! $*${N}"; }
info()  { echo -e "  ${DIM}$*${N}"; }

SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$SITE_DIR/config/.env"
mkdir -p "$SITE_DIR/config" "$SITE_DIR/logs"
[ -f "$ENV_FILE" ] && . "$ENV_FILE"

# ════════════════════════════════════════════════════
#  STEP 1 — Choose hosting mode
# ════════════════════════════════════════════════════
echo -e "  ${P}${B}How do you want to host Innerflect?${N}\n"
echo -e "  ${B}1)${N} Netlify frontend  +  Android backend via ${G}Tailscale${N}  ${DIM}← recommended${N}"
echo -e "     ${DIM}Free permanent URL, no popup, Netlify serves the site,${N}"
echo -e "     ${DIM}Android serves the API + database${N}\n"
echo -e "  ${B}2)${N} Netlify frontend  +  Android backend via ${Y}ngrok${N}"
echo -e "     ${DIM}Same idea but using ngrok tunnel instead of Tailscale${N}\n"
echo -e "  ${B}3)${N} Full self-host on Android via ${G}Tailscale${N}"
echo -e "     ${DIM}Everything (frontend + API) served from this device${N}\n"
echo -e "  ${B}4)${N} Full self-host on Android via ${Y}ngrok${N}"
echo -e "     ${DIM}Everything served from this device, ngrok as tunnel${N}\n"

printf "  Choose [1-4, default=1]: "
read -r MODE_CHOICE
MODE_CHOICE="${MODE_CHOICE:-1}"

case "$MODE_CHOICE" in
  2) USE_NETLIFY=1; USE_NGROK=1;     USE_TAILSCALE=0 ;;
  3) USE_NETLIFY=0; USE_NGROK=0;     USE_TAILSCALE=1 ;;
  4) USE_NETLIFY=0; USE_NGROK=1;     USE_TAILSCALE=0 ;;
  *) USE_NETLIFY=1; USE_NGROK=0;     USE_TAILSCALE=1 ;;
esac

echo ""
case "$MODE_CHOICE" in
  2) echo -e "  ${Y}Mode: Netlify + ngrok${N}" ;;
  3) echo -e "  ${G}Mode: Full self-host (Tailscale)${N}" ;;
  4) echo -e "  ${Y}Mode: Full self-host (ngrok)${N}" ;;
  *) echo -e "  ${G}Mode: Netlify + Tailscale (recommended)${N}" ;;
esac

# ════════════════════════════════════════════════════
#  STEP 2 — System packages
# ════════════════════════════════════════════════════
step "Installing packages..."
pkg update -y -q 2>/dev/null
PKGS="python nodejs curl wget cronie termux-tools iproute2 procps postgresql"
pkg install -y -q $PKGS 2>/dev/null \
  && ok "Packages ready" || warn "Some packages failed — re-run if issues"

# ════════════════════════════════════════════════════
#  STEP 3 — Python dependencies
# ════════════════════════════════════════════════════
step "Installing Python dependencies..."
pip3 install -q fastapi uvicorn slowapi asyncpg psutil aiofiles python-multipart 2>/dev/null \
  && ok "Python deps ready" \
  || warn "pip failed — try: pip3 install fastapi uvicorn slowapi asyncpg psutil aiofiles python-multipart"

# ════════════════════════════════════════════════════
#  STEP 4 — Caddy binary
# ════════════════════════════════════════════════════
if [ ! -x "$SITE_DIR/caddy" ]; then
  step "Downloading Caddy..."
  case $(uname -m) in
    aarch64|arm64) CA="arm64" ;; armv7*) CA="armv7" ;;
    x86_64) CA="amd64" ;; *) CA="arm64" ;;
  esac
  curl -fsSL "https://caddyserver.com/api/download?os=android&arch=${CA}&idempotency=$(date +%s)" \
    -o "$SITE_DIR/caddy" 2>/dev/null \
    && chmod +x "$SITE_DIR/caddy" && ok "Caddy ready ($CA)" \
    || warn "Caddy download failed — get it from caddyserver.com/download"
else
  ok "Caddy already present"
fi

# ════════════════════════════════════════════════════
#  STEP 5 — PostgreSQL
# ════════════════════════════════════════════════════
step "Setting up PostgreSQL..."
PG_DATA="${PREFIX:-/data/data/com.termux/files/usr}/var/lib/postgresql"

if [ ! -d "$PG_DATA" ]; then
  initdb "$PG_DATA" 2>/dev/null && ok "PostgreSQL data directory created" || warn "initdb failed"
fi

if ! pg_ctl -D "$PG_DATA" status >/dev/null 2>&1; then
  pg_ctl -D "$PG_DATA" -l "$SITE_DIR/logs/postgres.log" start 2>/dev/null && sleep 2
fi

if pg_ctl -D "$PG_DATA" status >/dev/null 2>&1; then
  # Create viddeoxx user + database (safe to re-run)
  psql -c "CREATE USER viddeoxx WITH PASSWORD 'viddeoxx_dev';" 2>/dev/null || true
  createdb -O viddeoxx viddeoxx 2>/dev/null || true
  ok "PostgreSQL running — database 'viddeoxx' ready"
  DB_URL="postgresql://viddeoxx:viddeoxx_dev@localhost:5432/viddeoxx"
  grep -q "^DATABASE_URL" "$ENV_FILE" 2>/dev/null \
    && sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$DB_URL|" "$ENV_FILE" \
    || echo "DATABASE_URL=$DB_URL" >> "$ENV_FILE"
  # Run schema if tables don't exist yet
  psql "$DB_URL" -f "$SITE_DIR/api/schema.sql" 2>/dev/null && ok "Schema applied" || true
else
  warn "PostgreSQL didn't start — check $SITE_DIR/logs/postgres.log"
fi

# ════════════════════════════════════════════════════
#  STEP 6 — Tunnel setup
# ════════════════════════════════════════════════════

# ── Tailscale ─────────────────────────────────────
if [ "$USE_TAILSCALE" = "1" ]; then
  echo ""
  echo -e "  ${P}${B}━━━  Tailscale Funnel setup  ━━━${N}"
  echo -e "  ${DIM}Free permanent HTTPS URL, no popup, works through any network${N}"
  echo ""
  echo -e "  ${Y}1)${N} Install Tailscale: Play Store or F-Droid → search ${C}Tailscale${N}"
  echo -e "  ${Y}2)${N} Sign up free at ${C}https://tailscale.com${N} and sign in through app"
  echo -e "  ${Y}3)${N} Enable Funnel at ${C}https://login.tailscale.com/admin/acls${N}"
  echo -e "     Add: ${C}\"funnel\": [\"*\"]${N}"
  echo -e "  ${Y}4)${N} In Termux run: ${C}tailscale funnel --bg 8090${N}"
  echo -e "  ${Y}5)${N} Check your URL: ${C}tailscale funnel status${N}"
  echo ""
  printf "  Enter your Tailscale URL (e.g. https://pixel6.tail1234.ts.net) or Enter to skip: "
  read -r TS_URL
  if [ -n "$TS_URL" ]; then
    TS_URL="${TS_URL%/}"
    grep -q "^TAILSCALE_URL" "$ENV_FILE" 2>/dev/null \
      && sed -i "s|^TAILSCALE_URL=.*|TAILSCALE_URL=$TS_URL|" "$ENV_FILE" \
      || echo "TAILSCALE_URL=$TS_URL" >> "$ENV_FILE"
    grep -q "^BACKEND_URL" "$ENV_FILE" 2>/dev/null \
      && sed -i "s|^BACKEND_URL=.*|BACKEND_URL=$TS_URL|" "$ENV_FILE" \
      || echo "BACKEND_URL=$TS_URL" >> "$ENV_FILE"
    ok "Tailscale URL saved: $TS_URL"
    bash "$SITE_DIR/termux-setup/update-api-base.sh" "$TS_URL"
  else
    warn "Skipped — run 'bash $SITE_DIR/termux-setup/update-api-base.sh YOUR_TS_URL' when ready"
  fi
fi

# ── ngrok ─────────────────────────────────────────
if [ "$USE_NGROK" = "1" ]; then
  echo ""
  echo -e "  ${Y}${B}━━━  ngrok setup  ━━━${N}"

  # Install binary
  NGROK_BIN="$HOME/.local/bin/ngrok"
  mkdir -p "$HOME/.local/bin"
  if ! command -v ngrok >/dev/null 2>&1 && [ ! -x "$NGROK_BIN" ]; then
    step "Downloading ngrok..."
    case $(uname -m) in
      aarch64|arm64) NA="arm64" ;; armv7*) NA="arm" ;;
      x86_64) NA="amd64" ;; *) NA="arm64" ;;
    esac
    curl -fsSL "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-${NA}.tgz" \
      | tar -xz -C "$HOME/.local/bin" 2>/dev/null \
      && chmod +x "$NGROK_BIN" && ok "ngrok installed ($NA)" \
      || warn "ngrok download failed — get from https://ngrok.com/download"
  else
    ok "ngrok already installed"
  fi
  export PATH="$HOME/.local/bin:$PATH"
  grep -q 'local/bin' "$HOME/.bashrc" 2>/dev/null \
    || echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"

  # Auth token
  NGROK_CFG="$HOME/.config/ngrok/ngrok.yml"
  if grep -q "authtoken:" "$NGROK_CFG" 2>/dev/null; then
    ok "ngrok already authenticated"
  else
    echo ""
    info "Get your token at: https://dashboard.ngrok.com/get-started/your-authtoken"
    printf "  Enter ngrok authtoken (or Enter to skip): "
    read -r NGROK_TOKEN
    if [ -n "$NGROK_TOKEN" ]; then
      ngrok config add-authtoken "$NGROK_TOKEN" 2>/dev/null \
        && ok "ngrok authenticated" || warn "Failed — run: ngrok config add-authtoken TOKEN"
    else
      warn "Skipped ngrok token"
    fi
  fi

  # Permanent domain
  [ -f "$ENV_FILE" ] && . "$ENV_FILE"
  if [ -z "${NGROK_DOMAIN:-}" ]; then
    echo ""
    info "Find your free permanent domain at: https://dashboard.ngrok.com/cloud-edge/domains"
    printf "  Enter your ngrok domain (e.g. abc.ngrok-free.dev) or Enter to skip: "
    read -r NGROK_D
    if [ -n "$NGROK_D" ]; then
      grep -q "^NGROK_DOMAIN" "$ENV_FILE" 2>/dev/null \
        && sed -i "s|^NGROK_DOMAIN=.*|NGROK_DOMAIN=$NGROK_D|" "$ENV_FILE" \
        || echo "NGROK_DOMAIN=$NGROK_D" >> "$ENV_FILE"
      grep -q "^BACKEND_URL" "$ENV_FILE" 2>/dev/null \
        && sed -i "s|^BACKEND_URL=.*|BACKEND_URL=https://$NGROK_D|" "$ENV_FILE" \
        || echo "BACKEND_URL=https://$NGROK_D" >> "$ENV_FILE"
      ok "ngrok domain saved: $NGROK_D"
      bash "$SITE_DIR/termux-setup/update-api-base.sh" "https://$NGROK_D"
    else
      warn "Skipped — add NGROK_DOMAIN to config/.env later"
    fi
  else
    ok "ngrok domain already set: $NGROK_DOMAIN"
  fi
fi

# ════════════════════════════════════════════════════
#  STEP 7 — Netlify info (if relevant)
# ════════════════════════════════════════════════════
if [ "$USE_NETLIFY" = "1" ]; then
  echo ""
  echo -e "  ${P}${B}━━━  Netlify frontend deployment  ━━━${N}"
  echo ""
  echo -e "  Your frontend (${C}www/${N}) is served by Netlify for free."
  echo -e "  The API stays on this Android device."
  echo ""
  echo -e "  ${Y}To deploy to Netlify:${N}"
  echo -e "  1) Go to ${C}https://app.netlify.com${N}"
  echo -e "  2) Add new site → Import from Git → ${C}github.com/MrNova420/innerflect${N}"
  echo -e "  3) Build settings: publish directory = ${C}www${N}, no build command"
  echo -e "  4) Deploy — your site is live at ${C}https://innerflect.netlify.app${N} (or your domain)"
  echo ""
  echo -e "  ${DIM}Every time you 'git push', Netlify auto-redeploys${N}"
  echo -e "  ${DIM}If you change your backend URL: run update-api-base.sh then git push${N}"
fi

# ════════════════════════════════════════════════════
#  STEP 8 — Watchdog cron
# ════════════════════════════════════════════════════
step "Setting up watchdog (auto-restart crashed services)..."
CRON_CMD="* * * * * bash $SITE_DIR/watchdog.sh"
( crontab -l 2>/dev/null | grep -v "public-site/watchdog"; echo "$CRON_CMD" ) \
  | crontab - && ok "Watchdog cron active (every minute)" || warn "crontab failed"
pgrep crond >/dev/null 2>&1 || crond -b 2>/dev/null || true

# ════════════════════════════════════════════════════
#  STEP 9 — Termux:Boot autostart
# ════════════════════════════════════════════════════
step "Installing boot autostart..."
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/innerflect.sh << BOOT
#!/data/data/com.termux/files/usr/bin/bash
sleep 15
bash $SITE_DIR/start.sh >> $SITE_DIR/logs/boot.log 2>&1
BOOT
chmod +x ~/.termux/boot/innerflect.sh
ok "Boot hook installed"
info "Install 'Termux:Boot' from F-Droid (NOT Play Store) and open it once"

# ════════════════════════════════════════════════════
#  STEP 10 — 'vx' shortcut
# ════════════════════════════════════════════════════
mkdir -p "$HOME/.local/bin"
printf '#!/usr/bin/env bash\nbash %s/termux-setup/menu.sh "$@"\n' "$SITE_DIR" \
  > "$HOME/.local/bin/vx"
chmod +x "$HOME/.local/bin/vx"
grep -q 'local/bin' "$HOME/.bashrc" 2>/dev/null \
  || echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
ok "'vx' shortcut ready — type 'vx' to open the control panel"

# ════════════════════════════════════════════════════
#  Done
# ════════════════════════════════════════════════════
echo ""
echo -e "${P}${B}══════════════════════════════════════════${N}"
echo -e "${G}${B}  ✅  Setup complete!${N}"
echo -e "${P}${B}══════════════════════════════════════════${N}"
echo ""

[ -f "$ENV_FILE" ] && . "$ENV_FILE"
LIVE_URL="${TAILSCALE_URL:-${NGROK_DOMAIN:+https://$NGROK_DOMAIN}}"
[ -n "$LIVE_URL" ] && echo -e "  ${C}${B}Backend URL: $LIVE_URL${N}" || \
  echo -e "  ${Y}Backend URL not set yet — run update-api-base.sh when tunnel is ready${N}"
echo ""
echo -e "  ${C}vx${N}         → control panel"
echo -e "  ${C}vx start${N}   → start all services"
echo -e "  ${C}vx stop${N}    → stop all services"
echo ""
echo -e "  ${Y}Tips for 24/7 uptime:${N}"
echo -e "  • Install ${B}Termux:Boot${N} from F-Droid & open it once"
echo -e "  • Disable battery optimisation for Termux in Android Settings"
echo -e "  • Keep device plugged in or on wireless charge"
echo ""
read -r -p "  Start Innerflect now? [y/N] " START
[[ "$START" =~ ^[Yy]$ ]] && bash "$SITE_DIR/start.sh"
