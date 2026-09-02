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
| `mqa needs-build [base]` | **ask before you build.** Exits 0 (rebuild) only if the native surface moved |
| `mqa build` | Gradle debug APK for the device's own ABI only — ~100MB, not ~300MB |
| `mqa reset` | `pm clear` — next launch starts at N1, for fresh-onboarding runs |
| `mqa walk <script.sh>` / `step <label>` | run a whole scenario in one call; `step` prints a separator |
| `mqa ui` | every visible text and content-desc |
| `mqa find <label>` / `tap <label>` | locate / tap by exact label |
| `mqa park` | drag the dev-client Tools bubble out of the way for the session |
| `mqa type <text>` · `clear` · `key <code>` · `back` | text entry and navigation |
| `mqa shot [name]` | screenshot → path you can Read |
| `mqa db "<sql>"` | query the on-device database |
| `mqa logs [n]` | recent JS errors and crashes |

`MQA_SERIAL` targets a specific device; `MQA_PORT` a non-8081 Metro.

## Scope the walk before you run it

**If a unit test can assert it, the emulator must not.** The emulator's job is
wiring (screen → mapping → SQLite), native and render behaviour, and pixels —
not arithmetic a pure function already covers. Re-typing a parser's case table
into a form proves nothing the parser's own suite does not, at roughly a hundred
times the cost.

This is not a style preference; it was measured. Two independent walks of MA-007,
same branch, same defect surface:

| | 9 scenarios, driven per interaction | 4 scenarios, scoped and scripted |
|---|---|---|
| Tool calls | 415 | 132 |
| Tokens | 473k | 220k |
| Found the regression | no | **yes** |

The wide walk spent its budget re-proving unit-tested arithmetic through a UI and
missed a live defect. The scoped one had room left to chase an anomaly. Going
wide is not the safe choice — it is the one that runs out of attention.

Add a scenario only when you can say **what device-only failure it catches**.
Four is a normal size. If a claim can be checked with `mqa db`, check it there
rather than reading it off a screen.

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

`/ship` runs this twice on any ticket whose header line says `Verify emulator`: the
implementer at P6 as a self-check before committing, the review battery at P7
independently, and the reviewer's run is the one that counts. Both happen in the task
worktree, which needs three things the worktree does not have by default.

1. **A real `npm install`.** A worktree's `node_modules` is symlinked. That passes `tsc`,
   `jest`, and lint, but it breaks device builds — expo-router resolves zero routes and you
   get a running app with no screens. It also breaks `mqa db`: this script resolves its root
   from **its own location**, so the worktree's copy needs the worktree's `better-sqlite3`.
2. **An APK — but usually not a new one.** `mqa install` wants
   `android/app/build/outputs/apk/debug/app-debug.apk`, and `android/` is
   gitignored, so a fresh worktree has none. **Ask before building:**

   ```bash
   npm install
   mqa needs-build            # exits 0 to rebuild, 1 to reuse
   ```

   A rebuild is mandatory only when the **native surface** moved —
   `package.json`, `package-lock.json`, `app.json`, `eas.json`, `patches/`, or
   anything under `android/`/`ios/`. Everything else reaches the device over
   Metro, so a dev client already installed is current by construction: point it
   at this worktree's Metro and the branch under test is what runs. Most task
   diffs are JS-only, and a skipped Gradle build is the single largest saving
   available in this workflow.

   When you do need one:

   ```bash
   npx expo prebuild --platform android
   mqa build                  # device's own ABI only
   mqa install
   ```

   `mqa build` passes `-PreactNativeArchitectures=<device abi>`. The default
   four-ABI debug APK is ~300MB and overflows the emulator's `/data`; the
   single-ABI one is ~100MB, and the emulator cannot execute the other three
   anyway.

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

**Run the CI parity chain first, then build once.** The chain ends in
`expo prebuild --no-install`, which regenerates `android/` and deletes the built
APK with it. The old advice here was to verify *before* the chain — which
guaranteed that P7 rebuilt everything P6 had just built. Invert it:
parity chain → `needs-build` → build if required → install once, and P6 and
P7 share that APK. The APK survives, because nothing after it regenerates
`android/`.

Cost, once ordered this way, is at most **one** Gradle build per task rather than
two, and for a JS-only diff it is zero — which is why only tasks marked
`verify: emulator` pay anything at all. `npm install` happens once per worktree.

## Drive the walk from a script, not one call at a time

Each `tap` → dump → `find` round trip carries a full UI hierarchy back. A form
fill is ~6 interactions; a four-scenario walk driven that way is a hundred-odd
round trips and most of the cost of the whole run. Write the scenario once and
run it in a single call:

```bash
cat > /tmp/walk.sh <<'SH'
$MQA step "1 — save 5,000 from Settings"
$MQA tap 'Add Account'; $MQA tap 'Name'; $MQA type 'Walk 1'
$MQA tap 'Opening balance'; $MQA type '5,000'
$MQA tap 'Save'
$MQA db "select name, opening_balance, current_balance from accounts order by id desc limit 1"

$MQA step "2 — double tap inserts one row"
$MQA db "select count(*) as before from accounts"
SH
mqa walk /tmp/walk.sh
```

`mqa walk` exports `$MQA` and runs the script under `-euo pipefail`, so the first
failed step stops the walk instead of letting later assertions read a screen that
never arrived. `mqa step` just prints a separator, which is what makes one long
output readable afterwards.

Run `mqa park` once at the start. The dev client's floating **Tools** bubble
lives in a window `uiautomator` never dumps, so it silently captures taps near
the header's right-hand action even from coordinates outside its reported bounds
— worth several wasted calls per walk before anyone notices.

Screenshot only what is genuinely visual. `mqa ui` is text, and `grep -c` over it
answers "did this message render?" far more cheaply than an image — that exact
check is what distinguished a real regression from a clean run on MA-007.

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
| "It installed, so the build is current" | A fresh `android/` proves nothing — `expo prebuild --no-install` regenerates the project *and deletes any APK already built there* without building a new one. Check `android/app/build/outputs/`. Run the parity chain **before** you build, and this stops being a trap rather than a thing to remember. |
| Install fails with an opaque `IOException` | Emulator `/data` is full, not a build problem. `mqa install` prints free space; a four-ABI debug APK needs ~400MB, which is most of why `mqa build` emits one ABI. `pm trim-caches` does not help — uninstall stale dev builds. |
| Rebuilding because the branch changed | The branch reaching the device is Metro's job, not the APK's. Ask `mqa needs-build` — only a native-surface change (`package*.json`, `app.json`, `eas.json`, `patches/`, `android/`, `ios/`) invalidates an installed dev client. |
| Going wide "to be safe" | Measured on MA-007: the 9-scenario walk cost 2× the 4-scenario one **and missed the defect the short one found**. Breadth spent on unit-testable claims buys nothing and crowds out the attention that catches anomalies. |
| A walk driven one tool call per tap | Every round trip carries a whole UI hierarchy. Put the scenario in a script and run `mqa walk`. |
| Tapping by screenshot coordinates | Read them from `mqa find`. RN wraps a Pressable around a same-labelled Text; only the `clickable` node responds. `find` sorts those first and `tap` refuses a text-only match rather than firing a no-op that reports success. |
| Typing a value containing `&`, `;`, `'` or `$` | The text reaches the *device's* shell. `mqa type` single-quotes it; a raw `adb shell input text` truncates at the metacharacter **and still exits 0**, so it looks like it worked. Account and category names are exactly where this bites. |
| Treating a green emulator run as QA | Gate 3 is the user's, on real hardware. This produces evidence for it, not a verdict. |
| Trusting the UI for a money assertion | The screen is the thing under test. Assert against `mqa db`. |
