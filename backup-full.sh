#!/bin/bash
# Full backup of Innerflect project with secrets and databases
# Can be used to restore entire site on new machine

TIMESTAMP=$(date +%Y%m%d-%H%M)
BACKUP_NAME="innerflect-FULL-BACKUP-${TIMESTAMP}.tar.gz"
BACKUP_DIR=~/Downloads
PROJECT_DIR=~/public-site

echo "═══════════════════════════════════════════════════════════"
echo "  VIDDEOXX FULL BACKUP"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Creating comprehensive backup..."
echo "  - All project files"
echo "  - Secrets & credentials"
echo "  - Databases (SQLite)"
echo "  - Configuration files"
echo "  - Scripts & automation"
echo ""

cd ~

# Create backup (exclude node_modules, venv, logs, __pycache__)
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}" \
  --exclude='public-site/venv' \
  --exclude='public-site/node_modules' \
  --exclude='public-site/logs/*.log' \
  --exclude='public-site/__pycache__' \
  --exclude='public-site/.git' \
  --exclude='public-site/caddy' \
  --exclude='public-site/ngrok' \
  public-site/ 2>/dev/null

if [ $? -eq 0 ]; then
  SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}" | cut -f1)
  echo "✅ Backup created successfully!"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  File: ${BACKUP_NAME}"
  echo "  Size: ${SIZE}"
  echo "  Location: ${BACKUP_DIR}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "BACKUP INCLUDES:"
  echo "  ✅ All source code"
  echo "  ✅ Secrets (.env file with admin token, Redis creds)"
  echo "  ✅ Databases (site.db, chat.db)"
  echo "  ✅ Caddyfile configuration"
  echo "  ✅ All scripts (start, stop, watchdog, etc.)"
  echo "  ✅ Admin dashboard & CLI"
  echo "  ✅ Frontend assets (HTML, CSS, JS)"
  echo ""
  echo "TO RESTORE ON NEW MACHINE:"
  echo "  1. Copy ${BACKUP_NAME} to new machine"
  echo "  2. Extract: tar -xzf ${BACKUP_NAME}"
  echo "  3. Run: bash ~/public-site/setup.sh"
  echo "  4. Start: bash ~/public-site/start.sh"
  echo ""
  echo "EXCLUDED (can be regenerated):"
  echo "  ❌ venv/ (recreate with: python3 -m venv venv)"
  echo "  ❌ node_modules/ (if any)"
  echo "  ❌ .git/ (GitHub is source of truth)"
  echo "  ❌ logs/*.log (old logs not needed)"
  echo ""
else
  echo "❌ Backup failed!"
  exit 1
fi
