#!/usr/bin/env bash
# Innerflect admin CLI — full control from terminal
set -euo pipefail

SITE_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SITE_DIR/config/.env" 2>/dev/null || true

TOKEN="${INNERFLECT_ADMIN_TOKEN:-}"
WEB_PORT="${WEB_PORT:-8090}"
API_PORT="${API_PORT:-8000}"
NGROK="${NGROK_DOMAIN:-}"
API="http://localhost:${API_PORT}"
URL="http${NGROK:+s}://${NGROK:-localhost:${WEB_PORT}}"

# ── Colors ────────────────────────────────────────────────────────────────
R=$'\033[0;31m' G=$'\033[0;32m' Y=$'\033[0;33m' B=$'\033[0;34m'
P=$'\033[0;35m' C=$'\033[0;36m' W=$'\033[1;37m' X=$'\033[0m' DIM=$'\033[2m'

# ── Helpers ───────────────────────────────────────────────────────────────
get()  { curl -sf -H "Authorization: Bearer ${TOKEN}" "${API}$1" 2>/dev/null; }
post() { curl -sf -X POST -H "Authorization: Bearer ${TOKEN}" "${API}$1" 2>/dev/null; }
hdr()  { clear; printf "${P}  ⚡ Innerflect admin CLI${X}\n${DIM}  ${URL}/admin  •  token: ${TOKEN:0:12}…${X}\n\n"; }
pause(){ read -rp "${DIM}  [Enter to continue]${X}" _; }
sep()  { printf "${DIM}  %s${X}\n" "────────────────────────────────────────────"; }

# ── Overview ──────────────────────────────────────────────────────────────
overview() {
  hdr
  echo "${W}  SERVICES${X}"
  get /api/admin/services 2>/dev/null | python3 -c "
import sys,json
d=json.load(sys.stdin)
for k,v in d.items():
    ok=v.get('up',False)
    sym='${G}●${X}' if ok else '${R}●${X}'
    label=v.get('label',k)
    meta=v.get('code','') or v.get('error','')[:40] if not ok else 'Online'
    print(f'    {sym}  {label:<12} {meta}')
" 2>/dev/null || echo "  ${R}API unreachable${X}"
  echo ""
  echo "${W}  SYSTEM${X}"
  get /api/admin/system 2>/dev/null | python3 -c "
import sys,json; d=json.load(sys.stdin)
cpu=d.get('cpu_pct',0); ram=d.get('ram_pct',0); disk=d.get('disk_pct',0)
s=d.get('uptime_s',0)
def bar(pct,w=20): n=int(pct/100*w); return '${G}'+'█'*n+'${DIM}'+'░'*(w-n)+'${X}'
print(f'    CPU  {bar(cpu)} {cpu:5.1f}%')
print(f'    RAM  {bar(ram)} {ram:5.1f}%')
print(f'    Disk {bar(disk)} {disk:5.1f}%')
print(f'    Uptime: {s//3600}h {(s%3600)//60}m  •  Python {d.get(\"python\",\"?\")}')
" 2>/dev/null
  echo ""
  echo "${W}  QUICK STATS${X}"
  get /api/admin/therapy-sessions/summary 2>/dev/null | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(f'    TherapySpace: {d.get(\"total_messages\",0)} msgs · {d.get(\"unique_sessions\",0)} sessions · {d.get(\"today_messages\",0)} today')
" 2>/dev/null
  get /api/admin/analytics 2>/dev/null | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(f'    Page views: {d.get(\"alltime\",0)} all-time · {d.get(\"total\",0)} last 14d')
" 2>/dev/null
  echo ""
}

# ── Token display ─────────────────────────────────────────────────────────
show_token() {
  hdr
  sep
  echo ""
  echo "  ${W}Admin Token${X}"
  echo "  ${Y}${TOKEN}${X}"
  echo ""
  echo "  ${W}Dashboard URL${X}"
  echo "  ${C}${URL}/admin${X}"
  echo ""
  echo "  ${W}To open in browser (WSL):${X}"
  echo "  ${DIM}  cmd.exe /c start ${URL}/admin${X}"
  echo ""
  echo "  ${W}Quick API test:${X}"
  echo "  ${DIM}  curl -sf -H 'Authorization: Bearer ${TOKEN}' ${API}/api/health${X}"
  echo ""
  sep
  pause
}

# ── Messages ──────────────────────────────────────────────────────────────
messages() {
  hdr; echo "${W}  CONTACT MESSAGES${X}"; sep; echo ""
  get /api/admin/messages 2>/dev/null | python3 -c "
import sys,json
msgs=json.load(sys.stdin).get('messages',[])
if not msgs: print('  No messages yet.'); exit()
for m in msgs:
    print(f'  ${Y}[#{m[\"id\"]}]${X} {m.get(\"date\",\"?\")}  ${W}{m.get(\"name\",\"?\")}${X}')
    print(f'  {str(m.get(\"message\",\"\"))[:200]}')
    rc=m.get('reply_via','')
    if rc: print(f'  ${DIM}Contact: {rc}${X}')
    print()
" 2>/dev/null
  read -rp "  Delete ID (Enter=skip, 'all'=delete all): " did
  if [ "$did" = "all" ]; then
    get /api/admin/messages | python3 -c "
import sys,json,subprocess
for m in json.load(sys.stdin).get('messages',[]):
    subprocess.run(['curl','-sfX','DELETE','-H','Authorization: Bearer ${TOKEN}','${API}/api/admin/messages/'+str(m['id'])],capture_output=True)
print('  Deleted all.')
" 2>/dev/null
  elif [ -n "$did" ]; then
    curl -sfX DELETE -H "Authorization: Bearer ${TOKEN}" "${API}/api/admin/messages/${did}" >/dev/null 2>&1 && echo "  ${G}Deleted #${did}${X}"
  fi
  pause
}

# ── Therapy sessions ──────────────────────────────────────────────────────
therapy() {
  hdr; echo "${W}  THERAPYSPACE SESSIONS${X}"; sep; echo ""
  get /api/admin/therapy-sessions/summary 2>/dev/null | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(f'  Total messages : {d.get(\"total_messages\",0)}')
print(f'  Unique sessions: {d.get(\"unique_sessions\",0)}')
print(f'  Today          : {d.get(\"today_messages\",0)}')
" 2>/dev/null
  echo ""
  get "/api/admin/therapy-sessions?limit=50" 2>/dev/null | python3 -c "
import sys,json
sessions={}
for m in json.load(sys.stdin).get('sessions',[]):
    sid=m['session_id']
    if sid not in sessions: sessions[sid]=[]
    sessions[sid].append(m)
if not sessions: print('  No sessions yet.'); exit()
for i,(sid,msgs) in enumerate(list(sessions.items())[:15],1):
    first=next((m['content'][:60] for m in msgs if m['role']=='user'),'')
    print(f'  ${Y}[{i}]${X} {sid[:12]}…  {len(msgs)} msgs  {msgs[0][\"date\"][:10]}')
    print(f'      {first}…')
" 2>/dev/null
  pause
}

# ── Analytics ─────────────────────────────────────────────────────────────
analytics() {
  hdr; echo "${W}  ANALYTICS${X}"; sep; echo ""
  get /api/admin/analytics 2>/dev/null | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(f'  All-time views: {d.get(\"alltime\",0)}  •  Last 14d: {d.get(\"total\",0)}')
print()
print(f'  {\"Page\":<30} {\"Hits\":>6}')
print(f'  {\"─\"*30} {\"─\"*6}')
for path,cnt in (d.get('by_path') or [])[:15]:
    bar='|'*min(cnt,30)
    print(f'  {path:<30} {cnt:>6}  {bar}')
" 2>/dev/null
  pause
}

# ── Redis ─────────────────────────────────────────────────────────────────
redis_panel() {
  hdr; echo "${W}  REDIS${X}"; sep; echo ""
  get /api/admin/redis 2>/dev/null | python3 -c "
import sys,json; d=json.load(sys.stdin)
if not d.get('connected'): print('  ${R}Not connected: '+d.get('reason','')+'${X}'); exit()
used=d.get('used_bytes',0)/1048576
peak=d.get('peak_bytes',0)/1048576
keys=d.get('keys',0)
limit=30
pct=used/limit*100
bar_n=int(pct/100*30)
bar='${G}'+'█'*bar_n+'${DIM}'+'░'*(30-bar_n)+'${X}'
print(f'  Memory: {bar} {pct:.1f}%')
print(f'  Used: {used:.2f}MB / {limit}MB free tier  •  Peak: {peak:.2f}MB')
print(f'  Keys: {keys}  •  Clients: {d.get(\"connected_clients\",0)}  •  Hit ratio: {d.get(\"hit_ratio\",\"n/a\")}')
print(f'  Version: {d.get(\"version\",\"?\")}  •  Uptime: {d.get(\"uptime_days\",0)}d')
" 2>/dev/null
  echo ""
  read -rp "  [f]lush cache  [Enter=back]: " ch
  [ "$ch" = "f" ] && post /api/admin/redis/flush 2>/dev/null | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(f'  ${G}Flushed {d.get(\"keys_flushed\",0)} keys${X}')
" 2>/dev/null
  pause
}

# ── Services / restart ────────────────────────────────────────────────────
services() {
  hdr; echo "${W}  SERVICES${X}"; sep; echo ""
  get /api/admin/services 2>/dev/null | python3 -c "
import sys,json
for k,v in json.load(sys.stdin).items():
    ok=v.get('up',False)
    sym='${G}● Online ${X}' if ok else '${R}● OFFLINE${X}'
    print(f'  {sym}  {v.get(\"label\",k):<14} {v.get(\"error\",\"\")[:50] if not ok else \"\"}')
" 2>/dev/null
  echo ""
  echo "  ${W}Restart:${X} [1]API  [2]Chat  [3]Caddy  [4]Tunnel  [Enter=back]"
  read -rp "  > " ch
  case "$ch" in
    1) svc=api;; 2) svc=chat;; 3) svc=caddy;; 4) svc=ngrok;; *) return;;
  esac
  echo "  Restarting ${svc}…"
  post "/api/admin/restart/${svc}" 2>/dev/null | python3 -c "
import sys,json; d=json.load(sys.stdin)
print('  ${G}Done${X}' if d.get('ok') else '  ${R}Failed: '+d.get('error','?')+'${X}')
" 2>/dev/null
  pause
}

# ── Logs ──────────────────────────────────────────────────────────────────
show_logs() {
  hdr; echo "${W}  LOGS${X}"; sep
  echo "  [1]API  [2]Chat  [3]Caddy  [4]Tunnel  [5]Watchdog"
  read -rp "  > " lc
  case "$lc" in 1) ln=api;; 2) ln=chat;; 3) ln=caddy;; 4) ln=ngrok;; 5) ln=watchdog;; *) ln=api;; esac
  echo ""
  get "/api/admin/log/${ln}" 2>/dev/null | python3 -c "
import sys,json
lines=json.load(sys.stdin).get('lines',[])
for l in lines[-50:]: print('  '+l)
" 2>/dev/null
  pause
}

# ── Daily report ──────────────────────────────────────────────────────────
send_report() {
  hdr
  echo "  Sending daily report to Discord…"
  get /api/admin/daily-report 2>/dev/null | python3 -c "
import sys,json; d=json.load(sys.stdin)
print('  ${G}Sent!${X}')
print()
print(d.get('report',''))
" 2>/dev/null
  pause
}

# ── Main menu ─────────────────────────────────────────────────────────────
while true; do
  overview
  sep
  echo "  ${W}[1]${X}Messages  ${W}[2]${X}TherapySpace  ${W}[3]${X}Analytics"
  echo "  ${W}[4]${X}Services   ${W}[5]${X}Redis         ${W}[6]${X}Logs"
  echo "  ${W}[7]${X}Show Token/URL              ${W}[8]${X}Daily Report"
  echo "  ${W}[0]${X}Exit"
  sep
  read -rp "  > " ch
  case "$ch" in
    1) messages ;;
    2) therapy ;;
    3) analytics ;;
    4) services ;;
    5) redis_panel ;;
    6) show_logs ;;
    7) show_token ;;
    8) send_report ;;
    0) echo "  Bye."; exit 0 ;;
  esac
done
