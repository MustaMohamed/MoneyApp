---
description: Run the pre-push CI parity chain and fix failures until green
---

Run the pre-push CI parity chain, `npm run ci:local` (the `Commands` section of CLAUDE.md); it stops at the first failure. Do not substitute a shorter check.

For each failure: report the failing step and its output, diagnose the cause, fix it, then re-run the chain **from the top** (an earlier step can regress on the fix). Repeat until it reports green.

If `expo-doctor` fails on a dependency version nobody touched, check the `expo-doctor` line in CLAUDE.md's `Commands` before changing any version — Expo's live requirement table moves under a pinned tool.

Report at the end: green or not, which steps failed on the way, and what you changed. Pushing still requires an explicit request from me.

$ARGUMENTS
