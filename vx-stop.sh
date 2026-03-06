#!/usr/bin/env bash
# ╔══════════════════════════════════════════╗
# ║  Innerflect — STOP all services            ║
# ║  Usage: bash vx-stop.sh                  ║
# ╚══════════════════════════════════════════╝
cd "$(dirname "${BASH_SOURCE[0]}")"
exec bash stop.sh "$@"
