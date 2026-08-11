# Phase 3 — Mode pick (conductor)

**Goal:** execute the delivery mode the human approved at the P2 gate — direct, chunk, or split. No new gate here unless the human deferred the choice.

**Inputs:** `spec.md`, `task.md`, the approved mode.

## The picker (recommended at P2, executed here)

| Mode | When | Executes as |
|---|---|---|
| **Direct** | `est_loc` ≤ ~200 (excl. comments/docs/generated) — or chunking would yield one chunk | phases 4–10 once |
| **Chunk** | `est_loc` > ~200, K ≥ 2 chunks, human said yes | virtual chunks in `task.md`; phases 6–10 per chunk (`chunk-single` variant: one branch, one PR at the final chunk) |
| **Split** | any split criterion below holds | GitHub sub-issues; phases 4–10 per slice; each slice re-enters this picker |

## Split criteria (measurable — judge the *expected diff*, not the ticket's word count)

A ticket needs **split** (not merely chunking) when any of these holds:

- It bundles more than one product-coherent outcome a PM would track separately.
- It spans more than one repo (always split at the repo boundary, contract-producing side first).
- A slice boundary is meaningful to the product — independently shippable, independently revertable *as a feature*.

Chunking handles pure *size*; splitting handles *product shape*. A 1,500-LOC single-feature ticket chunks; a two-feature ticket splits (and its big slices may then chunk).

## Chunk mode — seeding the ledger

1. **Peel the preludes first.** Pure, main-safe preparatory work — extractions, seam-cuts, mechanical refactors, test scaffolding — becomes chunk `c1` (or several): tiny, fast PRs that shrink and de-risk the core chunks.
2. Chunk boundaries are **semantic, ~200–400 LOC each**: interface-complete, independently testable. The LOC ruler decides *whether* to chunk; seams decide *where*. If the ledger would hold a single chunk, run **direct** instead — chunking starts paying at K ≥ 2. Boundaries are proposed here from the spec, finalized by the P4 skeleton plan.
3. **Dark-until-wired is allowed:** a chunk PR may merge inert-but-tested code (a pure function with no caller yet) provided the final chunk wires everything and the sequence completes within the ticket's In-Progress window. Ticket abandoned mid-sequence → revert the inert chunks.
4. Record the ledger in `task.md` (chunk slug, owned spec sections, exposed interface, status) and mirror status rows in `state.md` → `## Chunks`. Mark each chunk **disjoint** (parallelizable) or **dependent** (waits for named prerequisites' merges, or folds into the final PR).
5. Every chunk PR targets **main** — never another chunk's branch (CI runs only on main-targeting PRs; squash-merges force child rebases).

## Splitting rules

- **Vertical slices over horizontal layers.** Each sub-ticket delivers a usable sliver end-to-end, not "all the types", then "all the hooks", then "the UI".
- **Walking skeleton first.** Sub-ticket 1 proves the end-to-end seam (route → data → render, or store → repository → row) at minimal width; later sub-tickets widen it.
- **One repo per sub-ticket.**
- **Each sub-ticket independently mergeable** — a merged prefix of the sequence must leave the product consistent.
- Sub-ticket bodies are PM-style (problem + outcome, no file paths or code), with acceptance criteria mapped to `spec.md` sections.

## Gate (split boundaries only, if not already covered at P2)

If the P2 gate approved "split" without the slice list, present it now: title, one-line outcome, acceptance-criteria mapping, order, and why this cut. Ask directly: **"Approve this split?"**

Only after approval: create the sub-issues via `gh issue create` — one per slice, titled with the next globally-sequential MA numbers (highest across `docs/scopes/**` and `~/.ship/MoneyApp/` plus one), labeled `status:todo` — and record in `state.md` (`mode: split-parent`, `## Sub-tickets`) each sub-ticket's MA ID, issue number, order, **and slice brief** — one or two lines of outcome plus the `spec.md` sections/scenarios it owns. The brief is load-bearing: subagents cannot read GitHub issues, so `state.md` is the only place the planner and reviewers can learn which slice a sub-ticket covers.

## Execution shape after this phase

- **Direct:** phases 4–10 run once.
- **Chunk:** P4 skeleton plan finalizes boundaries; then phases 6–10 per chunk — **disjoint chunks in parallel worktrees**; dependent chunks after their prerequisites merge (or folded into the final PR). Chunk hand-offs are autonomous (Hard rule 9); every merge is the human's. **`chunk-single`** (fully dependent graph, or the human declined multiple PRs): same per-chunk loop and micro batteries on one branch; no per-chunk PR or merge — `gh pr create`, the full battery, and P10 run once, at the final chunk.
- **Split:** phases 4–10 per sub-ticket. The walking-skeleton slice completes first; after it merges, **independent slices may run in parallel worktrees**. Dependent slices stay sequential. All sub-plans live under the parent's `~/.ship/MoneyApp/MA-PARENT/plans/`. The parent moves to Done when the last sub-ticket merges.
