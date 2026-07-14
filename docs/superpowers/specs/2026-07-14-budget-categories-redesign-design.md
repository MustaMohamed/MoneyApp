# Budget Categories Redesign Design

- **Date:** 2026-07-14
- **Status:** Approved
- **Scope:** Budget Phase 1 redesign
- **Visual reference:** `.superpowers/brainstorm/82262-1784038480/content/budget-categories-expandable-v3.html`

## Summary

This redesign turns the Categories tab into a compact monthly budget ledger. The screen gives a useful month-level summary first, then groups every named budget under its parent expense category. Category rows remain easy to scan when collapsed and expand into full-width named-budget rows with enough information to explain how the category total was built.

Named-budget spending becomes real rather than estimated. Expense transactions can be assigned to a named budget for their category and month. The parent category still counts every matching expense, including historical or deliberately unassigned transactions, and the expanded section exposes any difference as `Unassigned spending`. This guarantees that the parent total always reconciles with its children without rewriting existing transaction history.

## Goals

- Make the Categories tab compact, modern, and data-rich without duplicating progress indicators.
- Use the same financial language as the Plans tab: `Planned`, `Spent`, `Left`, `% used`, `On track`, `Watch`, and `Over`.
- Show a clear month-level answer: how much was planned, spent, left or over, unassigned from expected income, and spent outside budgets.
- Make category rows useful while collapsed and fully explainable when expanded.
- Show meaningful spent, left, and usage values for each named budget.
- Preserve existing transactions and monthly budgets through an append-only, nullable data-model change.
- Follow the existing HeroUI Native, Uniwind, Zustand, repository, and screen-anatomy patterns.

## Non-Goals

- No redesign of the Plans or 50/30/20 tabs.
- No category filters, sorting controls, or search on the Categories tab.
- No rollover, recurring budget rule, alert scheduling, or automatic allocation advice.
- No transaction-to-Spending-Plan assignment; this design applies only to named monthly budgets.
- No changes to Spending Plan overlap, allocation, pace, or status logic.
- No automatic assignment of historical transactions to named budgets.

## Locked Product Decisions

1. The approved expandable category ledger is the implementation target.
2. The screen has no filter control. The monthly selector and existing three budget tabs remain.
3. A parent category has one circular usage indicator and no progress bar.
4. Expanded content is full width inside the category row, not a nested card.
5. Named budgets have their own small circular usage indicators aligned beneath the parent ring.
6. Each named budget shows its share of the parent category plan, spent of planned, percentage used, and left or over amount.
7. Named-budget spending comes from transaction assignment. It is not distributed proportionally or inferred from limits.
8. Existing transactions remain unassigned after migration. Parent category totals continue to include them.
9. Any parent spending not assigned to a child budget is shown as `Unassigned spending` in the expanded category.
10. The only repeat mechanism for monthly budgets remains Copy; named budgets do not acquire recurrence rules.

## Screen Hierarchy

The Categories tab retains the standard Budget screen header, month selector, and three HeroUI tabs:

- Categories
- Plans
- 50/30/20

The Categories content order is:

1. Monthly summary card.
2. Compact action row with `Copy` and `Add budget`.
3. Category-budget count label.
4. Expandable category ledger.

The app-level floating action remains unchanged and continues to open the global transaction action. It is not repurposed as a second Add budget control.

The redundant `CATEGORIES` section heading and filters are removed.

## Monthly Summary Card

The summary is a compact HeroUI `Card` using the visual rhythm established by the redesigned Plans summary.

### Content

- Eyebrow: category count and selected month, for example `4 category budgets in July`.
- Primary value: `2,550 EGP left` or `150 EGP over`.
- Secondary line: `3,700 spent of 6,250` and `59% used`.
- One overall progress bar for monthly spending against planned amount.
- Three compact metrics:
  - `Planned`: sum of all named budget limits in the selected month.
  - `Unassigned income`: `max(expectedIncome - planned, 0)`.
  - `Unbudgeted spend`: expense spending in categories with no named budget for the selected month.
- Full-width status row with colored icons and counts for `On track`, `Watch`, and `Over` categories.
- Month lifecycle copy:
  - current month: number of days left;
  - future month: `Planned`;
  - past month: `Complete`.

### Calculations

For categories that have at least one named budget in the selected month:

- `planned = sum(named budget limits)`.
- `spent = sum(all expense transactions in those categories during the month)`.
- `left = planned - spent`.
- `usedPct = planned > 0 ? spent / planned : undefined`.

`Unbudgeted spend` is separate from summary `spent` so the planned-vs-spent progress remains interpretable. It includes expenses in categories with no named budget for that month.

When expected income has not been set, `Unassigned income` displays `Set income` rather than inventing a zero. Its action reuses the existing income sheet.

When `planned` is zero, the summary does not show `0% used`; the percentage and progress fill use an unavailable/empty state.

### Category Status

Category health uses the same terms as Plans while preserving the existing 80% warning threshold:

- `On track`: planned is positive and spent is below 80% of planned.
- `Watch`: spent is from 80% through 100% of planned, inclusive.
- `Over`: spent is greater than planned.

Categories without a monthly budget are not assigned a health status; their spending contributes to `Unbudgeted spend` instead.

## Category Ledger

Use HeroUI `Accordion` as a controlled, single-expand ledger. Expanded category identity lives in `budget.state.ts`, not component-local state. Only one category is expanded at a time.

### Collapsed Parent Row

Each parent row is full width and contains:

- Left fixed gutter: category icon inside a circular progress ring.
- Main column:
  - category name and compact health chip;
  - `spent / planned · % used`.
- Right column:
  - remaining magnitude in semantic color;
  - `EGP left` or `EGP over`;
  - expand/collapse indicator.

The ring is the only per-category progress visualization. It fills to `min(usedPct, 100%)`; an over state uses the over-budget color but does not draw more than a full circle.

The row has a stable minimum height and aligned columns so expanding another category does not shift neighboring values horizontally.

### Expanded Named-Budget Rows

Expanded rows occupy the full parent width. A fixed left gutter and subtle vertical guide align each child ring with the parent ring.

Each named-budget row contains:

- Small circular usage ring with the exact used percentage centered inside.
- Budget name.
- Share badge: `limit / parent planned`, for example `80% of category`.
- Spending line: `spent / planned`.
- Right-aligned remaining magnitude and `EGP left` or `EGP over`.
- Overflow menu with `Edit` and `Delete` actions.

No child progress bar is shown. The child ring and financial values provide the progress information.

### Reconciliation Row

If parent category spending is greater than the sum of child-assigned spending, append a neutral row:

- Label: `Unassigned spending`.
- Supporting copy: `Not linked to a named budget`.
- Amount: the unassigned spend total.
- No planned amount, percentage, health status, or left value is invented.

This row covers existing transactions after migration and any valid transaction that no longer has an assignment because its named budget was deleted.

### Category Detail Action

The final expanded row is a full-width, icon-led `View category details` action. It opens the existing category detail route and passes the currently selected month so the detail screen does not silently jump to another month.

## Named-Budget Calculations

For each named budget:

- `planned = budget.limit_amount`.
- `spent = sum(expense transaction egp_amount where transaction.budget_id = budget.id)`.
- `left = planned - spent`.
- `usedPct = planned > 0 ? spent / planned : undefined`.
- `categorySharePct = parentPlanned > 0 ? planned / parentPlanned : undefined`.

For each parent category:

- `assignedSpend = sum(child budget spent)`.
- `unassignedSpend = max(parent spent - assignedSpend, 0)`.
- `parent spent = assignedSpend + unassignedSpend`.

All money calculations use stored EGP amounts, matching the existing budget analytics behavior.

## Transaction Assignment

The richer named-budget rows require a small, explicit change to the expense transaction flow.

### Data Model

Append migration `015_add_budget_id_to_transactions.ts`:

```sql
ALTER TABLE transactions
  ADD COLUMN budget_id TEXT REFERENCES budgets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_budget_id
  ON transactions(budget_id);
```

`budget_id` is nullable. Existing rows remain `NULL`; the migration performs no backfill and rewrites no financial history.

The `Transaction` entity and transaction database mappers add `budget_id: string | null`, following the project's database-null convention.

### Assignment Rules

- Income, transfer, and credit-card-payment transactions always store `budget_id = null`.
- An expense budget must match both the transaction category and transaction month.
- If an expense category/month has no named budgets, the Budget field is hidden and `budget_id` is null.
- If it has exactly one named budget, that budget is selected automatically and shown in the form for transparency.
- For a new expense with multiple named budgets, the user must choose one before saving.
- An existing unassigned expense may remain unassigned when the user edits unrelated fields; the form still offers matching budgets so it can be assigned deliberately.
- Changing transaction type, category, or date invalidates the current assignment and re-evaluates available budgets.
- Editing a historical unassigned expense allows the user to assign it to a current matching named budget for that original month.
- Repository validation repeats the category/month check at save time; UI validation alone is not sufficient.

If stale or externally corrupted data references a budget whose category/month does not match, aggregation treats the transaction as unassigned for display and does not attribute it to the child budget.

### Copy and Delete Behavior

- Copying budgets creates target-month budgets with new IDs and copies limits and names only. It never copies transaction assignments.
- Deleting a named budget relies on `ON DELETE SET NULL`; its transactions remain in the parent category and move into `Unassigned spending`.
- Delete confirmation copy states that linked spending will remain in the category but become unassigned.

## Empty, Loading, Refresh, and Error States

### Empty Month

When a month has no named budgets:

- Summary remains in place with `No budget set` as its primary state, `Planned` and planned-category `Spent` at zero, and no usage percentage or status counts.
- `Unbudgeted spend` still reports real expense activity.
- A compact empty state offers `Add budget` and `Copy from month` actions.
- No category health counts or `0% used` claims are shown.

### Loading and Refresh

- Initial load and pull-to-refresh use HeroUI `Skeleton`/`SkeletonGroup` placeholders.
- Skeletons match the final summary card, action row, parent row count, heights, and spacing to prevent layout shift.
- The tabs and selected `Categories` label remain visible during loading.
- Refresh uses the same geometry while preserving the selected month and tab.
- Expanded state may collapse on a full month change, but must not flicker during a same-month refresh.

### Errors

- Load failure keeps the standard screen structure and shows the existing retry/error pattern.
- Save and delete failures preserve form or menu state and use the existing toast pattern.
- Save buttons expose loading state and prevent duplicate submissions.

## Accessibility

- Parent and child rows expose complete labels including name, spent, planned, percentage, and left/over state.
- Circular progress is never the only carrier of status; text and semantic color accompany it.
- Expand controls expose expanded/collapsed state.
- Icon-only menu and detail actions have accessible labels and stable touch targets.
- Dynamic type may wrap supporting lines but must not overlap the right amount column.

## Component and Architecture Plan

All full-screen routes continue to use `Screen` and `ScreenScroll`. HeroUI Native components and Uniwind classes are mandatory where primitives exist.

### Budget Screen

- `index.tsx`: presentational composition only; no `useState`, `useSharedValue`, calculations, or persistence logic.
- `budget.hook.ts`: loads data, builds screen view models, handles navigation and actions.
- `budget.state.ts`: selected tab/month, expanded category ID, sheet visibility, loading, and refresh state.
- `budget.helpers.ts`: pure monthly summary, status, parent, child, and reconciliation calculations.
- `components/summary_card.tsx`: HeroUI Card receiving a complete summary view model.
- `components/category_budget_row.tsx`: controlled HeroUI Accordion item receiving a complete category view model.
- Focused presentational children may be extracted for the parent header, named-budget row, reconciliation row, and status breakdown when that keeps files small.

### Transaction Form

- Existing add/edit hooks derive matching monthly budgets and validate assignment.
- Existing add/edit stores include `budgetId` in drafts and persistence payloads.
- Presentational form components receive available budgets, selected ID, validation copy, and actions from hooks.
- Use an existing HeroUI selection primitive; do not build a custom selector.

### Styling

- Compose HeroUI `Card`, `Accordion`, `Chip`, `Button`, `Menu`, `Skeleton`, `SkeletonGroup`, and `PressableFeedback` for the corresponding card, expandable ledger, status, action, menu, loading, and interactive surfaces.
- Use `className` with project theme slots and `cn(...)`; no new custom `StyleSheet` blocks in touched UI files.
- Use `style` only for layout-critical flex behavior and runtime values such as category colors or SVG progress geometry, as allowed by project rules.
- User-visible copy belongs in `src/constants/strings.ts`.

## Data Flow

1. Budget store loads named budgets, category-level monthly spend, budget-assigned spend, expected income, and unbudgeted spend for the selected month.
2. `budget.hook.ts` groups budgets by category and derives summary, parent, child, and reconciliation view models.
3. Presentational components render only the supplied view models and dispatch actions.
4. Add/edit transaction hooks load named budgets for the selected expense category and transaction month.
5. Transaction repository validates and persists the nullable assignment with the transaction.
6. Budget save, delete, transaction save, and transaction delete invalidate/reload the affected selected month.

## Testing

### Migration and Repository Tests

- Migration adds nullable `transactions.budget_id` and its index without changing existing rows.
- Deleting a budget sets linked transaction assignments to null.
- Budget spending query includes only matching expense transactions assigned to the budget.
- Parent category spend includes assigned and unassigned category expenses.
- Unbudgeted spend includes only expenses in categories without monthly budgets.
- Copy creates new budget IDs and never copies assignments.

### Calculation Tests

- Parent and child planned, spent, left/over, used percentage, and category share.
- Parent reconciliation: assigned child spend plus unassigned spend equals parent spend.
- On-track, watch, and over boundaries, including exactly 80% and 100%.
- Zero-planned states never fabricate a percentage.
- Summary excludes unbudgeted spend from planned-vs-spent progress while reporting it separately.
- Expected-income absent and assigned-income calculations.

### Transaction Tests

- Non-expense transactions clear budget assignment.
- Zero, one, and multiple matching-budget form behavior.
- Category/date/type changes invalidate stale assignments.
- Repository rejects category or month mismatches.
- Historical unassigned expense can be assigned during edit.

### State and UI Contract Tests

- Accordion allows one expanded category and preserves it during same-month refresh.
- Month change resets invalid expanded category state.
- Category detail navigation preserves the selected month.
- Summary, parent, child, empty, refresh, and error view models expose all required copy and values.
- Skeleton dimensions match the rendered summary and ledger geometry.
- Save actions expose loading state and block duplicate writes.

## Acceptance Criteria

- Categories tab matches the approved expandable-ledger visual direction on supported phone sizes.
- Summary shows planned, spent, left/over, unassigned income, unbudgeted spend, and category status counts without layout shift.
- Parent rows use one progress ring and no per-row progress bar.
- Expanded rows are full width, align child rings under the parent ring, and show share, spent/planned, percentage, and left/over.
- Parent totals reconcile exactly with assigned child spending plus `Unassigned spending`.
- New expenses can be assigned only to a matching named budget.
- Existing transaction history remains unchanged after migration.
- The screen follows HeroUI Native and module anatomy rules, with no component-local business logic.
- Automated checks pass, followed by the required real-device QA gate for layout, dynamic type, refresh skeletons, expansion behavior, transaction assignment, copy, and delete reconciliation.

## Rollout and Risk

This redesign includes a safe but cross-section schema change because real named-budget spending cannot be represented by the current category-only transaction model. The migration is additive and nullable, performs no backfill, and preserves all existing financial totals. The feature ships as one coordinated PR so transaction assignment and budget display cannot become temporarily inconsistent.

Real-device QA is required before merge, with special attention to compact row alignment, long budget/category names, scroll behavior with expanded rows, skeleton geometry, and editing an existing unassigned transaction.
