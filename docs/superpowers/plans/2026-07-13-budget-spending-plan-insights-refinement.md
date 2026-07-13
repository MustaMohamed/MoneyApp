# Budget Spending Plan Insights Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Phase 2 Plans overview, plan cards, and plan detail sheet into the approved compact, data-rich experience with correct plan health, pace, allocation, and lifecycle insights.

**Architecture:** Keep persistence and spending aggregation unchanged. Extend `spending_plans.helpers.ts` into the single pure derivation boundary for dates, health, pace, summary counts, compact card chips, and detail category rows; pass those view models into focused presentational components. Split the summary and detail subregions into small components so screen templates remain logic-free and skeletons can mirror stable geometry.

**Tech Stack:** TypeScript strict, React Native, Expo, Zustand-derived screen state, HeroUI Native, MaterialCommunityIcons, Jest, Testing Library, Cairo Nights theme tokens.

---

## File Map

- Modify `src/modules/budget/screens/budget/spending_plans.helpers.ts`: derive lifecycle, elapsed time, health, pace, itemization, category pressure, and display-ready card/detail view models.
- Modify `src/modules/budget/screens/budget/budget.hook.ts`: pass a local calendar date into pure plan derivation.
- Create `src/modules/budget/screens/budget/components/spending_plans_summary.tsx`: render the approved overall summary hierarchy and icon status row.
- Modify `src/modules/budget/screens/budget/components/spending_plans_lens.tsx`: compose the focused summary and plan-card components only.
- Modify `src/modules/budget/screens/budget/components/spending_plan_card.tsx`: render compact plan money, lifecycle, status, pace, progress marker, chips, and footer actions.
- Modify `src/modules/budget/screens/budget/components/spending_plan_allocation_chip.tsx`: remove visible category names while retaining accessible names, ring, amount ratio, and percentage.
- Create `src/modules/budget/screens/budget/components/spending_plan_category_chip.tsx`: render unallocated categories without fabricating a limit or percentage.
- Create `src/modules/budget/screens/budget/components/spending_plan_detail_summary.tsx`: render the compact detail hero, progress marker, and four metrics.
- Create `src/modules/budget/screens/budget/components/spending_plan_detail_category_row.tsx`: render named category rows with allocated and unallocated variants.
- Modify `src/modules/budget/screens/budget/components/spending_plan_detail_sheet.tsx`: compose summary, insights, category rows, buffer, and edit action.
- Modify `src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx`: match the new summary and card geometry.
- Modify `src/constants/strings.ts`: centralize all new lifecycle, status, pace, summary, and insight copy.
- Modify `__tests__/spending_plans.helpers.test.ts`: cover financial/date derivation and view-model output.
- Modify `__tests__/screens/budget/spending_plans_lens.test.tsx`: cover summary status icons and compact card content.
- Modify `__tests__/screens/budget/spending_plan_detail_sheet.test.tsx`: cover compact summary, insights, and allocated/unallocated category rows.
- Modify `__tests__/screens/budget/budget_screen.test.tsx`: preserve loading/refresh skeleton behavior for the Plans tab.

---

### Task 1: Derive Plan Health, Pace, Lifecycle, and Summary Metrics

**Files:**
- Modify: `src/modules/budget/screens/budget/spending_plans.helpers.ts`
- Modify: `src/modules/budget/screens/budget/budget.hook.ts`
- Test: `__tests__/spending_plans.helpers.test.ts`

- [ ] **Step 1: Write failing date and health tests**

Add deterministic tests using `today: '2026-07-13'` for:

```ts
it.each([
  ['2026-07-26', '2026-07-28', 0, 'upcoming'],
  ['2026-07-08', '2026-07-18', 6020, 'watch'],
  ['2026-07-08', '2026-07-18', 3000, 'onTrack'],
  ['2026-07-01', '2026-07-12', 2870, 'over'],
])('derives lifecycle and health for %s to %s', (startDate, endDate, spent, status) => {
  const row = buildSpendingPlanRows({
    plans: [planFixture({ startDate, endDate, totalAmount: 2500 })],
    categories,
    spendByPlanId: { plan_trip: { cat_food: spent } },
    selectedMonth: '2026-07',
    today: '2026-07-13',
  })[0];

  expect(row.status).toBe(status);
});

it('uses inclusive dates for elapsed plan time', () => {
  expect(computePlanTiming('2026-07-08', '2026-07-18', '2026-07-13')).toEqual({
    lifecycle: 'active',
    totalDays: 11,
    elapsedDays: 6,
    elapsedPct: 6 / 11,
    daysValue: 5,
  });
});
```

Add tests proving:

- over takes precedence over watch;
- upcoming takes precedence over a zero-spend pace calculation;
- a category at exactly 80% makes an active plan `watch`;
- a completed plan within budget is `onTrack`;
- plain categories expose spend but no allocation percentage;
- summary returns planned, spent, left, pct, itemized amount/pct, active/upcoming counts, four status counts, and needs-attention count.

- [ ] **Step 2: Run the helper tests and verify failure**

Run:

```bash
npm test -- --runInBand __tests__/spending_plans.helpers.test.ts
```

Expected: FAIL because `today`, `computePlanTiming`, status fields, category detail rows, and expanded summary fields do not exist.

- [ ] **Step 3: Add pure derivation types and functions**

Implement these public contracts in `spending_plans.helpers.ts`:

```ts
export type SpendingPlanLifecycle = 'upcoming' | 'active' | 'completed';
export type SpendingPlanStatus = 'upcoming' | 'onTrack' | 'watch' | 'over';

export interface SpendingPlanTimingVM {
  lifecycle: SpendingPlanLifecycle;
  totalDays: number;
  elapsedDays: number;
  elapsedPct: number;
  daysValue: number;
}

export interface SpendingPlanDetailCategoryVM {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  spent: number;
  allocatedAmount?: number;
  left?: number;
  pct?: number;
  isOver: boolean;
  isWarning: boolean;
}
```

Use UTC day numbers for date-only arithmetic so DST cannot change day counts:

```ts
const DAY_MS = 86_400_000;

function isoDayNumber(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function computePlanTiming(
  startDate: string,
  endDate: string,
  today: string,
): SpendingPlanTimingVM {
  const start = isoDayNumber(startDate);
  const end = isoDayNumber(endDate);
  const current = isoDayNumber(today);
  const totalDays = end - start + 1;

  if (current < start) {
    return { lifecycle: 'upcoming', totalDays, elapsedDays: 0, elapsedPct: 0, daysValue: start - current };
  }

  const elapsedDays = Math.min(totalDays, current - start + 1);
  return {
    lifecycle: current > end ? 'completed' : 'active',
    totalDays,
    elapsedDays,
    elapsedPct: elapsedDays / totalDays,
    daysValue: current > end ? current - end : end - current,
  };
}
```

Derive status with this exact precedence:

```ts
function derivePlanStatus({
  lifecycle,
  isOver,
  paceDelta,
  hasCategoryPressure,
}: {
  lifecycle: SpendingPlanLifecycle;
  isOver: boolean;
  paceDelta: number;
  hasCategoryPressure: boolean;
}): SpendingPlanStatus {
  if (lifecycle === 'upcoming') return 'upcoming';
  if (isOver) return 'over';
  if (lifecycle === 'active' && (paceDelta >= 0.1 || hasCategoryPressure)) return 'watch';
  return 'onTrack';
}
```

Extend `SpendingPlanRowVM` with `timing`, `status`, `paceDelta`, `detailCategoryRows`, and `highestPressureCategory`. Extend plain card chips with category spend. Extend `SpendingPlansSummaryVM` with:

```ts
itemizedAmount: number;
itemizedPct: number;
activeCount: number;
upcomingCount: number;
onTrackCount: number;
watchCount: number;
overCount: number;
needsAttentionCount: number;
```

Change `buildSpendingPlanRows` to require `today: string`. In `budget.hook.ts`, import `toLocalDateString`, compute `const today = toLocalDateString(new Date())`, pass it into the helper, and include it in the memo dependencies.

- [ ] **Step 4: Run helper and hook tests**

Run:

```bash
npm test -- --runInBand __tests__/spending_plans.helpers.test.ts __tests__/screens/budget/budget_spending_plans_hook.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the pure derivation layer**

```bash
git add src/modules/budget/screens/budget/spending_plans.helpers.ts src/modules/budget/screens/budget/budget.hook.ts __tests__/spending_plans.helpers.test.ts __tests__/screens/budget/budget_spending_plans_hook.test.ts
git commit -m "feat: derive spending plan health insights"
```

---

### Task 2: Build the Compact Overall Plans Summary

**Files:**
- Create: `src/modules/budget/screens/budget/components/spending_plans_summary.tsx`
- Modify: `src/modules/budget/screens/budget/components/spending_plans_lens.tsx`
- Modify: `src/constants/strings.ts`
- Test: `__tests__/screens/budget/spending_plans_lens.test.tsx`

- [ ] **Step 1: Write failing summary rendering tests**

Expand the summary fixture and assert:

```ts
expect(getByText('6,800 EGP left')).toBeTruthy();
expect(getByText('1 needs attention')).toBeTruthy();
expect(getByText('1,200 spent of 8,000')).toBeTruthy();
expect(getByText('15% used')).toBeTruthy();
expect(getByText('1 active')).toBeTruthy();
expect(getByText('0 upcoming')).toBeTruthy();
expect(getByText('3,000 · 38%')).toBeTruthy();
expect(getByText('1 on track')).toBeTruthy();
expect(getByText('1 watch')).toBeTruthy();
expect(getByText('0 over')).toBeTruthy();
```

Mock `MaterialCommunityIcons` as a host element and assert icon names `check-circle-outline`, `alert-circle-outline`, `alert-octagon-outline`, and `clock-outline` are rendered in the status row.

- [ ] **Step 2: Run the lens test and verify failure**

```bash
npm test -- --runInBand __tests__/screens/budget/spending_plans_lens.test.tsx
```

Expected: FAIL because the richer summary and icons are absent.

- [ ] **Step 3: Add centralized copy**

Add string functions for plan-count eyebrow, left/over primary amount, attention count, spent-of-total, percentage used, active/upcoming counts, itemized metric, and four status counts. Use `Intl`-formatted values supplied by components; strings must not perform financial math.

- [ ] **Step 4: Implement `SpendingPlansSummary`**

The component accepts only:

```ts
interface SpendingPlansSummaryProps {
  summary: SpendingPlansSummaryVM;
  selectedMonth: string;
}
```

Render the approved hierarchy with theme tokens and `MaterialCommunityIcons`. Use a three-cell metric row and a full-width four-item status row with `justifyContent: 'space-between'`. Icon mapping is fixed:

```ts
const STATUS_ITEMS = [
  { key: 'onTrack', icon: 'check-circle-outline', color: Colors.dark.positive },
  { key: 'watch', icon: 'alert-circle-outline', color: Colors.dark.warning },
  { key: 'over', icon: 'alert-octagon-outline', color: Colors.dark.negative },
  { key: 'upcoming', icon: 'clock-outline', color: Colors.dark.info },
] as const;
```

Use the existing `BudgetBar`; do not add an aggregate time marker.

- [ ] **Step 5: Compose the summary from `SpendingPlansLens`**

Replace the inline three-figure summary with `<SpendingPlansSummary />`. Pass the selected month label through the lens props from `budget/index.tsx`; keep `summaryFooter` immediately beneath the card.

- [ ] **Step 6: Run lens and budget-screen tests**

```bash
npm test -- --runInBand __tests__/screens/budget/spending_plans_lens.test.tsx __tests__/screens/budget/budget_screen.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit the overall summary**

```bash
git add src/constants/strings.ts src/modules/budget/screens/budget/components/spending_plans_summary.tsx src/modules/budget/screens/budget/components/spending_plans_lens.tsx src/modules/budget/screens/budget/index.tsx __tests__/screens/budget/spending_plans_lens.test.tsx __tests__/screens/budget/budget_screen.test.tsx
git commit -m "feat: enrich spending plans summary"
```

---

### Task 3: Redesign Compact Plan Cards and Category Chips

**Files:**
- Modify: `src/modules/budget/screens/budget/components/spending_plan_card.tsx`
- Modify: `src/modules/budget/screens/budget/components/spending_plan_allocation_chip.tsx`
- Create: `src/modules/budget/screens/budget/components/spending_plan_category_chip.tsx`
- Modify: `src/constants/strings.ts`
- Test: `__tests__/screens/budget/spending_plans_lens.test.tsx`

- [ ] **Step 1: Write failing compact-card tests**

Assert that an active watch plan renders:

```ts
expect(getByText('Watch')).toBeTruthy();
expect(getByText('Jul 18 - Jul 21 · 8 days left')).toBeTruthy();
expect(getByText('6,800')).toBeTruthy();
expect(getByText('EGP left')).toBeTruthy();
expect(getByText('1,200 / 8,000 spent')).toBeTruthy();
expect(getByText('15% used')).toBeTruthy();
expect(getByText('10 pts ahead of pace')).toBeTruthy();
expect(getByText('1,200/3,000')).toBeTruthy();
expect(queryByText('Food')).toBeNull();
```

Also assert the category chip remains accessible as `Food, 1,200 of 3,000, 40% used`, and a plain unallocated category chip exposes spend without a percent or denominator.

- [ ] **Step 2: Run the lens test and verify failure**

```bash
npm test -- --runInBand __tests__/screens/budget/spending_plans_lens.test.tsx
```

Expected: FAIL against the old card hierarchy and visible category names.

- [ ] **Step 3: Remove the visible name from allocation chips**

Keep the HeroUI `Chip`, `BudgetRing`, category icon, compact amount ratio, and percentage. Remove the visible name block. Preserve the category name in `accessibilityLabel`.

- [ ] **Step 4: Add the unallocated category chip**

`SpendingPlanCategoryChip` accepts a plain-category card-chip VM and renders the category icon plus formatted spent amount. It must not render a ring percentage, limit denominator, or remaining value.

- [ ] **Step 5: Implement the approved plan-card hierarchy**

Render:

1. Plan name plus compact status label.
2. Date range plus lifecycle copy.
3. Right-aligned remaining/over amount.
4. Spent of total plus percentage used.
5. Budget progress bar and an absolute blue elapsed-time marker only when active.
6. Pace/final-state copy.
7. Up to three card chips plus overflow.
8. Assigned/flexible footer plus the existing edit/delete actions.

Use view-model fields only. Do not calculate timing, status, category pressure, or allocation totals in the component.

- [ ] **Step 6: Run lens tests**

```bash
npm test -- --runInBand __tests__/screens/budget/spending_plans_lens.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit plan cards and chips**

```bash
git add src/constants/strings.ts src/modules/budget/screens/budget/components/spending_plan_card.tsx src/modules/budget/screens/budget/components/spending_plan_allocation_chip.tsx src/modules/budget/screens/budget/components/spending_plan_category_chip.tsx __tests__/screens/budget/spending_plans_lens.test.tsx
git commit -m "feat: redesign spending plan cards"
```

---

### Task 4: Redesign Plan Details and Match Loading Geometry

**Files:**
- Create: `src/modules/budget/screens/budget/components/spending_plan_detail_summary.tsx`
- Create: `src/modules/budget/screens/budget/components/spending_plan_detail_category_row.tsx`
- Modify: `src/modules/budget/screens/budget/components/spending_plan_detail_sheet.tsx`
- Modify: `src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx`
- Modify: `src/constants/strings.ts`
- Test: `__tests__/screens/budget/spending_plan_detail_sheet.test.tsx`
- Test: `__tests__/screens/budget/budget_screen.test.tsx`

- [ ] **Step 1: Write failing detail and skeleton tests**

Assert the detail sheet renders:

```ts
expect(getByText('6,800 EGP left')).toBeTruthy();
expect(getByText('15%')).toBeTruthy(); // budget used
expect(getByText('40%')).toBeTruthy(); // time elapsed
expect(getByText('3,000')).toBeTruthy(); // assigned
expect(getByText('5,000')).toBeTruthy(); // flexible
expect(getByText('25 pts under pace')).toBeTruthy();
expect(getByText('Food & Dining')).toBeTruthy();
expect(getByText('1,200 / 3,000')).toBeTruthy();
expect(getByText('1,800 left')).toBeTruthy();
expect(getByText('Included · no category limit')).toBeTruthy();
```

Keep the existing first-load and refresh skeleton assertions, and add stable test IDs for the redesigned Plans summary skeleton and each plan-card skeleton.

- [ ] **Step 2: Run focused tests and verify failure**

```bash
npm test -- --runInBand __tests__/screens/budget/spending_plan_detail_sheet.test.tsx __tests__/screens/budget/budget_screen.test.tsx
```

Expected: FAIL because the compact detail components and matching skeleton geometry do not exist.

- [ ] **Step 3: Implement focused detail components**

`SpendingPlanDetailSummary` renders amount left/over, date/lifecycle, spent of total, percentage used, progress with active time marker, and four metrics. `SpendingPlanDetailCategoryRow` renders two explicit branches:

```tsx
if (category.allocatedAmount === undefined) {
  return <UnallocatedCategoryContent spent={category.spent} />;
}

return <AllocatedCategoryContent category={category} />;
```

The allocated branch shows circular progress, name, status copy, spent/allocated, and left/over. The unallocated branch shows the icon, name, total spend, and `Included · no category limit`.

- [ ] **Step 4: Compose the detail sheet**

Keep the HeroUI-backed `Sheet`, `BottomSheetScrollView`, and themed footer `Button`. Render at most two insights from the view model: pace/final-state and highest-pressure category. Keep category names in detail rows. Show the flexible amount row only when `buffer > 0`.

- [ ] **Step 5: Update Plans skeleton geometry**

Mirror the redesigned summary hierarchy with one primary block, progress, three metric blocks, and four short status items. Mirror cards with header/value, money line, progress, pace line, compact chips, and footer. Use `SkeletonGroup` only and preserve current first-load/refresh behavior.

- [ ] **Step 6: Run all Budget spending-plan tests**

```bash
npm test -- --runInBand __tests__/spending_plans.helpers.test.ts __tests__/screens/budget/spending_plans_lens.test.tsx __tests__/screens/budget/spending_plan_detail_sheet.test.tsx __tests__/screens/budget/budget_screen.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit detail and skeleton refinement**

```bash
git add src/constants/strings.ts src/modules/budget/screens/budget/components/spending_plan_detail_summary.tsx src/modules/budget/screens/budget/components/spending_plan_detail_category_row.tsx src/modules/budget/screens/budget/components/spending_plan_detail_sheet.tsx src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx __tests__/screens/budget/spending_plan_detail_sheet.test.tsx __tests__/screens/budget/budget_screen.test.tsx
git commit -m "feat: enrich spending plan details"
```

---

### Task 5: Full Verification and Review Preparation

**Files:**
- Verify all files changed in Tasks 1-4.

- [ ] **Step 1: Run formatting**

```bash
npm run format
```

Expected: command exits 0 and only formats refinement files.

- [ ] **Step 2: Run focused regression tests**

```bash
npm test -- --runInBand __tests__/spending_plans.helpers.test.ts __tests__/screens/budget/budget_spending_plans_hook.test.ts __tests__/screens/budget/spending_plans_lens.test.tsx __tests__/screens/budget/spending_plan_detail_sheet.test.tsx __tests__/screens/budget/budget_screen.test.tsx
```

Expected: all focused suites pass.

- [ ] **Step 3: Run typecheck and static checks**

```bash
npm run typecheck
npm run lint
npm run format:check
```

Expected: all commands exit 0; existing lint warnings may remain but no new warnings are introduced.

- [ ] **Step 4: Run the complete Jest suite**

```bash
npm test -- --ci
```

Expected: all suites pass.

- [ ] **Step 5: Review the final diff**

Confirm:

- no persistence, migration, repository, or spending-query changes;
- no component-local `useState`, financial math, date math, or status derivation;
- all user-visible strings live in `Strings`;
- all dimensions/colors use Cairo Nights tokens and responsive helpers;
- HeroUI Native primitives remain in use;
- skeleton geometry follows the real summary and cards;
- plan status and overall status icon mappings match the approved prototype.

- [ ] **Step 6: Commit any verification-only cleanup**

```bash
git add src/modules/budget src/constants/strings.ts __tests__
git commit -m "test: verify spending plan insights refinement"
```

Skip this commit when verification produces no changes.
