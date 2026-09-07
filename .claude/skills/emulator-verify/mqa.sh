#!/usr/bin/env bash
# mqa — drive the MoneyApp dev client on an Android emulator and read state back.
# Every subcommand is verified against a real emulator; the ordering rules they
# encode (see cmd_tap, cmd_back, cmd_type) are what make interaction reliable.
# `mqa help` lists usage.
#
# -e matters here: this is a verification tool, and a step that fails silently
# produces a false pass, which is worse than no tool. Pipelines that legitimately
# return non-zero (a grep with no matches) are guarded explicitly at their site.
set -euo pipefail

PKG="${MQA_PKG:-com.moneyapp.app}"
SCHEME="${MQA_SCHEME:-moneyapp}"
APK="${MQA_APK:-android/app/build/outputs/apk/debug/app-debug.apk}"

# Resolve the repo root from this script's own location, never from $PWD — the
# node call below needs the project's better-sqlite3 regardless of where the
# caller happens to be standing.
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"

ADB="$(command -v adb || echo "$HOME/Library/Android/sdk/platform-tools/adb")"
EMU="$HOME/Library/Android/sdk/emulator/emulator"

die() { echo "mqa: $*" >&2; exit 1; }

# --- device leases ----------------------------------------------------------
# Three tickets verify in parallel, so a session must own one device outright.
# The claim cannot live in MQA_SERIAL: an agent's shell calls do not carry env
# between them, and a lost export puts us back on "first device wins", which is
# the silent cross-talk this whole mechanism exists to stop. The lease is keyed
# on the caller's git worktree instead. Claim once, and every later call from
# that worktree resolves the same device, with nothing to remember.
LEASE_DIR="${MQA_LEASE_DIR:-$HOME/.mqa/leases}"
LEASE_TTL="${MQA_LEASE_TTL:-7200}"
read -r -a SLOT_AVDS <<<"${MQA_SLOTS:-Pixel_2_API_34 Pixel_2_API_34_2 Pixel_2_API_34_3}"
SLOT_MAX="${#SLOT_AVDS[@]}"

# Slot N is pinned to console port 5554+2(N-1) and Metro 8081+N, and `claim`
# boots with an explicit -port. Letting the emulator pick the lowest free port
# would make the serial depend on boot order, i.e. on which session started first.
slot_avd()    { echo "${SLOT_AVDS[$(($1 - 1))]}"; }
slot_serial() { echo "emulator-$((5554 + ($1 - 1) * 2))"; }
slot_port()   { echo "$((8081 + $1))"; }

worktree() { git -C "$PWD" rev-parse --show-toplevel 2>/dev/null || echo "$ROOT"; }
lease_field() { sed -n "s/^$2=//p" "$LEASE_DIR/$1" 2>/dev/null || true; }

# A lease outlives the shell that took it, so a PID proves nothing about whether
# the holder is alive. Judge it on what does persist: the worktree still exists,
# and the lease was touched recently. Every mqa call touches its own, so an
# abandoned session ages out instead of holding a device forever.
lease_stale() {
  local f="$LEASE_DIR/$1" wt age
  [ -f "$f" ] || return 0
  wt="$(lease_field "$1" worktree)"
  [ -n "$wt" ] && [ -d "$wt" ] || return 0
  age=$(( $(date +%s) - $(stat -f %m "$f") ))
  [ "$age" -gt "$LEASE_TTL" ]
}

my_slot() {
  local wt s
  wt="$(worktree)"
  for ((s = 1; s <= SLOT_MAX; s++)); do
    if ! lease_stale "$s" && [ "$(lease_field "$s" worktree)" = "$wt" ]; then echo "$s"; return 0; fi
  done
  return 1
}

active_leases() {
  local s n=0
  for ((s = 1; s <= SLOT_MAX; s++)); do
    if ! lease_stale "$s"; then n=$((n + 1)); fi
  done
  echo "$n"
}

attached() { "$ADB" devices | awk '/^emulator-[0-9]+\tdevice$/{print $1}'; }

# Resolution order: an explicit MQA_SERIAL, then this worktree's lease, then the
# single-emulator case. That last fallback keeps solo work claim-free, but only
# while nobody holds a lease. Once one session has claimed, an unclaimed caller
# is guessing, and guessing is what produces a pass against another branch.
resolve_serial() {
  if [ -n "${MQA_SERIAL:-}" ]; then echo "$MQA_SERIAL"; return; fi
  local slot devs
  if slot="$(my_slot)"; then
    touch "$LEASE_DIR/$slot"
    lease_field "$slot" serial
    return
  fi
  devs="$(attached)"
  if [ "$(grep -c . <<<"$devs" || true)" = 1 ] && [ "$(active_leases)" = 0 ]; then
    echo "$devs"
  fi
}
S="$(resolve_serial)"

resolve_port() {
  if [ -n "${MQA_PORT:-}" ]; then echo "$MQA_PORT"; return; fi
  local slot
  if slot="$(my_slot)"; then lease_field "$slot" port; else echo 8081; fi
}
PORT="$(resolve_port)"

# Per device, not per machine: a shared work dir means two sessions overwrite
# each other's ui.xml and pull the other's SQLite into their own analysis.
WORK="${MQA_WORK:-${TMPDIR:-/tmp}/mqa/${S:-unclaimed}}"
mkdir -p "$WORK"

a() { "$ADB" ${S:+-s "$S"} "$@"; }

need_device() {
  [ -n "$S" ] && return 0
  local n; n="$(grep -c . <<<"$(attached)" || true)"
  [ "$n" = 0 ] && die "no emulator attached. Run: mqa claim"
  die "no device claimed for $(worktree): $n attached, $(active_leases) leased.
Guessing here would drive another session's device. Run: mqa claim   (see: mqa claims)"
}

# --- UI hierarchy -----------------------------------------------------------
# GOTCHA: uiautomator dumps the *app* window only, never the IME. With the soft
# keyboard up a field's reported bounds can sit underneath it, and tapping there
# types a letter instead. Always dismiss the IME before tapping by coordinate.
dump() {
  need_device
  # Write then rename: a torn ui.xml read by a concurrent invocation would
  # otherwise parse as "element not found", i.e. a false negative.
  a exec-out uiautomator dump /dev/tty 2>/dev/null > "$WORK/ui.xml.$$"
  mv -f "$WORK/ui.xml.$$" "$WORK/ui.xml"
  [ -s "$WORK/ui.xml" ] || die "empty UI dump (app not foreground?)"
}

# Emit "x y clickable|text" per match, clickable first: an RN Pressable wraps a
# non-clickable Text carrying the same label, and only the wrapper responds.
locate() {
  python3 - "$WORK/ui.xml" "$1" <<'PY'
import re, sys
xml = open(sys.argv[1], encoding='utf8').read()
target = sys.argv[2]
hits = []
for m in re.finditer(r'<node[^>]*?>', xml):
    n = m.group(0)
    t = re.search(r' text="([^"]*)"', n)
    d = re.search(r' content-desc="([^"]*)"', n)
    if (t.group(1) if t else '') != target and (d.group(1) if d else '') != target:
        continue
    b = re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', n)
    if not b:
        continue
    x1, y1, x2, y2 = map(int, b.groups())
    hits.append(((x1 + x2) // 2, (y1 + y2) // 2, 'clickable="true"' in n))
hits.sort(key=lambda h: not h[2])
for x, y, c in hits:
    print(x, y, 'clickable' if c else 'text')
PY
}

# A screen mid-transition (an overlay animating out, a route still mounting)
# reports the old hierarchy. Re-dump a bounded number of times before concluding
# the node is absent — each dump costs ~1s, which is also the settle.
locate_retry() {
  local label="$1" tries="${2:-6}" i hits
  for ((i = 1; i <= tries; i++)); do
    dump
    hits="$(locate "$label")"
    if [ -n "$hits" ]; then printf '%s\n' "$hits"; return 0; fi
  done
  return 1
}

# --- input ------------------------------------------------------------------
ime_shown() { a shell dumpsys input_method 2>/dev/null | grep -q "mInputShown=true"; }

# GOTCHA: BACK is overloaded — it closes the IME when shown, otherwise it pops
# the navigation stack. Pressing it blindly to "dismiss the keyboard" silently
# navigates off the screen under test.
cmd_ime_down() { need_device; if ime_shown; then a shell input keyevent 4; fi; }
cmd_back() {
  need_device
  if ime_shown; then a shell input keyevent 4; dump; fi   # dump = settle
  a shell input keyevent 4
  dump
}

# GOTCHA: `input tap` returns before the app processes the focus change. Any
# `input text` fired straight after lands in the previously focused field. The
# trailing dump doubles as the settle — never chain tap+text without it.
cmd_tap() {
  need_device
  cmd_ime_down
  local hits first x y kind
  hits="$(locate_retry "$1")" || die "no node matching '$1' (try: mqa ui)"
  first="${hits%%$'\n'*}"
  read -r x y kind <<<"$first"
  # A tap on a non-clickable node is a no-op. Reporting it as a tap is exactly
  # the false pass this tool exists to prevent, so refuse instead.
  [ "$kind" = clickable ] || die "'$1' matched only a non-clickable node at $x $y — \
the tappable ancestor may carry a different label; inspect: mqa find '$1'"
  a shell input tap "$x" "$y"
  dump
  echo "tapped '$1' at $x $y"
}

# GOTCHA: the text reaches the *device's* shell, so an unquoted `&`, `;`, `|` or
# quote truncates it there — and adb still exits 0, so the caller sees success.
# Single-quote for the device shell and escape embedded quotes; spaces then need
# no %s substitution. Verified with: O'Brien & Co; 50% $x
cmd_type() {
  need_device
  local escaped
  escaped="$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
  a shell "input text '$escaped'"
  dump
}

# One round trip instead of one per keystroke (~1s vs ~6s).
cmd_clear() {
  need_device
  local dels
  dels="$(printf '67 %.0s' $(seq 1 60))"
  # shellcheck disable=SC2086 -- deliberate word splitting: one keycode per arg
  a shell input keyevent 123 $dels     # MOVE_END then DEL x60
  dump
}

# --- lifecycle --------------------------------------------------------------
# Boots the AVD for one slot on its pinned console port. Waits on that serial
# specifically: `adb wait-for-device` with three emulators up returns for
# whichever one answers first, which need not be the one being booted.
boot_slot() {
  local slot="$1" avd serial
  avd="$(slot_avd "$slot")"; serial="$(slot_serial "$slot")"
  if "$ADB" devices | grep -q "^$serial	device$"; then echo "$serial already up"; return; fi
  echo "booting $avd on $serial ..."
  nohup "$EMU" -avd "$avd" -port "${serial#emulator-}" >/dev/null 2>&1 &
  "$ADB" -s "$serial" wait-for-device
  until [ "$("$ADB" -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do
    sleep 2
  done
  echo "booted $serial"
}

cmd_boot() {
  local slot="${1:-}"
  if [ -z "$slot" ]; then slot="$(my_slot)" || die "no slot claimed here. Run: mqa claim   (or: mqa boot <slot>)"; fi
  boot_slot "$slot"
}

print_claim() {
  local slot="$1"
  cat <<EOF
slot $slot  $(slot_avd "$slot")  $(slot_serial "$slot")  metro :$(slot_port "$slot")
  npx expo start --port $(slot_port "$slot")   # in this worktree, then: mqa launch
EOF
}

cmd_claim() {
  mkdir -p "$LEASE_DIR"
  local want="${1:-}" wt slot s
  wt="$(worktree)"
  if slot="$(my_slot)"; then echo "already claimed"; print_claim "$slot"; return; fi
  if [ -n "$want" ]; then
    [ "$want" -ge 1 ] 2>/dev/null && [ "$want" -le "$SLOT_MAX" ] || die "slot must be 1..$SLOT_MAX"
    lease_stale "$want" || die "slot $want is held by $(lease_field "$want" worktree)"
    slot="$want"
  else
    slot=""
    for ((s = 1; s <= SLOT_MAX; s++)); do
      if lease_stale "$s"; then slot="$s"; break; fi
    done
    [ -n "$slot" ] || die "all $SLOT_MAX slots are held. See: mqa claims"
  fi
  cat > "$LEASE_DIR/$slot" <<EOF
worktree=$wt
avd=$(slot_avd "$slot")
serial=$(slot_serial "$slot")
port=$(slot_port "$slot")
claimed=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
  boot_slot "$slot"
  # Expo silently falls through to the next free port when its own is taken, so a
  # squatter costs a run: this device would load whatever that other server serves.
  # A Metro already answering here is the normal case on a re-claim, not a problem.
  local mp; mp="$(slot_port "$slot")"
  if lsof -nP -iTCP:"$mp" -sTCP:LISTEN >/dev/null 2>&1; then
    if curl -sS --max-time 2 "http://127.0.0.1:$mp/status" 2>/dev/null | grep -q packager-status:running; then
      echo "Metro already answering on :$mp. Check it is this worktree's before you trust a run"
    else
      echo "WARNING: :$mp is held by something that is not Metro. Free it before starting Metro"
    fi
  fi
  print_claim "$slot"
}

cmd_release() {
  local slot
  slot="$(my_slot)" || { echo "nothing claimed for $(worktree)"; return; }
  rm -f "$LEASE_DIR/$slot"
  echo "released slot $slot ($(slot_serial "$slot")). The emulator is left running."
}

cmd_claims() {
  local s state wt
  printf '%-5s %-20s %-16s %-6s %-9s %s\n' SLOT AVD SERIAL METRO STATE WORKTREE
  for ((s = 1; s <= SLOT_MAX; s++)); do
    if lease_stale "$s"; then
      state=free; wt="-"
      [ -f "$LEASE_DIR/$s" ] && wt="(stale: $(lease_field "$s" worktree))"
    else
      state=held; wt="$(lease_field "$s" worktree)"
    fi
    "$ADB" devices | grep -q "^$(slot_serial "$s")	device$" || state="$state,down"
    printf '%-5s %-20s %-16s %-6s %-9s %s\n' "$s" "$(slot_avd "$s")" "$(slot_serial "$s")" ":$(slot_port "$s")" "$state" "$wt"
  done
}

# GOTCHA: a fresh `android/` proves nothing — the CI-parity chain ends in
# `expo prebuild --no-install`, which regenerates the project *and deletes any
# previously built APK* without building a new one.
cmd_install() {
  need_device
  [ -f "$ROOT/$APK" ] || die "no APK at $APK — run: npx expo run:android (builds + installs)"
  # A failed install here is usually a full /data, not a bad build. Report the
  # number rather than letting adb surface an opaque IOException.
  local free
  free="$(a shell df /data | awk 'NR==2{print int($4/1024)}' | tr -d '\r')"
  if [ -n "$free" ]; then
    echo "free on /data: ${free}MB"
    [ "$free" -gt 400 ] || echo "WARNING: <400MB free — install will likely fail. Uninstall stale dev builds."
  else
    echo "WARNING: could not read free space on /data"
  fi
  a install -r -d "$ROOT/$APK"
}

cmd_launch() {
  need_device
  a reverse "tcp:$PORT" "tcp:$PORT"
  curl -sS -o /dev/null --max-time 5 "http://127.0.0.1:$PORT/status" \
    || echo "WARNING: no Metro on :$PORT — start it with: npx expo start"
  a shell am start -a android.intent.action.VIEW \
    -d "$SCHEME://expo-development-client/?url=http%3A%2F%2Flocalhost%3A$PORT" >/dev/null
  echo "launched — bundle takes ~20-40s on a cold Metro"
}

cmd_reset() { need_device; a shell pm clear "$PKG" >/dev/null; echo "app data cleared — 'launch' next; the DB is recreated on first run"; }

# --- build decision ----------------------------------------------------------
# The Gradle build is the single most expensive step in a verification run, and
# most task diffs do not need one. These three commands make "do I have to
# rebuild?" a question with a checkable answer instead of a habit.

cmd_abi() { need_device; a shell getprop ro.product.cpu.abi | tr -d '\r'; }

# A debug APK built for all four ABIs is ~300MB and overflows the emulator's
# /data; one matching the device is ~100MB. There is no upside to the other
# three — the emulator can only run its own.
cmd_build() {
  need_device
  local abi
  abi="$(cmd_abi)"
  [ -d "$ROOT/android" ] || die "no android/ — run: npx expo prebuild --platform android"
  echo "building debug APK for $abi only (all-ABI is ~3x the size and cannot install)"
  ( cd "$ROOT/android" && ./gradlew assembleDebug "-PreactNativeArchitectures=$abi" )
  ls -lh "$ROOT/$APK"
}

# Native surface: a change to any of these means the installed APK is stale and
# a rebuild is mandatory. Everything else ships over Metro, so an APK already on
# the device is current by construction — reuse it and skip ~10 minutes.
cmd_needs_build() {
  local base="${1:-origin/main}" changed
  changed="$(
    { git -C "$ROOT" diff --name-only "$base"...HEAD 2>/dev/null || true
      git -C "$ROOT" diff --name-only HEAD 2>/dev/null || true
      git -C "$ROOT" ls-files --others --exclude-standard 2>/dev/null || true
    } | sort -u | grep -E '^(package(-lock)?\.json|app\.json|eas\.json|patches/|android/|ios/|.*\.gradle|gradle\.properties)' || true
  )"
  if [ -n "$changed" ]; then
    echo "REBUILD — native surface changed since $base:"
    sed 's/^/  /' <<<"$changed"
    return 0
  fi
  echo "REUSE — no native surface change since $base; serve this branch over Metro."
  if [ -n "$S" ] && ! a shell pm list packages 2>/dev/null | grep -q "$PKG"; then
    echo "  ...but $PKG is not installed on $S. Build once: mqa build && mqa install"
    return 0
  fi
  return 1
}

# The dev client's floating Tools bubble captures taps near the header's
# right-hand action even from coordinates outside its reported bounds, because
# it lives in a separate window that uiautomator does not dump. Drag it to the
# bottom of the screen for the session rather than hunting for a safe pixel.
cmd_park() {
  need_device
  local h
  h="$(a shell wm size | sed -n 's/.*: [0-9]*x\([0-9]*\).*/\1/p' | tr -d '\r')"
  a shell input swipe 971 174 971 "$(( ${h:-2400} - 900 ))" 800
  echo "parked the dev-client Tools bubble"
}

# --- scripted walks ----------------------------------------------------------
# A walk driven as tap -> dump -> find, one tool call at a time, costs an order
# of magnitude more than the same walk as a script: each round trip carries a
# full UI hierarchy back. Write the scenario once, run it in one call, read one
# output. `$MQA` and `mqa step` are what the script uses.
cmd_walk() {
  local script="${1:?usage: mqa walk <script.sh>}"
  [ -f "$script" ] || die "no walk script at $script"
  MQA="$HERE/mqa.sh" bash -euo pipefail "$script"
}

cmd_step() { printf '\n=== %s\n' "$*"; }

# --- observation ------------------------------------------------------------
cmd_shot() {
  need_device
  local out="$WORK/${1:-shot}.png"
  a exec-out screencap -p > "$out"
  echo "$out"
}

cmd_ui() { dump; grep -oE '(text|content-desc)="[^"]+"' "$WORK/ui.xml" | sort -u || true; }

cmd_logs() {
  need_device
  a logcat -d 2>/dev/null \
    | grep -E "ReactNativeJS|ReferenceError|FATAL EXCEPTION|runtime not ready" \
    | tail -"${1:-40}" || true
}

# Pull db + WAL together: expo-sqlite runs in WAL mode, so writes made seconds
# ago live in the -wal file and are invisible if you copy only the .db.
cmd_db() {
  need_device
  [ $# -ge 1 ] || die "usage: mqa db \"select * from accounts\""
  rm -rf "$WORK/db" && mkdir -p "$WORK/db"
  local f
  for f in moneyapp.db moneyapp.db-wal moneyapp.db-shm; do
    a exec-out run-as "$PKG" cat "/data/data/$PKG/files/SQLite/$f" > "$WORK/db/$f" 2>/dev/null || true
  done
  # `adb exec-out run-as ... cat` writes the device shell's errors to STDOUT, so a
  # missing file yields a non-empty "cat: ... No such file" payload that only fails
  # later as an opaque SQLITE_NOTADB. Check the magic header, not the size.
  if ! head -c 15 "$WORK/db/moneyapp.db" 2>/dev/null | grep -q "SQLite format"; then
    if grep -qs "No such file" "$WORK/db/moneyapp.db"; then
      die "no database on device — the app creates it on first launch (after 'reset', run 'launch')"
    fi
    die "could not read DB: $(head -c 200 "$WORK/db/moneyapp.db" 2>/dev/null)"
  fi
  MQA_SQL="$1" MQA_DB="$WORK/db/moneyapp.db" MQA_ROOT="$ROOT" node -e '
    const Database = require(process.env.MQA_ROOT + "/node_modules/better-sqlite3");
    const db = new Database(process.env.MQA_DB);   // writable: SQLite replays the WAL on open
    const stmt = db.prepare(process.env.MQA_SQL);
    // .all() throws on a statement that returns no rows; pick the right one.
    console.log(stmt.reader ? JSON.stringify(stmt.all(), null, 2) : JSON.stringify(stmt.run()));
  '
}

usage() {
  cat <<'EOF'
mqa — drive the MoneyApp dev client on an Android emulator and read state back.

  claim [slot] | release | claims      one device per worktree
  boot [slot] | install | launch | reset   lifecycle
  needs-build [base] | build | abi     build decision (default base: origin/main)
  walk <script.sh> | step <label>      scripted scenarios
  ui | find <label> | shot [name]      observe
  tap <label> | tapxy <x> <y> | park   interact
  type <text> | clear | key <code>     text entry
  back | ime-down                      navigation
  db "<sql>" | logs [n]                state

env: MQA_SERIAL MQA_PORT MQA_PKG MQA_APK MQA_WORK MQA_SLOTS MQA_LEASE_DIR MQA_LEASE_TTL

Three slots run in parallel, one per worktree. The claim is keyed on the
worktree, so it survives between shell calls and there is nothing to export:

  slot 1  Pixel_2_API_34    emulator-5554  metro :8082
  slot 2  Pixel_2_API_34_2  emulator-5556  metro :8083
  slot 3  Pixel_2_API_34_3  emulator-5558  metro :8084

Cheapest correct run, in order:
  mqa claim                                      # boots a free device, prints its Metro port
  mqa needs-build && mqa build && mqa install    # exits 1 when a rebuild is not needed
  npx expo start --port <the port claim printed> &
  mqa launch && mqa park
  mqa walk scenarios.sh                          # one call, not one per tap
  mqa release                                    # when the ticket is done
EOF
}

case "${1:-help}" in
  claim)    cmd_claim "${2:-}" ;;
  release)  cmd_release ;;
  claims)   cmd_claims ;;
  boot)     cmd_boot "${2:-}" ;;
  install)  cmd_install ;;
  launch)   cmd_launch ;;
  reset)    cmd_reset ;;
  abi)      cmd_abi ;;
  build)    cmd_build ;;
  needs-build) cmd_needs_build "${2:-origin/main}" ;;
  park)     cmd_park ;;
  walk)     cmd_walk "${2:?walk script}" ;;
  step)     shift; cmd_step "$@" ;;
  shot)     cmd_shot "${2:-shot}" ;;
  ui)       cmd_ui ;;
  find)     dump; locate "${2:?label}" ;;
  tap)      cmd_tap "${2:?label}" ;;
  tapxy)    need_device; cmd_ime_down; a shell input tap "${2:?x}" "${3:?y}"; dump ;;
  type)     cmd_type "${2:?text}" ;;
  clear)    cmd_clear ;;
  key)      need_device; a shell input keyevent "${2:?keycode}"; dump ;;
  back)     cmd_back ;;
  ime-down) cmd_ime_down ;;
  db)       shift; cmd_db "$@" ;;
  logs)     cmd_logs "${2:-40}" ;;
  *)        usage ;;
esac
