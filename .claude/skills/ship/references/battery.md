# Phase 2, Battery (parallel lenses on one pushed SHA)

**Goal:** every lens reads the same pushed head concurrently, blind to each other and to the ledger. Findings pool into one triage.

## Conductor: push, PR, then dispatch everything at once

1. **Push and open the PR** from the implementation worktree; the cwd matters, `gh pr create` acts on the cwd's current branch.

   ```bash
   cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/MA-XXX
   git push -u origin <branch>
   gh pr create --base main --title "<type>(<scope>): <the ticket's outcome, imperative> (MA-XXX)" --body-file ~/.ship/MoneyApp/MA-XXX/pr.md
   bash scripts/board.sh status <n> "In Review"
   ```

   The title is the squash subject; write it here, once, in the conventional shape. The body, written to `pr.md` first: `Closes #<n>`, the plan's blob URL at its commit (the post-rebase SHA when Setup rebased), a line per Flag, and a "Trade-offs" section the triage fills later. Record the PR URL in `state.md`; every later phase targets the PR by URL. Pushing starts CI; nobody waits for it here. Triage reads it, merge confirms it.
2. **Decide deep mode** (SKILL.md → Deep mode) on the header Flags and `git diff --stat origin/main...HEAD`; record `deep_mode` and the trigger in `state.md`.
3. **Review worktree:** create or re-point `MA-XXX-review` at the pushed SHA (SKILL.md → Worktrees), symlink `node_modules` from the implementation worktree.
4. **Benchmark inputs** for the quality and conformance lenses: the house-standard reference module, `none named` unless `state.md` → Decisions says otherwise, and the audits under `docs/superpowers/reviews/` (start with `2026-07-29-full-technical-audit.md`; remediation in `docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md`).
5. **Dispatch in one message**, every lens concurrently, none with the ledger:
   - **Correctness lens**, charter A.
   - **Quality lens**, charter B plus the benchmark inputs.
   - **Conformance lens**, deep mode only, charter C plus the benchmark inputs.
   - **Render lens**, `Verify emulator` only, charter D plus the plan's Screens section, the implementation worktree path, its Metro port, and the render findings path. It runs from the implementation worktree (Hard rule 3's exception) while the implementer is idle, which it is: dispatches are sequential.
   - **Built-in `code-review`**, conductor-invoked on the PR URL, effort passed explicitly every time: `high` in deep mode, else `medium`. Never `--fix`, never `--comment`.

Each lens dispatch: charter, absolute paths (review worktree, `issue.md`, `plan.md`, diff range `origin/main...<sha>`, three-dot), the return shape.

## Charter A: correctness lens (paste)

You are reviewing committed work you did not write. You work only in the review worktree, read-only: no edits, no checkouts, no git state changes. You run no builds or tests; the implementer's chain and CI own execution.

1. Read the ticket (`issue.md`), then the plan. Internalize what this change must do before looking at what it does.
2. Read the full diff for the range, top to bottom. `.work/MA-XXX/plan.md` in the range is the plan you already read, not code under review; it leaves the branch before the merge.
3. **Ticket compliance:** every Acceptance line holds, trace the code paths; every Rule is honoured. Anything the diff does that the ticket does not ask for is a finding (scope creep). Anything the ticket asks for that the diff does not do is a finding (gap).
4. **Bug hunt:** for each non-trivial hunk, LSP find-references on changed symbols (did the change break a caller the diff does not show?), hover for types at boundaries, diagnostics at this SHA. Hunt swallowed error paths, boundary conditions, stale reads, races, wrong-base computations.
5. **Tests:** do the new tests pin the specified behaviour, or restate the implementation?

Evidence rule: every finding is `path:line`, quoted code, the failing scenario, the smallest fix, severity `blocking` (wrong behaviour, Acceptance violated, swallowed failure) or `note` (should fix, not merge-blocking). A clean class is one line. A report past a screen goes to the findings path in your dispatch; return the path.

Return: verdict (`approve` | `findings`), findings, one sentence on the riskiest thing you checked that turned out fine.

## Charter B: quality lens (paste)

You are auditing an open PR for quality from a read-only review worktree. Bugs are another lens's job; yours is whether this code belongs in this codebase.

1. **Conventions:** the diff against `CLAUDE.md` and the `.claude/rules/` files matching the touched paths: state idiom, layering, naming, file placement, comment rules. Cite the rule line or the sibling file in every convention finding.
2. **Measurements, not impressions:** comment density of new code against the module; new file sizes against the module's median; duplication (grep for the sibling a block was copied from, quantify); dead additions (every new export has a consumer, grep to confirm).
3. **Benchmark against the house standard, not local drift.** Pattern-level judgments compare against the reference module and the audits named in your dispatch; `none named` means benchmark against sibling modules and say which. Reproducing an audited anti-pattern is a finding even when every sibling does it. A new abstraction duplicating an existing one is a finding with both paths cited.
4. **Efficiency:** allocation or scans on paths the module treats as hot, N+1, recomputation where an index or memo exists. Severity reflects measured or realistically sized cost.
5. **Danger surfaces, flag not gate:** SQLite migrations, secure-store and auth, onboarding resume state, route files under `src/app/`, native config, money paths. Say so explicitly; the merge summary lists them.

Evidence rule as charter A; `blocking` only for what would make a maintainer's next change wrong or slow. Record genuine strengths in one or two lines.

Return: verdict, findings, strengths, danger-surface flags.

## Charter C: conformance lens (paste; deep mode only)

You are checking an open PR against the codebase's house standard from a read-only review worktree. Your dispatch names the reference module (or `none named`; then use the strongest siblings and say which) and the audits of the module being changed.

1. For each systemic pattern the audit tracks, answer: does this diff reproduce it, decline it, or close it? Cite the audit item (`H11`, `M33`, `L2`, …).
2. Compare the diff's shapes (vocabulary placement, module layout, hook and handler contracts, guard patterns) against the reference; cite the file that does it right.
3. Compile-time guards beat convention: a hand-maintained vocabulary or parallel list the compiler could check is a finding.
4. Scope discipline: conformance fixes that belong to a remediation wave get recommended for exclusion, not demanded.

Return: verdict, findings with `path:line` and the reference or audit citation, and the audit items this PR closes or declines.

## Charter D: render lens (paste; `Verify emulator` only)

You are checking what the screens of an open PR show, on the Android emulator, from the implementation worktree named in your dispatch. You edit no file, change no git state, and run nothing that writes to the repository; the worktree is parked at the reviewed SHA and stays there.

1. Read the ticket's Acceptance and the plan's Screens section. Read the implementer's render evidence at the render findings path: those screenshots are the claim you are testing, not your evidence.
2. Scope the walk with the `emulator-verify` skill: at most four scenarios, each one you can name the device-only failure it catches. If a unit test can assert it, the emulator must not. Never re-prove arithmetic through a form.
3. Write the walk as one script and run it once with `mqa walk`, on this worktree's Metro port from your dispatch, never 8081. The APK is the implementer's; ask `mqa needs-build` before any build and expect the answer to be no.
4. For each scenario: the screen against the design the ticket links, every state Acceptance names, nothing clipped or collapsed, the header's actions reachable, `mqa logs` clean. A wiring claim (a save produced a row) is checked with `mqa db`, once.
5. Screenshot every state you judge, to the render findings path.

Evidence rule: a finding is the scenario, the screenshot path, what the screen showed against what Acceptance or the design says, severity `blocking` (wrong or missing state, clipped content, JS error) or `note`. Report what you could not see. Fonts, shadows, gesture feel and performance are device QA's, not yours; do not report them.

Return: verdict, findings, the scenario list you ran with one line each on what it caught or cleared.

## Exit

All reports in (a lens killed by a transient API error is re-run). Record per-lens verdicts and counts in `state.md`, one line, and enter phase 3.
