# Audit Remediation Backlog

Source: [2026-07-29-full-technical-audit.md](../reviews/2026-07-29-full-technical-audit.md) (89 findings, verifier-corrected). This file is the canonical tracker for the remediation work — one item per wave, in dependency order. Mark items done with their PR number as they merge. Wave 1 of the original sequencing (verify-pr green) already shipped via PR #175/#177.

---

## Item 1 — Fix commitment payment lifecycle

**Tags:** `bug`, `financial-correctness` · **Effort:** L · **Blocked by:** —

Payment status is stamped once at insert and never ages (`upcoming` forever), and generation is anchored to `start_date` with a hard 64-occurrence cap that never re-windows — a daily commitment stops producing payments after 64 days. One root cause: derived time-state stored in the same column as durable user actions.

- Findings: **H1/H4** (status never transitions), **H2** (64-cap window), M10/M17 (edit orphans overdue rows), L9 (after_count stalls on skip), L10 (non-atomic edit), L8 (full-table re-scan per mutation)
- Fix shape: derive `upcoming/due/overdue` at read time (or age inside the housekeeping transaction), keep only `paid/skipped` durable; rolling generation window `[max(start, today−1 period), today+horizon]`
- Guardrails now in place: `.claude/rules/database.md` derived-state rule; `moneyapp-testing` for the housekeeping suite; Device QA commitments matrix
- Spec input ready (2026-07-30, [layla]): status is `Paid` if `paid_date` set, else `Skipped` if `skipped_date` set, else compare `due_date` to today — `<` overdue, `=` due, `>` upcoming. Terminal markers always win, so a bill paid three weeks late reads `Paid`, never `Overdue`. `today` is an argument, never `new Date()` inside the function, so a list can't evaluate it twice.
- Two adjacent bugs surfaced while specifying it:
  - `planMissingCommitmentPayments` derives its date via UTC slice, not local calendar date. On a UTC+2/+3 device a bill due "today" rolls to tomorrow for the last hours of the evening, so the insert-time value and any read-time derivation disagree on the same row. Fix both to local date, or the corrected model still flickers on first render.
  - `deleteUnpaidPaymentsByCommitment` filters `status IN ('upcoming','due')`, silently excluding `overdue` rows from regeneration cleanup — the same trust-the-stale-bucket mistake. Should filter `paid_date IS NULL AND skipped_date IS NULL`. Confirm the intended deletion scope before changing it.

## Item 2 — Category deletion integrity

**Tags:** `bug`, `crash` · **Effort:** M · **Blocked by:** —

Deleting a custom category with a budget or commitment row throws `FOREIGN KEY constraint failed` into a `void` handler — no error surface, delete silently fails. The reassign path has the same hole (never migrates `budgets`).

- Findings: **H5/H8/H13** (3 lenses independently), **H9** (reassign misses budgets)
- Fix shape (code-only first): usage count across ALL FK sources → route to reassign; add `UPDATE budgets` to `reassignAndDelete` with UNIQUE-collision handling. Schema `ON DELETE` migration is the durable fix but needs sign-off (critical trigger 3)

## Item 3 — Money display fixes (after formatter consolidation)

**Tags:** `bug`, `financial-correctness` · **Effort:** M · **Blocked by:** Issue 4

Preview/display bugs where the shown number diverges from the persisted one: Pay sheet overstated (H6), transaction form EGP→USD previews (M18/M40), hardcoded "EGP" on USD credit-card fields (M19), USD rendered with 0 decimals everywhere (M22), `parseFloat` money inputs (M15/M21), adjust-balance vs revolving (M16), statement-day cycle skip (M20), archive-erases-debt copy (M12).

- Fix rule: derive display from the write-path domain function (`money-rules` skill — the iron rule)
- H6 located precisely (2026-07-30): `pay_sheet.tsx:60-63` computes `amountWatch * exchangeRateValue` unconditionally. Worst case is the EGP-commitment → USD-account pair, where the correct value divides — 500 EGP at rate 50 displays **25,000 USD against an actual debit of 10 USD (2500× over)**, not the 50× the original write-up assumed. The resolver itself is correct and already covers all four pairs (`__tests__/commitment.repository.test.ts:448`); only the preview bypasses it. Fix = route the preview through `resolveCommitmentPaymentAmounts` in `pay_sheet.hook.ts`. Note `exchange_rate_row.tsx:24-31` (`formatPreviewAmount`) hardcodes the same USD→EGP assumption and is shared — needs a direction prop, larger change.

## Item 4 — Consolidate money formatting layer

**Tags:** `refactor` · **Effort:** M · **Blocked by:** — (do BEFORE Item 3 or 13 sites get touched twice)

13 ad-hoc `Intl.NumberFormat` sites diverge from `formatAmount` (M1); `formatAmount` constructs a formatter per call on the hottest path (M24). One currency-aware formatter, module-hoisted instances.

## Item 5 — Budget envelope identity

**Tags:** `bug`, `financial-correctness` · **Effort:** M · **Blocked by:** —

Creating a budget whose name matches an existing one (case-insensitive) in the same category+month silently overwrites the existing limit via the natural-key upsert arm (**H3**). Also: budget edit rewrites the category's global `budget_group` across all months (M9); unassigned-income clamp ignores plans (M8).

## Item 6 — Cairo Nights typography actually renders

**Tags:** `bug`, `design-system` · **Effort:** M · **Blocked by:** — · **Needs a design call first**

`font-sora`/`font-inter` emit no CSS — no `--font-*` variables exist in `global.css` `@theme inline`; ~347 usages across ~90 files are inert; app ships in Roboto/system (**H15**). Add the font variables + weight families. **Device-QA-only verification** — the `/qa` always-run typography check is the acceptance test.

- Widened 2026-08-04 by heroui-native 1.0.8 (PR #182). 1.0.3 styled its own text with Tailwind **weight** utilities (`font-medium` → `font-weight: 500`); 1.0.8 replaced them with **family** references (`font-family: var(--font-medium)`) in 33 places across 19 component CSS files. `--font-normal/-medium/-semibold/-bold` are defined by nobody — not Tailwind v4 (it ships `--font-weight-medium` for weight and `--font-sans/serif/mono` for families; `--font-medium` is neither), not heroui's own `variables.css`/`theme.css`, and not `global.css`. HeroUI documents no contract for them. So HeroUI's primitives now render with no weight at all: `--font-medium` alone covers Button, Card, Dialog, Chip, Label, ListGroup, Menu, Popover, Tabs, BottomSheet, Toast, Alert, Avatar, Select, Slider, TagGroup. `text.css` uses all four, so `Typography weight="bold"` is inert — that is every tab screen header (`<Typography.Heading type="h3" weight="bold">`).
- **Why the obvious fix is wrong.** Declaring `--font-medium` and friends inside `@theme inline` makes them Tailwind *family* tokens, and Tailwind resolves `font-<x>` against the family namespace before the weight namespace. That silently re-points **211** existing weight-utility usages (`font-semibold` ×111, `font-bold` ×55, `font-medium` ×39, `font-normal` ×4, `font-extrabold` ×2), and **60 files** pair a family class with a weight class (`className="font-sora … font-semibold"`) where the hijacked weight class would override the intended Sora family. Doing this blind makes typography worse, not better.
- **The call to make:** whether MoneyApp adopts heroui's family-per-weight model wholesale (define the tokens, migrate the 211 weight utilities to family classes) or scopes the tokens so they satisfy heroui without entering Tailwind's utility namespace — plain custom properties in the existing `@layer theme` block resolve `var(--font-medium)` without generating a `font-medium` family utility, but that split has not been verified against Uniwind's compiler and would leave two competing conventions in the codebase. Either way it is a design-system decision (marcus/tariq), and which family each weight token names (Inter vs Sora) is part of it.
- Loaded families available today (`src/app/_layout.tsx`): `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Sora_400Regular`, `Sora_600SemiBold`, `Sora_700Bold`, `Sora_800ExtraBold`. Names are mirrored in `constants/theme.ts` as `FontFamily`.

## Item 7 — Bounded render + query performance

**Tags:** `performance` · **Effort:** M · **Blocked by:** Issues 1–5 (correctness first)

Top wins, in order: gate sheet children behind `hasEverOpened` in `components/ui/sheet.tsx` (**H7** — one file, fixes Budget's 10-sheet eager mount app-wide); staleness gates on Budget/Commitments focus + stop Dashboard invalidate-on-blur (M13/M32/L26); hoist `formatAmount`'s `Intl` (M24 — may land with Item 4); index-friendly predicates in `budget_stats.ts` + `transactions.ts` (L2/L34); lazy swipeable action tiles (L16); move startup housekeeping off first paint (L23).

- Added 2026-07-30: `commitments/detail/components/payment_history.tsx:28` renders `payments` unbounded, ascending. Combined with H2's 64-occurrence generation, an old weekly commitment puts 60+ rows inline on the detail screen and buries `DetailsCard`. Cap it (newest-first, terminal statuses only) or move the full list behind its own screen — a product call for [marcus], so pair it with Item 1 rather than fixing it blind.

## Item 8 — Real coverage gate + test-suite repairs

**Tags:** `testing` · **Effort:** L · **Blocked by:** Issues 1–5 (never instrument coverage over known-broken logic)

Coverage config measures 0.6% of source (**H10**) — replace allowlist with denylist over `src/**`; `runMigrations` has zero tests (**H11**) — bridge-driven runner suite; de-vacuous the over-mocked atomicity tests (M33/M34); retire source-text-assertion suites (M35). **Needs user decision first:** the logic-only test policy vs the 40 existing `.tsx` render suites (M36).

- Added 2026-08-03: `budget.state.ts:59` — `initialState()` reads `currentYearMonth()` off the system clock with no seam, so `.claude/rules/tests.md` ("time is an input, never `new Date()`") can only be honoured by every consumer remembering to pin the month in `beforeEach`. One test forgot and went red on 2026-08-01 while its PR badge still showed green. Structural fix: an optional `now` parameter on `initialState()`/`reset()`. Production change — do not fold into a test or deps PR.
- A sound date-sweep instrument exists and found **zero** date-dependent tests across 221 suites at seven clock positions (control, month/year boundaries, a leap day): subclass `Date` so `new Date()`/`Date.now()` shift while `new Date(<args>)`, `Date.parse`, and `Date.UTC` stay literal, and never touch timers. `jest.useFakeTimers()` is the wrong tool here — it breaks `waitFor` in 15 suites at any date, including an offset-zero control.

## Item 9 — Module boundaries + legacy retirement

**Tags:** `refactor` · **Effort:** L · **Blocked by:** Issue 8 (coverage guards the refactor)

Retire compat surfaces (9 dead re-export stubs L20, `src/screens/` orphan tree L1, compat imports in `(app)/_layout` L25); de-duplicate the 157-line transaction hook overlap (M5); decompose 495-line `useBudget` (M6); consolidate month helpers (M7); enforce module barrels against 32 deep imports (M2); delete dead budget/commitment API surfaces (L5/L11).

---

**Not scheduled (user decisions):** goals tab stub visibility (L18) · render-test policy (M36) · `ON DELETE` schema migration (Item 2 follow-up).
