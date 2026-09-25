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
  next: mqa up   # starts Metro on :$(slot_port "$slot") from this worktree and launches the app
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
  # An open agent-device session leaves its headless keyboard active for the next holder.
  if [ -x "$AD_BIN" ] && [ -n "$S" ]; then ad close >/dev/null 2>&1 || true; fi
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

# The dev client's floating Tools bubble captures taps near the header's right-hand action; drag it from where it is, never from a fixed pixel.
cmd_park() {
  need_device
  local f r x y w h H
  f="$(snap_file)"
  r="$(query rect "$f" 'label="Tools"' 2>/dev/null)" || { echo "no Tools bubble on screen; nothing to park"; return 0; }
  read -r x y w h <<<"$r"
  H="$(a shell wm size | sed -n 's/.*: [0-9]*x\([0-9]*\).*/\1/p' | tr -d '\r')"
  a shell input swipe "$((x + w / 2))" "$((y + h / 2))" "$((x + w / 2))" "$((${H:-1920} - 900))" 800
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

# --- screen engine -----------------------------------------------------------
ad() { AGENT_DEVICE_NO_UPDATE_NOTIFIER=1 AGENT_DEVICE_ANDROID_DEVICE_ALLOWLIST="$S" "$AD_BIN" "$@"; }
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
    ad snapshot --json > "$WORK/snap.json"
    echo "$WORK/snap.json"
  else
    dump
    echo "$WORK/ui.xml"
  fi
}

# query bounds <file> <sel>...: each match in dp · query rect <file> <sel>: px rect of the largest match · query within <file> <scope>: what is drawn inside it.
query() {
  "$PY" - "$DENSITY" "$@" <<'PY'
import json, re, sys
D = float(sys.argv[1]); mode, path, sels = sys.argv[2], sys.argv[3], sys.argv[4:]
raw = open(path, encoding='utf8').read()
nodes = []
def add(cls, label, text, nid, x, y, w, h, enabled, selected):
    nodes.append(dict(cls=cls.split('.')[-1], label=label, text=text, id=nid, x=x, y=y, w=w, h=h, enabled=enabled, selected=selected))
if raw.lstrip().startswith('{'):
    def walk(o):
        if isinstance(o, dict):
            if 'rect' in o:
                r = o['rect']
                add(o.get('type', ''), o.get('label') or '', o.get('value') or '', o.get('identifier') or '',
                    r['x'], r['y'], r['width'], r['height'], o.get('enabled', True), bool(o.get('selected')))
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    walk(json.loads(raw))
else:
    import xml.etree.ElementTree as ET
    for c in ET.fromstring(raw[raw.index('<hierarchy'):raw.rindex('</hierarchy>') + len('</hierarchy>')]).iter('node'):
        b = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', c.get('bounds', ''))
        x1, y1, x2, y2 = map(int, b.groups()) if b else (0, 0, 0, 0)
        add(c.get('class', ''), c.get('content-desc') or c.get('text', ''), c.get('text', ''), c.get('resource-id', ''),
            x1, y1, x2 - x1, y2 - y1, c.get('enabled') == 'true', c.get('selected') == 'true')
def match(n, s):
    if s.startswith('~'): return s[1:] in n['label'] or s[1:] in n['text']
    k, eq, v = s.partition('=')
    if not eq: return s in (n['label'], n['text'], n['id'])
    v = v.strip('"')
    if k == 'id': return n['id'] == v or n['id'].endswith('/' + v)
    if k in ('label', 'text'): return v in (n['label'], n['text'])
    sys.exit(f'mqa: unknown selector {s}')
def line(n, indent=''):
    state = ('enabled' if n['enabled'] else 'disabled') + (' selected' if n['selected'] else '')
    return f"{indent}{n['cls']} label={n['label']!r} x={n['x'] / D:.1f} y={n['y'] / D:.1f} w={n['w'] / D:.1f} h={n['h'] / D:.2f}dp {state}"
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
  if uses_ad; then
    need_device
    if [ -z "${1:-}" ]; then ad snapshot -i; return; fi
  elif [ -z "${1:-}" ]; then
    cmd_ui; return
  fi
  # A scope lists every labelled node drawn inside it: React Native flattens a testID container's children out of the tree.
  local f
  f="$(snap_file)"
  query within "$f" "$1"
}

cmd_press() {
  local t="${1:?usage: mqa tap <selector>}" f r x y w h
  if uses_ad; then
    need_device
    ad_settle "$t"
    case "$t" in '~'*) ad find "${t#\~}" click ;; *) ad press "$(sel "$t")" ;; esac
    return
  fi
  case "$t" in
    id=* | '~'*)
      f="$(snap_file)"; r="$(query rect "$f" "$t")"; read -r x y w h <<<"$r"
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
    case "$t" in '~'*) ad find "${t#\~}" fill "$text" ;; *) ad fill "$(sel "$t")" "$text" ;; esac
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
    case "$t" in '~'*) ad wait text "${t#\~}" "$ms" >/dev/null ;; *) ad wait "$(sel "$t")" "$ms" >/dev/null ;; esac
    echo "saw $t"; return
  fi
  ua_poll "$t" "$ms" || die "timed out after ${ms}ms waiting for $t"
  echo "saw $t"
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
swipe_once() {
  local H
  cmd_ime_down   # an open keyboard turns the drag into typing, or a gesture that leaves the app
  H="$(a shell wm size | sed -n 's/.*: [0-9]*x\([0-9]*\).*/\1/p' | tr -d '\r')"; H="${H:-1920}"
  case "$1" in
    down) a shell input swipe 540 $((H * 7 / 10)) 540 $((H * 3 / 10)) 600 ;;
    up) a shell input swipe 540 $((H * 3 / 10)) 540 $((H * 7 / 10)) 600 ;;
    *) die "usage: mqa scroll <up|down> [--until <selector>]" ;;
  esac
}

cmd_scroll() {
  local dir="${1:?usage: mqa scroll <up|down> [--until <selector>]}" target="" f i
  shift
  need_device
  if [ "${1:-}" = --until ]; then target="${2:?--until <selector>}"; fi
  if [ -z "$target" ]; then swipe_once "$dir"; uses_ad || dump; return; fi
  for ((i = 0; i <= 15; i++)); do
    f="$(snap_file)"
    if query rect "$f" "$(sel "$target")" >/dev/null 2>&1; then echo "reached $target after $i swipes"; return; fi
    [ "$i" -lt 15 ] || break
    swipe_once "$dir"; sleep 0.4
  done
  die "scroll: $target not on screen after 15 swipes $dir"
}

cmd_open() {
  local u="${1:?usage: mqa open <route|url>}"
  case "$u" in *://*) ;; /*) u="$SCHEME:/$u" ;; *) u="$SCHEME://$u" ;; esac
  need_device
  if uses_ad; then ad open "$u" >/dev/null; else a shell am start -a android.intent.action.VIEW -d "$u" >/dev/null; fi
  echo "opened $u"
}

cmd_key() { need_device; a shell input keyevent "${1:?keycode}"; uses_ad || dump; }

cmd_down() {
  need_device
  if [ -x "$AD_BIN" ]; then ad close >/dev/null 2>&1 || true; fi
  echo "closed the agent-device session on $S; the system keyboard is back"
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

# Metro, a cold launch on it, and the first screen: the start of every run.
cmd_up() {
  need_device
  local ready="$READY_DEFAULT" ready_ms="${MQA_READY_MS:-90000}" url try
  while [ $# -gt 0 ]; do
    case "$1" in
      --ready) ready="$(sel "${2:?--ready <selector>}")"; shift 2 ;;
      *) die "usage: mqa up [--ready <selector>]" ;;
    esac
  done
  cmd_metro start >/dev/null
  url="$SCHEME://expo-development-client/?url=http%3A%2F%2Flocalhost%3A$PORT"
  a reverse "tcp:$PORT" "tcp:$PORT" >/dev/null
  if uses_ad; then ad close >/dev/null 2>&1 || true; fi
  # A launch can stall: one agent-device open in four left the home screen, one uiautomator launch in nine sat 92 s. A second launch recovers it.
  for try in 1 2; do
    a shell am force-stop "$PKG"
    if uses_ad; then
      ad open "$PKG" "$url" --platform android --serial "$S" >/dev/null
      if ad wait "$ready" "$ready_ms" >/dev/null 2>&1; then break; fi
    else
      a shell am start -a android.intent.action.VIEW -d "$url" >/dev/null
      if ua_poll "$ready" "$ready_ms"; then break; fi
    fi
    [ "$try" = 1 ] || die "the app never showed $ready after two launches. Check: mqa logs"
    echo "launch $try stalled; relaunching" >&2
  done
  if uses_ad; then ad react-native dismiss-overlay >/dev/null 2>&1 || true; fi
  echo "ready: $S, Metro :$PORT, engine $ENGINE"
}

usage() {
  cat <<'EOF'
mqa: drive the MoneyApp dev client on an Android emulator and read state back.
Call it as `bash .claude/skills/emulator-verify/mqa.sh <verb>` from the worktree.

device      claim [slot] | release | claims | boot [slot]
build       needs-build [base] | build | install | abi | reset
run         up [--ready <sel>]      Metro for this worktree, cold launch, first screen, dev overlays cleared
            down                    close the agent-device session (restores the keyboard)
            metro [start|restart|stop|status]
            open <route|url>        /transactions or moneyapp://…
screen      read [scope] | ui       what is on screen; a scope lists what is drawn inside that container
            bounds <sel>...         each match: x y w h in dp, enabled/disabled, selected
            find <label>            bounds of one label
            tap <sel> | fill <sel> <text>   each waits up to 10 s for its target first
            type <text> | clear | key <code> | back | tapxy <x> <y>
            wait <sel> [ms]         wait for the value you are about to assert (default 10000)
            scroll <up|down> [--until <sel>]   a raw drag; --until swipes until the selector is on screen
            park | ime-down
evidence    shot [name] [--crop <sel>] [--out <dir>] | db "<sql>" | logs [n]
scripts     walk <script.sh> | step <label>

selectors   label="…" or text="…" exact · id="…" testID · ~text substring · @eN ref (agent-device)
            bare text = a label; in bounds, shot --crop and read it also matches a testID
engine      agent-device (default when installed) or MQA_UI=uiautomator; one per device at a time
env         MQA_UI MQA_SERIAL MQA_PORT MQA_PKG MQA_APK MQA_WORK MQA_SLOTS MQA_LEASE_DIR MQA_LEASE_TTL MQA_PYTHON MQA_READY_MS

Slots: 1 emulator-5554 :8082 · 2 emulator-5556 :8083 · 3 emulator-5558 :8084, one per worktree.

A run, in order:
  mqa claim                                      # a free device for this worktree
  mqa needs-build || { mqa build && mqa install; }   # exits 1 when no rebuild is needed
  mqa up                                         # Metro, launch, first screen
  mqa walk scenarios.sh                          # one call, not one per tap
  mqa down && mqa release
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
  logs)     cmd_logs "${2:-40}" ;;
  *)        usage ;;
esac
