#!/data/data/com.termux/files/usr/bin/bash
# Run this ONCE on your Android device in Termux:
# bash ~/public-site/termux-setup/install-termux-boot.sh

echo "Installing Termux autostart..."
pkg install -y termux-tools 2>/dev/null || true
mkdir -p ~/.termux/boot
cp ~/public-site/termux-setup/termux-autostart.sh ~/.termux/boot/innerflect.sh
chmod +x ~/.termux/boot/innerflect.sh
echo ""
echo "Done! Now:"
echo "  1. Install 'Termux:Boot' from F-Droid (NOT Play Store)"
echo "  2. Open Termux:Boot once to enable it"
echo "  3. Your site will auto-start every time the phone reboots"
echo ""
echo "  To start manually:  bash ~/public-site/vx-start.sh"
echo "  To stop:            bash ~/public-site/vx-stop.sh"
echo "  Status:             bash ~/public-site/vx-start.sh --status"
