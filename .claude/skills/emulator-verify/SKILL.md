---
name: emulator-verify
description: Use when you need to see a MoneyApp change actually run rather than infer it from tests — checking a screen renders, walking a flow end to end, reproducing a device-only bug, or asserting what the app really wrote to SQLite. Also for "does this look right?", "run the app", "check it on the emulator", or a `[runtime not ready]` / white-screen / native crash report.
---

# Verifying on the Android emulator

## Overview

You can drive the app yourself: install it, tap through it, screenshot it, and read the
SQLite it wrote. That closes the loop between "tests pass" and "it works" without waiting
on the user.

**This is not the Device QA gate.** Gate 3 is the user's, on real hardware, and it is
critical trigger #8 — the emulator does not discharge it. What you produce here is
evidence *for* that gate: a change you have watched run, with the failures already found.
Fonts, shadows, gesture feel, and performance still need the real device (`device-qa`).

## The tool

Every primitive is wrapped by `mqa.sh`, next to this file. Run it from the repo root; the
examples below assume `M=.claude/skills/emulator-verify/mqa.sh`.

| Command | Does |
|---|---|
| `mqa boot` / `install` / `launch` | start AVD · install `app-debug.apk` · deep-link into the dev client |
| `mqa reset` | `pm clear` — next launch starts at N1, for fresh-onboarding runs |
| `mqa ui` | every visible text and content-desc |
| `mqa find <label>` / `tap <label>` | locate / tap by exact label |
| `mqa type <text>` · `clear` · `key <code>` · `back` | text entry and navigation |
| `mqa shot [name]` | screenshot → path you can Read |
| `mqa db "<sql>"` | query the on-device database |
| `mqa logs [n]` | recent JS errors and crashes |

`MQA_SERIAL` targets a specific device; `MQA_PORT` a non-8081 Metro.

## Three ordering rules

Interaction is unreliable without these. Each one cost a wrong result before it was found.

1. **Never chain `tap` then `type`.** `input tap` returns before the app moves focus, so
   the text lands in the *previous* field — silently, producing one concatenated value.
   `mqa tap` dumps the hierarchy afterward, which settles it. Assert focus moved before typing.
2. **Dismiss the keyboard before tapping by coordinate.** `uiautomator` dumps the app
   window only, never the IME, so a field's reported bounds can sit *underneath* the open
   keyboard — the tap types a letter instead. `mqa tap` calls `ime-down` first; do the same
   for `tapxy`.
3. **Never press BACK to "close the keyboard".** BACK closes the IME when shown and pops
   the navigation stack otherwise, so a blind press walks you off the screen under test.
   `mqa back` and `mqa ime-down` check `mInputShown` first.

Corollary: coordinates go stale whenever focus changes — a form auto-scrolls to reveal the
focused field. Re-run `find` after every interaction rather than reusing an offset.

## Verifying logic, not just pixels

Debug builds allow `run-as`, so the real database is readable. This is how you check a
business rule actually held, instead of trusting the screen that reported it:

```bash
$M db "select name, opening_balance, current_balance, currency from accounts"
```

expo-sqlite runs in WAL mode: writes from seconds ago sit in `moneyapp.db-wal`, so the
helper pulls `.db`, `-wal` and `-shm` together. Copying the `.db` alone gives you the full
schema and stale rows — which reads as a clean pass. Query with the project's own
`better-sqlite3`; the same rules apply as `money-rules` (assert on stored integers, not on
formatted strings).

## Reporting

Screenshot the states you claim to have checked and Read them — a screen that renders is
not a screen that renders *correctly*. Report what you saw, including what you could not
check here (typography, shadows, perf, gestures), and keep the verdict separate from the
user's gate: this is "verified on emulator", never "QA passed".

## Common mistakes

| Mistake | Reality |
|---|---|
| "It installed, so the build is current" | A fresh `android/` proves nothing — the CI-parity chain ends in `expo prebuild --no-install`, which generates the project without building it. Check `android/app/build/outputs/`. |
| Install fails with an opaque `IOException` | Emulator `/data` is full, not a build problem. `mqa install` prints free space; a debug APK needs ~400MB. `pm trim-caches` does not help — uninstall stale dev builds. |
| Tapping by screenshot coordinates | Read them from `mqa find`. RN wraps a Pressable around a same-labelled Text; only the `clickable` node responds, and `find` sorts those first. |
| Treating a green emulator run as QA | Gate 3 is the user's, on real hardware. This produces evidence for it, not a verdict. |
| Trusting the UI for a money assertion | The screen is the thing under test. Assert against `mqa db`. |
