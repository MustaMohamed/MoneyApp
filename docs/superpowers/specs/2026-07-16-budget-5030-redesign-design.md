# Budget 50/30/20 Redesign Design

- **Date:** 2026-07-16
- **Status:** Approved
- **Scope:** Budget Phase 3
- **Visual reference:** `.superpowers/brainstorm/27882-1784197207/content/phase-3-full-flow.html`

## Summary

Phase 3 redesigns the 50/30/20 tab as a compact monthly planning and performance lens. A shared summary card answers how much income remains to plan, then a single-expand ledger explains Needs, Wants, and Savings without mixing allocation progress with recorded spending.

The feature treats planning and results as separate dimensions:

- **Plan alignment** compares monthly budget allocations with the 50/30/20 targets.
- **Recorded result** reports expense spending for Needs and Wants, including categories with activity but no monthly budget.
- **Savings result** remains `Not tracked` until Phase 4 introduces explicit savings contribution and debt-principal semantics.

Expected income becomes month-specific. A month keeps its own income and category-group snapshot so viewing or editing another month cannot silently rewrite historical targets.

## Goals

- Match the compact, data-rich summary structure used by the Categories and Plans tabs.
- Show one clear monthly planning answer before the bucket breakdown.
- Keep plan alignment and actual spending understandable and mathematically honest.
- Reconcile budgeted, unbudgeted, and ungrouped activity rather than dropping it.
- Make each bucket explainable through contributing categories without opening another screen.
- Preserve layout geometry during initial load, refresh, month changes, and expansion transitions.
- Follow the existing HeroUI Native, Uniwind, Zustand, repository, migration, and screen-anatomy patterns.

## Non-Goals

- No editable 50/30/20 percentages in Phase 3.
- No automatic recommendations, reallocation, rollover, or recurring budget rules.
- No transfer-based savings result or debt minimum/extra-principal split; those belong to Phase 4.
- No dedicated Needs, Wants, or Savings detail route.
- No changes to Categories or Plans calculations and layouts.
- No filters or sorting controls on the 50/30/20 tab.

## Locked Product Decisions

1. Direction A, the expandable rule ledger, is the implementation target.
2. The existing Budget header, month selector, and `Categories / Plans / 50/30/20` HeroUI tabs remain.
3. The summary uses the same shared card parts, typography, spacing, and progress geometry as the Plans summary.
4. The only overall progress bar represents `total planned / monthly planning income`.
5. Each bucket ring represents `bucket planned / bucket target`; it never represents spending.
6. Needs and Wants show both plan alignment and recorded expense spending.
7. Savings shows plan alignment and `Actual: Not tracked`.
8. Only one bucket may be expanded at a time; tapping the open bucket collapses it.
9. Expanded content is full width inside the ledger, not a nested card or nested accordion.
10. Category contributors include categories with planned or recorded activity. An unbudgeted category must not disappear from actual results.
11. `Not grouped` is neutral reconciliation information, not a warning state.
12. Planning income is stored by month. Editing July cannot change June targets.
13. Category grouping is snapshotted by month when monthly income is configured or a budget group is saved for that month.

## Information Architecture

The 50/30/20 tab content order is:

1. Monthly rule summary card.
2. `Rule breakdown` label with `Plan + recorded result` supporting copy.
3. Single-expand Needs, Wants, and Savings ledger.
4. Conditional `Not grouped` reconciliation row.

There is no tab-specific action rail. Income editing is available from the summary. Monthly budgets continue to be managed in Categories through the expanded bucket action.

## Monthly Summary Card

The summary is a compact HeroUI `Card` composed from the shared budget summary parts.

### Content

- Eyebrow: `50/30/20 plan · July`.
- Lifecycle: current-month days left, future `Planned`, or past `Complete`.
- Primary result:
  - positive: `5,500 EGP left to plan`;
  - negative: `3,000 EGP over planned income`;
  - no income: `Set monthly planning income`.
- Secondary line: `14,500 planned of 20,000 income` and `73% planned`.
- One plan-progress bar, visually clamped to 100% while text preserves the true percentage.
- Metrics:
  - `Income`;
  - `Planned`;
  - `Not grouped`.
- Full-width status row:
  - `Needs within cap`, `Needs over cap`, or `Needs no plan`;
  - `Wants within cap`, `Wants over cap`, or `Wants no plan`;
  - `Savings target met`, `Savings below target`, or `Savings no plan`.

### Calculations

For selected month `M`:

```text
income = monthly planning income for M
groupedPlanned = sum(monthly budget limits whose category has a group snapshot for M)
ungroupedPlanned = sum(monthly budget limits whose category has no group snapshot for M)
totalPlanned = groupedPlanned + ungroupedPlanned
leftToPlan = income - totalPlanned
plannedPct = income > 0 ? totalPlanned / income : unavailable
```

`Not grouped` displays `ungroupedPlanned`. The conditional reconciliation row provides both ungrouped planned and recorded amounts when either is nonzero.

## Bucket Ledger

Use HeroUI Native `Accordion` as a controlled, single-expand ledger. Expanded bucket identity belongs in `budget.state.ts`, not component-local state.

### Shared Collapsed Row

Each bucket row contains:

- Circular planned-progress ring with a bucket icon.
- Bucket name and fixed rule percentage.
- Semantic status chip.
- Supporting line with planned, target, and recorded result.
- Right-aligned variance against the target.
- Expand/collapse indicator.

The row keeps fixed grid columns and a stable minimum height so expansion does not move values horizontally.

### Needs and Wants

For group `G`:

```text
target = income × rulePct
planned = sum(monthly budget limits for categories assigned to G in M)
spent = sum(all expense transaction EGP amounts in M for categories assigned to G)
planPct = target > 0 ? planned / target : unavailable
variance = target - planned
```

Needs and Wants status is plan-based:

- `No plan yet`: planned is zero.
- `Within cap`: planned is greater than zero and not above target.
- `Over cap`: planned is above target.

The circular ring fills to `min(planPct, 100%)`; the numeric percentage remains truthful when above 100%.

### Savings

```text
target = income × 0.20
planned = sum(monthly budget limits for categories assigned to Savings in M)
actual = unavailable
variance = target - planned
```

Savings status is plan-based:

- `No plan yet`: planned is zero.
- `Target met`: planned is at least target.
- `Below target`: planned is below target.

Savings copy must say `Actual not tracked`; it must not use `spent`, infer contributions from transfers, or claim progress from account movements.

## Expanded Bucket Content

Opening a bucket reveals:

1. Compact `Target / Planned / Spent` metrics for Needs and Wants.
2. Compact `Target / Planned / Actual: Not tracked` metrics for Savings.
3. One short insight explaining the most important state.
4. Category contributors.
5. `Manage [bucket] budgets` action that switches to Categories and focuses the matching group.

### Category Contributors

Needs and Wants include every category whose monthly group is the bucket and whose `planned > 0` or `spent > 0`:

- icon and category name;
- share of the bucket plan when planned is positive;
- `spent / planned` when budgeted;
- `spent · unbudgeted` when spending exists without a monthly budget.

Savings contributors show planned amounts and plan share only. Their trailing result remains `Actual not tracked`.

Contributors sort by planned amount descending, then recorded spend descending, then category name.

## Not Grouped Reconciliation

Show the neutral row when `ungroupedPlanned > 0` or `ungroupedSpent > 0`.

- Label: `Not grouped`.
- Supporting copy: `Not counted in the rule breakdown`.
- Values: planned and recorded expense amounts.
- Neutral icon, surface, border, and foreground tokens.
- No health status, target, percentage, or fabricated left value.

`ungroupedSpent` includes expense activity for categories without a selected-month group snapshot.

## Monthly Income and Group Snapshot

### Data Model

Append migration `016_create_budget_month_profiles.ts` with two tables:

```sql
CREATE TABLE IF NOT EXISTS budget_month_settings (
  year_month TEXT PRIMARY KEY,
  expected_income REAL NOT NULL CHECK(expected_income > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS budget_month_category_groups (
  year_month TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  budget_group TEXT NOT NULL CHECK(budget_group IN ('need', 'want', 'savings')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(year_month, category_id)
);
```

The migration is append-only and preserves existing data. It seeds the current month income from the legacy `expected_monthly_income` app setting when the value is valid. Existing budget months receive category-group snapshots from their categories as a best-effort baseline.

### Persistence Rules

- Saving income upserts only the selected month.
- Saving monthly income snapshots the current group of every grouped expense category for that month when no snapshot exists.
- Saving a budget group updates the selected month snapshot and the category default used for future months.
- Copying budgets copies the selected categories' group snapshots into the target month without changing the source month.
- Loading a month reads its income and group snapshots together with budget rows and spending.
- A current category group may be used as a display fallback before monthly income is configured, but persisted historical calculations use the month snapshot once created.

## Income Sheet

Reuse the HeroUI-backed `Sheet` and existing RHF/Zod income-sheet anatomy.

- Title: `Monthly planning income`.
- Description explains that the value belongs to the selected month.
- Field label includes the selected month.
- Existing trailing-income suggestion remains available.
- Save button exposes loading state and prevents duplicate submission.
- Save failure keeps the sheet and entered value open and uses the existing toast pattern.

The sheet is rendered once by the Budget screen, not once inside each tab lens.

## UI States

### Initial Load and Refresh

- Keep the Budget header, month selector, and tabs visible.
- Use HeroUI `Skeleton` / `SkeletonGroup` placeholders matching the final summary and three ledger rows.
- Refresh uses the same geometry and preserves selected month, selected tab, and expanded bucket.
- Do not show stale numbers, then skeletons, then numbers again on tab focus.

### No Income

- Preserve summary geometry.
- Primary action is `Set monthly planning income`.
- Show planned amount if budgets exist, but do not calculate targets or percentages.
- Bucket rows remain visible with `Income needed` state and no fabricated target variance.

### Income With No Budgets

- Primary result is the full income `left to plan`.
- All buckets show `No plan yet`.
- Needs/Wants may still show real recorded spending from grouped categories.
- No `0% used` wording is shown for unavailable plan ratios.

### Over Planned

- Primary result and progress bar use danger semantics.
- Progress bar is visually capped at 100%; supporting text shows the true percentage.
- Bucket statuses and variances remain independently calculated.

### Load Error

- Preserve the standard screen shell and selected tab.
- Use the existing retry/error pattern.
- Retry reloads the selected month without clearing the user's selection.

## Accessibility

- Accordion headers expose expanded/collapsed state and complete financial labels.
- Rings are never the only carrier of progress or status.
- Icon-only controls have accessible labels and stable touch targets.
- Dynamic type may wrap supporting copy but must not overlap the amount or chevron columns.
- Status uses icon, text, and color together.
- Reduced-motion users receive immediate open/close state changes without the height animation.

## Architecture

- `index.tsx` remains template-only and contains no local state.
- `budget.hook.ts` composes persisted data and delegates pure calculations.
- `budget.state.ts` owns expanded bucket and tab UI state.
- `budget_buckets.helpers.ts` owns pure summary, bucket, contributor, and reconciliation calculations.
- New focused 50/30/20 components live under `components/fifty_thirty_twenty/`.
- Shared summary parts and `BudgetRing` are reused rather than duplicated.
- HeroUI Native `Card`, `Accordion`, `Button`, `Skeleton`, and the existing `Sheet` wrapper are mandatory where applicable.
- Use Uniwind `className` and theme tokens; runtime category colors remain the only dynamic color styles.
- All user-visible copy lives in `src/constants/strings.ts`.

## Acceptance Criteria

1. July and June can store different planning incomes without affecting each other.
2. Summary planned total includes grouped and ungrouped monthly budgets exactly once.
3. Needs/Wants actual spending includes unbudgeted categories assigned to the group.
4. Savings actual always displays `Not tracked` in Phase 3.
5. Ungrouped planned and recorded activity reconciles outside the 50/30/20 buckets.
6. Rings always represent planned amount against target, with truthful percentages above 100%.
7. Only one bucket expands at a time and rows do not shift horizontally during transitions.
8. No-income, no-budget, over-plan, loading, refreshing, and error states preserve screen geometry.
9. Income sheet saves the selected month, exposes loading state, and stays open on failure.
10. Categories and Plans tabs remain behaviorally unchanged.
11. Unit tests cover formulas, migration, query/repository behavior, store race handling, and UI-state transitions.
12. Format, lint, typecheck, unit tests, Expo Doctor, and Android prebuild parity pass before push.
