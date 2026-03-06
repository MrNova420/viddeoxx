#!/usr/bin/env bash
# Quick admin opener — run from anywhere
# Usage: bash ~/public-site/start-admin.sh
SITE="$(cd "$(dirname "$0")" && pwd)"
source "$SITE/config/.env" 2>/dev/null || true
TOKEN="${INNERFLECT_ADMIN_TOKEN:-}"
PORT="${API_PORT:-8000}"

echo ""
echo "  ⚡ Innerflect admin"
echo "  ─────────────────"

# Check API is up
if curl -sf "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
  echo "  ✅  API is running"
else
  echo "  ❌  API is NOT running — start with: bash $SITE/start.sh"
  echo ""
  read -p "  Start everything now? [y/N] " yn
  if [[ "$yn" =~ ^[Yy] ]]; then
    bash "$SITE/start.sh"
    sleep 4
  else
    exit 1
  fi
fi

echo ""
echo "  🌐  Web dashboard:  http://localhost:8090/admin/"
echo "  🔑  Admin token:    <hidden>"
echo ""
echo "  📋  To copy your token, run:"
echo "      grep INNERFLECT_ADMIN_TOKEN $SITE/config/.env"
echo "  💾  Token is saved in: $SITE/config/.env"
echo ""

# Try to open browser (WSL or Linux desktop)
URL="http://localhost:8090/admin/"
if command -v xdg-open &>/dev/null 2>&1; then
  xdg-open "$URL" 2>/dev/null &
elif command -v wslview &>/dev/null 2>&1; then
  wslview "$URL" 2>/dev/null &
elif command -v termux-open-url &>/dev/null 2>&1; then
  termux-open-url "$URL" 2>/dev/null &
fi

echo "  Or open terminal admin CLI:"
echo "  bash $SITE/admin-cli.sh"
echo ""
