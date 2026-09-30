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

# Screen engine: agent-device (a devDependency) unless MQA_UI=uiautomator; Android allows one per device at a time.
AD_BIN="${MQA_AGENT_DEVICE:-$ROOT/node_modules/.bin/agent-device}"
if [ -n "${MQA_UI:-}" ]; then ENGINE="$MQA_UI"; elif [ -x "$AD_BIN" ]; then ENGINE=agent-device; else ENGINE=uiautomator; fi
case "$ENGINE" in agent-device | uiautomator) ;; *) die "MQA_UI must be agent-device or uiautomator" ;; esac
DENSITY=2.625
READY_DEFAULT='label="󰓡, Transactions"'

# The shell's first python3 can be an Intel build that dies with "Bad CPU type"; take the first one that runs.
PY="${MQA_PYTHON:-}"
if [ -z "$PY" ]; then
  for p in /usr/bin/python3 python3; do if "$p" -c '' 2>/dev/null; then PY="$p"; break; fi; done
fi
[ -n "$PY" ] || die "no runnable python3 (set MQA_PYTHON)"

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
  if ! grep -q '<hierarchy' "$WORK/ui.xml"; then held_die; die "uiautomator returned no hierarchy: $(head -c 120 "$WORK/ui.xml")"; fi
}

# While agent-device's helper holds UI automation, uiautomator prints "Killed" and exits 0; a lingering helper process alone proves nothing.
held_die() {
  if grep -qs Killed "$WORK/ui.xml"; then die "an agent-device session holds UI automation on $S. Run: mqa down   (or drop MQA_UI=uiautomator)"; fi
}

# Emit "x y clickable|text" per match, clickable first: an RN Pressable wraps a
# non-clickable Text carrying the same label, and only the wrapper responds.
locate() {
  "$PY" - "$WORK/ui.xml" "$1" <<'PY'
import html, re, sys
xml = open(sys.argv[1], encoding='utf8').read()
target = sys.argv[2]
hits = []
for m in re.finditer(r'<node[^>]*?>', xml):
    n = m.group(0)
    t = re.search(r' text="([^"]*)"', n)
    d = re.search(r' content-desc="([^"]*)"', n)
    vals = {v for g in (t, d) if g for v in (g.group(1), html.unescape(g.group(1)))}
    if target not in vals:
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
  hits="$(locate_retry "$1")" || { suggest "label=\"$1\""; die "no node matching '$1'"; }
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
  next: mqa up   # starts Metro on :$(slot_port "$slot") from this worktree and launches the app
EOF
}

port_ok() {
  local pid; pid="$(lsof -nP -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null | head -1)" || true
  [ -z "$pid" ] || [ "$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | tail -1)" = "$2" ]
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
    # Prefer a free slot whose Metro port nobody else's server holds: a leftover Metro there makes `up` refuse the port.
    slot=""
    for ((s = 1; s <= SLOT_MAX; s++)); do
      if lease_stale "$s" && port_ok "$(slot_port "$s")" "$wt"; then slot="$s"; break; fi
    done
    for ((s = 1; s <= SLOT_MAX && ${#slot} == 0; s++)); do
      if lease_stale "$s"; then slot="$s"; fi
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
  # An open agent-device session leaves its headless keyboard active for the next holder.
  if [ -x "$AD_BIN" ] && [ -n "$S" ]; then ad close >/dev/null 2>&1 || true; fi
  # This worktree's Metro on the slot's port would make the next holder's `up` refuse the port.
  local pid; pid="$(metro_pid)"
  if [ -n "$pid" ] && [ "$(metro_cwd "$pid")" = "$(worktree)" ]; then kill "$pid"; rm -f "$WORK/metro.head"; echo "stopped this worktree's Metro on :$PORT"; fi
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
native_changes() {
  { git -C "$ROOT" diff --name-only "$1"...HEAD 2>/dev/null || true
    git -C "$ROOT" diff --name-only HEAD 2>/dev/null || true
    git -C "$ROOT" ls-files --others --exclude-standard 2>/dev/null || true
  } | sort -u | grep -E '^(package(-lock)?\.json|app\.json|eas\.json|patches/|android/|ios/|.*\.gradle|gradle\.properties)' || true
}

# The installed APK's own file time, in epoch seconds; empty when the app is not installed.
apk_time() {
  local p
  p="$(a shell pm path "$PKG" 2>/dev/null | tr -d '\r' | sed -n 's/^package://p' | head -1)" || true
  [ -z "$p" ] || a shell stat -c %Y "$p" 2>/dev/null | tr -d '\r'
}

# Prints the verdict and returns 0 when a build is needed; an APK installed after the newest native change already carries it (the lens's case).
build_verdict() {
  local base="${1:-origin/main}" changed newest t
  changed="$(native_changes "$base")"
  if [ -z "$changed" ]; then
    if [ -n "$S" ] && ! a shell pm list packages 2>/dev/null | grep -q "$PKG"; then
      echo "REBUILD: $PKG is not installed on $S. A /ship implementer builds, one call each: mqa build, then mqa install. Any other session asks first; the render lens never builds."; return 0
    fi
    echo "REUSE: no native surface change since $base; this branch reaches the device over Metro."; return 1
  fi
  # shellcheck disable=SC2086 -- deliberate word splitting: one pathspec per changed file
  if [ -n "$(git -C "$ROOT" status --porcelain -- $changed 2>/dev/null)" ]; then newest="$(date +%s)"; else
    newest="$(git -C "$ROOT" log -1 --format=%ct "$base"..HEAD -- $changed 2>/dev/null)"; fi
  t=""; [ -z "$S" ] || t="$(apk_time)"
  if [ -n "$t" ] && [ -n "$newest" ] && [ "$t" -gt "$newest" ]; then
    echo "REUSE: the native surface changed since $base, and the APK on $S was installed after the newest change; a missing native module on screen means rebuild."
    return 1
  fi
  echo "REBUILD: native surface changed since $base, and the APK on ${S:-the device} predates it. A /ship implementer builds, one call each: mqa build, then mqa install. Any other session asks first; the render lens never builds."
  sed 's/^/  /' <<<"$changed"
  return 0
}

# Prints the verdict and exits 0; --exit-code keeps the old contract for scripts: 0 to rebuild, 1 to reuse.
cmd_needs_build() {
  local base=origin/main code="" rc=0
  while [ $# -gt 0 ]; do case "$1" in --exit-code) code=1 ;; *) base="$1" ;; esac; shift; done
  build_verdict "$base" || rc=$?
  [ -z "$code" ] || return "$rc"
}

# The dev client's Tools button covers whatever is under it (Filter, a header's Back); the dev menu's own switch hides it until the app data is cleared.
cmd_park() {
  need_device
  local f
  f="$(snap_file)"
  query rect "$f" 'label="Tools"' >/dev/null 2>&1 || { echo "no Tools button on screen"; return 0; }
  cmd_press 'label="Tools"' >/dev/null
  cmd_wait 'label="Close"' 5000 >/dev/null || die "park: the dev menu did not open"
  cmd_scroll down --until 'label="Toggle Dev Menu"' >/dev/null
  cmd_press 'label="Toggle Dev Menu"' >/dev/null
  cmd_press 'label="Close"' >/dev/null
  echo "turned the dev-client Tools button off; it stays off until the app data is cleared"
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
  local name="${1:-shot}" crop="" out="$WORK" f r="" png
  [ $# -eq 0 ] || shift
  while [ $# -gt 0 ]; do
    case "$1" in
      --crop) crop="${2:?--crop <selector>}"; shift 2 ;;
      --out) out="${2:?--out <dir>}"; shift 2 ;;
      *) die "usage: mqa shot [name] [--crop <selector>] [--out <dir>]" ;;
    esac
  done
  mkdir -p "$out"; png="$out/$name.png"
  if [ -n "$crop" ]; then f="$(snap_file)"; r="$(query rect "$f" "$crop")"; fi
  a exec-out screencap -p > "$png"
  # shellcheck disable=SC2086 -- deliberate word splitting: x y w h
  [ -z "$r" ] || crop_png "$png" $r
  echo "$png"
}

crop_png() {
  if "$PY" -c 'import PIL' 2>/dev/null; then
    "$PY" -c 'import sys; from PIL import Image; p = sys.argv[1]; x, y, w, h = map(int, sys.argv[2:]); Image.open(p).crop((x, y, x + w, y + h)).save(p)' "$@"
    return
  fi
  # sips leaves the image whole, and exits 0, when a crop touches the bottom edge; stop one pixel short.
  local H h="$5"
  H="$(sips -g pixelHeight "$1" | awk '/pixelHeight/{print $2}')"
  [ $(($3 + h)) -lt "$H" ] || h=$((H - $3 - 1))
  sips -c "$h" "$4" --cropOffset "$3" "$2" "$1" >/dev/null
}

cmd_ui() { dump; grep -oE '(text|content-desc)="[^"]+"' "$WORK/ui.xml" | sort -u || true; }

app_pid() { a shell pidof "$PKG" 2>/dev/null | tr -d '\r' | awk '{print $1}'; }

# The app's own process (a crashed app has no pid, so then all), warnings and errors only: the dev build logs a styling banner at info level.
cmd_logs() {
  need_device
  local n=40 all="" pid="" re=' [WEF] ReactNativeJS|ReferenceError|TypeError|FATAL EXCEPTION|runtime not ready'
  while [ $# -gt 0 ]; do case "$1" in --all) all=1 ;; --info) re="ReactNativeJS|${re#* ReactNativeJS|}" ;; *) n="$1" ;; esac; shift; done
  [ -n "$all" ] || pid="$(app_pid)" || true
  if [ -n "$pid" ]; then a logcat -d --pid="$pid" 2>/dev/null; else a logcat -d 2>/dev/null; fi | grep -E "$re" | tail -"$n" || true
}

# Pull db + WAL together: expo-sqlite runs in WAL mode, so writes made seconds
# ago live in the -wal file and are invisible if you copy only the .db.
pull_db() {
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
      die "no database on device — the app creates it on first launch (after 'reset', run 'up')"
    fi
    die "could not read DB: $(head -c 200 "$WORK/db/moneyapp.db" 2>/dev/null)"
  fi
}

# Runs JS against the pulled copy, opened writable so SQLite replays the WAL.
db_node() { MQA_DB="$WORK/db/moneyapp.db" MQA_ROOT="$ROOT" node -e "const db = new (require(process.env.MQA_ROOT + '/node_modules/better-sqlite3'))(process.env.MQA_DB); $1"; }

cmd_db() {
  need_device
  [ $# -ge 1 ] || die "usage: mqa db \"select * from accounts\""
  pull_db
  # .all() throws on a statement that returns no rows; pick the right one.
  MQA_SQL="$1" db_node 'const s = db.prepare(process.env.MQA_SQL); console.log(s.reader ? JSON.stringify(s.all(), null, 2) : JSON.stringify(s.run()));'
}

# Column names come from the device's own schema, not from memory: three agents on 26 Sep queried a `date` column that does not exist.
cmd_schema() {
  need_device
  pull_db
  MQA_T="${1:-}" db_node '
    const t = process.env.MQA_T;
    const names = t ? [t] : db.prepare("select name from sqlite_master where type = ? and name not like ? order by name").all("table", "sqlite_%").map(r => r.name);
    for (const name of names) {
      const cols = db.prepare("select * from pragma_table_info(?)").all(name);
      if (!cols.length) { console.error("mqa: no table " + name); process.exit(1); }
      console.log(t ? cols.map(c => [c.name, c.type, c.notnull ? "not null" : "", c.pk ? "pk" : ""].filter(Boolean).join(" ")).join("\n")
                    : name + ": " + cols.map(c => c.name).join(", "));
    }'
}

# A prepared database replaces the app's own: stop the app, drop the WAL pair, stream the file through run-as, check the size.
push_seed() {
  local file="$1" dir=files/SQLite want got
  [ -f "$file" ] || die "no seed at $file"
  head -c 15 "$file" | grep -q "SQLite format" || die "$file is not a SQLite database"
  a shell am force-stop "$PKG"
  a shell run-as "$PKG" mkdir -p "$dir"
  a shell run-as "$PKG" rm -f "$dir/moneyapp.db-wal" "$dir/moneyapp.db-shm"
  base64 -i "$file" | a shell "run-as $PKG sh -c 'base64 -d > $dir/moneyapp.db'"
  want="$(stat -f %z "$file")"; got="$(a shell run-as "$PKG" stat -c %s "$dir/moneyapp.db" | tr -d '\r')"
  [ "$want" = "$got" ] || die "seed push wrote $got of $want bytes"
  echo "seeded $(basename "$file"), $want bytes"
}

# One self-contained file, WAL folded in, ready for a later `mqa seed`.
save_seed() {
  pull_db
  mkdir -p "$(dirname "$1")"; rm -f "$1"
  MQA_OUT="$1" db_node 'db.prepare("vacuum into ?").run(process.env.MQA_OUT);'
  echo "saved $1, $(stat -f %z "$1") bytes"
}

cmd_seed() {
  need_device
  case "${1:-}" in
    --save) save_seed "${2:?usage: mqa seed --save <file.db>}" ;;
    '' | -*) die "usage: mqa seed <file.db> | mqa seed --save <file.db>" ;;
    *)
      push_seed "$1"
      if metro_up; then launch_ready "$READY_DEFAULT"; echo "ready: $S, Metro :$PORT, engine $ENGINE"; else echo "the app is stopped; mqa up launches it"; fi ;;
  esac
}

top_activity() { a shell dumpsys activity activities 2>/dev/null | sed -n 's/.*topResumedActivity=ActivityRecord{[^ ]* [^ ]* \([^ ]*\).*/\1/p' | head -1 | tr -d '\r'; }

cmd_state() {
  need_device
  local pid top
  pid="$(app_pid)" || true
  top="$(top_activity)" || true
  if [ -n "$pid" ]; then echo "app: running, pid $pid"; else echo "app: not running"; fi
  echo "top activity: ${top:-none}"
  echo "keyboard: $(if ime_shown; then echo shown; else echo hidden; fi)"
  echo "metro: $(cmd_metro status)"
  echo "engine: $ENGINE"
}

# --- screen engine -----------------------------------------------------------
# stdout passes through; stderr is kept in AD_ERR and reprinted with agent-device's own CLI hints swapped for mqa's.
AD_ERR=""
ad() {
  local rc=0
  { AD_ERR="$(AGENT_DEVICE_NO_UPDATE_NOTIFIER=1 AGENT_DEVICE_ANDROID_DEVICE_ALLOWLIST="$S" "$AD_BIN" "$@" 2>&1 1>&3 3>&-)" || rc=$?; } 3>&1
  [ -z "$AD_ERR" ] || ad_explain >&2
  return "$rc"
}
ad_explain() {
  grep -vE '^(Hint|Diagnostic ID|Diagnostics Log):|^Warning: android snapshots are slow' <<<"$AD_ERR" || true
  if no_idle; then
    echo "mqa: the screen never went idle, so it cannot be read (a looping animation such as a loading skeleton). Prove this state with mqa shot; tapxy still taps."
  fi
  case "$AD_ERR" in *AMBIGUOUS_MATCH*) echo "mqa: more than one node matches; pick an exact label=\"…\" or id=\"…\" from mqa read" ;; esac
}
# Only the accessibility timeout means a screen that never settles; agent-device's other helper failures are transient.
no_idle() { case "$AD_ERR" in *'continuously changing app UI'* | *'snapshot helper failed'*'timed out'*) return 0 ;; *) return 1 ;; esac; }

# On a miss, print what is on screen that looks like the target; skipped when the screen cannot be read at all.
suggest() {
  case "$AD_ERR" in *'snapshot helper failed'* | *AMBIGUOUS_MATCH*) return 0 ;; esac
  local f near
  f="$(snap_file 2>/dev/null)" || return 0
  near="$(query near "$f" "$1" 2>/dev/null)" || return 0
  [ -z "$near" ] || printf 'mqa: on screen now, closest to %s:\n%s\n' "$1" "$near" >&2
}
need_ad() { [ -x "$AD_BIN" ] || die "agent-device is missing at $AD_BIN: run npm install, or set MQA_UI=uiautomator"; }
uses_ad() { [ "$ENGINE" = agent-device ] && need_ad; }
# Give an action's target up to 10 s to render, as locate_retry does for uiautomator; the action itself reports a miss.
ad_settle() {
  case "$1" in
    @*) ;;
    '~'*) ad wait text "${1#\~}" 10000 >/dev/null 2>&1 || true ;;
    *) ad wait "$(sel "$1")" 10000 >/dev/null 2>&1 || true ;;
  esac
}

# Selectors: label="…" or text="…" is an exact label or text, id="…" a testID, ~text a substring, @eN a snapshot ref; bare text is a label (and, in bounds, shot and read, also a testID).
sel() { case "$1" in *=* | @* | '~'*) printf '%s' "$1" ;; *) printf 'label="%s"' "$1" ;; esac; }

# The current screen as a file query can read: agent-device JSON, or a uiautomator dump.
snap_file() {
  need_device
  if uses_ad; then
    ad snapshot "$@" --json > "$WORK/snap.json"
    echo "$WORK/snap.json"
  else
    dump
    echo "$WORK/ui.xml"
  fi
}


# query <mode> <file> [sel]: bounds (dp per match), rect (px, largest), within, where (on/below/above/absent), box, sig, near, screen (read).
query() {
  "$PY" - "$DENSITY" "$@" <<'PY'
import difflib, hashlib, json, os, re, sys
D = float(sys.argv[1]); mode, path, sels = sys.argv[2], sys.argv[3], sys.argv[4:]
raw = open(path, encoding='utf8').read()
nodes, page = [], ''
def add(cls, label, text, nid, x, y, w, h, enabled, selected, vis=True, ref='', depth=0, flags=(), idx=None, parent=None, sys_ui=False):
    nid = '' if ':id/' in nid else nid
    nodes.append(dict(cls=cls.split('.')[-1], label=label, text=text, id=nid, x=x, y=y, w=w, h=h, enabled=enabled, selected=selected,
                      vis=vis, ref=ref, depth=depth, flags=[f for f in flags if f], idx=idx, parent=parent, sys=sys_ui))
if raw.lstrip().startswith('{'):
    doc = json.loads(raw)
    page = (doc.get('data') or {}).get('appName', '') if isinstance(doc, dict) else ''
    app = (doc.get('data') or {}).get('appBundleId', '') if isinstance(doc, dict) else ''
    def walk(o):
        if isinstance(o, dict):
            if 'rect' in o:
                r, t = o['rect'], o.get('type', '')
                flags = ('scrollable' if t.endswith('ScrollView') else '', 'editable' if o.get('editable') else '',
                         'content below hidden' if o.get('hiddenContentBelow') else '')
                add(t, o.get('label') or '', o.get('value') or '', o.get('identifier') or '', r['x'], r['y'], r['width'], r['height'],
                    o.get('enabled', True), bool(o.get('selected')), o.get('visibleToUser', True) is not False, o.get('ref', ''), o.get('depth', 0), flags,
                    o.get('index'), o.get('parentIndex'), bool(app and o.get('bundleId') and o.get('bundleId') != app))
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    walk(doc)
else:
    import xml.etree.ElementTree as ET
    for c in ET.fromstring(raw[raw.index('<hierarchy'):raw.rindex('</hierarchy>') + len('</hierarchy>')]).iter('node'):
        b = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', c.get('bounds', ''))
        x1, y1, x2, y2 = map(int, b.groups()) if b else (0, 0, 0, 0)
        add(c.get('class', ''), c.get('content-desc') or c.get('text', ''), c.get('text', ''), c.get('resource-id', ''),
            x1, y1, x2 - x1, y2 - y1, c.get('enabled') == 'true', c.get('selected') == 'true')
H = int(os.environ.get('MQA_H') or 0) or max((n['y'] + n['h'] for n in nodes if n['depth'] == 0), default=0)
def onscreen(n): return n['vis'] and n['h'] > 0 and n['y'] >= -2 and n['y'] + n['h'] <= H + 2
def match(n, s):
    if s.startswith('@'): return n['ref'] == s[1:]
    if s.startswith('~'): return s[1:] in n['label'] or s[1:] in n['text']
    k, eq, v = s.partition('=')
    if not eq: return s in (n['label'], n['text'], n['id'])
    v = v.strip('"')
    if k == 'id': return n['id'] == v or n['id'].endswith('/' + v)
    if k in ('label', 'text'): return v in (n['label'], n['text'])
    sys.exit(f'mqa: unknown selector {s}')
def line(n, indent=''):
    state = ('enabled' if n['enabled'] else 'disabled') + (' selected' if n['selected'] else '')
    nid = f" id={n['id']!r}" if n['id'] else ''
    return f"{indent}{n['cls']} label={n['label']!r}{nid} x={n['x'] / D:.1f} y={n['y'] / D:.1f} w={n['w'] / D:.1f} h={n['h'] / D:.2f}dp {state}"
if mode == 'where':
    hits = [n for n in nodes if match(n, sels[0])]
    if not hits: print('absent')
    elif any(onscreen(n) for n in hits): print('on')
    else:
        # A node scrolled out of a list collapses to zero size outside that list's viewport: its nearest scrollable ancestor says which side.
        n, byidx = hits[0], {c['idx']: c for c in nodes if c['idx'] is not None}
        c = byidx.get(n['parent'])
        while c and 'scrollable' not in c['flags']: c = byidx.get(c['parent'])
        if c and c['h'] > 0: print('above' if n['y'] < c['y'] + c['h'] / 2 else 'below')
        else: print('below' if n['y'] >= H / 2 else 'above')
    sys.exit()
if mode == 'box':
    hits = [n for n in nodes if match(n, sels[0])]
    byidx = {c['idx']: c for c in nodes if c['idx'] is not None}
    c = byidx.get(hits[0]['parent']) if hits else None
    while c and 'scrollable' not in c['flags']: c = byidx.get(c['parent'])
    if c and c['h'] > 0: print(c['x'], c['y'], c['w'], c['h'])
    sys.exit()
if mode == 'sig':
    print(hashlib.md5('|'.join(f"{n['label']}{n['text']}{n['id']}@{n['y']}" for n in nodes if onscreen(n)).encode()).hexdigest())
    sys.exit()
if mode == 'near':
    s = sels[0]; k, eq, v = s.partition('=')
    want = (v.strip('"') if eq else s.lstrip('~')).lower()
    cands = {}
    for n in nodes:
        if not onscreen(n) or n['sys']: continue
        for kind in ('label', 'text', 'id'):
            val = n[kind]
            if val and len(val) < 90 and val.lower() not in cands.values(): cands[f'{kind}="{val}"'] = val.lower()
    def score(val): return difflib.SequenceMatcher(None, want, val).ratio() + (0.5 if min(len(want), len(val)) > 3 and (want in val or val in want) else 0)
    ranked = sorted(cands, key=lambda c: -score(cands[c]))
    best = [c for c in ranked if score(cands[c]) >= 0.45][:6]
    if best: print('\n'.join('  ' + c for c in best))
    else: print(f"  nothing like it; the screen shows {', '.join(c for c in list(cands)[:8])}")
    sys.exit()
GLYPH = re.compile('^[-\U000f0000-\U0010ffff]$')
KIND = {'Button': 'button', 'TextView': 'text', 'EditText': 'field', 'ImageView': 'image', 'ScrollView': 'scroll', 'HorizontalScrollView': 'scroll',
        'ViewGroup': 'group', 'View': 'group', 'SvgView': 'image', 'CheckBox': 'checkbox', 'Switch': 'switch'}
if mode == 'screen':
    out, labelled, shown = [], [], []
    for n in nodes:
        while labelled and labelled[-1][0] >= n['depth']: labelled.pop()
        while shown and shown[-1] >= n['depth']: shown.pop()
        lab = n['label'] or n['text']
        folded = bool(lab) and not n['id'] and any(lab in a for _, a in labelled)
        if lab: labelled.append((n['depth'], lab))
        if not n['vis'] or folded or (lab and GLYPH.match(lab) and not n['id']): continue
        if not (lab or n['id'] or 'scrollable' in n['flags']): continue
        extra = [f for f in n['flags'] if f != 'editable'] + (['selected'] if n['selected'] else []) + ([] if n['enabled'] else ['disabled'])
        text = f" text={n['text']!r}" if n['label'] and n['text'] and n['text'] != n['label'] else ''
        out.append('  ' * min(len(shown), 5) + ' '.join(p for p in (f"@{n['ref']}" if n['ref'] else '', KIND.get(n['cls'], n['cls'].lower()),
                   json.dumps(lab, ensure_ascii=False) if lab else '', f"id={n['id']}" if n['id'] else '', text.strip(),
                   ' '.join(f'[{e}]' for e in extra)) if p))
        shown.append(n['depth'])
    print(f"screen {page or '?'} · {len(out)} nodes")
    print('\n'.join(out))
    sys.exit()
if mode == 'within':
    s = sels[0]
    roots = [n for n in nodes if match(n, s)] or [n for n in nodes if s in n['label']]
    if not roots: sys.exit(f'mqa: nothing on screen matches {s}')
    r, t = roots[0], 2
    print(line(r))
    inside = [n for n in nodes if n is not r and (n['label'] or n['text']) and r['x'] - t <= n['x'] and r['y'] - t <= n['y']
              and n['x'] + n['w'] <= r['x'] + r['w'] + t and n['y'] + n['h'] <= r['y'] + r['h'] + t]
    for n in sorted(inside, key=lambda n: (n['y'], n['x'])): print(line(n, '  '))
    sys.exit()
if mode == 'rect':
    hits = [n for n in nodes if match(n, sels[0])]
    if not hits: sys.exit(f'mqa: no node matches {sels[0]}')
    n = max(hits, key=lambda n: n['w'] * n['h'])
    print(n['x'], n['y'], n['w'], n['h'])
    sys.exit()
for s in sels:
    hits = [n for n in nodes if match(n, s)]
    if not hits: print(f'{s}: no match')
    for n in hits: print(f"{s}: {line(n)}")
PY
}

cmd_bounds() {
  [ $# -ge 1 ] || die "usage: mqa bounds <selector>..."
  local f
  f="$(snap_file)"
  query bounds "$f" "$@"
}

cmd_read() {
  local f
  if uses_ad; then
    need_device
    if [ -z "${1:-}" ]; then f="$(snap_file -i)"; query screen "$f"; return; fi
  elif [ -z "${1:-}" ]; then
    cmd_ui; return
  fi
  # A scope lists every labelled node drawn inside it: React Native flattens a testID container's children out of the tree.
  f="$(snap_file)"
  query within "$f" "$1"
}

# agent-device refuses to press a node outside the viewport; bring it in with the same raw drag scroll uses, then press once more.
ad_press() {
  local t="$1" f w ref
  case "$t" in '~'*) ad find "${t#\~}" click 2>/dev/null && return ;; *) ad press "$(sel "$t")" 2>/dev/null && return ;; esac
  # A row and the texts inside it match together; when one candidate's label holds every other's, they are one element: press that one.
  if [[ "$AD_ERR" == *AMBIGUOUS_MATCH*Candidates* ]]; then
    ref="$("$PY" -c '
import re, sys
c = re.findall(r"^\s*@(e\d+) \[[^]]*\] \"(.*)\"$", sys.stdin.read(), re.M)
print(next((r for r, l in c if all(o in l for _, o in c)), ""))' <<<"$AD_ERR")"
    if [ -n "$ref" ]; then ad press "@$ref"; return; fi
  fi
  case "$AD_ERR" in *'not safe to press'*) ;; *) ad_explain >&2; suggest "$t"; return 1 ;; esac
  ad_explain >&2
  f="$(snap_file)"; w="$(query where "$f" "$(sel "$t")")"; SWIPE_BOX="$(query box "$f" "$(sel "$t")")"
  case "$w" in above) cmd_scroll up --until "$t" >&2 ;; *) cmd_scroll down --until "$t" >&2 ;; esac
  case "$t" in '~'*) ad find "${t#\~}" click ;; *) ad press "$(sel "$t")" ;; esac
}

cmd_press() {
  local t="${1:?usage: mqa tap <selector>}" f r x y w h
  if uses_ad; then
    need_device
    ad_settle "$t"
    if no_idle; then ad_explain >&2; return 1; fi
    ad_press "$t"
    return
  fi
  case "$t" in
    id=* | '~'*)
      f="$(snap_file)"; r="$(query rect "$f" "$t")" || { suggest "$t"; exit 1; }; read -r x y w h <<<"$r"
      a shell input tap "$((x + w / 2))" "$((y + h / 2))"; dump
      echo "tapped $t at $((x + w / 2)) $((y + h / 2))" ;;
    label=* | text=*) t="${t#*=}"; t="${t#\"}"; cmd_tap "${t%\"}" ;;
    *) cmd_tap "$t" ;;
  esac
}

cmd_fill() {
  local t="${1:?usage: mqa fill <selector> <text>}" text="${2?usage: mqa fill <selector> <text>}"
  if uses_ad; then
    need_device
    ad_settle "$t"
    if no_idle; then ad_explain >&2; return 1; fi
    case "$t" in '~'*) ad find "${t#\~}" fill "$text" ;; *) ad fill "$(sel "$t")" "$text" ;; esac || { suggest "$t"; return 1; }
    return
  fi
  cmd_press "$t" >/dev/null
  grep -oE '<node[^>]*class="android.widget.EditText"[^>]*>' "$WORK/ui.xml" | grep -q 'focused="true"' \
    || die "fill: no text field has focus after tapping $t"
  cmd_clear; cmd_type "$text"; echo "filled $t"
}

# Wait on the value you are about to assert, never on a nearby label: the totals strip settles after the filter badge.
cmd_wait() {
  local t="${1:?usage: mqa wait <selector> [ms]}" ms="${2:-10000}" end
  if uses_ad; then
    need_device
    wait_or_poll "$t" "$ms" "$ms" || { ad_explain >&2; suggest "$t"; return 1; }
    echo "saw $t"; return
  fi
  ua_poll "$t" "$ms" || { suggest "$t"; die "timed out after ${ms}ms waiting for $t"; }
  echo "saw $t"
}

# agent-device's wait can lose its capture session on a loaded device while a plain snapshot still reads: poll those for $3 ms, after the optional gate command $4.
wait_or_poll() { ad_wait "$1" "$2" 2>/dev/null || { ! no_idle && "${4:-true}" && ad_poll "$1" "$3"; }; }
ad_wait() { case "$1" in '~'*) ad wait text "${1#\~}" "$2" >/dev/null ;; *) ad wait "$(sel "$1")" "$2" >/dev/null ;; esac; }
ad_poll() {
  local end=$((SECONDS + ($2 + 999) / 1000)) err="$AD_ERR"
  while [ "$SECONDS" -lt "$end" ]; do
    if ad snapshot --json > "$WORK/poll.json" 2>/dev/null && [ "$(query where "$WORK/poll.json" "$(sel "$1")")" = on ]; then return 0; fi
    sleep 0.5
  done
  AD_ERR="$err"; return 1
}

# Poll uiautomator dumps for a selector; returns 1 on timeout instead of exiting, so callers can retry.
ua_poll() {
  local end=$((SECONDS + ($2 + 999) / 1000))
  while :; do
    # A dump taken mid-launch can come back empty; that is "not yet", not a failure. A held device is.
    if (dump) >/dev/null 2>&1 && query rect "$WORK/ui.xml" "$(sel "$1")" >/dev/null 2>&1; then return 0; fi
    held_die
    [ "$SECONDS" -lt "$end" ] || return 1
    sleep 0.5
  done
}

# A raw drag under both engines: agent-device's synthesized scroll reports "moved nothing" on this app's transaction list.
SWIPE_BOX=""   # px "x y w h" of one list: a sheet's form scrolls only when the drag starts inside it
swipe_once() {
  local H x=540 lo hi bx by bw bh
  cmd_ime_down   # an open keyboard turns the drag into typing, or a gesture that leaves the app
  if [ -n "$SWIPE_BOX" ]; then
    read -r bx by bw bh <<<"$SWIPE_BOX"; x=$((bx + bw / 2)); lo=$((by + bh * 8 / 10)); hi=$((by + bh * 2 / 10))
  else
    H="$(a shell wm size | sed -n 's/.*: [0-9]*x\([0-9]*\).*/\1/p' | tr -d '\r')"; H="${H:-1920}"; lo=$((H * 7 / 10)); hi=$((H * 3 / 10))
  fi
  case "$1" in
    down) a shell input swipe "$x" "$lo" "$x" "$hi" 600 ;;
    up) a shell input swipe "$x" "$hi" "$x" "$lo" 600 ;;
    *) die "usage: mqa scroll <up|down> [--in <sel>] [--until <sel>]" ;;
  esac
}

# --until stops on the first on-screen match, or when a swipe no longer changes the screen: the end of the list.
cmd_scroll() {
  local dir="${1:?usage: mqa scroll <up|down> [--in <sel>] [--until <sel>]}" target="" f i sig last="" still=0
  shift
  need_device
  while [ $# -gt 0 ]; do
    case "$1" in
      --until) target="$(sel "${2:?--until <selector>}")"; shift 2 ;;
      --in) f="$(snap_file)"; SWIPE_BOX="$(query rect "$f" "$(sel "${2:?--in <selector>}")")"; shift 2 ;;
      *) die "usage: mqa scroll <up|down> [--in <sel>] [--until <sel>]" ;;
    esac
  done
  if [ -z "$target" ]; then swipe_once "$dir"; uses_ad || dump; return; fi
  for ((i = 0; i <= 25; i++)); do
    f="$(snap_file)"
    if [ "$(query where "$f" "$target")" = on ]; then echo "reached $target after $i swipes"; return; fi
    sig="$(query sig "$f")"
    # One still swipe can be a paginated list fetching its next page; two in a row is its end.
    if [ "$sig" = "$last" ]; then
      still=$((still + 1))
      [ "$still" -lt 2 ] || die "scroll: swipes $((i - 1)) and $i $dir moved nothing, so the list ends here and $target is not on it"
      sleep 1.5
    else
      still=0
    fi
    last="$sig"
    [ "$i" -lt 25 ] || break
    swipe_once "$dir"; sleep 0.4
  done
  die "scroll: $target not on screen after 25 swipes $dir"
}

cmd_open() {
  local u="${1:?usage: mqa open <route|url>}" err
  case "$u" in *://*) ;; /*) u="$SCHEME:/$u" ;; *) u="$SCHEME://$u" ;; esac
  need_device
  if uses_ad; then
    ad open "$u" >/dev/null
  else
    # am start warns on stderr whenever the app is already running; that is the normal case here.
    err="$(a shell am start -a android.intent.action.VIEW -d "$u" 2>&1 >/dev/null)" || true
    grep -v 'intent has been delivered to currently running' <<<"$err" | grep . >&2 || true
  fi
  echo "opened $u"
}

cmd_key() { need_device; a shell input keyevent "${1:?keycode}"; uses_ad || dump; }

cmd_down() {
  need_device
  if [ -x "$AD_BIN" ]; then ad close >/dev/null 2>&1 || true; fi
  echo "closed the agent-device session on $S; the system keyboard is back. The claim and Metro stay for the next run."
}

# --- Metro -------------------------------------------------------------------
metro_pid() { lsof -nP -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -1 || true; }
metro_cwd() { lsof -a -p "$1" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | tail -1; }
metro_up() { curl -s --max-time 2 "http://127.0.0.1:$PORT/status" 2>/dev/null | grep -q packager-status:running; }

# One Metro per worktree on the claimed port; a moved HEAD restarts it with --clear, since a cached transform serves the old commit.
cmd_metro() {
  need_device
  local sub="${1:-start}" wt head pid cwd="" i log="$WORK/metro.log"
  wt="$(worktree)"; head="$(git -C "$wt" rev-parse HEAD)"; pid="$(metro_pid)"
  [ -z "$pid" ] || cwd="$(metro_cwd "$pid")"
  case "$sub" in
    status)
      if [ -n "$pid" ]; then echo "Metro :$PORT pid $pid from $cwd, started at $(cut -c1-8 "$WORK/metro.head" 2>/dev/null || echo unknown)"; else echo "no Metro on :$PORT"; fi
      return ;;
    stop)
      [ -n "$pid" ] || { echo "no Metro on :$PORT"; return; }
      [ "$cwd" = "$wt" ] || die "Metro on :$PORT runs from $cwd, not this worktree; not stopping it"
      kill "$pid"; rm -f "$WORK/metro.head"; echo "stopped Metro on :$PORT"
      return ;;
    start | restart) ;;
    *) die "usage: mqa metro [start|restart|stop|status]" ;;
  esac
  if [ -n "$pid" ]; then
    [ "$cwd" = "$wt" ] || die "port :$PORT is held by $cwd, which would serve another branch to this device; stop it first"
    if [ "$sub" = start ] && [ "$(cat "$WORK/metro.head" 2>/dev/null)" = "$head" ] && metro_up; then
      echo "Metro :$PORT already serves $wt at ${head:0:8}"; return
    fi
    kill "$pid"
    for ((i = 0; i < 20; i++)); do [ -n "$(metro_pid)" ] || break; sleep 0.5; done
  fi
  # Redirect the whole group: a backgrounded list that keeps the caller's stdout makes `mqa up | tail` wait on Metro forever.
  (cd "$wt" && exec nohup npx expo start --port "$PORT" --clear) < /dev/null > "$log" 2>&1 &
  echo "$head" > "$WORK/metro.head"
  for ((i = 0; i < 180; i++)); do metro_up && break; sleep 1; done
  metro_up || die "Metro did not answer on :$PORT within 180 s; see $log"
  echo "Metro :$PORT from $wt at ${head:0:8} (log: $log)"
}

# This worktree's slot, taken now if it has none: `up` is the first call of a run, so the claim rides on it.
ensure_claim() {
  if [ -n "${MQA_SERIAL:-}" ]; then echo "device: $S, from MQA_SERIAL"; return; fi
  local slot out
  if slot="$(my_slot)"; then
    touch "$LEASE_DIR/$slot"; echo "claim: slot $slot, $(slot_serial "$slot"), already this worktree's"
  else
    out="$(cmd_claim)"
    grep WARNING <<<"$out" || true
    slot="$(my_slot)" || die "claim failed: $out"
    echo "claim: slot $slot, $(slot_serial "$slot"), claimed now"
  fi
  S="$(lease_field "$slot" serial)"; PORT="${MQA_PORT:-$(lease_field "$slot" port)}"
  WORK="${MQA_WORK:-${TMPDIR:-/tmp}/mqa/$S}"; mkdir -p "$WORK"
}

# A launch whose app left the front relaunches at once; one in front has its dev overlays dismissed before the poll.
front_and_clear() {
  local err="$AD_ERR"
  case "$(top_activity)" in "$PKG"/*) ;; *) return 1 ;; esac
  ad react-native dismiss-overlay >/dev/null 2>&1 || true
  AD_ERR="$err"
}

# A cold launch on this worktree's Metro, then the first screen.
launch_ready() {
  local ready="$1" ready_ms="${MQA_READY_MS:-90000}" url try
  url="$SCHEME://expo-development-client/?url=http%3A%2F%2Flocalhost%3A$PORT"
  a reverse "tcp:$PORT" "tcp:$PORT" >/dev/null
  if uses_ad; then ad close >/dev/null 2>&1 || true; fi
  # A launch can stall: one agent-device open in four left the home screen, one uiautomator launch in nine sat 92 s. A second launch recovers it.
  for try in 1 2; do
    a shell am force-stop "$PKG"
    if uses_ad; then
      ad open "$PKG" "$url" --platform android --serial "$S" >/dev/null
      if wait_or_poll "$ready" "$ready_ms" "${MQA_READY_POLL_MS:-15000}" front_and_clear; then break; fi
    else
      a shell am start -a android.intent.action.VIEW -d "$url" >/dev/null
      if ua_poll "$ready" "$ready_ms"; then break; fi
    fi
    [ "$try" = 1 ] || die "the app never showed $ready after two launches. Check: mqa logs"
    echo "launch $try stalled; relaunching" >&2
  done
  if uses_ad; then ad react-native dismiss-overlay >/dev/null 2>&1 || true; fi
}

# The start of every run, in one call: the claim, the build verdict, this worktree's Metro, an optional seed, a cold launch.
cmd_up() {
  local ready="$READY_DEFAULT" seed="" v
  while [ $# -gt 0 ]; do
    case "$1" in
      --ready) ready="$(sel "${2:?--ready <selector>}")"; shift 2 ;;
      --seed) seed="${2:?--seed <file.db>}"; shift 2 ;;
      *) die "usage: mqa up [--seed <file.db>] [--ready <selector>]" ;;
    esac
  done
  ensure_claim
  need_device
  v="$(build_verdict)" || true
  sed '1s/^/build: /' <<<"$v"
  v="$(cmd_metro start)"
  echo "metro: $v"
  [ -z "$seed" ] || push_seed "$seed"
  launch_ready "$ready"
  v="$(cmd_park 2>/dev/null)" || true
  case "$v" in turned*) echo "tools: $v" ;; esac
  echo "ready: $S, Metro :$PORT, engine $ENGINE"
}

usage() {
  cat <<'EOF'
mqa: drive the MoneyApp dev client on an Android emulator and read state back.
Call it as `bash .claude/skills/emulator-verify/mqa.sh <verb>`, one verb per Bash call, typed out in full:
the worktree guard refuses a function or variable wrapped around it, and a chain. Sequences go in a walk file.

run         up [--seed <file.db>] [--ready <sel>]
                                    claim this worktree's slot if needed, print the build verdict, start or reuse
                                    this worktree's Metro, push a seed, cold launch, wait for the tab bar
            down                    close the agent-device session (restores the keyboard); claim and Metro stay
            open <route|url>        /transactions or moneyapp://…
screen      read [scope]            what is on screen with refs and testIDs; a scope lists what is drawn inside it
            bounds <sel>...         each match: x y w h in dp, testID, enabled/disabled, selected
            tap <sel> | fill <sel> <text>   each waits up to 10 s for its target; tap scrolls an off-screen target in
            wait <sel> [ms]         wait for the value you are about to assert (default 10000)
            scroll <up|down> [--in <sel>] [--until <sel>]   a raw drag, inside <sel> when given (a sheet's form);
                                    --until stops on sight, or where the list stops moving
            type <text> | clear | key <code> | back | tapxy <x> <y> | park | ime-down | ui | find <label>
evidence    shot [name] [--crop <sel>] [--out <dir>]   cropped to the largest match of <sel>
            db "<sql>" | schema [table]        query the device's SQLite · its tables and columns
            logs [n] [--info] [--all]   JS warnings, errors and crashes from the running app; --info adds console.log, --all every process
            state                   app pid, top activity, keyboard, Metro, engine
data        seed <file.db> | seed --save <file.db>   replace the app's database and relaunch · save it to a file
scripts     walk <script.sh> | step <label>   the script runs under -euo pipefail with $MQA set to this script
lifecycle   needs-build [base] [--exit-code] | build | install | abi | reset
            claim [slot] | release | claims | boot [slot] | metro [start|restart|stop|status]
            `up` covers claim, needs-build and metro; call these only to inspect or repair

selectors   label="…" or text="…" exact · id="…" testID · ~text substring · @eN ref from read
            bare text = a label; in bounds, shot --crop and read it also matches a testID
engine      agent-device (default when installed) or MQA_UI=uiautomator; one per device at a time
files       Metro log and pulled DB: $TMPDIR/mqa/<serial>/ (metro.log, metro.head, db/)
env         MQA_UI MQA_SERIAL MQA_PORT MQA_PKG MQA_APK MQA_WORK MQA_SLOTS MQA_LEASE_DIR MQA_LEASE_TTL MQA_PYTHON MQA_READY_MS

Slots: 1 emulator-5554 :8082 · 2 emulator-5556 :8083 · 3 emulator-5558 :8084, one per worktree.

A run is two lifecycle calls around one walk:
  mqa up                    # on build: REBUILD, a /ship implementer builds: mqa build, then mqa install, one call each, then up again; any other session asks first, the render lens never builds
  mqa walk <walk.sh>        # written with the Write tool, not a heredoc
  mqa down
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
  needs-build) shift; cmd_needs_build "$@" ;;
  metro)    cmd_metro "${2:-start}" ;;
  up)       shift; cmd_up "$@" ;;
  down)     cmd_down ;;
  open)     cmd_open "${2:-}" ;;
  park)     cmd_park ;;
  walk)     cmd_walk "${2:?walk script}" ;;
  step)     shift; cmd_step "$@" ;;
  shot)     shift; cmd_shot "$@" ;;
  ui | read) cmd_read "${2:-}" ;;
  bounds)   shift; cmd_bounds "$@" ;;
  find)     if uses_ad; then cmd_bounds "$(sel "${2:?label}")"; else dump; locate "${2:?label}"; fi ;;
  tap)      cmd_press "${2:?selector}" ;;
  fill)     cmd_fill "${2:?selector}" "${3?text}" ;;
  wait)     cmd_wait "${2:?selector}" "${3:-10000}" ;;
  scroll)   shift; cmd_scroll "$@" ;;
  tapxy)    need_device; if uses_ad; then ad press "${2:?x}" "${3:?y}"; else cmd_ime_down; a shell input tap "${2:?x}" "${3:?y}"; dump; fi ;;
  type)     if uses_ad; then need_device; ad type "${2:?text}"; else cmd_type "${2:?text}"; fi ;;
  clear)    if uses_ad; then need_device; a shell input keyevent 123 $(printf '67 %.0s' $(seq 1 60)); else cmd_clear; fi ;;
  key)      cmd_key "${2:?keycode}" ;;
  back)     if uses_ad; then need_device; ad back; else cmd_back; fi ;;
  ime-down) cmd_ime_down ;;
  db)       shift; cmd_db "$@" ;;
  schema)   cmd_schema "${2:-}" ;;
  seed)     shift; cmd_seed "$@" ;;
  state)    cmd_state ;;
  logs)     shift; cmd_logs "$@" ;;
  *)        usage ;;
esac
