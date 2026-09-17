# Phase 1, Implement (a test writer, then one composed implementer)

**Goal:** the plan becomes commits on the ticket branch: first the tests the plan names, committed red; then the code that makes them green, self-reviewed, CI parity chain green, render pass done when the header says `Verify emulator`. No push.

Two dispatches in sequence, same worktree, same branch. The test writer never sees the implementation and the implementer never edits a test file, so the tests pin Acceptance, not the code. On the accounts redesign, 0 of 158 implementer runs wrote a test before their first source edit; the median run started its tests at message 36 of 73. The split is what makes test-first happen.

**Board:** `bash scripts/board.sh status <n> "In Progress"` at dispatch. The script carries In Progress up to the parent and its parent when they are not there yet; a parent stays In Progress until `promote` closes it with its last child.

## Conductor: dispatch the test writer first

It writes the plan's `Test: first` cases. Skip only when no step reads `first`; record `P1a: vacuous` in `state.md`. The `Test: after` cases get a second, shorter dispatch of the same charter once the implementer has committed, with the implementer's return appended (its files and exported symbols, not the diff) and the objective "write the `after` cases against the exported signatures; read no function body". An `after` test that fails is a phase 3 finding, a real defect or a wrong test, never a reason to re-run the implementer. Otherwise the prompt is: the charter below verbatim; absolute paths to `issue.md`, `plan.md`, the worktree and the branch; required reading `CLAUDE.md`, `.claude/rules/tests.md`, `.claude/rules/review.md`, and the `moneyapp-testing` skill by name. Nothing about the implementation.

### Charter (paste)

You write the tests for a plan; on the first dispatch its code does not exist yet, on the `after` dispatch it does (step 7). You do not implement, design or re-plan.

1. Read the ticket's Acceptance and Rules, then every plan step's `Test:` line marked for this dispatch (`first`, or `after` on the second) and the `Change:` line beside it for the interface it names. Load the `moneyapp-testing` skill before writing anything.
2. For each `Test:` line write the case it names, in `__tests__/` as a logic-only `.ts` file, asserting the behaviour the Acceptance line states: returned values, thrown error types, row state after the operation. An interface the plan names and the code lacks is imported as named; the test fails at run time until the implementer adds it, which is the point.
3. Run each file: `npm test -- --ci <file> > .work/MA-XXX/red.log 2>&1; grep -nE "✕|●|Expected|Received|Cannot find" .work/MA-XXX/red.log | head -20`. Every test must fail on its assertion or on the missing interface the plan names, never on a typo, a wrong path or a mock that swallows the call. A test that passes against the current code proves nothing about this change: delete it or fix the assertion.
4. Touch only `__tests__/` and, when a plan step names one, `src/test_helpers/`. No source edits.
5. An Acceptance line you cannot turn into a test at any layer the repo tests: say so in the return with the reason; it is the implementer's render pass or a gap, not your guess.
6. **60 tool calls.** Commit as `test(MA-XXX): red tests for steps <list>`. Never push.
7. **On the `after` dispatch** the code exists and steps 2 and 3 invert: import the exported symbols the implementer's return names and read their signatures, never a function body; every test must pass on the first run. A test that fails is returned as it is, with the log lines, and enters phase 3 as a finding: you do not change the test to pass and you do not touch the code. Commit as `test(MA-XXX): after cases for steps <list>`.

Return, in the unslop shape: the commit SHA, one line per test file with the failing reason as the log shows it, the Acceptance lines with no test and why, your tool-call count.

## Conductor: compose the implementer

Never dispatch `@layla`; she rules on money and writes no code. Assemble the prompt from three layers:

1. **Repo layer.** Required reading in this order: the worktree's `CLAUDE.md`, then the `.claude/rules/` files matching the plan's files (`database.md`, `ui.md`, `state.md`, `money.md`, `tests.md`, `review.md`). Name the two verification commands: the fast subset, `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`, per commit; the full CI parity chain from `CLAUDE.md` → Commands, once, before hand-off.
2. **Task layer.** From the plan header and the ticket: the module, the conventions that are load-bearing for this change (UI: HeroUI primitive first, tokens through `ms()`/`msFont()`, copy in `constants/strings.ts`, no `useState` in `index.tsx`; money: rounding and formatting per the `money-rules` skill; DB: `null` only for DB-mapped nullable columns), the decision record the plan names, and, for `Verify emulator`, the plan's Screens section and the Metro port this worktree owns (never 8081).
3. **Charter layer.** The contract below, verbatim.

Also pass: absolute paths to `issue.md`, `plan.md`, the worktree, the branch name, and the test writer's commit SHA with its list of test files and their failing reasons.

## Re-entry

- **Fix dispatch (from phase 3):** same three layers; the charter's objective becomes "address exactly the findings in the file below, nothing else", with `findings/cycle-<n>.md` appended verbatim. A test file may be edited only for a finding that names it. Budget 60 tool calls. The fast subset before the commit; the full chain does not run again, CI on the pushed head is the chain and triage reads it first. Commit and no-push rules unchanged.
- **Over budget:** the implementer returned `over budget` with a SHA and the steps left. Dispatch a fresh implementer with the same three layers, the SHA as the base and the steps-left list as the plan's remaining steps. It is the same phase, not a cycle. Record `budget: <calls> / <calls>` per dispatch in `state.md`.
- **Discrepancy STOP:** the implementer returned that the plan is wrong about the code. First discard the dead attempt's uncommitted edits, `git -C <worktree> checkout -- . && git -C <worktree> clean -fd`, so the amend planner reads a clean tree and the next implementer starts from the last commit. Then run the `prep` skill with `--amend` and the discrepancy verbatim (it commits the amended plan and pushes), refresh `plan.md` with `cp <worktree>/.work/MA-XXX/plan.md ~/.ship/MoneyApp/MA-XXX/plan.md`, and re-dispatch the implementer.

## Charter (paste)

You execute the plan. You do not design, re-plan, or expand scope.

1. Read the required repo docs, the ticket, and the plan fully before touching code. Turn your steps into a short concrete edit list (files, symbols, test names) checked against the code as it is now: the plan gives interfaces and invariants, the current code wins on line-level detail. If the plan is wrong about the code (file moved, symbol renamed, approach impossible), STOP and return the discrepancy with `path:line`; do not improvise around it.
2. Work only inside the worktree, on the named branch. Do not touch the plan file, `.work/MA-XXX/plan.md`.
3. Follow the plan's step order. The `first` tests for each step already exist at the test commit and are red; your step makes them green. A step whose interface you shape differently from the Change line is a plan deviation in your return with the new signature, so the `after` test writer has it. **Test files are not yours:** you do not edit `__tests__/` or `src/test_helpers/` except a case a plan step marks `owned by implementer`. A red test you believe asserts the wrong thing is a discrepancy: STOP and return the test, the assertion and the Acceptance line it misreads; do not change it to pass.
4. Match the surrounding code's idiom. When your instinct conflicts with `CLAUDE.md` or a rules file, the rules win.
5. **Cadence and budget:** targeted tests for the layer you touched after each step (`npm test -- --ci <path>`), the fast subset before each commit, the full parity chain exactly once, at step 7. Every check writes to a file and you read the tail: `... > .work/MA-XXX/check.log 2>&1; tail -20 .work/MA-XXX/check.log`, and on a failure `grep -nE "FAIL|error|✕" .work/MA-XXX/check.log | head -20`. Never read a full jest or chain output. **You have 120 tool calls.** At 100, stop adding steps: commit what is green, and return `over budget` with the steps done, the steps left and the SHA. The conductor dispatches a fresh implementer for the rest; that costs less than your context from here. Builds: `mqa needs-build` once; a second build in one run is a return, not a retry.
6. **Self-review before committing:** read `git diff origin/main...HEAD` once, file by file, as a hostile reviewer; past 800 changed lines outside tests, read only the files you touched in the last step, the correctness lens re-reads the whole diff with a fresh context. Conventions from the required reading; leftover debug output or dead code; error paths that swallow failures; copy-paste from a sibling that carried along things this change does not need; every new symbol consumed. Fix what you find.
7. Run the full CI parity chain, its one run, and paste the real final output into your report. Any failure: fix it or return blocked. Never report done with a red chain.
8. **Render pass, only when the header says `Verify emulator`, only the plan's Screens.** Mechanics and economics are in the `emulator-verify` skill: parity chain first, then `mqa needs-build`, this worktree's own Metro port. The walk is the recipes from `emulator-verify/features/<screen>.md` for the plan's states, copied into one `mqa walk` script; explore nothing. The pass checks pixels, not behaviour: each named state against its frame, nothing clipped or collapsed, no red screen or JS error in `mqa logs`. A state you meet that the file does not carry goes into the file in this commit, with its frame or `no frame`. Screenshot every state you claim, into the findings/render path in your dispatch. Never walk a data cycle; the integration tests you wrote in step 3 already prove it. `mqa db` is a wiring spot-check at most (one save, one row). A render defect: fix it, fast subset, re-shoot.
9. Commit with a conventional message. **Never push. Never run `gh`. Never write workflow files into the repo.**

Return, in the unslop shape: branch, commit SHAs, the chain's last 20 lines, render evidence (screenshot paths per state, or "no UI surface"), plan deviations with reasons, your tool-call count, and the one thing you would flag first if you were reviewing this diff.

## Exit

Committed and green → the `after` test dispatch when the plan has `after` cases, then phase 2. Discrepancy → `prep --amend`, then re-dispatch; a discrepancy on a test goes to the test writer, not the implementer. Over budget → re-dispatch on the SHA. Record the test SHA, the implementation SHA, outcomes and tool-call counts in `state.md`.
