# ADR: The build verdict dates the APK against the native history the branch holds

- **Date:** 2026-10-14
- **Status:** accepted
- **Ticket:** MA-178 (#718), under #608
- **Applies to:** `.claude/skills/emulator-verify/mqa.sh`, `.claude/skills/emulator-verify/SKILL.md`, `scripts/package_json_scripts_only.mjs`, `.github/workflows/pr-checks.yml`

PR #716's render pass read three truncated lines cut on an APK installed on 2026-09-15, before MA-141's text view patch merged, while `mqa up` printed `build: REUSE` (ADR `2026-10-03-android-ellipsis-paint-typeface.md` §7). `build_verdict` compared the APK's install time with a native-surface change only when the branch carried one, so a branch with none read `REUSE` whatever `main` had changed since that APK was built. This record moves the verdict to the newest native change the branch holds, its own or `main`'s.

## 1. The rule

`build_verdict` in `mqa.sh`, which `mqa up` and `mqa needs-build` print, takes the newest native change from two places and reads `REUSE` only for an APK installed after both.

- **The branch.** The native-surface files in `git diff <base>...HEAD`, the working tree and the untracked files, dated by the newest `<base>..HEAD` commit that touches one, or by the current time when one is uncommitted. This half is unchanged.
- **The base history the branch holds.** The newest commit on the first-parent line from `git merge-base <base> HEAD` that touches the native surface. A merge commit's files are read against its first parent (`git log --first-parent -m`), so a native change merged in counts at the merge's time, not at its own older commit time. A native commit `main` gained after the branch forked is not in this history, since a build from the branch does not carry it.

The base is `origin/main` unless `mqa needs-build <base>` names another. On a branch with no native change of its own, with a device claimed and the app installed, an APK installed after the history commit reads `REUSE` and names that commit. An older APK, or one whose install time cannot be read, reads `REBUILD` and lists that commit's native-surface files. On a branch with a change of its own, the later of the two times decides, and a `REBUILD` lists the history commit's files beside the branch's when that commit is the later. With no device claimed, no merge-base between the base and `HEAD`, or no native commit in that history, the branch half decides alone, which is `REUSE` for a branch with no native change.

## 2. One spelling of each part

`NATIVE_RE` in `mqa.sh` is the native surface: `package.json`, `package-lock.json`, `app.json`, `eas.json`, `patches/`, `android/`, `ios/`, any path containing `.gradle`, and `gradle.properties` at the root. The diff read, the history read and the list a `REBUILD` prints all use it, and `SKILL.md` § Running from a task worktree lists the same paths. Who builds on a `REBUILD` is one string too, `BUILD_WHO`, which ends every `REBUILD` line: a `/ship` implementer or a `/prep` probe builds, any other session asks first, and the render lens never builds.

**Amended 2026-10-14, MA-191 (#742).** A `package.json` change confined to whitespace, key order or scripts npm does not run on install is not a native-surface change. npm runs eight scripts on install: `preinstall`, `install`, `postinstall`, `prepublish`, `preprepare`, `prepare`, `postprepare` and `dependencies`. A change to one of them, or to any field outside `scripts`, reaches the APK. A `package.json` side that is absent, as in a root commit or a deletion, or that does not parse as JSON, reaches the APK too. `scripts/package_json_scripts_only.mjs` is the one spelling of the exception: it exits 0 only when both sides parse and agree once every other script is dropped and every object's keys are sorted. Each reader compares its own pair of sides. The branch half compares the merge-base with the working tree. The history half compares each commit with its first parent and skips a commit whose only native-surface change is confined this way. A `REBUILD` never lists a confined `package.json`. The `Patched React Native compiles (Android)` gate in `.github/workflows/pr-checks.yml` compares `HEAD^1` with `HEAD`, and skips the compile when `package.json` is the only one of its four paths that changed and the change is confined.

## 3. False readings

The rule reads times, and nothing records what an APK was built from, so it reads wrong in three cases.

- An APK built before a native commit and installed after it reads `REUSE` without that change, since the install is newer than the commit.
- An APK built from a branch before that branch's squash merge reads `REBUILD` once after the merge, since the merge commit is newer than the install.
- An APK built from another branch and installed after the newest native commit this branch holds reads `REUSE`, whatever native change that other branch carried.

## 4. Cost

Every native-surface commit on `main` makes the next run on each slot read `REBUILD` once its branch holds that commit. A build compiles React Native from source, about 6 minutes at a 1-minute load near 85 (ADR `2026-10-03-android-ellipsis-paint-typeface.md` §3).

## What this does not decide

- A stamp of the native surface an APK was built from, which would remove the three false readings.
- Which `package.json` changes reach the device beyond the scripts-only exception, which §2's amendment states.
