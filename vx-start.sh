#!/usr/bin/env bash
# ╔══════════════════════════════════════════╗
# ║  Innerflect — START                        ║
# ║  Works on: WSL2, Ubuntu, Termux, RPi     ║
# ║  Usage: bash vx-start.sh                 ║
# ╚══════════════════════════════════════════╝
cd "$(dirname "${BASH_SOURCE[0]}")"
exec bash start.sh "$@"
