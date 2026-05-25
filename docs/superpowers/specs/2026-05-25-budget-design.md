# Budget (v1) — Design Spec

**Date:** 2026-05-25
**Status:** Draft — awaiting spec sign-off
**Owners:** [tariq] technical · [marcus] UX · [layla] financial · [sarah] sequencing
**Initiative:** First net-new **feature** after the Cairo Nights / HeroUI Native rebrand (§1–§9). NOT part of that rebrand's locked "no new features" scope — this is greenfield product work that enters the full superpowers flow from the top.
**Branch (impl, later):** `feat/budget`

**Cross-references:**
- `app/(app)/(tabs)/budget/index.tsx` — current placeholder (renders only `<EmptyState variant="budget" />`); this spec replaces it.
- `database/migrations/003_create_categories.ts` — the 22 expense + 5 income default categories budgets are set against.
- `database/migrations/004_create_transactions.ts` — `category_id`, normalized `egp_amount`, `transaction_date`; the source of all spend.
- `database/account_stats.ts` — the canonical pattern for a read-only aggregation/stats query file (`budget_stats.ts` mirrors it).
- `components/ui/sheet.tsx` — declarative `Sheet` primitive (set/edit budget sheet).
- `screens/transactions/transaction_form/**` — Add Transaction reference (its custom numpad is **deliberately NOT reused** here — see §2.3).

---

## 1. Feature Summary

Budget lets the user set a **monthly spending limit per expense category** and track actual spend against it. It is the **category-envelope** model (YNAB / Wallet by BudgetBakers): the user caps the categories they care about, and the app fills each "envelope" as tagged transactions land, warning before the cap is breached.

### 1.1 The unified model (why v1 doesn't paint us into a corner)

The four budgeting methodologies (envelopes · single overall cap · 50/30/20 · zero-based) are **not four engines — they are four lenses on one primitive**: *"how much is allocated to each category for a period, given income."* This spec builds that one primitive. v1 lights up only the envelope lens (+ the overall-total readout, which is free off the same data). 50/30/20 and zero-based are **deferred, additive** fast-follows that require no schema rewrite (see §6).

### 1.2 What ships in v1

1. **Budget overview** (the `Budget` tab) — a summary card (Budgeted / Spent / Left + one overall progress bar with "% used · days left") above a scannable list of budgeted categories, each with icon, status pill, `spent / limit`, and a progress bar.
2. **Set / edit budget sheet** — a bottom `Sheet` with a category picker + a native-keyboard amount field. Sets, edits, or removes one category's monthly limit.
3. **Category history detail** — per-category screen: live-month card + three stat tiles (net banked, avg/mo, hit-rate) + a green/red monthly-result chart + a month-by-month ledger of recorded surplus/deficit.
4. **Empty state** — when no budgets exist, an `EmptyState` with a "Set up your budget" CTA that opens the set-budget sheet.

### 1.3 What does NOT ship in v1 (explicit out-of-scope)

- **50/30/20 bucket view** and **zero-based assignment** — deferred (see §6). Data model is forward-compatible; no v1 UI.
- **Push / local notifications** for over-budget alerts — requires native notification scheduling (outside the established stack). v1 surfaces budget status **in-app only** (color + status pills). Deferred.
- **Custom cycle-start day** (e.g. payday-anchored 25th→24th cycles) — v1 is calendar-month only. Each period resolves by month, so a custom anchor is addable later.
- **Rollover-into-limit** (carrying surplus/deficit forward to change next month's spendable amount) — explicitly rejected; see §3 rollover decision. We record history; we never mutate a limit.
- **Income capture** — no income figure and no `expected_income` column in v1. Both land with the income-anchored lenses later (§6). v1's table stays minimal.
- **Budgeting income categories** — budgets are expense envelopes only.
- **Budgets in a non-base currency** — all math is in `egp_amount` (base currency). A per-budget currency is not a thing.

---

## 2. Product & UX ([marcus])

*Source: Marcus Chen's stance, validated via interactive mockups in `.superpowers/brainstorm/81706-1779707551/` (budget-layout-v4, set-budget-v2, category-detail). Implementors build from this section directly.*

### 2.1 Budget overview — screen anatomy

The `Budget` tab (route `app/(app)/(tabs)/budget/index.tsx`). Full tab screen, uses `Screen` / `ScreenScroll`.

```
BudgetScreen  (screens/budget/index.tsx)
│
├── <Screen edges={['top','bottom']}>
│   ├── Header (in-flow): title "Budget · {Month}" + "+ Budget a category" affordance (right)
│   ├── <ScreenScroll>
│   │   ├── SummaryCard
│   │   │   ├── three figures: Budgeted · Spent · Left   (Left in positive/green)
│   │   │   └── one overall progress bar  +  "{pct}% used · {n} days left"
│   │   └── CategoryList
│   │       └── CategoryBudgetRow ×N   (tap → category detail; bar gold→saffron→red)
│   └── (empty state replaces ScreenScroll content when no budgets — see 2.5)
```

- The **summary card** leads with the three figures, then a single thick **overall bar** (gold → saffron → red). Same bar language as the category rows below, so the screen reads as one coherent system. (The earlier hero-ring exploration was dropped in favour of the bar — confirmed.)
- **Overall totals are computed over budgeted categories only** (see §3 / §4). Spend in unbudgeted categories does not appear in the summary.
- Each **CategoryBudgetRow**: category icon (in its category color tint), name, a status pill (`80%` saffron when in warning band, `Over` red when exceeded — no pill when comfortably under), right-aligned `spent / limit`, and a progress bar beneath.

### 2.2 Category history detail — screen anatomy

Route `app/(app)/(tabs)/budget/[id]/index.tsx` (the `[id]/index.tsx` exception). `id` = `category_id`. Reached by tapping a CategoryBudgetRow.

```
CategoryBudgetDetailScreen  (screens/budget/category_detail/index.tsx)
│
├── <Screen> Header: ‹ back · category icon · category name
│   ├── LiveMonthCard       "{spent} spent of {limit}" · "{left} left" · "{n} days left" · bar
│   ├── StatTiles ×3        Net (banked, signed/colored) · Avg / mo · "{k} of {m}" under limit
│   ├── MonthlyResultChart  vertical bars, green above baseline (surplus), red below (deficit)
│   └── MonthLedger         row per month: "{spent} of {limit}" + signed delta chip (green/red)
```

- Current (in-progress) month is marked (`May*`) and its delta is provisional.
- Everything here is **derived** from transactions + the effective-dated limit (see §4) — nothing extra persisted.

### 2.3 Set / edit budget sheet

A declarative `Sheet` (`components/ui/sheet.tsx`, `size="sm"`). Opened from: the overview's "+ Budget a category", a CategoryBudgetRow's edit affordance, or the empty-state CTA.

```
SetBudgetSheet
├── title "Set budget"
├── CategoryPicker row   (tappable to choose category when ADDING; locked/disabled when EDITING)
├── label "Monthly limit"
├── AmountField          single input, live thousands-grouping, "EGP" suffix,
│                        raises the OS NUMERIC keyboard (keyboardType="number-pad")
└── "Save budget" gold CTA
   (when editing: a "Remove budget" action in the picker-row overflow)
```

- **No custom numpad.** Decision: amount entry uses the **device's native number keyboard**, not the Add-Transaction-style in-sheet numpad. (User correction during brainstorm — recorded here so implementors don't copy the numpad pattern.)
- Amount is a positive integer-or-decimal EGP value, validated with Zod (RHF). `> 0`.
- The same `AmountField` pattern is the reuse target for the deferred income / zero-based setup.

### 2.4 Category selection (opt-in)

Budgets are **opt-in per category**: the user budgets only the expense categories they choose. Unbudgeted categories are not tracked and never appear on the overview. "+ Budget a category" presents the expense categories that do **not** yet have an active budget.

### 2.5 Empty state

When no active budgets exist, the tab shows an `EmptyState` (existing `variant="budget"` strings updated) with a primary CTA "Set up your budget" → opens the SetBudgetSheet in add mode. (Updates `emptyBudgetTitle` / `emptyBudgetSub` in `constants/strings.ts`.)

### 2.6 Visual states (thresholds)

| State | Condition | Bar / pill color (token) |
|---|---|---|
| Under | `pct < 0.8` | gold `#D4A44C` (`Colors.dark.gold`), no pill |
| Warning | `0.8 ≤ pct ≤ 1.0` | saffron `#D4830A` (`Colors.dark.warning`), pill `{pct}%` |
| Over | `pct > 1.0` | red `#E05A42` (`Colors.dark.negative`), pill `Over` |
| Surplus (history) | delta `> 0` | positive green `#4CAF82` (`Colors.dark.positive`) |

Warning threshold = **0.8** (Layla's "approaching limit" heuristic). Defined as a single constant; not user-configurable in v1.

---

## 3. Locked Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | **Category-envelope** methodology for v1 | Lowest friction on existing data; the model that changes behavior; foundation the other lenses layer onto. |
| D2 | **One unified model** supports all four methodologies; v1 ships envelopes + free overall-total readout | Avoids a future rewrite; 50/30/20 + zero-based are additive. |
| D3 | **Calendar month** period (1st → month-end) | Matches mental model and how income/bills land. Custom anchor deferrable (each period resolves by month). |
| D4 | **Fresh limits each month + recorded (not carried) history** | `available = limit − spent`, never inherits. Each month's surplus/deficit is recorded (derived) and shown as a cumulative "banked vs overspent" history. Limits are **never** auto-changed. Gives the savings/accountability insight without the "why is my budget negative?" confusion of carry-forward rollover. |
| D5 | **Count everything** — all expense-type, category-tagged transactions count, including commitment payments | Least surprising ("I paid, the bar moved"); zero special-casing. Users skip budgeting pure-bill categories if they only want variable spend. |
| D6 | **Opt-in categories** | User budgets only chosen expense categories; the rest are untracked. |
| D7 | **In-app status only**, no notifications in v1 | Push/local notifications are outside the established stack (native scheduling). |
| D8 | **Native number keyboard** for amount entry, not a custom numpad | User preference recorded during brainstorm. |
| D9 | **Effective-dated limits** so history stays truthful when a limit changes | A limit edit must not retroactively rewrite past months' results (D4 depends on accurate per-month records). See §4.1. |

---

## 4. Financial Logic & Formulas ([layla])

All amounts use `transactions.egp_amount` (base currency, EGP). "Spend" = transactions with `type = 'expense'` and a matching `category_id`, regardless of `commitment_payment_id` (D5). Income, transfer, and cc_payment rows never count.

### 4.1 Effective-dated limits (the truthful-history mechanism)

A budget for a category is a series of effective-dated limit rows. For any month `M`, the **applicable limit** for a category is the most recent row whose `effective_from ≤ M` with a non-null amount.

- **Set** a new budget → insert a row `{category_id, limit_amount, effective_from = current month}`.
- **Edit** the limit → insert a row with `effective_from = current month` and the new amount (history before this month keeps the old limit).
- **Remove** a budget → insert a row with `limit_amount = NULL`, `effective_from = current month` (a tombstone: "no budget from here on"). Months before it keep their recorded limits.

This stores at most one row per change (not one per month), keeps storage bounded, and means **editing/removing a limit never alters past results**. Spend is always derived, so editing an old transaction recomputes the affected month correctly.

> If editing the limit twice within the same month, the second write **replaces** the same-month row (unique on `category_id + effective_from`) rather than stacking.

### 4.2 Per-category, per-month figures

For category `c`, month `M`:

```
limit(c, M)      = applicable effective-dated limit (§4.1), or undefined if none
spent(c, M)      = Σ egp_amount  WHERE type='expense' AND category_id=c
                                  AND transaction_date in [M-01, M-end]
available(c, M)  = limit − spent          (may be negative → "over")
pct(c, M)        = spent / limit          (limit > 0; guard /0)
status(c, M)     = over     if spent > limit
                 = warning  if pct ≥ 0.8
                 = under    otherwise
delta(c, M)      = limit − spent          (surplus if > 0, deficit if < 0)   ← the "recorded result"
```

### 4.3 Overall (summary card) figures — over budgeted categories only

Let `B(M)` = categories with an applicable limit in month `M`.

```
totalBudgeted(M) = Σ_{c ∈ B(M)} limit(c, M)
totalSpent(M)    = Σ_{c ∈ B(M)} spent(c, M)        ← spend in UNbudgeted categories is excluded
totalLeft(M)     = totalBudgeted − totalSpent
overallPct(M)    = totalSpent / totalBudgeted
daysLeft(M)      = days from today to month-end (0 for past months)
```

### 4.4 History / insight figures (category detail)

Over the set of months `H` in which category `c` had an applicable limit (most recent N, e.g. 12):

```
netBanked(c)  = Σ_{M ∈ H} delta(c, M)             (signed; "+650")
avgPerMonth(c)= mean over H of spent(c, M)
hitRate(c)    = count(M ∈ H : spent ≤ limit) / |H|   → "3 of 4 under limit"
```

The current in-progress month is included but flagged provisional (its `spent` is partial).

### 4.5 Worked example (matches the mockup)

Groceries, limit 3,000 EGP/month, warning at 0.8 (≥ 2,400):

| Month | limit | spent | available | pct | status | delta (recorded) |
|---|---|---|---|---|---|---|
| Feb | 3,000 | 2,400 | +600 | 0.80 | warning | **+600** |
| Mar | 3,000 | 3,200 | −200 | 1.07 | over | **−200** |
| Apr | 3,000 | 2,750 | +250 | 0.92 | warning | **+250** |
| May* (partial) | 3,000 | 2,400 | +600 | 0.80 | warning | **+600** (provisional) |

`netBanked = 600 − 200 + 250 + 600 = +1,250` *(mockup rounded display "+650" used a 4-mo subset — implementors use the formula, not the mockup's illustrative number)*. `hitRate = 3 of 4` (Mar was over). `avgPerMonth = (2400+3200+2750+2400)/4 = 2,688`.

Overall summary for May (mock data set): Budgeted 7,400 · Spent 5,670 · Left 1,730 · 77% used.

### 4.6 Test cases (Layla → Dev, logic-only)

1. spent aggregation sums only `type='expense'` matching category in window; ignores income/transfer/cc_payment and other categories.
2. commitment-payment expense rows **are** counted (D5) — a txn with non-null `commitment_payment_id` still contributes.
3. multi-currency: spend uses `egp_amount`, not `amount`.
4. status thresholds: exactly 0.8 = warning; exactly 1.0 (spent == limit) = warning (not over); 1.0000001 = over.
5. effective-dated limit resolution: month before first `effective_from` → no limit; between two rows → earlier row; after a NULL tombstone → no limit.
6. editing a limit this month does not change last month's `delta`.
7. `pct` guards divide-by-zero when limit is 0/undefined.
8. overall totals exclude unbudgeted-category spend.
9. netBanked / hitRate / avg over a multi-month fixture incl. an over month and the provisional current month.
10. daysLeft = 0 for any past month; correct for current month; full month count irrelevant for future (no data).

---

## 5. Data Model & Architecture ([tariq])

### 5.1 Migration — `database/migrations/011_create_budgets.ts`

```sql
CREATE TABLE IF NOT EXISTS budgets (
  id             TEXT PRIMARY KEY,
  category_id    TEXT NOT NULL REFERENCES categories(id),
  limit_amount   REAL,                       -- NULL = tombstone (budget removed from effective_from)
  effective_from TEXT NOT NULL,              -- 'YYYY-MM'
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  UNIQUE(category_id, effective_from)        -- one row per category per month-of-change
);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);
```

- Append to `database/migrations/index.ts` (next version = **11**). Never edit a shipped migration.
- `expected_income` is **not** added in v1 (no income lens shipping). It lands in a future migration alongside 50/30/20 — keeps v1's table minimal and honest. *(Forward-compat note, not a v1 column.)*

### 5.2 Entity — `database/entities/budget.entity.ts`

Types only (no logic, no cross-imports from `database/`):

```ts
export interface Budget {
  id: string;
  category_id: string;
  limit_amount: number | null;   // null = removed (tombstone) from effective_from
  effective_from: string;        // 'YYYY-MM'
  created_at: string;
  updated_at: string;
}
```

### 5.3 Query files

- `database/budgets.ts` — CRUD for the table. `getBudgetRows(db)` (all rows, for resolution), `getActiveBudgets(db, month)` (resolved applicable limits for a month), `addBudget`, `setBudgetLimit` (insert effective-dated row / replace same-month), `removeBudget` (insert NULL tombstone). First param always `db: SQLiteDatabase`. No business logic.
- `database/budget_stats.ts` — read-only aggregation, mirrors `account_stats.ts`. `getCategorySpendByMonth(db, months)` and `getCurrentMonthSpend(db)` returning per-category summed `egp_amount` for expense txns in the window(s). Pure SQL aggregation; the resolution of limit-vs-spend → status/delta lives in the store/helpers, not SQL.

### 5.4 Domain store — `store/budget.store.ts`

Zustand (v5), one per domain. Holds fetched budget rows + computed per-category/overall view models for the current month, plus the loaded history for a focused category. `state: { ... }` wrapper per house convention; flat actions; `reset()`. Pure derivation (limit resolution, status, totals, history stats) lives in colocated helpers (`budget.helpers.ts` under the screen or a `utils` module) and is the unit-tested surface.

### 5.5 Screen structure (`screens/budget/`)

```
screens/budget/
├── index.tsx                 UI only (no useState/useSharedValue)
├── budget.hook.ts            logic: load month + budgets, nav to detail, open set-sheet
├── budget.state.ts           UI state: set-sheet visibility, add-vs-edit mode, target category
├── budget.helpers.ts         pure: resolveLimit, computeRow, computeOverall, computeHistory  ← tested
├── components/
│   ├── summary_card.tsx
│   ├── category_budget_row.tsx
│   └── set_budget_sheet.tsx        (+ set_budget_sheet.state.ts if it holds local state)
└── category_detail/
    ├── index.tsx
    ├── category_detail.hook.ts
    └── components/ (live_month_card, stat_tiles, monthly_result_chart, month_ledger)
```

Routing (app/ rules): `app/(app)/(tabs)/budget/index.tsx` → `export { default } from '@/screens/budget';`; `app/(app)/(tabs)/budget/[id]/index.tsx` → `export { default } from '@/screens/budget/category_detail';`. No `.hook/.state/.helpers` siblings in `app/`.

### 5.6 Components, styling, strings

- HeroUI Native primitives first (`Card`, `ListGroup`/rows, `Chip` for pills, `Button`, `Input` for the amount field, `Sheet` wrapper). Progress bars: a small `tv`-based wrapper in `components/ui/` if no HeroUI primitive fits (a thin `BudgetBar` is acceptable — single purpose, color-by-status).
- Set sheet uses `Sheet` (declarative, `visible`/`onClose`); scrollable content (category picker list) uses `BottomSheetScrollView`/`BottomSheetFlatList` from `@gorhom/bottom-sheet`.
- All copy → `constants/strings.ts`. All color/spacing/radius → `constants/theme.ts` tokens, scaled with `ms()`/`msFont()`. Status colors map to existing `gold` / `warning` / `negative` / `positive`. Warning threshold constant (0.8) lives in a budget constants area.
- Forms: RHF v7 + Zod v4; `keyboardType="number-pad"`; thousands-grouping via `Intl.NumberFormat('en-US',{style:'decimal'})`.

### 5.7 Account-creation-style defaults

New budget row: `id = uuidv4()`, `effective_from = currentMonth ('YYYY-MM')`, `created_at = updated_at = new Date().toISOString()`.

---

## 6. Phasing & Future (additive, no rewrite)

- **v1.1 — 50/30/20 lens:** add `budget_group` ('need'|'want'|'savings') to categories (seeded defaults) + `expected_income` to a budget-period concept; a bucket-summary view aggregates existing allocations by group. UI-additive.
- **v1.2 — Zero-based lens:** income-first assignment screen with a running "left to assign = income − Σ allocations → 0" counter over the same allocations.
- **Later:** custom cycle-start day · opt-in rollover-into-limit (kept distinct from D4's recorded history) · in-app vs notification alerts.

Each is a separate spec → plan → implementation cycle. None forces a change to the v1 `budgets` table beyond additive migrations.

---

## 7. Testing

Logic-only (per project convention — no `.tsx` render tests). Jest unit tests in `__tests__/` (snake_case) covering §4.6 against the `budget.helpers.ts` pure functions and the `budgets.ts` / `budget_stats.ts` query layer (with an in-memory/seeded SQLite fixture for the query tests). Coverage thresholds: 80% lines / 95% functions / 100% branches.

---

## 8. Edge Cases

1. **No budgets** → empty state; overall card not shown.
2. **Limit removed mid-history** → detail shows only months the budget was active (up to the tombstone).
3. **Partial current month** → figures provisional, marked `*`; `daysLeft` drives the "n days left" caption.
4. **Spend in unbudgeted category** → never in the overall summary; the category simply isn't listed.
5. **Multi-currency transactions** → always `egp_amount`.
6. **spent == limit exactly** → warning, not over; bar at 100% in saffron.
7. **Over by a lot** → bar clamps at 100% width but color is red and pill says `Over`; the `spent / limit` text shows the true overspend.
8. **Category referenced by a budget** is a seeded default (FK guaranteed). Custom-category deletion is out of scope for this domain; budgets FK to `categories(id)`.
9. **Future month navigation** (if added) → no spend data; out of v1 nav scope (v1 shows current month only on the overview; detail shows history + current).
10. **First-ever month** of a budget → no prior history; detail shows just the live month.

---

## 9. Open Questions / Risks

- **R1 (cross-section, low):** the effective-dated limit table (D9) is slightly more than the simplest "one current limit" table. Accepted because D4's recorded-history promise depends on truthful past limits. Flagged for [tariq] sign-off in the plan.
- **R2:** overview shows the **current month only** in v1 (no month switcher on the overview). History/month-nav lives in the category detail. Confirm this is acceptable for v1 or whether a month switcher on the overview is wanted. *(Recommendation: current-month-only overview for v1; defer switcher.)*
- **R3:** `budget_stats.ts` history query windows over the last N months — N is an implementation constant (propose 12). Not user-configurable.
```
