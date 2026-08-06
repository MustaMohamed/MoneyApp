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

## Running from a task worktree

The nine-step workflow runs this twice on any task whose frontmatter says `verify: emulator`
— `@dev` at step 6 as a self-check before committing, `@impl-reviewer` at step 7
independently, and the reviewer's run is the one that counts. Both happen in the task
worktree, which needs three things the worktree does not have by default.

1. **A real `npm install`.** A worktree's `node_modules` is symlinked. That passes `tsc`,
   `jest`, and lint, but it breaks device builds — expo-router resolves zero routes and you
   get a running app with no screens. It also breaks `mqa db`: this script resolves its root
   from **its own location**, so the worktree's copy needs the worktree's `better-sqlite3`.
2. **An actual build.** `mqa install` wants `android/app/build/outputs/apk/debug/app-debug.apk`
   and `android/` is gitignored, so a fresh worktree has neither:

   ```bash
   npm install
   npx expo prebuild --platform android
   ( cd android && ./gradlew assembleDebug )
   ```

3. **Its own Metro, on its own port.** This is the one that produces a false pass.
   `mqa launch` runs `adb reverse tcp:$PORT tcp:$PORT`, and **`adb reverse` is global per
   device** — it does not care which directory asked for it. Share port 8081 with the Metro
   already running in the primary repo and the emulator loads the *primary repo's* bundle:
   the app runs, the screens render, the run goes green, and none of it exercised the code
   under review. Always give the worktree a private port:

   ```bash
   MQA_PORT=8082 npx expo start --port 8082   # in the worktree
   MQA_PORT=8082 $M launch
   ```

   Confirm before trusting anything: `mqa launch` warns when no Metro answers on that port,
   and a change you made should be visible on the first screen you look at. If it is not,
   assume the wrong bundle before assuming the change failed.

**Order this against the CI parity chain deliberately.** The chain ends in
`expo prebuild --no-install`, which regenerates `android/` and takes the built APK with it.
So verify *before* running the chain, or rebuild after it — a chain run between your build
and your `mqa install` leaves you installing nothing, or worse, whatever was there before.

Cost is a full install and Gradle build per task, which is why only tasks marked
`verify: emulator` pay it. Between step 6 and step 7 the worktree persists, so `npm install`
happens once; the build does not survive the parity chain, so step 7 rebuilds.

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
| "It installed, so the build is current" | A fresh `android/` proves nothing — the CI-parity chain ends in `expo prebuild --no-install`, which regenerates the project *and deletes any APK already built there* without building a new one. Check `android/app/build/outputs/`; running the parity chain means rebuilding before you can install again. |
| Install fails with an opaque `IOException` | Emulator `/data` is full, not a build problem. `mqa install` prints free space; a debug APK needs ~400MB. `pm trim-caches` does not help — uninstall stale dev builds. |
| Tapping by screenshot coordinates | Read them from `mqa find`. RN wraps a Pressable around a same-labelled Text; only the `clickable` node responds. `find` sorts those first and `tap` refuses a text-only match rather than firing a no-op that reports success. |
| Typing a value containing `&`, `;`, `'` or `$` | The text reaches the *device's* shell. `mqa type` single-quotes it; a raw `adb shell input text` truncates at the metacharacter **and still exits 0**, so it looks like it worked. Account and category names are exactly where this bites. |
| Treating a green emulator run as QA | Gate 3 is the user's, on real hardware. This produces evidence for it, not a verdict. |
| Trusting the UI for a money assertion | The screen is the thing under test. Assert against `mqa db`. |
