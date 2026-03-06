#!/data/data/com.termux/files/usr/bin/bash
# =============================================================================
#  Termux:Boot auto-start script for Innerflect
#
#  Setup (one-time):
#    1. Install Termux:Boot from F-Droid
#    2. Open Termux:Boot once to register it
#    3. mkdir -p ~/.termux/boot
#    4. cp ~/public-site/android/termux-boot.sh ~/.termux/boot/innerflect.sh
#    5. chmod +x ~/.termux/boot/innerflect.sh
#  The script runs automatically on every Android boot.
# =============================================================================

# Wait for Android boot to settle + network to come up
sleep 30

SITE_DIR="$HOME/public-site"
LOG="$SITE_DIR/logs/boot.log"
mkdir -p "$SITE_DIR/logs"

echo "[$(date)] Termux boot — starting Innerflect" >> "$LOG"

# Acquire a wake lock so Android doesn't kill Termux in background
termux-wake-lock 2>/dev/null || true

# Start the site
bash "$SITE_DIR/start.sh" >> "$LOG" 2>&1

echo "[$(date)] Innerflect started" >> "$LOG"
