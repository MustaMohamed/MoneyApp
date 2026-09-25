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

`mqa.sh`, next to this file, is the only command a run needs. Call it from the worktree as
`bash .claude/skills/emulator-verify/mqa.sh <verb>`; below, `mqa`. To chain calls in one
Bash call, define `m() { bash .claude/skills/emulator-verify/mqa.sh "$@"; }`. Never
`M="bash …"; $M` (zsh does not split it) and never a `PATH=` prefix (mqa picks a runnable
python itself). `mqa help` is complete; do not read the script to learn it.

| Verb | Does |
|---|---|
| `claim [slot]` · `release` · `claims` | take one of three devices for this worktree · give it back · who holds what |
| `needs-build [base]` · `build` · `install` | **ask before you build**: exit 0 only when the native surface moved · single-ABI debug APK · install it |
| `up [--ready <sel>]` | Metro for this worktree on the claimed port, a cold launch on it, wait for the tab bar, dev overlays cleared |
| `down` | close the agent-device session; the system keyboard comes back |
| `metro [start\|restart\|stop\|status]` | the Metro part of `up` on its own |
| `open <route\|url>` | deep link: `/transactions`, `/accounts`, or a full `moneyapp://` URL |
| `read [scope]` · `ui` | what is on screen; with a scope (a testID or a label), every labelled node drawn inside that container, in dp |
| `bounds <sel>...` | every match: x, y, width and height in dp, enabled or disabled, selected |
| `tap <sel>` · `fill <sel> <text>` · `type` · `clear` · `key <code>` · `back` | act; `tap` and `fill` first wait up to 10 s for their target, and `fill` focuses, clears and types in one call |
| `wait <sel> [ms]` | block until a selector is on screen (default 10000 ms) |
| `scroll <up\|down> [--until <sel>]` | a raw drag under both engines (agent-device's own scroll does not move this app's lists); `--until` swipes until the selector is on screen, 15 at most |
| `shot [name] [--crop <sel>] [--out <dir>]` | screencap (~0.2 s), cropped to the largest match |
| `db "<sql>"` · `logs [n]` | query the on-device SQLite · recent JS errors and crashes |
| `walk <script.sh>` · `step <label>` | run a whole scenario in one call |
| `reset` · `park` · `ime-down` · `tapxy <x> <y>` | clear app data · move the dev-client Tools bubble · hide the keyboard · tap a pixel |

**Selectors.** `label="…"` or `text="…"` matches a label or a text exactly, `id="…"` a
testID (`id="sheet-footer"`), `~text` a substring, `@e12` a ref printed by `read`. Bare text
is a label; in `bounds`, `shot --crop` and `read` it also matches a testID. Tab labels start with an icon glyph that `read` prints; `mqa open /transactions`
reaches a tab without it. A node with both a text and an accessibility label reads as its
text under agent-device (`+10,000`) and as its label under uiautomator (`Income +10,000`);
`label="…"` matches either. React Native flattens a testID container's children out of
the tree, which is why a scoped `read` lists what is drawn inside the container, not its
children.

`MQA_SERIAL` targets a specific device; `MQA_PORT` a non-slot Metro. Both override the
claim below, which is the only reason to set them.

## Screen engine

`mqa` reads and taps through agent-device, pinned in `devDependencies`. `MQA_UI=uiautomator`
switches to the older uiautomator path, which is also the fallback when agent-device is not
installed. Claims, Metro, builds, `db`, `shot` and `logs` are mqa's own and work under
either engine.

**One engine per run.** Android gives one UI automation connection per device. While an
agent-device session is open, `uiautomator dump` is killed, so the uiautomator engine
refuses with `run: mqa down` instead of reporting an empty screen. `mqa down` releases the
connection; `mqa release` runs it for you.

Measured on the same four transactions states, same device, same Metro (2026-09-25):

| | uiautomator engine | agent-device engine |
|---|---|---|
| Read the screen | 2.13 s | 0.45 s |
| Tap by label | 4.64 s | 0.85 s |
| Scripted walk, four states after launch | 70.9 s | 21.8 s |
| Render-lens agent on those states, tokens · time | 1.20M · 233 s | 0.91M · 137 s |

The agent-device session switches the emulator to a headless test keyboard: typing works,
the soft keyboard never draws. A state about the keyboard itself (a field the keyboard
covers) runs under `MQA_UI=uiautomator`.

## Claim a device before anything else

Three tickets verify at once, so there are three emulators and a session owns one
outright. **`mqa claim` is the first call of any run.**

| Slot | AVD | Serial | Metro |
|---|---|---|---|
| 1 | `Pixel_2_API_34` | emulator-5554 | 8082 |
| 2 | `Pixel_2_API_34_2` | emulator-5556 | 8083 |
| 3 | `Pixel_2_API_34_3` | emulator-5558 | 8084 |

The claim is keyed on the **git worktree**, not on an environment variable. An agent's
shell calls do not carry env between them, so an exported `MQA_SERIAL` is gone by the next
call. Keyed on the worktree, one claim covers every later call from it.

Without a claim, `mqa` refuses to run as soon as a second device is attached or any lease
is held. Before this existed, four concurrent `/ship` sessions shared one device and
produced three silent failures: a launch re-pointed another session's dev client at the
wrong Metro, two dumps at once returned a screen the app was not on, and state-setting
`DELETE`s landed in another session's fixtures. Every one of those reads as a pass.

A lease goes stale when its worktree is deleted, or after `MQA_LEASE_TTL` (default 2h)
without a call; every `mqa` call touches its own. `mqa claims` shows a stale lease as free
and names its old holder. A fourth concurrent ticket queues: add a slot by creating another
AVD and extending `MQA_SLOTS`.

## The feature map, read before scoping

`features/` next to this file holds one file per screen: how to reach it, every state it can be in with the canvas frame, how to force the state, and what proves it. A walk is assembled by copying those recipes for the states the plan names; nothing is explored. A state the file does not carry is a state the design did not draw: add it to the file, with its frame or `no frame` and the ticket, before shooting it. `features/README.md` has the rule and the file shape.

## Scope the walk before you run it

**If a unit test can assert it, the emulator must not.** The emulator's job is wiring
(screen → mapping → SQLite), native and render behaviour, and pixels — not arithmetic a
pure function already covers.

Two independent walks of MA-007, same branch, same defect surface:

| | 9 scenarios, driven per interaction | 4 scenarios, scoped and scripted |
|---|---|---|
| Tool calls | 415 | 132 |
| Tokens | 473k | 220k |
| Found the regression | no | **yes** |

Add a scenario only when you can say **what device-only failure it catches**. Four is a
normal size. If a claim can be checked with `mqa db`, check it there rather than reading it
off a screen.

## Sync on the value you assert

The agent-device engine reads a screen in under half a second, fast enough to catch it
before it settles. On MA-102 the totals strip still read the unfiltered month just after
the filter badge showed `Filter, 1 active`, in 2 of 4 runs. `mqa wait '−2,100'`, then read.
A wait on a nearby label is how a fast read reports a stale screen.

## Uiautomator engine: three ordering rules

These hold under `MQA_UI=uiautomator` only; agent-device's `fill` and its headless keyboard
remove all three.

1. **Never chain `tap` then `type`.** `input tap` returns before the app moves focus, so
   the text lands in the *previous* field. `mqa tap` dumps the hierarchy afterward, which
   settles it; `mqa fill` checks the field has focus before typing.
2. **Dismiss the keyboard before tapping by coordinate.** `uiautomator` dumps the app
   window only, so a field's reported bounds can sit *underneath* the open keyboard.
   `mqa tap` calls `ime-down` first.
3. **Never press BACK to "close the keyboard".** BACK closes the IME when shown and pops
   the navigation stack otherwise. `mqa back` and `mqa ime-down` check `mInputShown` first.

## Running from a task worktree

`/ship` runs this twice on any ticket whose header line says `Verify emulator`: the
implementer's render pass as a self-check before committing, the battery's render lens
independently, and the lens's run is the one that counts. Both happen in the task
worktree, which needs three things the worktree does not have by default.

1. **A real `npm install`.** A worktree's symlinked `node_modules` passes `tsc`, `jest` and
   lint but breaks device builds (expo-router resolves zero routes). It also breaks
   `mqa db` and the agent-device engine: this script resolves its root from **its own
   location**, so the worktree's copy needs the worktree's `better-sqlite3` and
   `agent-device`.
2. **An APK — but usually not a new one.** `mqa install` wants
   `android/app/build/outputs/apk/debug/app-debug.apk`, and `android/` is gitignored.
   **Ask before building:** `mqa needs-build` exits 0 to rebuild, 1 to reuse. A rebuild is
   mandatory only when the **native surface** moved: `package.json`, `package-lock.json`,
   `app.json`, `eas.json`, `patches/`, or anything under `android/`/`ios/`. Everything else
   reaches the device over Metro. When you do need one:

   ```bash
   npx expo prebuild --platform android
   mqa build                  # device's own ABI only: ~100MB, not ~300MB
   mqa install
   ```

3. **Its own Metro, on the claimed port.** `adb reverse` is global per device: share a port
   with another Metro and the emulator loads *that* branch's bundle, renders it, and the run
   goes green on code that is not under review. `mqa up` starts Metro from this worktree on
   the port the claim owns, refuses a port another worktree's Metro holds, and restarts it
   with `--clear` when HEAD has moved since it started, since a cached transform serves the
   old commit. A change you made should be visible on the first screen you look at; if it
   is not, suspect the bundle before the change.

**Run the CI parity chain first, then build once.** The chain ends in
`expo prebuild --no-install`, which regenerates `android/` and deletes any APK built there.
Parity chain → `needs-build` → build if required → install once, and the render pass and
the render lens share that APK.

## Drive the walk from a script, not one call at a time

A walk driven one call per tap pays a model turn per interaction, and turns are most of the
cost. Write the scenario once and run it in one call:

```bash
cat > /tmp/walk.sh <<'SH'
$MQA step "1 filter footer, disabled"
$MQA open /transactions
$MQA tap Filter
$MQA wait 'label="Apply"'
$MQA bounds 'label="Reset"' 'label="Apply"'
$MQA shot footer_disabled --crop 'id="sheet-footer"' --out /tmp/render

$MQA step "2 totals strip, one account"
$MQA tap 'Accounts, All accounts'
$MQA tap 'MA102 Alpha, account filter'
$MQA tap 'Apply (1)'
$MQA wait '−2,100' 10000
$MQA db "select sum(egp_amount) from transactions where account_id='ma102-alpha' and type='expense'"
SH
mqa up && mqa walk /tmp/walk.sh
```

`mqa walk` exports `$MQA` and runs the script under `-euo pipefail`, so the first failed
step stops the walk instead of letting later assertions read a screen that never arrived.
`mqa step` prints a separator, which is what makes one long output readable afterwards.

Measure with `bounds`, not a parser of your own: it prints dp, divided by the Pixel 2's
2.625. Screenshot only what is genuinely visual, and crop it: a full frame is ~1,500
tokens, a cropped footer ~300. `mqa park` moves the dev-client Tools bubble when it sits
over something under test; it finds the bubble first and does nothing when there is none.

## Verifying logic, not just pixels

Debug builds allow `run-as`, so the real database is readable. This is how you check a
business rule actually held, instead of trusting the screen that reported it:

```bash
mqa db "select name, opening_balance, current_balance, currency from accounts"
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
| "It installed, so the build is current" | `expo prebuild --no-install` regenerates `android/` *and deletes any APK already built there*. Check `android/app/build/outputs/`. Run the parity chain **before** you build. |
| Install fails with an opaque `IOException` | Emulator `/data` is full. `mqa install` prints free space; uninstall stale dev builds. |
| Rebuilding because the branch changed | The branch reaches the device through Metro. Ask `mqa needs-build`. |
| Going wide "to be safe" | Measured on MA-007: the 9-scenario walk cost 2× the 4-scenario one **and missed the defect the short one found**. |
| A walk driven one tool call per tap | Every call is a model turn. Put the scenario in a script and run `mqa walk`. |
| Waiting on a nearby label, then reading the value | The value can lag the label (MA-102 totals strip). `mqa wait` on the value itself. |
| Mixing engines in one run | The uiautomator engine refuses while an agent-device session holds the device. `mqa down` first, or stay on one engine. |
| Reading `mqa.sh` to learn a verb | `mqa help` lists every verb and selector form. |
| Writing a parser for bounds | `mqa bounds <sel>` prints dp, enabled or disabled, and selected. |
| Tapping by screenshot coordinates | Use a selector. `tapxy` exists for a target with no label. |
| Typing a value containing `&`, `;`, `'` or `$` | Under the uiautomator engine the text reaches the *device's* shell; `mqa type` quotes it. A raw `adb shell input text` truncates at the metacharacter **and still exits 0**. |
| Running without a claim because "only my session is using it" | `mqa` cannot see the other sessions, and neither can you. It refuses instead of guessing. |
| Treating a green emulator run as QA | Gate 3 is the user's, on real hardware. This produces evidence for it, not a verdict. |
| Trusting the UI for a money assertion | The screen is the thing under test. Assert against `mqa db`. |
