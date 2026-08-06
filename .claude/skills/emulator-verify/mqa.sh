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
PORT="${MQA_PORT:-8081}"
APK="${MQA_APK:-android/app/build/outputs/apk/debug/app-debug.apk}"
WORK="${MQA_WORK:-${TMPDIR:-/tmp}/mqa}"

# Resolve the repo root from this script's own location, never from $PWD — the
# node call below needs the project's better-sqlite3 regardless of where the
# caller happens to be standing.
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"

ADB="$(command -v adb || echo "$HOME/Library/Android/sdk/platform-tools/adb")"
EMU="$HOME/Library/Android/sdk/emulator/emulator"
mkdir -p "$WORK"

serial() {
  if [ -n "${MQA_SERIAL:-}" ]; then echo "$MQA_SERIAL"; return; fi
  "$ADB" devices | awk '/^emulator-[0-9]+\tdevice$/{print $1; exit}'
}
S="$(serial)"
a() { "$ADB" ${S:+-s "$S"} "$@"; }

die() { echo "mqa: $*" >&2; exit 1; }
need_device() { [ -n "$S" ] || die "no emulator attached. Run: mqa boot"; }

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
cmd_boot() {
  if [ -n "$S" ]; then echo "already running: $S"; return; fi
  local avd
  avd="$("$EMU" -list-avds 2>/dev/null | sed -n 1p)"
  [ -n "$avd" ] || die "no AVD found"
  echo "booting $avd ..."
  nohup "$EMU" -avd "$avd" >/dev/null 2>&1 &
  "$ADB" wait-for-device
  until [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do
    sleep 2
  done
  echo "booted"
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

  boot | install | launch | reset      lifecycle
  ui | find <label> | shot [name]      observe
  tap <label> | tapxy <x> <y>          interact
  type <text> | clear | key <code>     text entry
  back | ime-down                      navigation
  db "<sql>" | logs [n]                state

env: MQA_SERIAL MQA_PORT MQA_PKG MQA_APK MQA_WORK
EOF
}

case "${1:-help}" in
  boot)     cmd_boot ;;
  install)  cmd_install ;;
  launch)   cmd_launch ;;
  reset)    cmd_reset ;;
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
