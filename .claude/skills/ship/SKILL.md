---
name: ship
description: "Use when the user invokes /ship with an MA ticket, asks to deliver a ticket end-to-end through the gated ship workflow, or asks to resume a ticket that has ~/.ship/MoneyApp/MA-XXX/state.md."
argument-hint: "MA-XXX"
---

# Ship — Gated Ticket Delivery

Conductor playbook for taking one MoneyApp ticket (an `MA-XXX` task backed by a GitHub issue) from idea to merged PR through ten phases. The main session is the conductor. Phases 4–6 run in isolated subagents; phase 7 is a parallel review battery (lens subagents plus the built-in `code-review`, conductor-invoked); phases 8–9 are one triage → fix → delta re-check loop. Every ticket runs all ten phases — small tickets move through phases quickly; they never skip phases.

## Roles

- **Conductor (this session):** owns the GitHub issue, human gates, worktrees, subagent dispatch, triage, and `state.md`. Never implements, plans, or reviews in phases a subagent owns. **Dispatch first, journal second:** never leave an agent slot idle while writing `state.md`, PR text, or issue updates — dispatch the next agent, then write while it runs.
- **Subagents:** discovery scouts (1), planner (4), plan reviewer or panel (5), implementer (6), battery lenses (7), finding verifier (8, deep mode only), delta re-checker (9, one per cycle). Each starts fresh and receives file paths — never conversation history. If a subagent needs background, the spec is the background; a spec that isn't background enough is a spec defect. (The built-in `code-review` is the exception: the conductor invokes it directly — subagents cannot run it, and it brings its own isolated reviewers.)
- **Human:** approves scope (P1), task definition + delivery mode (P2 gate), split boundaries, **every PR merge**, and arbitrates disputed findings.

## Phase map

Load `references/phase-<n>-*.md` when entering a phase. Do not run a phase from memory of this table — the reference file is the method.

| # | Phase | Actor | Exit |
|---|-------|-------|------|
| 1 | Brainstorm | Conductor + human, parallel scouts | **Human gate:** scope + goal approved |
| 2 | Spec | Conductor | **Human gate:** `task.md` + recommended delivery mode approved; `est_loc` recorded |
| 3 | Mode pick | Conductor | Direct: proceed. Chunk: ledger seeded. Split: sub-issues created on GitHub |
| 4 | Plan | Subagent (cold planner) | Skeleton plan complete (+ chunk boundaries in chunk mode) |
| 5 | Plan review | Subagent — single, or 3-lens panel when `est_loc` > ~400 | Approve, or fix loop (single: ≤2 cycles; panel: one consolidated revision + one re-check) |
| 6 | Implement | Subagent (composed specialist — built per the phase-6 recipe, never a `.claude/agents/` persona) | Verification battery green (+ UI render pass when the spec declares UI screens), committed, not pushed |
| 7 | Review battery | Conductor pushes + `gh pr create`, then parallel lenses + built-in `code-review`, CI alongside | All lens reports in |
| 8 | Triage + fix | Conductor (ledger; deep mode: + finding verifier) → implementer → conductor pushes | Consolidated fixes on the PR |
| 9 | Delta re-check | One fresh re-checker, delta-scoped, effort `medium` | Approve (P8↔P9 cap: 2 cycles) |
| 10 | Merge + cleanup | Human, then conductor | PR merged → teardown → issue closed |

**Chunk mode** runs phases 6–10 per chunk: non-final chunks get a 2-lens micro battery; the final chunk gets the full battery as the integration check. **Split** slices each run phases 4–10; the walking-skeleton slice merges first, then remaining *independent* slices may run in parallel worktrees. A triage with nothing left to fix records `P9: vacuous — no fixes to re-check` and proceeds — that is a phase scaling down, not skipped.

## Delivery modes (recommended at the P2 gate, executed at P3)

| Mode | Trigger | Shape |
|---|---|---|
| **Direct** | `est_loc` ≤ ~200 (excluding comments, docs, generated files) — or chunking would yield a single chunk | one branch, one PR, phases run once |
| **Chunk** | `est_loc` > ~200, K ≥ 2 chunks, **and the human says yes** at the P2 gate | virtual chunks in `task.md` — no GitHub sub-issues; each chunk: implement → micro battery → own **main-targeting** PR |
| **Chunk, single-branch** (`mode: chunk-single`) | chunk graph fully dependent, or the human declines multiple PRs | same per-chunk loop and micro batteries, but as increments on **one** branch: one PR opened at the final chunk, full battery once, P10 once |
| **Split** | multi-feature ticket (criteria in the phase-3 file) | real GitHub sub-issues with the next MA numbers; each slice re-enters this picker — a large slice may itself chunk |

## Artifacts

All under `~/.ship/MoneyApp/<ticket>/` — outside the repo and every worktree:

```
~/.ship/MoneyApp/MA-042/
  task.md                    # human-readable checklist — approved at P2; chunk modes: + the chunk ledger
  spec.md                    # deep agent-facing spec
  state.md                   # phase state — written after EVERY transition and gate outcome
  plans/MA-042.md            # skeleton plan (amendments: plans/MA-042-amendment-<n>.md)
  findings/p8-cycle-<n>.md   # each triage's consolidated findings list — what P9 verifies against
  prestage/                  # pre-staged proposals drafted during open gates; overruled ⇒ delete the file
```

Artifacts live outside every repo and worktree, so they can never leak into a commit, they survive worktree teardown, and subagents get stable absolute paths. The GitHub issue body is never used for workflow artifacts. **Anything a later phase consumes must live in a file, not in conductor context** — `state.md` is the only resume point, and it points at the rest.

### state.md template

One copyable block; sections not in play stay present with `-`. **In chunk and split modes the per-row sections below are authoritative for branch/PR/phase/deep_mode; the header fields track the ticket level only.**

```markdown
# MA-042 — <title>
repo: MoneyApp
issue: #<N>                       # the GitHub issue behind this ticket — every status write targets it
branch: feat/MA-042-<kebab-slug>  # chunk mode: ticket-level slug only; real branches live in ## Chunks
phase: <1-10>                     # chunk/split: the furthest ticket-level phase; per-chunk/slice phase lives in the rows
mode: direct | chunk | chunk-single | split-parent
est_loc: ~<N>                     # recorded at the P2 gate; drives the P5 panel decision
deep_mode: no | yes (<reason>)    # per battery — see Deep mode
pr: <url or ->                    # direct/chunk-single: the PR; chunk/split: - (PRs live in the rows)

## Log
- <date> P1 gate: approved — <one-line scope>
- <date> P7 battery: correctness 0 / code-review 3 / quality 2 / conformance 1

## Decisions
- <date> <decision + why>

## Adjudications
<!-- consumed by P8 triage and P9 re-checks — never by first-pass lenses. -->
<!-- Standing entries below ship with the template on purpose; append rulings under them. -->
- FP class: built-in code-review may diff against a stale local main that absorbed others' merged
  commits — verify suspicious "unrelated file" findings against origin/main...HEAD before triage.
- <short label> → <human ruling> (<date>) — <one-line why>

## P1 output
<scope boundaries, scenario inventory table, chosen approach, rejected alternatives, spike findings>

## Chunks
<!-- chunk modes only; mirror of the task.md ledger status. AUTHORITATIVE for per-chunk state. -->
- c1 <slug> — disjoint — merged <pr-url>
- c2 <slug> — disjoint — P7 — deep: no — branch feat/MA-042-c2-<slug> — <pr-url>
- c3 <slug> — dependent on c1,c2 — pending

## Sub-tickets
<!-- split-parent only. A chunked slice notes "(chunk)" and gets its own "### MA-043 chunks" -->
<!-- subsection HERE (same row shape as ## Chunks) and its own ledger section in the parent's -->
<!-- task.md — one slice's rows and ledger never share a section with another's. -->
- MA-043 (#<issue>, phase 6) — <slug>
- MA-044 (#<issue>, pending) — <slug> (chunk)
```

**Log entries are facts, capped at ~8 lines each** — SHAs, verdicts, counts, decisions. Narrative belongs nowhere; the reviews carry their own evidence. The template is a floor, not a ceiling: phases append the structured sections their reference files direct. Sub-tickets and chunks have **no state.md of their own** — their state is their row here.

### Output budgets

The `unslop` skill is the output contract and binds every artifact this workflow writes — conductor and subagents alike; dispatches say so. Ship-specific ceilings, in words unless stated:

| Artifact | Ceiling | Past it |
|---|---|---|
| `spec.md` | 3,000 | Split the ticket |
| `plans/MA-XXX.md` | 2,000 | The plan is a spec — re-cut the chunks |
| A lens report | 800 | Write `findings/<lens>-p7.md`, return the path |
| One finding | 400 | It is two findings |
| A subagent's return | 300 | Write a file, return the path |
| `state.md` | 15 KB total | Collapse the oldest narrative into pointers |

On entering P3, replace `## P1 output` with a ≤10-line summary plus a pointer to the prestage/scout files — P2 is its only consumer, and `state.md` is read in full on every resume. Measured on MA-011: the uncollapsed section was 14.7 KB, 32% of the file, read back on every one of ~40 resume points.

## Hard rules

Violating the letter of these rules is violating their spirit.

1. **Subagents never touch the GitHub issue or PR, never push, never merge.** Only the conductor runs `gh` (issue writes, PR creation, merges are the human's), `git push`, and the built-in `code-review`.
2. **Reviewers never write code.** Findings route to the producer — planner for P5, implementer for P7–9 — who fixes and commits. If fixing seems faster than re-dispatching, that is the moment this rule exists for.
3. **Review lenses work only in the review worktree**, read-only, LSP-first. The plan reviewer/panel (P5) reads the main repo checkout, equally read-only. The built-in `code-review` manages its own isolation. The implementation worktree belongs to the implementer alone.
4. **Every ticket runs all ten phases.** Small tickets get fast phases, never fewer phases. There is no fast lane. (A phase with nothing to do — P9 after a clean triage — is recorded as vacuous, not skipped silently.)
5. **Human gates are explicit.** Approval is a direct answer to the gate question in this session. Earlier enthusiasm, the ticket's existence, or urgency are not approval.
6. **One branch, one PR per (sub-)ticket — per chunk in chunk mode (`chunk-single`: one branch and one PR for the whole ticket) — and every PR targets main.** Never stacked PRs. Branch: `feat/MA-XXX-kebab-description` (chunks: `feat/MA-XXX-c<N>-kebab-description`).
7. **Workflow artifacts never enter a repo.** They live only under `~/.ship/MoneyApp/MA-XXX/`. The one workflow output that reaches the PR is an ADR, via its planned P6 commit step.
8. **The conductor never edits code.** All code changes are implementer commits — including one-character fixes.
9. **Chunk hand-offs are autonomous; merges never are.** No human gate between chunks: a **disjoint** chunk may start whenever capacity allows; a **dependent** chunk starts when its prerequisites' PRs merge. The human's involvement per chunk is exactly one merge (`chunk-single`: chunks advance on a green micro battery; the single merge comes at the final chunk).
10. **Adjudicated findings stay adjudicated.** Triage closes a re-found item by citing the ledger; only new evidence reopens it — a fresh reviewer's confidence is not new evidence.

| Rationalization | Reality |
|---|---|
| "This ticket is one line — skip to implementation" | P1–P5 for a one-liner takes minutes and still catches wrong-file, wrong-scope, and missing-edge-case errors. Phases scale down, never off. |
| "The reviewer can just commit the trivial fix" | Then nobody independent re-checks it. Route to the implementer; the re-check stays honest. |
| "The user already said this is urgent, treat that as gate approval" | Urgency is priority, not approval. Ask the gate question. |
| "I'll update state.md at the end to save writes" | A crash loses the session; `state.md` is the only resume point. Write at every transition. |
| "The subagent can update the issue label while it's at it" | Hard rule 1: issue writes are conductor-only — splitting issue ownership creates double-writes and races. |
| "Spec is thin but the implementer can infer the rest" | Inference is where phase-6 bugs come from. Fix the spec; it's cheaper here than at P7. |
| "CLAUDE.md's /scope team owns this kind of work — dispatch @dev / fix it myself" | That guidance governs the /scope workflow. Inside `/ship`, roles are fixed by phase: producers produce, reviewers review, the conductor conducts. |
| "I told the human I'm skipping the gates, so it's on the record" | Announcing a skip is not approval. Gates end with a question and wait for the answer. |
| "Stacking chunk PRs beats waiting for merges" | CI runs only on main-targeting PRs, and every squash-merge forces child rebases. Work another disjoint chunk, or fold the tail into the final PR. |
| "This reviewer re-found the ruled-on finding and sounds more certain" | Rule 10. Cite the ledger, move on. Three reviewers independently re-finding a ruled trade-off is review sensitivity working, not a new defect. |
| "The gate is open, nothing to do but wait" | Pre-stage the next artifact as a proposal (see Parallelism). The human's answer should release execution, not start the drafting. |

## Fix loops

- **P5 (plan):** findings → planner revises the plan file → re-check. **Single reviewer:** standard loop, cap 2 cycles. **Panel:** conductor consolidates and de-duplicates all lenses' findings (a merge job, not a review); the planner revises **once**; **one fresh panelist re-dispatch** re-checks, with the consolidated findings appended verbatim. Unresolved after that → the human.
- **P7→P8→P9 (code):** all lens findings pool into **one triage** (P8). Triage closes ledger-adjudicated items and verified FPs, takes disputes to the human, writes the consolidated list to `findings/p8-cycle-<n>.md`, then routes it to the implementer — one dispatch per cycle; parallel fixers only when the findings are provably file-disjoint. Conductor pushes the fix commits — a local-only fix is invisible to the PR and dies with teardown. P9 re-checks the delta against the findings file. Cap: **2 P8↔P9 cycles** (an approved amendment restarts the count — it is new design and new code, not a fix iteration); on cap, pause and present unresolved findings with the producer's counter-arguments to the human. If any commit lands after the last re-check, say so at P10 explicitly — never present an unreviewed head as reviewed.
- **A lens or re-checker that dies on a transient API error (429/529) is re-run and does not count as a cycle.** Record the failure; tokens were spent, a review was not produced.
- **Disputes skip the loop.** If the producer argues a finding is wrong instead of fixing it, take both sides to the human immediately, and record the ruling under `## Adjudications`.

## Deep mode (decided per battery, at that battery's entry)

Each battery — each chunk's micro battery, the final chunk's full battery, a direct ticket's single battery — decides deep mode on **its own PR diff**: > ~400 lines excluding generated files and lockfiles; touches money-handling paths (the `money-rules` domain); conductor judgment (novel pattern, wide blast radius). Any one suffices. Record `deep_mode` + reason in `state.md` per battery. Consequences: built-in `code-review` at `high` (else `medium` — including in a micro battery whose chunk trips a trigger), the conformance lens joins the battery, and **P8 triage adversarially verifies findings before the fix dispatch** (see phase 8). Chunk diffs rarely trip the size trigger — by design; the judgment and money-path triggers still apply per chunk. The P5 panel keys off `est_loc` instead — it runs before any diff exists.

## Parallelism

Runs concurrently — always take these overlaps:

- **P1 scouts:** up to 4 read-only discovery agents (codebase map, prior art, history, danger surfaces).
- **P5 panel** (`est_loc` > ~400): three lenses at once; one consolidated revision, one re-check.
- **P7 battery:** all lenses + built-in `code-review` dispatched in one message; CI runs alongside.
- **Chunk mode:** disjoint chunks in parallel worktrees; a merge pending on one chunk never blocks another. Dependent tail chunks wait for their prerequisites' merges or fold into the final PR. Merge-ready chunk PRs are presented to the human **together** — one visit merges several.
- **Split mode:** after the walking-skeleton slice merges, independent slices run in parallel worktrees.
- **Conductor journaling** overlaps any running agent (dispatch first, journal second).

Never concurrent: producer revision within a review cycle (one fix dispatch per cycle — file-disjoint parallel fixers are the one exception, per Fix loops), steps inside one chunk, triage, human gates.

**Pre-stage during every open human gate.** While waiting: P1 gate → draft the spec skeleton; P2 gate → draft the plan charter; P8 findings gate → draft the amendment spec delta + plan-charter draft (P4 still owns planning). Drafts live under `prestage/`; `state.md` gets one log line pointing at the file. Execution starts only on approval; an overruled proposal's file is deleted, not argued for.

## Worktrees

Created by the conductor; subagents never create or remove worktrees. The primary checkout is `/Users/musta/Code/projects/practice/MoneyApp`; worktrees live under its gitignored `.claude/worktrees/`.

```bash
# Implementation worktree (at P6 dispatch), fresh from origin/main:
git -C /Users/musta/Code/projects/practice/MoneyApp fetch origin            # never branch off a stale ref
git -C /Users/musta/Code/projects/practice/MoneyApp worktree add .claude/worktrees/MA-XXX -b feat/MA-XXX-<slug> origin/main
# Bootstrap gotcha in a fresh worktree: it has NO node_modules — the battery won't install them
# itself, and a symlinked node_modules passes tsc/jest/lint but breaks expo prebuild and device
# builds (expo-router resolves zero routes). It needs a REAL tree — but usually not a real
# install: when the lockfile matches the primary checkout, APFS-clone its node_modules
# (copy-on-write: the whole tree as real files — 58k files in ~10s measured, vs minutes for
# npm ci — and no extra disk until files diverge). Lockfile moved, or clone fails → npm ci.
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/MA-XXX
cmp -s package-lock.json ../../../package-lock.json \
  && cp -c -R ../../../node_modules node_modules \
  || npm ci

# Chunk mode: one worktree per in-flight chunk, same recipe:
#   .claude/worktrees/MA-XXX-c<N> -b feat/MA-XXX-c<N>-<slug> origin/main

# Review worktree (at P7), detached at the pushed SHA. One per battery:
#   direct / chunk-single / final chunk: .claude/worktrees/MA-XXX-review
#   chunk c<N> micro battery:            .claude/worktrees/MA-XXX-c<N>-review
git -C /Users/musta/Code/projects/practice/MoneyApp worktree add --detach .claude/worktrees/MA-XXX-review <sha>
# If it already exists (resume, P9 re-check), RE-POINT — never re-run the create:
#   git -C /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/MA-XXX-review checkout --detach <new-sha>
# Full LSP needs deps; review lenses never build or run the app, so symlink node_modules FROM THE
# MATCHING implementation worktree (chunk battery ⇒ the chunk's worktree). -sfn: idempotent — bare
# ln -s re-runs nest a loop.
ln -sfn /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/<impl-worktree>/node_modules /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/<review-worktree>/node_modules

# Teardown (P10, after merge — per chunk in chunk mode: that chunk's impl + review worktrees and branch):
git -C /Users/musta/Code/projects/practice/MoneyApp worktree remove .claude/worktrees/<review-worktree> --force
git -C /Users/musta/Code/projects/practice/MoneyApp worktree remove .claude/worktrees/<impl-worktree>
git -C /Users/musta/Code/projects/practice/MoneyApp branch -D <branch>
git -C /Users/musta/Code/projects/practice/MoneyApp worktree prune
```

## GitHub issue touchpoints (conductor only, via `gh`)

Read a ticket with `gh issue view <N>` (find N from an MA ID: `gh issue list --search "MA-XXX" --state all`); write status with `gh issue edit <N> --add-label ... --remove-label ...`. Exactly one `status:*` label at a time — replace, never add. **Closed is the done signal**; labels are inert once the issue is closed.

- P1 start → ticket In Progress: replace the current `status:*` label with `status:implementing`.
- P3 split → create sub-issues with the next MA numbers (`gh issue create`; PM-style bodies; acceptance criteria mapped to spec sections), labeled `status:todo`. Chunk modes create **nothing** on GitHub — chunks live in `task.md`.
- Sub-ticket enters P4 (first, or the next after a merge) → that sub-issue to `status:implementing`.
- P7 → PR opened via `gh pr create` (see phase 7): the PR body carries `Closes #<N>` only when its merge should close an issue — direct, chunk-single, split slices (their sub-issue), and the **final** chunk; non-final chunk PRs reference the issue without closing keywords. One status write follows: direct / final chunk / chunk-single → replace `status:implementing` with `status:in-review`; after a *non-final* chunk's PR the label stays `status:implementing` — In Review is reserved for the final chunk's PR.
- P8 triage defers a finding → conductor files the follow-up issue via `gh issue create` (PM-style body), records its number in the triage table. "Deferred" without an issue number is not a disposition.
- P10 after merge → confirm `Closes #N` closed the issue (`gh issue view <N> --json state`); close explicitly only if the closing keyword was missing (chunk mode: after the **final** chunk merges; split: parent closes after the last sub-ticket).

## Dispatch recipe

A subagent prompt is assembled from, in order:

1. The **charter** section of the phase's reference file (verbatim).
2. **Absolute paths**: `spec.md`, `task.md`, the plan, the relevant worktree, the diff range or PR.
3. **Repo required reading**: the `CLAUDE.md` at the worktree root, plus the `.claude/rules/` files matching the touched paths (`database.md`, `ui.md`, `state.md`, `money.md`, `tests.md`, `review.md` — they also load automatically inside subagents when files match).
4. The **output contract** from the reference file (what to return, in what shape).
5. **Quality and conformance lenses only:** the repo's named house-standard reference module and any existing audits of the module being changed — sourced per phase 7; `none named` is an allowed value with a defined fallback.

Never paste conversation history. Never summarize the spec into the prompt — pass the path; the subagent reads the file. (Phase 6's task layer *names* the load-bearing conventions and modules for the change; it does not restate spec content.) **P9 re-check dispatches additionally get the `findings/p8-cycle-<n>.md` path and the `## Adjudications` section verbatim; first-pass lens dispatches never receive the ledger** — discovery stays independent, triage stays informed.

## Resume

On `/ship MA-XXX`:

1. Locate `~/.ship/MoneyApp/MA-XXX/state.md`.
2. If found: read it, announce the recorded phase, mode, active chunk/sub-ticket, and any pending gate or loop. **Chunk and split modes: also re-read the `task.md` chunk ledger** (boundaries, interfaces, disjoint/dependent markers) before continuing — `## Chunks` rows carry status; the ledger carries the meaning. Mid-loop resumes read the latest `findings/p8-cycle-<n>.md`. Load that phase's reference file, continue. Do not redo completed phases or merged chunks.
3. If not found, check for a parent first: grep `~/.ship/MoneyApp/*/state.md` for `MA-XXX` and check the ticket's issue body/title for a parent reference (`gh issue view`). A hit means this is a sub-ticket — resume the parent's flow at this sub-ticket's recorded phase; never cold-start it.
4. Only then treat it as new — after one guard: read the ticket's issue first (`gh issue view <N>`). If it is closed, or a merged PR already references it (`gh pr list --search "MA-XXX" --state merged`), report that instead of restarting; a completed ticket has no `state.md` because phase 10 deleted it. Otherwise: create the artifact directory and `state.md`, set `status:implementing`, enter phase 1.

## Red flags — stop and re-read Hard rules

- About to run `git push`, `gh pr merge`, or a `gh` issue/PR write inside a subagent prompt
- About to let a reviewer "quickly fix" anything
- About to start phase 6 with no approved `task.md` in the log
- About to answer a gate yourself because the human is away
- About to base a chunk PR on another chunk's branch instead of main
- About to insert a human gate between chunks, or skip a human merge
- About to hand the adjudication ledger to a first-pass lens
- About to keep a findings list only in conductor context instead of `findings/`
- About to sit idle at an open gate instead of pre-staging the next proposal
- About to write a workflow artifact inside a repo or worktree instead of `~/.ship/MoneyApp/`
- `state.md` doesn't match what you're doing
