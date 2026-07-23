#!/usr/bin/env bash
# isaac-watch.sh — live Isaac dashboard, polls kadoosh APIs every $INTERVAL seconds
# Usage: ./scripts/isaac-watch.sh
#        INTERVAL=3 PROJECT=/path/to/project ./scripts/isaac-watch.sh

set -euo pipefail

INTERVAL="${INTERVAL:-5}"
API="http://localhost:8002"
AUTH="X-Session-ID: a2a:service"
CURRICULUM="/Users/prasad.nikam/projects1/synapse-build/docs/curriculum.json"
PROJECT="${PROJECT:-/Users/prasad.nikam/projects1/llm/grok-build}"

# colours
BOLD='\033[1m'
DIM='\033[2m'
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
BLUE='\033[34m'
RESET='\033[0m'

bar() { printf '%0.s─' $(seq 1 "${COLUMNS:-80}"); printf '\n'; }
header() { printf "${BOLD}${CYAN}%s${RESET}\n" "$1"; }

status_color() {
  case "$1" in
    done|completed)       printf "${GREEN}%s${RESET}" "$1" ;;
    in_progress)          printf "${YELLOW}%s${RESET}" "$1" ;;
    not_started)          printf "${DIM}%s${RESET}" "$1" ;;
    active)               printf "${GREEN}%s${RESET}" "$1" ;;
    *)                    printf "%s" "$1" ;;
  esac
}

render() {
  local now
  now=$(date '+%Y-%m-%d %H:%M:%S')

  printf '\033[2J\033[H'  # clear + move to top

  # title bar
  printf "${BOLD}${BLUE}══ ISAAC DASHBOARD ══${RESET}  %s  ${DIM}(refreshes every ${INTERVAL}s — ctrl-c to exit)${RESET}\n" "$now"
  bar

  # ── Active sessions ──────────────────────────────────────────────────────────
  header "SESSIONS"
  local sess_json
  sess_json=$(curl -sf --max-time 4 "${API}/isaac-sessions?agent_id=190&limit=3" \
    -H "${AUTH}" 2>/dev/null) || sess_json="[]"
  if [[ "$sess_json" == "[]" || -z "$sess_json" ]]; then
    printf "  ${DIM}none${RESET}\n"
  else
    echo "$sess_json" | python3 -c "
import json, sys
for s in json.load(sys.stdin):
    sid    = s.get('id','?')
    title  = s.get('title','(no title)')[:55]
    status = s.get('status','?')
    cwd    = s.get('cwd','')
    base   = cwd.split('/')[-1] if cwd else ''
    print(f'  id={sid:<5} {title:<56} [{status}]  {base}')
" 2>/dev/null || printf "  ${RED}parse error${RESET}\n"
  fi
  bar

  # ── Curriculum ───────────────────────────────────────────────────────────────
  header "CURRICULUM  community-0"
  if [[ -f "$CURRICULUM" ]]; then
    python3 -c "
import json
with open('$CURRICULUM') as f:
    data = json.load(f)
done = not_started = in_progress = 0
rows = []
for mod in data:
    for c in mod.get('chapters', []):
        status = c.get('status', 'not_started')
        if status == 'done': done += 1
        elif status == 'in_progress': in_progress += 1
        else: not_started += 1
        rows.append((c['id'], c['title'], status))
total = len(rows)
bar = '#' * done + '>' * in_progress + '.' * not_started
print(f'  [{bar:<12}] {done}/{total} done  {in_progress} in_progress  {not_started} not_started')
print()
for cid, title, status in rows:
    marker = '▶' if status == 'in_progress' else ('✓' if status == 'done' else ' ')
    print(f'  {marker} {cid:5s}  {title:<45s}  {status}')
" 2>/dev/null || printf "  ${RED}could not read curriculum${RESET}\n"
  else
    printf "  ${RED}curriculum.json not found at ${CURRICULUM}${RESET}\n"
  fi
  bar

  # ── Recent memories ──────────────────────────────────────────────────────────
  header "RECENT MEMORIES  project=$(basename "${PROJECT}")"
  local mem_json
  mem_json=$(curl -sf --max-time 4 "${API}/agents/190/memory?project=${PROJECT}&limit=8" \
    -H "${AUTH}" 2>/dev/null) || mem_json="[]"
  if [[ "$mem_json" == "[]" || -z "$mem_json" ]]; then
    printf "  ${DIM}none${RESET}\n"
  else
    echo "$mem_json" | python3 -c "
import json, sys
mems = json.load(sys.stdin)
for m in reversed(mems):
    mtype = m.get('memory_type', '?')[:12]
    ts    = m.get('created_at','')[:16].replace('T',' ')
    text  = m.get('content','')[:90].replace('\n',' ')
    print(f'  [{mtype:<12}]  {ts}  {text}')
" 2>/dev/null || printf "  ${RED}parse error${RESET}\n"
  fi
  bar

  # ── Last graphify ─────────────────────────────────────────────────────────────
  header "LAST GRAPHIFY SNAPSHOT"
  local gfy_json
  gfy_json=$(curl -sf --max-time 4 "${API}/agents/190/memory?project=${PROJECT}&limit=50" \
    -H "${AUTH}" 2>/dev/null) || gfy_json="[]"
  echo "$gfy_json" | python3 -c "
import json, sys
mems = [m for m in json.load(sys.stdin) if m.get('memory_type') == 'graphify']
if mems:
    m = mems[-1]
    ts   = m.get('created_at','')[:16].replace('T',' ')
    text = m.get('content','')[:120].replace('\n',' ')
    print(f'  {ts}  {text}')
else:
    print('  (none yet)')
" 2>/dev/null || printf "  ${RED}parse error${RESET}\n"
  bar
}

trap 'printf "\n${DIM}dashboard stopped${RESET}\n"; exit 0' INT TERM

while true; do
  render
  sleep "$INTERVAL"
done
