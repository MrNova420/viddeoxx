#!/data/data/com.termux/files/usr/bin/bash
sleep 10
termux-wake-lock 2>/dev/null || true
export HOME=/data/data/com.termux/files/home
SITE_DIR="$HOME/public-site"
LOG="$SITE_DIR/logs/autostart.log"
mkdir -p "$SITE_DIR/logs"
echo "[$(date)] Termux boot: starting Innerflect..." >> "$LOG"
bash "$SITE_DIR/start.sh" >> "$LOG" 2>&1
echo "[$(date)] done" >> "$LOG"
