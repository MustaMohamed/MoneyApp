# Audit Remediation Backlog

Source: [2026-07-29-full-technical-audit.md](../reviews/2026-07-29-full-technical-audit.md) (89 findings, verifier-corrected). This file is the canonical tracker for the remediation work — one item per wave, in dependency order. Mark items done with their PR number as they merge. Wave 1 of the original sequencing (verify-pr green) already shipped via PR #175/#177.

---

## Item 1 — Fix commitment payment lifecycle

**Tags:** `bug`, `financial-correctness` · **Effort:** L · **Blocked by:** —

Payment status is stamped once at insert and never ages (`upcoming` forever), and generation is anchored to `start_date` with a hard 64-occurrence cap that never re-windows — a daily commitment stops producing payments after 64 days. One root cause: derived time-state stored in the same column as durable user actions.

- Findings: **H1/H4** (status never transitions), **H2** (64-cap window), M10/M17 (edit orphans overdue rows), L9 (after_count stalls on skip), L10 (non-atomic edit), L8 (full-table re-scan per mutation)
- Fix shape: derive `upcoming/due/overdue` at read time (or age inside the housekeeping transaction), keep only `paid/skipped` durable; rolling generation window `[max(start, today−1 period), today+horizon]`
- Guardrails now in place: `.claude/rules/database.md` derived-state rule; `moneyapp-testing` for the housekeeping suite; Device QA commitments matrix

## Item 2 — Category deletion integrity

**Tags:** `bug`, `crash` · **Effort:** M · **Blocked by:** —

Deleting a custom category with a budget or commitment row throws `FOREIGN KEY constraint failed` into a `void` handler — no error surface, delete silently fails. The reassign path has the same hole (never migrates `budgets`).

- Findings: **H5/H8/H13** (3 lenses independently), **H9** (reassign misses budgets)
- Fix shape (code-only first): usage count across ALL FK sources → route to reassign; add `UPDATE budgets` to `reassignAndDelete` with UNIQUE-collision handling. Schema `ON DELETE` migration is the durable fix but needs sign-off (critical trigger 3)

## Item 3 — Money display fixes (after formatter consolidation)

**Tags:** `bug`, `financial-correctness` · **Effort:** M · **Blocked by:** Issue 4

Preview/display bugs where the shown number diverges from the persisted one: Pay sheet up to 50× overstated (H6), transaction form EGP→USD previews (M18/M40), hardcoded "EGP" on USD credit-card fields (M19), USD rendered with 0 decimals everywhere (M22), `parseFloat` money inputs (M15/M21), adjust-balance vs revolving (M16), statement-day cycle skip (M20), archive-erases-debt copy (M12).

- Fix rule: derive display from the write-path domain function (`money-rules` skill — the iron rule)

## Item 4 — Consolidate money formatting layer

**Tags:** `refactor` · **Effort:** M · **Blocked by:** — (do BEFORE Item 3 or 13 sites get touched twice)

13 ad-hoc `Intl.NumberFormat` sites diverge from `formatAmount` (M1); `formatAmount` constructs a formatter per call on the hottest path (M24). One currency-aware formatter, module-hoisted instances.

## Item 5 — Budget envelope identity

**Tags:** `bug`, `financial-correctness` · **Effort:** M · **Blocked by:** —

Creating a budget whose name matches an existing one (case-insensitive) in the same category+month silently overwrites the existing limit via the natural-key upsert arm (**H3**). Also: budget edit rewrites the category's global `budget_group` across all months (M9); unassigned-income clamp ignores plans (M8).

## Item 6 — Cairo Nights typography actually renders

**Tags:** `bug`, `design-system` · **Effort:** S · **Blocked by:** —

`font-sora`/`font-inter` emit no CSS — no `--font-*` variables exist in `global.css` `@theme inline`; ~347 usages across ~90 files are inert; app ships in Roboto/system (**H15**). Add the font variables + weight families. **Device-QA-only verification** — the `/qa` always-run typography check is the acceptance test.

## Item 7 — Bounded render + query performance

**Tags:** `performance` · **Effort:** M · **Blocked by:** Issues 1–5 (correctness first)

Top wins, in order: gate sheet children behind `hasEverOpened` in `components/ui/sheet.tsx` (**H7** — one file, fixes Budget's 10-sheet eager mount app-wide); staleness gates on Budget/Commitments focus + stop Dashboard invalidate-on-blur (M13/M32/L26); hoist `formatAmount`'s `Intl` (M24 — may land with Item 4); index-friendly predicates in `budget_stats.ts` + `transactions.ts` (L2/L34); lazy swipeable action tiles (L16); move startup housekeeping off first paint (L23).

## Item 8 — Real coverage gate + test-suite repairs

**Tags:** `testing` · **Effort:** L · **Blocked by:** Issues 1–5 (never instrument coverage over known-broken logic)

Coverage config measures 0.6% of source (**H10**) — replace allowlist with denylist over `src/**`; `runMigrations` has zero tests (**H11**) — bridge-driven runner suite; de-vacuous the over-mocked atomicity tests (M33/M34); retire source-text-assertion suites (M35). **Needs user decision first:** the logic-only test policy vs the 40 existing `.tsx` render suites (M36).

## Item 9 — Module boundaries + legacy retirement

**Tags:** `refactor` · **Effort:** L · **Blocked by:** Issue 8 (coverage guards the refactor)

Retire compat surfaces (9 dead re-export stubs L20, `src/screens/` orphan tree L1, compat imports in `(app)/_layout` L25); de-duplicate the 157-line transaction hook overlap (M5); decompose 495-line `useBudget` (M6); consolidate month helpers (M7); enforce module barrels against 32 deep imports (M2); delete dead budget/commitment API surfaces (L5/L11).

---

**Not scheduled (user decisions):** goals tab stub visibility (L18) · render-test policy (M36) · `ON DELETE` schema migration (Item 2 follow-up).
