#!/bin/bash
# Stop admin dashboard access (disables admin routes in Caddy)

SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🛑 Stopping admin dashboard access..."

# 1. Kill any admin-cli.sh processes
ADMIN_CLI_PIDS=$(pgrep -f "admin-cli.sh" 2>/dev/null)
if [ -n "$ADMIN_CLI_PIDS" ]; then
  echo "$ADMIN_CLI_PIDS" | xargs kill 2>/dev/null
  echo "  ✓ Killed admin-cli.sh processes"
fi

# 2. Temporarily block admin access via Caddyfile
if [ -f "$SITE_DIR/Caddyfile" ] && ! grep -q "# ADMIN DISABLED" "$SITE_DIR/Caddyfile"; then
  # Create backup
  cp "$SITE_DIR/Caddyfile" "$SITE_DIR/Caddyfile.bak"
  
  # Comment out admin route
  sed -i '/handle \/admin {/,/^[[:space:]]*}/ s/^/# ADMIN DISABLED # /' "$SITE_DIR/Caddyfile"
  
  # Reload Caddy
  if [ -f "$SITE_DIR/logs/caddy.pid" ]; then
    CADDY_PID=$(cat "$SITE_DIR/logs/caddy.pid")
    if ps -p "$CADDY_PID" > /dev/null 2>&1; then
      kill -HUP "$CADDY_PID" 2>/dev/null
      echo "  ✓ Disabled admin routes in Caddy"
    fi
  fi
fi

echo ""
echo "✅ Admin dashboard access DISABLED"
echo "   Admin routes are now blocked at /admin"
echo ""
echo "To re-enable:"
echo "  1. Restore: cp $SITE_DIR/Caddyfile.bak $SITE_DIR/Caddyfile"
echo "  2. Reload:  kill -HUP \$(cat $SITE_DIR/logs/caddy.pid)"
