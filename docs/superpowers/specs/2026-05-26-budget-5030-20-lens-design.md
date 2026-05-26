# Budget v1.1 — 50/30/20 Lens — Design

- **Date:** 2026-05-26
- **Status:** Draft → awaiting spec sign-off
- **Builds on:** `docs/superpowers/specs/2026-05-25-budget-design.md` (envelope budgeting v1, shipped #115)
- **Phase mapping:** Brainstorm complete → this spec → `writing-plans`
- **Owners:** @tariq (synthesis/architecture) · @layla (financial logic) · @marcus (UX)

---

## 1. Feature Summary

The budget v1 spec framed the four budgeting methodologies as **four lenses on one primitive** — "how much is allocated to each category for a period, given income." v1 lit up the **envelope** lens. This spec adds the **50/30/20 lens** as a purely additive layer on top of the existing envelopes: no rewrite of the `budgets` table, no change to how limits or spend are computed.

The 50/30/20 rule splits expected monthly income into **50% Needs · 30% Wants · 20% Savings**. v1.1 groups each expense category into one of those three buckets, captures an expected-income figure, and presents a bucket view that compares **what you've budgeted (allocated)** against each target — with **actual spend overlaid** inside each bucket.

### 1.1 What ships in v1.1

- A `budget_group` tag (`need` | `want` | `savings` | NULL) on expense categories, seeded with sensible defaults and editable per category.
- One new seeded expense category: **Savings & Investments**.
- A single **expected monthly income** figure (editable), with the entry pre-filled by a suggestion derived from recent income transactions.
- A **50/30/20 tab** on the budget overview (HeroUI `Tabs`: Categories ↔ 50/30/20) showing three bucket cards (allocated-vs-target bar + spend fill) and a reconciliation footer.

### 1.2 What does NOT ship in v1.1 (explicit out-of-scope)

- **Effective-dated income** — v1.1 stores a single current value. Upgrade to dated history is additive, deferred.
- **Month switcher / historical bucket view** — the lens shows the **current month only** (consistent with v1 overview, R2).
- **Zero-based lens (v1.2)** — the "left to assign → 0" view is a separate cycle.
- **Goals → Savings-bucket integration** — when the Goals feature (§10) lands, savings contributions can feed the bucket; v1.1 does not depend on it.
- **Standalone category-group management screen** — tagging happens inside the set/edit budget sheet.
- **Splitting minimum vs. extra debt payment** — one group tag per category.

---

## 2. Locked Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | **Lens frame = plan vs target + spend overlay.** Each bucket's headline is `allocated` (Σ budgeted limits in the group) vs its `target` (pct × income); actual spend is drawn as a fill inside. | Anchors the lens to the envelopes users already set in v1; answers both "is my plan balanced?" and "am I living to it?" in one card. |
| D2 | **Savings bucket = tagged expense categories** (Debt Payment + new seeded "Savings & Investments"). Symmetric with Needs/Wants. | App tracks expenses, not transfers; this keeps the frame uniform and avoids a dependency on the unmerged Goals feature. |
| D3 | **Expected income = single editable value in `app_settings`, suggestion-seeded** from a trailing average of `income`-type category transactions. | Zero-setup default + full user control; YAGNI vs. effective-dated for a current-month-only lens. |
| D4 | **Spend overlay scope = budgeted categories only**, of each group. | Apples-to-apples with the allocation the fill is drawn against; unbudgeted categories never enter the lens. |
| D5 | **Group tagging surface = a single-select Need/Want/Savings control in the set/edit budget sheet**, defaulting to the seeded group. | Co-locates "how much" and "which bucket"; only budgeted categories affect the lens, so the set sheet is the natural home. |
| D6 | **Placement = HeroUI `Tabs` on the overview** (Categories ↔ 50/30/20), default Categories. | Both lenses first-class on one screen, no new route, room to host the v1.2 zero-based lens as a third tab. Matches the §5 Tabs precedent + Team Law 7. |
| D7 | **Debt Payment → Needs** (minimums dominate); **Money Transfer, Other → untagged**; untagged budgeted categories surface in an "Ungrouped" reconciliation line. | One tag per category; keeps the rule legible while reconciling totals. |

---

## 3. Product & UX ([marcus])

### 3.1 Budget overview — tab shell

- A HeroUI `Tabs` control sits at the top of `screens/budget/index.tsx`: **Categories** | **50/30/20**.
- Default selected tab = **Categories** — the existing v1 list and `SummaryCard` are unchanged; no behavior change for existing users until they opt into the lens.
- Selected tab is screen UI state in `budget.state.ts` (not persisted; resets per the existing focus-reset conventions if applicable).

### 3.2 50/30/20 tab body

1. **Income header.** "Monthly income · EGP 20,000" with an edit affordance (tap → income sheet). When income is unset/≤0, the buckets are replaced by a single CTA card: "Set your monthly income" (opens the sheet with the suggestion pre-filled).
2. **Three `BucketCard`s** — Needs (50%), Wants (30%), Savings (20%). Each shows:
   - Target amount (`pct × income`) and allocated amount.
   - An allocation-vs-target **bar** (reusing `budget_bar` visual language), with the **spend** drawn as a fill inside; bar width clamps at 100% while the text shows the true percentage.
   - A status chip interpreted per group (§4.2): Needs/Wants show on-track / over (caution); Savings shows ahead (favorable) / behind (caution). Exceeding the savings target is good, not flagged.
3. **Reconciliation footer.**
   - "Unallocated · EGP 2,000" when `income − Σ allocated > 0`; "Over-allocated by EGP 1,500" (saffron) when negative.
   - An "Ungrouped · EGP X" line shown **only** when a budgeted category has a NULL `budget_group`, nudging the user to tag it.
4. **Savings caption.** A one-line note clarifying that savings moved as transfers won't show as spend — the allocation still reflects the plan.

### 3.3 Income entry sheet

- A small amount sheet reusing the `set_budget_sheet` `AmountField` pattern.
- When income is unset, the field is pre-filled with the trailing-income suggestion (D3); the user accepts or overrides. The stored value wins once set.

### 3.4 Group picker in the set/edit budget sheet

- A single-select Need / Want / Savings control added to `set_budget_sheet.tsx`, defaulting to the category's current/seeded group.
- HeroUI primitive only (Team Law 7) — `Tabs`-segment or `RadioGroup` pills; final primitive chosen at plan time with a one-line justification.

---

## 4. Financial Logic & Formulas ([layla])

### 4.1 Targets

Given `income` = expected monthly income (> 0):

```
target(need)    = 0.50 × income
target(want)    = 0.30 × income
target(savings) = 0.20 × income
```

### 4.2 Per-bucket figures (current month `ym`)

For each group `g ∈ {need, want, savings}`, over **budgeted** categories tagged `g`:

```
allocated(g) = Σ resolveLimitForMonth(rows, categoryId, ym)   // for tagged, budgeted categories
spent(g)     = Σ spendByMonth[categoryId][ym]                  // same categories
target(g)    = pct(g) × income
```

- `allocationBarPct(g) = clamp(allocated(g) / target(g), 0..1)` for bar width; the true `allocated/target` % is shown in text.
- `spendFillPct(g)     = clamp(spent(g) / allocated(g), 0..1)` for the overlay **width**, 0 when `allocated(g) = 0`; the true `spent/allocated` % is shown in text (so an overspent group reads e.g. "108%").
- **Bucket status is interpreted per group** — exceeding the target is *not* uniformly bad:
  - **Needs / Wants:** `allocated(g) > target(g)` ⇒ `over` (caution — too much of income committed here); else `on-track`.
  - **Savings:** `allocated(g) ≥ target(g)` ⇒ `ahead` (favorable — saving at/above 20%); `allocated(g) < target(g)` ⇒ `behind` (caution — under-saving).

### 4.3 Reconciliation

```
allocatedTotal = Σ allocated(g) over the three groups + ungrouped
ungrouped      = Σ limits of budgeted categories with NULL budget_group
unallocated    = income − allocatedTotal     // negative ⇒ over-allocated by |unallocated|
```

### 4.4 Trailing-income suggestion

```
suggestion = round( average monthly total of income-type category transactions
                    over the last 3 complete months )
```

- Used only to pre-fill the income sheet when no value is stored. Returns `null`/omitted when there is no income history (the field starts empty).

### 4.5 Seed group defaults

| Group | Seeded categories |
|---|---|
| **need** | Housing, Groceries, Transport, Car, Utilities, Phone & Internet, Health, Bills, Education, Family, Debt Payment, Bank Fees |
| **want** | Food & Dining, Dining Out, Subscriptions, Shopping, Clothes, Gifts, Entertainment, Charity |
| **savings** | Savings & Investments (new: `cat_savings`) |
| **NULL** | Money Transfer, Other |

Income categories keep `budget_group = NULL` (the lens is expense-only).

### 4.6 Worked example

Income = EGP 20,000 → targets: Needs 10,000 · Wants 6,000 · Savings 4,000.

Budgeted & tagged:
- Needs: Housing 5,000 + Groceries 2,500 + Utilities 1,000 = **allocated 8,500** (spent 6,000) → under target by 1,500, on-track.
- Wants: Dining Out 1,500 + Entertainment 1,000 = **allocated 2,500** (spent 2,700) → under target; spend fill > allocation (over the envelope, bar text shows 108%).
- Savings: Savings & Investments 4,000 (spent 0 — moved as a transfer) = **allocated 4,000** → `allocated ≥ target` ⇒ **ahead** (favorable); caption explains 0 spend.
- `allocatedTotal = 15,000`; `unallocated = 20,000 − 15,000 = 5,000` shown in the footer.

### 4.7 Test cases (Layla → Dev, logic-only)

1. Targets computed at 50/30/20 of income.
2. `allocated(g)` sums only budgeted, tagged categories for the current month via `resolveLimitForMonth`.
3. `spent(g)` sums the same categories' current-month spend.
4. `unallocated` positive, zero, and negative (over-allocated) cases.
5. Untagged budgeted category contributes to `ungrouped`, not to any bucket.
6. `income = 0`/unset ⇒ buckets suppressed (guard returns an "income unset" shape).
7. `allocated(g) = 0` ⇒ `spendFillPct = 0`, no divide-by-zero.
8. Savings allocated > 0 with spend 0 ⇒ valid bucket; status `ahead` when `allocated ≥ target`.
9. Per-group status: Needs/Wants over target ⇒ `over`; Savings under target ⇒ `behind`, at/over ⇒ `ahead`.
10. Trailing-income suggestion: 3-month average; empty history ⇒ no suggestion.

---

## 5. Data Model & Architecture ([tariq])

### 5.1 Migration — `database/migrations/012_add_budget_group.ts`

```sql
ALTER TABLE categories ADD COLUMN budget_group TEXT
  CHECK(budget_group IN ('need','want','savings'));     -- NULL allowed

-- backfill seeded defaults (UPDATE ... WHERE id IN (...)) per §4.5

INSERT OR IGNORE INTO categories
  (id, name, type, icon, color, is_default, sort_order, budget_group, created_at, updated_at)
VALUES
  ('cat_savings', 'Savings & Investments', 'expense', 'piggy-bank', '#3D7A5F', 1, 22, 'savings',
   '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
```

Append `migration012` to `migrations/index.ts`. Never edit a shipped migration.

### 5.2 Enums & entity

- `constants/enums.ts` → `enum BudgetGroup { Need = 'need', Want = 'want', Savings = 'savings' }` (values match the CHECK strings).
- `database/entities/category.entity.ts` → `budget_group: BudgetGroup | null` (DB-nullable ⇒ `null`).

### 5.3 Query files

- `database/categories.ts` → `setCategoryGroup(db, categoryId, group)` (UPDATE); ensure category SELECTs return `budget_group`.
- Trailing-income suggestion query: a `get*` over `income`-type category transactions across the last 3 complete months (lives in `database/budget_stats.ts` or `database/transactions.ts` per existing layering).
- Expected income via the existing `app_settings.repository` (`get`/`set`), key `expected_monthly_income`.

### 5.4 Pure helpers — `screens/budget/budget_buckets.helpers.ts`

```ts
export type BucketStatus = 'on-track' | 'over' | 'ahead' | 'behind';
export interface BucketVM { group: BudgetGroup; target: number; allocated: number;
  spent: number; barPct: number; spendFillPct: number; status: BucketStatus; }
export interface BucketsVM { income: number; buckets: BucketVM[]; ungrouped: number;
  unallocated: number; hasIncome: boolean; }

export function computeBuckets(
  income: number,
  categories: Category[],
  rows: Budget[],
  spendByMonth: Record<string, Record<string, number>>,
  month: string,
): BucketsVM
```

Pure and logic-only tested. Keeps `budget.helpers.ts` focused on the envelope lens.

### 5.5 Store & hook

- Extend `store/budget.store.ts`: `load()` also reads `expectedIncome` (app_settings) and exposes it; add `setExpectedIncome(amount)`. Categories continue to flow from `category.store` (now carrying `budget_group`).
- `screens/budget/budget.hook.ts`: derive `buckets = computeBuckets(...)` via `useMemo`, mirroring the existing `rows`/`overall` memos; keep the month-rollover `useState`+focus pattern.
- `screens/budget/budget.state.ts`: add `lensTab: 'categories' | 'fiftythirty'` UI state + setter.

### 5.6 Components, styling, strings

- New: `components/bucket_card.tsx`, `components/income_sheet.tsx` (+ `income_sheet.state.ts`), and a lens container for the 50/30/20 tab body.
- `set_budget_sheet.tsx` gains the group picker.
- All copy in `constants/strings.ts`; tokens-only styling (`constants/theme.ts`), `ms()`/`msFont()`; the new category color from a theme token.

---

## 6. Testing

Logic-only Jest (no `.tsx` render tests), in `__tests__/`:
- `computeBuckets` against §4.7.
- Trailing-income suggestion helper.
- Seed-group resolution (categories carry expected default groups).
- Query tests with a seeded in-memory SQLite fixture for `setCategoryGroup` + the income query.

Coverage thresholds: 80% lines / 95% functions / 100% branches.

---

## 7. Edge Cases

1. **Income unset/≤0** → buckets suppressed; "Set your monthly income" CTA.
2. **No tagged budgets** → zero buckets; nudge to add budgets.
3. **Untagged budgeted category** → counted in "Ungrouped," excluded from buckets.
4. **Savings spend = 0** (transfers) → valid; allocation shows the plan; caption explains.
5. **Over-allocated** (`Σ allocated > income`) → footer shows "Over-allocated by X" in saffron.
6. **Allocation exceeds bucket target** → bar clamps at 100%, text shows true %, status chip = over-allocated.
7. **No income history** → suggestion omitted; income field starts empty.
8. **Existing users** → migration backfills groups; default tab stays Categories, so nothing changes until opt-in.

---

## 8. Open Questions / Risks

- **R1 (cross-section, low):** how the Savings bucket is defined (D2) may bind future Goals→savings integration. Accepted: v1.1 stays expense-only and Goals layering is additive.
- **R2:** group picker primitive (Tabs-segment vs RadioGroup pills) — Tariq finalizes at plan time, HeroUI-only.
- **R3:** trailing-income window = 3 complete months (implementation constant, not user-configurable).
- **R4:** new category color/icon — `piggy-bank` icon proposed; color from an existing theme token, confirmed in the plan.
