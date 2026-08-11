# Phase 6 — Implement (subagent: composed specialist)

**Goal:** the plan becomes commits on the ticket branch, self-reviewed, verification battery green. No push. **Chunk mode:** this phase runs once per chunk, in that chunk's worktree, scoped to that chunk's plan steps.

## Conductor: compose the implementer (no persona dependency)

Do not use `.claude/agents/` personas — they belong to the /scope workflow and carry its step contracts; /ship composes its own implementer. Assemble the implementer prompt from three layers at dispatch time:

1. **Repo layer** — required reading, in this order: the worktree's `CLAUDE.md`, plus the `.claude/rules/` files matching the touched paths (`database.md`, `ui.md`, `state.md`, `money.md`, `tests.md`, `review.md`). Name the verification commands from `CLAUDE.md` → `## Commands`: the **fast subset** (`npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`) is the per-commit check; the **full CI parity chain** (the subset plus `npx --yes expo-doctor@1.20.1 && npx expo prebuild --no-install --platform android && test -d android`) runs once, pre-push — the doctor and prebuild members cost minutes and are not per-commit checks.
2. **Task layer** — from `spec.md`: the module being touched, the conventions that are load-bearing for THIS change (e.g. UI work: HeroUI primitive first, tokens via `ms()`/`msFont()` from `theme.ts`, copy in `constants/strings.ts`, no `useState` in `index.tsx`; money work: rounding and formatting per the `money-rules` skill; DB work: `null` only for DB-mapped nullable columns), and any ADRs the spec cites.
3. **Charter layer** — the fixed contract below, verbatim.

Also pass: absolute paths to the plan, `spec.md`, and the implementation worktree; the branch name. **Chunk mode:** name the chunk, pass its ledger row (owned steps, interface, dark-merge notes), and — for chunks after the first — one line per *merged* chunk stating what already landed. Create the worktree first (see SKILL.md → Worktrees; remember the real `npm ci`) — **if it already exists (fix-loop re-entry, resume), reuse it; never re-run the create command.**

## Re-entry (fix loops from P8–P10, or after a STOP)

- **Fix dispatch:** compose the same three layers, but swap the charter's step 3 objective: "address exactly the findings below — nothing else". Append the consolidated findings list verbatim (findings are data, not conversation history). Battery, commit, no-push rules unchanged.
- **After a discrepancy STOP or abandoned dispatch:** the worktree may hold uncommitted edits from the dead attempt. The conductor (as worktree owner) discards them before the next dispatch: `git -C <worktree> checkout -- . && git -C <worktree> clean -fd` — a fresh implementer must start from the last commit, not inherit a stranger's half-approach.

## Charter (paste into the implementer prompt)

You execute the plan. You do not design, re-plan, or expand scope.

1. Read the required repo docs, the spec, and the plan fully before touching code. **Elaborate before editing:** turn your assigned steps into a short concrete edit list (files, symbols, test names) checked against the code as it is now — the plan gives interfaces and invariants; the current code wins on line-level detail. If the plan is wrong about the code (file moved, symbol renamed, approach impossible), STOP and return the discrepancy — do not improvise around it.
2. Work only inside the implementation worktree, on the named branch.
3. Follow the plan's step order. Test-first where the plan says so.
4. Match the surrounding code's idiom: comment density, naming, patterns. When your instinct conflicts with `CLAUDE.md` or a `.claude/rules/` file, the rules win.
5. **Verification cadence:** run the *targeted* tests for the layer you touched after each step; run the **fast subset before each commit** — never the full chain per commit, and not after every micro-step. The full parity chain runs exactly once, at step 7, because every hand-off precedes a push. Full-chain output is large and rereading it every step burns your context for no signal.
6. **Self-review before committing:** re-read the entire `git diff` top-to-bottom as a hostile reviewer. Check specifically: conventions from the required reading; leftover debug output or dead code; error paths that swallow failures; copy-paste from a sibling that carried along things this change doesn't need; every new symbol actually consumed (chunk mode: or explicitly listed as dark-until-wired in your report). Fix what you find.
7. Run the **full CI parity chain** — its one and only run: your commits are about to be pushed, and the conductor cannot fix a red chain. Paste the real final output (not a summary) into your report. Any failure: fix it or return blocked — never report done with a red battery.
8. **UI render pass — only when spec §8 declares UI screens, and only those screens.** Mechanics, port rules, and build economics: the `emulator-verify` skill (run from THIS worktree, on its own Metro port — never 8081; parity chain first, then `mqa needs-build`). The pass checks **pixels, not behavior**: each declared screen against the design reference the spec names — layout intact, nothing clipped or collapsed, every declared state renders (empty, error, filled), no red screens or JS errors in `mqa logs`. Screenshot every state you claim checked. **Never walk a data cycle** — cycle behavior is already proven by the integration tests you wrote in step 3; `mqa db` is allowed only as a spot-check that a screen is wired to the store at all (one save, one row), never as a scenario. A render defect: fix it, re-run the fast subset, re-shoot.
9. Commit with a clear message. **Never push. Never run `gh`. Never write workflow artifacts into the repo — they live under `~/.ship/MoneyApp/`.**

Return: branch, commit SHA(s), battery output, UI render-pass evidence (screenshot paths per screen state, or "no UI surface"), plan deviations (if any, with reasons), dark-until-wired symbols (chunk mode), and what you'd flag first if you were reviewing this diff.

## Exit

Committed and green → phase 7 (chunk mode: this chunk's battery — micro for non-final chunks, full for the final chunk). Discrepancy return → conductor routes back through phase 4/5 (plan fix) — not around them. Record SHA and outcome in `state.md`; update the chunk ledger row.
