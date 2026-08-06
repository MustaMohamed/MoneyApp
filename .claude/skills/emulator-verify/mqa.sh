#!/usr/bin/env bash
# mqa — drive the MoneyApp dev client on an Android emulator and read state back.
# Every subcommand is a primitive that has been verified against a real emulator;
# the ordering rules they encode (see `ui`, `tap`, `back`) are what make interaction
# reliable. Run `mqa help` for usage.
set -uo pipefail

PKG="${MQA_PKG:-com.moneyapp.app}"
SCHEME="${MQA_SCHEME:-moneyapp}"
PORT="${MQA_PORT:-8081}"
APK="${MQA_APK:-android/app/build/outputs/apk/debug/app-debug.apk}"
DBPATH="/data/data/$PKG/files/SQLite/moneyapp.db"
WORK="${MQA_WORK:-${TMPDIR:-/tmp}/mqa}"

ADB="$(command -v adb || echo "$HOME/Library/Android/sdk/platform-tools/adb")"
EMU="$HOME/Library/Android/sdk/emulator/emulator"
mkdir -p "$WORK"

# Prefer an explicit serial; otherwise the first attached emulator.
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
# keyboard up, a field's reported bounds can sit underneath it, and tapping there
# types a letter instead. Always `mqa ime-down` before tapping by coordinate.
dump() {
  need_device
  a exec-out uiautomator dump /dev/tty 2>/dev/null > "$WORK/ui.xml"
  [ -s "$WORK/ui.xml" ] || die "empty UI dump (app not foreground?)"
}

# Locate a node by exact text or content-desc. Emits "x y clickable" per match,
# clickable nodes first — an RN Pressable wraps a non-clickable Text with the
# same label, and only the wrapper responds to a tap.
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
    label = t.group(1) if t else ''
    desc = d.group(1) if d else ''
    if label != target and desc != target:
        continue
    b = re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', n)
    if not b:
        continue
    x1, y1, x2, y2 = map(int, b.groups())
    hits.append(((x1 + x2) // 2, (y1 + y2) // 2, 'clickable="true"' in n))
hits.sort(key=lambda h: not h[2])          # clickable wrappers first
for x, y, c in hits:
    print(x, y, 'clickable' if c else 'text')
PY
}

# --- input ------------------------------------------------------------------
ime_shown() { a shell dumpsys input_method 2>/dev/null | grep -q "mInputShown=true"; }

# GOTCHA: BACK is overloaded — it closes the IME when shown, otherwise it pops the
# navigation stack. Pressing it blindly to "dismiss the keyboard" silently
# navigates you off the screen you were testing.
cmd_ime_down() { need_device; if ime_shown; then a shell input keyevent 4; fi; }
cmd_back()     { need_device; if ime_shown; then a shell input keyevent 4; fi; a shell input keyevent 4; }

# GOTCHA: `input tap` returns before the app processes the focus change. Any
# `input text` fired straight after lands in the previously focused field. The
# dump below doubles as the settle — never chain tap+text without it.
cmd_tap() {
  need_device
  cmd_ime_down
  dump
  local hit; hit="$(locate "$1" | head -1)"
  [ -n "$hit" ] || die "no node matching '$1' (try: mqa ui)"
  local x y; x="$(echo "$hit" | cut -d' ' -f1)"; y="$(echo "$hit" | cut -d' ' -f2)"
  a shell input tap "$x" "$y"
  dump   # settle + leaves a fresh hierarchy for the caller to assert against
  echo "tapped '$1' at $x $y"
}

cmd_type() {
  need_device
  # `input text` treats spaces as argument separators; %s is its space escape.
  a shell input text "$(printf '%s' "$1" | sed 's/ /%s/g')"
  dump
}

cmd_clear() {                       # clear the focused field
  need_device
  a shell input keyevent 123        # MOVE_END
  local i; for i in $(seq 1 60); do a shell input keyevent 67; done   # DEL
  dump
}

# --- lifecycle --------------------------------------------------------------
cmd_boot() {
  if [ -n "$S" ]; then echo "already running: $S"; return; fi
  local avd; avd="$("$EMU" -list-avds 2>/dev/null | head -1)"
  [ -n "$avd" ] || die "no AVD found"
  echo "booting $avd ..."
  nohup "$EMU" -avd "$avd" >/dev/null 2>&1 &
  "$ADB" wait-for-device
  until [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 2; done
  echo "booted"
}

# GOTCHA: a fresh `android/` proves nothing — the CI-parity chain ends in
# `expo prebuild --no-install`, which generates the project without building it.
cmd_install() {
  need_device
  [ -f "$APK" ] || die "no APK at $APK — run: npx expo run:android (builds + installs)"
  # A failed install here is usually the emulator's /data being full; report it
  # with the number rather than the opaque adb IOException.
  local free; free="$(a shell df /data | awk 'NR==2{print int($4/1024)}')"
  echo "free on /data: ${free}MB"
  [ "$free" -gt 400 ] || echo "WARNING: <400MB free — install will likely fail. Uninstall stale dev builds."
  a install -r -d "$APK"
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

cmd_reset() { need_device; a shell pm clear "$PKG"; echo "app data cleared — next launch starts at N1"; }

# --- observation ------------------------------------------------------------
cmd_shot() {
  need_device
  local out="$WORK/${1:-shot}.png"
  a exec-out screencap -p > "$out"
  echo "$out"
}

cmd_ui() { dump; grep -oE '(text|content-desc)="[^"]+"' "$WORK/ui.xml" | sort -u; }

cmd_logs() {
  need_device
  a logcat -d 2>/dev/null | grep -E "ReactNativeJS|ReferenceError|FATAL EXCEPTION|runtime not ready" | tail -"${1:-40}"
}

# Pull db + WAL together: expo-sqlite runs in WAL mode, so writes made seconds
# ago live in the -wal file and are invisible if you copy only the .db.
cmd_db() {
  need_device
  [ $# -ge 1 ] || die "usage: mqa db \"select * from accounts\""
  rm -rf "$WORK/db" && mkdir -p "$WORK/db"
  local f
  for f in moneyapp.db moneyapp.db-wal moneyapp.db-shm; do
    a exec-out run-as "$PKG" cat "/data/data/$PKG/files/SQLite/$f" > "$WORK/db/$f" 2>/dev/null
  done
  # `adb exec-out run-as ... cat` writes the device shell's errors to STDOUT, so a
  # missing file yields a non-empty "cat: ... No such file" payload that only fails
  # later as an opaque SQLITE_NOTADB. Check the magic header instead of the size.
  if ! head -c 15 "$WORK/db/moneyapp.db" 2>/dev/null | grep -q "SQLite format"; then
    if grep -qs "No such file" "$WORK/db/moneyapp.db"; then
      die "no database on device — the app creates it on first launch (after 'reset', run 'launch')"
    fi
    die "could not read DB: $(head -c 200 "$WORK/db/moneyapp.db" 2>/dev/null)"
  fi
  MQA_SQL="$1" MQA_DB="$WORK/db/moneyapp.db" node -e '
    const Database = require(process.cwd() + "/node_modules/better-sqlite3");
    const db = new Database(process.env.MQA_DB);   // writable: SQLite replays the WAL on open
    const rows = db.prepare(process.env.MQA_SQL).all();
    console.log(JSON.stringify(rows, null, 2));
  '
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
  *) sed -n '2,4p' "$0"; grep -oE '^  [a-z-]+\)' "$0" | tr -d ' )' | tr '\n' ' '; echo ;;
esac
