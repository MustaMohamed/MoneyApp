# Phase 2, Battery (parallel lenses on one pushed SHA)

**Goal:** every lens reads the same pushed head concurrently, blind to each other and to the ledger. Findings pool into one triage.

## Conductor: push, PR, then dispatch everything at once

1. **Push and open the PR** from the implementation worktree; the cwd matters, `gh pr create` acts on the cwd's current branch.

   ```bash
   cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/MA-XXX
   # the push runs the pre-push hook's jest; the log keeps its output out of context
   git push -u origin <branch> > ~/.ship/MoneyApp/MA-XXX/push.log 2>&1 \
     && gh pr create --base main --title "<type>(<scope>): <the ticket's outcome, imperative> (MA-XXX)" --body-file ~/.ship/MoneyApp/MA-XXX/pr.md >> ~/.ship/MoneyApp/MA-XXX/push.log 2>&1; echo "exit $?"; tail -20 ~/.ship/MoneyApp/MA-XXX/push.log
   bash scripts/board.sh status <n> "In Review"
   ```

   The title is the squash subject; write it here, once, in the conventional shape. The body, written to `pr.md` first, in this order: `Closes #<n>`; the plan's blob URL at its commit (the post-rebase SHA when Setup rebased); one line `Flags: <the header's> · Verify: <the header's>` followed by the diff's shape in a sentence, files, lines and what stays untouched. Phase 5 appends the merge summary to it, [merge.md](merge.md) § Present for merge step 4. Record the PR URL in `state.md`; every later phase targets the PR by URL. Pushing starts CI; nobody waits for it here. Triage reads it, merge confirms it.
2. **Decide deep mode** (SKILL.md → Deep mode) on the header Flags and `node .claude/skills/ship/scripts/pr_size.mjs <pr> 2>&1 | tail -20`, whose `Delivered: <k> files outside tests, <n> lines` gives the figure the ~400-line trigger names; it leaves out the plan file, still on the branch at phase 2. Record `deep_mode`, the trigger and `review_level` in `state.md`. The Flag-path read, `git diff --name-only origin/main...HEAD | grep -vE '^(__tests__|__mocks__|src/test_helpers)/|^\.work/|^jest\.setup\.js$' | head -20`, filters out the test paths of `.claude/skills/tickets/references/splitting.md` § Size gate and the plan file, and gives every file outside tests on a diff of 20 or fewer; check it against the Flags row of [ticket-body.md § Header line](../../tickets/references/ticket-body.md#header-line): a Flag the diff needs and the header lacks parks the ticket, SKILL.md → Parking case 1. On a longer diff the quality lens's danger surfaces, checked at triage, are the second read.
3. **Review worktree:** create or re-point `MA-XXX-review` at the pushed SHA (SKILL.md → Worktrees), symlink `node_modules` from the implementation worktree.
4. **Benchmark inputs** for the quality and conformance lenses: the house-standard reference module, `none named` unless `state.md` → Decisions says otherwise, and the audits under `docs/superpowers/reviews/` (start with `2026-07-29-full-technical-audit.md`; remediation in `docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md`).
5. **Dispatch in one message**, every lens concurrently, none with the ledger:
   - **Correctness lens**, charter A.
   - **Quality lens**, charter B plus the benchmark inputs.
   - **Conformance lens**, deep mode only, charter C plus the benchmark inputs.
   - **Render lens**, `Verify emulator` only, agent type `render`, charter D plus the plan's Screens section, the implementation worktree path, its Metro port, and the render findings path. It runs from the implementation worktree (Hard rule 3's exception) while the implementer is idle, which it is: dispatches are sequential. A lens whose verdict line carries `build: REBUILD` and the files `mqa up` listed builds nothing: the implementer builds under the hold in [implement.md](implement.md) → Re-entry, then the lens is dispatched again.
   - **Built-in `code-review`**, conductor-invoked on the PR URL, effort passed explicitly every time: `state.md` → `review_level`. Never `--fix`, never `--comment`.

Each lens dispatch: charter, absolute paths (review worktree, `issue.md`, `plan.md`, diff range `origin/main...<sha>`, three-dot, the report path `findings/<lens>-<sha>.md`), the return shape of [returns.md](returns.md). Charters A to C also get the review worktree line of [SKILL.md](../SKILL.md) → Worktrees.

## Charter A: correctness lens (paste)

You are reviewing committed work you did not write. You read from the review worktree, under the review worktree line of your dispatch, read-only: no edits but your report, no checkouts, no git state changes. You run no builds or tests; the implementer's chain and CI own execution.

1. Read the ticket (`issue.md`), then the plan. Internalize what this change must do before looking at what it does.
2. Read the full diff for the range, top to bottom. `.work/MA-XXX/plan.md` in the range is the plan you already read, not code under review; it leaves the branch before the merge.
3. **Ticket compliance:** every Acceptance line holds, trace the code paths; every Rule is honoured. Anything the diff does that the ticket does not ask for is a finding (scope creep). Anything the ticket asks for that the diff does not do is a finding (gap). A changed hunk inside the file, section or line range that a line under the plan's `## Non-goals` names is a finding.
4. **Bug hunt:** for each non-trivial hunk, LSP find-references on changed symbols (did the change break a caller the diff does not show?), hover for types at boundaries, diagnostics at this SHA. Hunt swallowed error paths, boundary conditions, stale reads, races, wrong-base computations.
5. **Tests:** do the new tests pin the specified behaviour, or restate the implementation?

Evidence rule: every finding is `path:line`, quoted code, the failing scenario, the smallest fix, severity `blocking` (wrong behaviour, Acceptance violated, swallowed failure) or `note` (should fix, not merge-blocking). A clean class is one line. The findings go to your report, at the path in your dispatch, never into a worktree.

Return at most 15 lines, in the shape of `.claude/skills/ship/references/returns.md`: verdict `approve` | `findings <k>`, the counts line, the worktree Bash ran in, `LSP: used | not used, <why>`, and `report:` with the `findings` range. The report holds the findings and one sentence on the riskiest thing you checked that turned out fine.

## Charter B: quality lens (paste)

You are auditing an open PR for quality from a read-only review worktree. Bugs are another lens's job; yours is whether this code belongs in this codebase.

1. **Conventions:** the diff against `CLAUDE.md` and the `.claude/rules/` files matching the touched paths: state idiom, layering, naming, file placement, comment rules. Cite the rule line or the sibling file in every convention finding.
2. **Measurements, not impressions:** comment density of new code against the module; new file sizes against the module's median; duplication (grep for the sibling a block was copied from, quantify); dead additions (every new export has a consumer, grep to confirm).
3. **Benchmark against the house standard, not local drift.** Pattern-level judgments compare against the reference module and the audits named in your dispatch; `none named` means benchmark against sibling modules and say which. Reproducing an audited anti-pattern is a finding even when every sibling does it. A new abstraction duplicating an existing one is a finding with both paths cited.
4. **Efficiency:** allocation or scans on paths the module treats as hot, N+1, recomputation where an index or memo exists. Severity reflects measured or realistically sized cost.
5. **Danger surfaces, flag not gate:** SQLite migrations, secure-store and auth, onboarding resume state, route files under `src/app/`, native config, money paths. Name each one the diff touches and the Flag it needs from the Flags row of `.claude/skills/tickets/references/ticket-body.md` § Header line, or `none`; triage checks those against the header Flags.

Evidence rule as charter A; `blocking` only for what would make a maintainer's next change wrong or slow. Record genuine strengths in one or two lines.

Return at most 15 lines, in the shape of `.claude/skills/ship/references/returns.md`: verdict `approve` | `findings <k>`, the counts line, the worktree Bash ran in, `LSP: used | not used, <why>`, one line per danger surface with its Flag or `none`, and `report:` with the `findings` range. The report holds the findings and the strengths.

## Charter C: conformance lens (paste; deep mode only)

You are checking an open PR against the codebase's house standard from a read-only review worktree. Your dispatch names the reference module (or `none named`; then use the strongest siblings and say which) and the audits of the module being changed.

1. For each systemic pattern the audit tracks, answer: does this diff reproduce it, decline it, or close it? Cite the audit item (`H11`, `M33`, `L2`, …).
2. Compare the diff's shapes (vocabulary placement, module layout, hook and handler contracts, guard patterns) against the reference; cite the file that does it right.
3. Compile-time guards beat convention: a hand-maintained vocabulary or parallel list the compiler could check is a finding.
4. Scope discipline: conformance fixes that belong to a remediation wave get recommended for exclusion, not demanded.

Return at most 15 lines, in the shape of `.claude/skills/ship/references/returns.md`: verdict `approve` | `findings <k>`, the counts line, the worktree Bash ran in, `LSP: used | not used, <why>`, and `report:` with the `findings` range. The report holds the findings, each with `path:line` and the reference or audit citation, and the audit items this PR closes or declines.

## Charter D: render lens (paste; `Verify emulator` only)

You are checking what the screens of an open PR show, on the Android emulator, from the implementation worktree named in your dispatch. You edit no repository file, change no git state, and run nothing that writes to the repository; you write your report at the path in your dispatch, beside your walk and screenshots. The worktree is parked at the reviewed SHA and stays there.

1. Read the ticket's Acceptance and the plan's Screens section. Read the implementer's render evidence at the render findings path: those screenshots are the claim you are testing, not your evidence.
2. The scenarios are the recipes in `emulator-verify/features/<screen>.md` for the states the plan's Screens section names, at most four; take the force and the proof from the file and explore nothing. If a unit test can assert it, the emulator must not. A state Acceptance names that the file lacks is a finding (`note`), not a scenario you invent.
3. Start with `mqa up`: it claims the device, prints the build verdict, serves this worktree's Metro on the claimed port, never 8081, and launches the app. Write the walk as one file with the Write tool and run it once with `mqa walk`; end with `mqa down`. Each mqa call is its own Bash call. The APK is the implementer's: expect `build: REUSE`. A `build: REBUILD` goes on your verdict line with the files `mqa up` listed, and you build nothing.
4. For each scenario: the shot, cropped with `mqa shot --crop`, against the frame the file names, geometry from `mqa bounds` (dp) against the artboard's measurements, nothing clipped or collapsed, the header's actions reachable, `mqa logs` clean. A wiring claim (a save produced a row) is checked with `mqa db`, once.
5. Screenshot every state you judge, to the render findings path.

Evidence rule: a finding is the scenario, the screenshot path, what the screen showed against what Acceptance or the design says, severity `blocking` (wrong or missing state, clipped content, JS error) or `note`. Report what you could not see. Fonts, shadows, gesture feel and performance are device QA's, not yours; do not report them.

Return at most 15 lines, in the shape of `.claude/skills/ship/references/returns.md`: verdict `approve` | `findings <k>`, ending `build: REBUILD <files>` when you met it, the counts line, and `report:` with the `findings` range. The report holds the findings and the scenario list you ran, one line each on what it caught or cleared.

## Exit

All returns in (a lens killed by a transient API error is re-run). Record per-lens verdicts and counts in `state.md`, one line, from the returns, with `LSP: not used` beside each lens that returned it, and enter phase 3. A report opens at triage, on a verdict of the open list of [returns.md](returns.md).
