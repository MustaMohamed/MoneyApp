#!/usr/bin/env bash
# Stub adb for mqa_needs_build.test.ts: one attached emulator with the app installed, its APK time from $ADB_STUB_APK_TIME.
set -u
args="$*"
case "$args" in
  *"pm list packages"*) echo "package:com.moneyapp.app" ;;
  *"pm path"*) echo "package:/data/app/~~stub==/com.moneyapp.app-stub==/base.apk" ;;
  *"stat -c %Y"*) if [ -n "${ADB_STUB_APK_TIME:-}" ]; then echo "$ADB_STUB_APK_TIME"; fi ;;
  *devices*) printf 'List of devices attached\n%s\tdevice\n' "$ADB_STUB_SERIAL" ;;
  *) ;;
esac
