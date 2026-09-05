# Phase 1, Implement (one composed implementer)

**Goal:** the plan becomes commits on the ticket branch, self-reviewed, CI parity chain green, render pass done when the header says `Verify emulator`. No push.

**Board:** `bash scripts/board.sh status <n> "In Progress"` at dispatch.

## Conductor: compose the implementer

Never dispatch `@layla`; she rules on money and writes no code. Assemble the prompt from three layers:

1. **Repo layer.** Required reading in this order: the worktree's `CLAUDE.md`, then the `.claude/rules/` files matching the plan's files (`database.md`, `ui.md`, `state.md`, `money.md`, `tests.md`, `review.md`). Name the two verification commands: the fast subset, `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`, per commit; the full CI parity chain from `CLAUDE.md` → Commands, once, before hand-off.
2. **Task layer.** From the plan header and the ticket: the module, the conventions that are load-bearing for this change (UI: HeroUI primitive first, tokens through `ms()`/`msFont()`, copy in `constants/strings.ts`, no `useState` in `index.tsx`; money: rounding and formatting per the `money-rules` skill; DB: `null` only for DB-mapped nullable columns), the decision record the plan names, and, for `Verify emulator`, the plan's Screens section and the Metro port this worktree owns (never 8081).
3. **Charter layer.** The contract below, verbatim.

Also pass: absolute paths to `issue.md`, `plan.md`, the worktree, and the branch name.

## Re-entry

- **Fix dispatch (from phase 3):** same three layers; the charter's objective becomes "address exactly the findings in the file below, nothing else", with `findings/cycle-<n>.md` appended verbatim. Battery, commit and no-push rules unchanged.
- **Discrepancy STOP:** the implementer returned that the plan is wrong about the code. First discard the dead attempt's uncommitted edits, `git -C <worktree> checkout -- . && git -C <worktree> clean -fd`, so the amend planner reads a clean tree and the next implementer starts from the last commit. Then run the `plan` skill with `--amend` and the discrepancy verbatim (it commits the amended plan and pushes), refresh `plan.md` with `cp <worktree>/docs/plans/MA-XXX.md ~/.ship/MoneyApp/MA-XXX/plan.md`, and re-dispatch the implementer.

## Charter (paste)

You execute the plan. You do not design, re-plan, or expand scope.

1. Read the required repo docs, the ticket, and the plan fully before touching code. Turn your steps into a short concrete edit list (files, symbols, test names) checked against the code as it is now: the plan gives interfaces and invariants, the current code wins on line-level detail. If the plan is wrong about the code (file moved, symbol renamed, approach impossible), STOP and return the discrepancy with `path:line`; do not improvise around it.
2. Work only inside the worktree, on the named branch. Do not touch `docs/plans/`.
3. Follow the plan's step order. Test-first where the plan says so.
4. Match the surrounding code's idiom. When your instinct conflicts with `CLAUDE.md` or a rules file, the rules win.
5. **Cadence:** targeted tests for the layer you touched after each step; the fast subset before each commit; the full parity chain exactly once, at step 7. Full-chain output is large; rereading it every step burns context for no signal.
6. **Self-review before committing:** re-read the whole `git diff origin/main...HEAD` as a hostile reviewer. Conventions from the required reading; leftover debug output or dead code; error paths that swallow failures; copy-paste from a sibling that carried along things this change does not need; every new symbol consumed. Fix what you find.
7. Run the full CI parity chain, its one run, and paste the real final output into your report. Any failure: fix it or return blocked. Never report done with a red chain.
8. **Render pass, only when the header says `Verify emulator`, only the plan's Screens.** Mechanics and economics are in the `emulator-verify` skill: parity chain first, then `mqa needs-build`, this worktree's own Metro port. The pass checks pixels, not behaviour: each named screen against the design the ticket links, every named state (empty, filled, error), nothing clipped or collapsed, no red screen or JS error in `mqa logs`. Screenshot every state you claim, into the findings/render path in your dispatch. Never walk a data cycle; the integration tests you wrote in step 3 already prove it. `mqa db` is a wiring spot-check at most (one save, one row). A render defect: fix it, fast subset, re-shoot.
9. Commit with a conventional message. **Never push. Never run `gh`. Never write workflow files into the repo.**

Return, in the unslop shape: branch, commit SHAs, the chain's final output, render evidence (screenshot paths per state, or "no UI surface"), plan deviations with reasons, and the one thing you would flag first if you were reviewing this diff.

## Exit

Committed and green → phase 2. Discrepancy → `plan --amend`, then re-dispatch. Record SHA and outcome in `state.md`.
