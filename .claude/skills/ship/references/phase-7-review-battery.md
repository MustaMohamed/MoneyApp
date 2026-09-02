# Phase 7 — Review battery (parallel lenses + built-in `code-review`, one pushed SHA)

**Goal:** every review lens reads the same pushed head **concurrently**, blind to each other. One battery replaces sequential review phases — findings pool into a single P8 triage instead of separate fix loops.

## Conductor: push, PR, then dispatch everything at once

1. **Push and open the PR first.** From the implementation worktree (`cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/MA-XXX...`): `git push -u origin <branch>`, then `gh pr create --base main` — **the working directory matters**: `gh pr create` acts on the current branch of the cwd's repo, and the conductor's default cwd (the primary checkout) sits on a different branch. The PR body carries `Closes #<N>` only when its merge should close an issue — direct, chunk-single, a split slice (its sub-issue), and the **final** chunk; a non-final chunk PR references the issue without closing keywords. Then the one status write: direct / final chunk / chunk-single → `bash scripts/board.sh status <N> "In Review"`; non-final chunk → the board stays at In Progress — In Review is reserved for the final chunk's PR. Record the PR URL in `state.md` (chunk mode: in that chunk's `## Chunks` row) — all later phases target the PR by URL, never by bare number. Pushing triggers CI; nobody waits for it here — P8 triage reads it, P10 confirms it. (`chunk-single`: non-final chunks push the branch but open no PR; `gh pr create` runs once, at the final chunk.)
2. **Decide deep mode now, for this battery, on this PR's diff** (SKILL.md → Deep mode); record `deep_mode` + reason in `state.md`.
3. **Create or re-point this battery's review worktree** (SKILL.md → Worktrees; per-battery names — `MA-XXX-review`, or `MA-XXX-c<N>-review` for a chunk's micro battery). If it already exists (resume, re-check), **re-point with `git checkout --detach <sha>` — never re-run the create.** Symlink `node_modules` from the *matching* implementation worktree. All lens subagents share it read-only.
4. **Name the benchmark inputs** for the quality and conformance lenses: the repo's **house-standard reference module** and any **existing audits** of the module being changed. This repo's standing answer (recorded at install): reference module `none named` — the quality and conformance lenses benchmark against sibling modules and say so; audits live in `docs/superpowers/reviews/` (start with `2026-07-29-full-technical-audit.md`) with remediation tracked in `docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md`. A later human answer recorded in `state.md` → `## Decisions` overrides the standing `none named` for every later battery.
5. **Dispatch the battery in one message** — every lens concurrently, none receives the adjudication ledger (first-pass discovery stays blind):
   - **Correctness lens** (subagent) — charter A below.
   - **Quality lens** (subagent) — charter B below + the benchmark inputs from step 4.
   - **Conformance lens** (subagent, deep mode only) — charter C below + the benchmark inputs from step 4.
   - **Built-in `code-review`** — conductor-invoked (subagents cannot run it; it brings its own isolated reviewers). Target the **PR URL from `state.md`**. Effort: pass it **explicitly every time** — `high` when this battery's `deep_mode: yes`, else `medium` (with no level given the skill silently reuses the last level typed in the session). Never pass `--fix` or `--comment` — fixes are implementer commits (Hard rules 2 and 8). Known FP class: it may pick a stale local base; suspicious "unrelated file" findings get verified against `origin/main...HEAD` at triage, not discarded by the lens.

**Micro battery (chunk mode, non-final chunks):** two lenses — built-in `code-review` (effort per this chunk's deep-mode decision: `high` if a trigger fired, else `medium`) plus the quality lens with charter B. **A chunk that trips deep mode (money path, conductor judgment) gets the conformance lens too** — the deep-mode consequences are per battery, micro or not.

**Final chunk = the integration check.** Its diff range only contains the final chunk's commits (earlier chunks are already merged into main), so integration duty is carried by context, not range: pass every lens the `task.md` chunk ledger and the merged chunk PR URLs — charter A's final-chunk step then activates on its own.

Each lens dispatch = charter + absolute paths (review worktree, `spec.md`, `task.md`, plan, diff range `origin/main...<sha>` — three-dot, so an advanced main doesn't leak reverse-diffs).

## Charter A — correctness lens (paste)

You are reviewing committed work you did not write. You work ONLY in the review worktree, read-only: no edits, no branch checkouts, no git state changes beyond being parked at the given SHA. You do not run builds or tests — the implementer's battery and CI own execution.

1. Read `task.md`, then `spec.md`. Internalize what this change must do before looking at what it does.
2. Read the full diff for the given range, top to bottom.
3. **Spec compliance:** every spec scenario this ticket covers behaves as specified — trace the code paths. Anything the diff does that the spec doesn't ask for is a finding (scope creep). Anything the spec asks for that the diff doesn't do is a finding (gap).
4. **Bug hunt:** for each non-trivial hunk, use LSP — find-references on changed symbols (who else calls this? did the change break a caller the diff doesn't show?), hover for types at boundaries, diagnostics at this SHA. Hunt: error paths that swallow failures, boundary conditions from the spec's scenario table, stale reads, races, wrong-base computations.
5. **Tests:** do the new tests pin the specified behavior (would they fail if it regressed?), or restate the implementation?
6. **Final-chunk batteries only** (your dispatch includes a chunk ledger + merged chunk PR URLs): trace the wiring against the merged chunks' interfaces — the cross-chunk seams are the one thing only this battery can check.

**Evidence rule:** every finding cites `path:line` with quoted code and severity matched to consequence — `blocking` (wrong behavior, spec violation, swallowed failure) or `note` (should fix, **not merge-blocking**). No finding without evidence. Do not pad: a clean diff gets an approve, not manufactured notes. Shape (unslop contract): a finding is `path:line` + failing scenario + smallest fix, nothing else; a class checked and found clean is one line, not a section. A report that outgrows a screen goes to `findings/<lens>-p7.md` with the path returned.

Return: verdict (`approve` | `findings`), findings list, one sentence on the riskiest thing you checked that turned out fine.

## Charter B — quality lens (paste)

You are auditing an open PR for quality and efficiency from a read-only review worktree. Bugs are another lens's job; yours is whether this code belongs in this codebase.

1. **Conventions:** check the diff against the repo's `CLAUDE.md` and the `.claude/rules/` files matching the touched paths (`ui.md`, `state.md`, `database.md`, `money.md`, `tests.md`): state management idiom, layering, naming, file placement, comment rules. Cite the rule-file line or sibling file in every convention finding.
2. **Measurements, not impressions:** comment density of new code vs the surrounding module; new file sizes vs the module's median; duplication (grep for the sibling each new block may have been copied from; quantify overlap); dead additions (every new export has a consumer — grep to confirm; dark-until-wired symbols declared by the implementer are exempt, but say so).
3. **Benchmark against the house standard, not the local drift.** Pattern-level judgments (state shape, layering, abstraction reuse) compare against the repo's **house-standard reference module** and any **existing audits** — both named in your dispatch. If your dispatch says `none named`, benchmark against sibling modules and say so in the report. "Consistent with the module the diff lives in" is NOT conformance when that module is a known deviant; reproducing an audited anti-pattern is a finding even if every sibling file does it. A new abstraction duplicating an existing one is a finding **with both paths cited**.
4. **Efficiency:** allocation or scans inside paths the module treats as hot, N+1 patterns, recomputation where an index or memo exists. Severity must reflect *measured or realistically-sized* cost — no theoretical cliffs; check what actually gates re-renders/queries before filing.
5. **Repo danger surfaces (flag, don't gate):** SQLite migrations, secure-store/auth surfaces, onboarding resume state, route files under `src/app/` (layout-sibling and colocation traps), native config (`app.json` plugins, prebuild surface), money computation paths — say so explicitly; P10 surfaces these in the merge summary. Never let such a diff pass silently unlabeled.

**Evidence rule:** `path:line` + quoted code; `blocking` only for things that would make a maintainer's next change wrong or slow; everything else is a `note` (should fix, not merge-blocking). Record genuine strengths (one or two lines). Do not pad. Shape (unslop contract): a finding is `path:line` + failing scenario + smallest fix, nothing else. A report that outgrows a screen goes to `findings/<lens>-p7.md` with the path returned.

Return: verdict (`approve` | `findings`), findings list, strengths, danger-surface flags.

## Charter C — conformance lens (paste; deep mode only)

You are checking an open PR against the codebase's house standard, from a read-only review worktree. Your dispatch names the **house-standard reference module** (or `none named` — then benchmark against the strongest sibling modules and say which you used) and any **existing audits** of the module being changed.

1. For each systemic pattern the audit tracks, answer explicitly: does this diff reproduce it, decline it, or close it? Cite the audit item (audit findings carry IDs — `H11`, `M33`, `L2`, …).
2. Compare the diff's shapes (vocabulary placement, module layout, hook/handler contracts, index-before-loop, guard patterns) against the reference module — cite the reference file that does it right.
3. Compile-time guards beat convention: where the diff hand-maintains a vocabulary or parallel list the compiler could check, that is a finding.
4. Scope discipline: flag conformance fixes that belong to an audit's remediation wave rather than this ticket — recommend exclusion, don't demand inclusion.

**Evidence rule:** `path:line` + the reference-module or audit citation. Return: verdict, findings, and the audit items this PR *closes* or *declines* (credit, not just debt).

## Exit

All lens reports in (a lens killed by a transient API error is re-run — not a cycle). Pool everything and enter phase 8. Record per-lens verdicts and finding counts in `state.md` (one line).
