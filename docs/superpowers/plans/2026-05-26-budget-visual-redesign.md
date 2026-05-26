# Budget Visual Redesign + Wave 4 Swipe Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `CategoryBudgetRow` with a progress ring around the category icon, a remaining-first right column, and a 5-band colour scale — AND wire swipe Edit/Delete (Wave 4 of the swipe standard) — in a single combined budget PR so the file is touched exactly once.

**Architecture:** TDD-first. Add 5 budget band tokens to `constants/theme.ts`, implement `budgetBandColor(pct)` in the existing `screens/budget/budget.helpers.ts` (alongside `computeStatus`), unit-test it exhaustively, then build the `BudgetRing` SVG component, rewrite `CategoryBudgetRow` to the new anatomy while simultaneously wrapping it in the shared `SwipeableRow` (already on this branch), update `BudgetBar`/`SummaryCard` to use the band colour, create `BudgetDeleteConfirmSheet`, wire `budget/index.tsx` with `useConfirmAction` + `useFocusEffect` blur-close, and remove the inline Remove link from `set_budget_sheet.tsx`. The shared primitives (`SwipeableRow`, `ConfirmSheet` destructive, `useConfirmAction`) are **already merged on this branch** — do not recreate them.

**Tech Stack:** react-native-svg (already installed v15.15.3), react-native-reanimated v4, Zustand v5, HeroUI Native BottomSheet (via legacy `Sheet` wrapper), TypeScript strict, oxlint v1, oxfmt beta.

---

## Implementation Notes Before You Start

### Branch
You are on `feat/swipe-actions-standard`. Waves 1–3 of the swipe plan are already committed. This plan implements the budget-specific work (Wave 4 + visual redesign) on the same branch.

### Already available on this branch
- `components/ui/swipeable_row.tsx` — `SwipeableRow` / `SwipeAction` / `closeAllRows`
- `components/ui/confirm_sheet.tsx` — has `destructive` prop
- `utils/use_confirm_action.hook.ts` — confirm/cancel gate hook
- `constants/strings.ts` — already contains `swipeEdit`, `swipeDelete`, `budgetDeleteConfirmTitle/Body/Confirm/Cancel`

### No new dependencies
`react-native-svg` is already in `package.json` at `^15.15.3`. Do **not** run `npm install` for it.

### HeroUI justification for BudgetRing
`BudgetRing` uses `react-native-svg` (`Circle` with `strokeDasharray`/`strokeDashoffset`). HeroUI Native has no SVG progress-ring primitive. This is the same justification as the existing SVG textures in the codebase — not a Team Law 7 violation; no sign-off needed.

### `Colors` object shape
`constants/theme.ts` exports `Colors` as `{ dark: {...}, light: {...}, shared: {...} } as const`. To add tokens you must edit the `dark` and `light` sub-objects and remove/re-add `as const`. The full object closes at line 53.

### `budget.helpers.ts` is the right home for `budgetBandColor`
`computeStatus`, `computeCategoryRow`, `computeOverall` already live there. `budgetBandColor` is the same layer of budget-domain logic. Add it there — no new file needed.

### `BudgetBar` colour source change (cleanest signature)
`BudgetBar` currently takes `status: BudgetStatus`. The cleanest change is to add an optional `color?: string` prop — when provided it overrides the status-map lookup. `SummaryCard` passes `color={budgetBandColor(overall.pct)}`; the per-row usage is removed entirely. Existing callers that still pass `status` continue to work without change (there are none after the redesign, but keep the prop for backward safety during the transition).

### `openEdit` API
`useBudgetState.openEdit(categoryId: string)` — takes `categoryId`, not the full VM row. Pass `row.categoryId` from the index `.map`.

### `CategoryBudgetRowVM` field names
`categoryId`, `name`, `icon`, `color`, `pct`, `spent`, `limit` — all confirmed in `budget.hook.ts`.

### Logic-only tests rule
`BudgetRing` and `CategoryBudgetRow` are `.tsx` — no render tests. Only `budgetBandColor` and any extracted helper (remaining magnitude/label) get unit tests (`.ts` files in `__tests__/`).

### `budgetBandColor` boundary semantics (from spec §6)
```
pct > 1     → budgetOver   (strictly over 100%)
pct >= 0.9  → budgetNear   (90–100%, including exactly 100%)
pct >= 0.8  → budgetWatch  (80–90%)
pct >= 0.5  → budgetSteady (50–80%)
otherwise   → budgetUnder  (< 50%)
```
Always references `Colors.dark.*` tokens (the helper is dark-mode first per the existing codebase convention — all runtime colour references in the budget screen use `Colors.dark.*`).

---

## File Map

### New files

| File | Responsibility |
|------|---------------|
| `screens/budget/components/budget_ring.tsx` | SVG progress ring with centred icon slot. Props: `pct`, `color`, `size?`, `stroke?`, `children`. |
| `screens/budget/components/budget_delete_confirm_sheet.tsx` | Thin `ConfirmSheet destructive` wrapper for budget remove. |

### Modified files

| File | Change |
|------|--------|
| `constants/theme.ts` | Add 5 budget band tokens to `Colors.dark` and `Colors.light`. |
| `screens/budget/budget.helpers.ts` | Add `budgetBandColor(pct)` + `remainingLabel(remaining)` helpers. |
| `__tests__/budget.helpers.test.ts` | Extend with exhaustive `budgetBandColor` + `remainingLabel` tests. |
| `__tests__/budget.store.test.ts` | Add `removeBudget` signature smoke-test (Wave 4 refactor guard). |
| `screens/budget/components/budget_bar.tsx` | Add optional `color?: string` prop — overrides status-map when provided. |
| `screens/budget/components/category_budget_row.tsx` | Full rewrite: new ring+icon / name+% / remaining-first anatomy + `SwipeableRow` wrapping. |
| `screens/budget/components/summary_card.tsx` | Switch `BudgetBar` colour to `budgetBandColor(overall.pct)`; update `pctLabel` to drop "used". |
| `screens/budget/index.tsx` | Add `useConfirmAction`, `useFocusEffect` blur-close, `BudgetDeleteConfirmSheet`, pass `onEdit`/`onDelete` to rows. |
| `screens/budget/components/set_budget_sheet.tsx` | Remove the inline "Remove budget" `Pressable` block (lines 191–201) and `onRemove` function. |

---

## Task 1 — Add 5 budget band tokens to `constants/theme.ts`

**Files:**
- Modify: `constants/theme.ts`

These are the colour foundation. Everything else in this plan references them.

- [ ] **Step 1: Read the current `Colors` object**

Read `/Users/musta/Code/projects/practice/MoneyApp/constants/theme.ts` in full. Confirm the `dark` sub-object ends before line 30 (lines 15–29 approx) and `light` sub-object ends before line 44. You will be adding 5 keys to each.

- [ ] **Step 2: Add tokens to `Colors.dark`**

In `constants/theme.ts`, find the `dark` sub-object. After `overlayWhite7: 'rgba(255, 255, 255, 0.07)',` (the last key), add:

```ts
    // Budget 5-band colour scale
    budgetUnder: '#6FA8DC',
    budgetSteady: '#4CAF82',
    budgetWatch: '#E0B341',
    budgetNear: '#E05A42',
    budgetOver: '#B23A28',
```

- [ ] **Step 3: Add tokens to `Colors.light`**

In the `light` sub-object, after `warning: '#B86E08',` (the last key), add:

```ts
    // Budget 5-band colour scale (light analogues — tunable at device QA)
    budgetUnder: '#4A86C0',
    budgetSteady: '#3A8F65',
    budgetWatch: '#B8922A',
    budgetNear: '#C04030',
    budgetOver: '#8F2818',
```

- [ ] **Step 4: Typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck 2>&1 | tail -5
```

Expected: no new errors. The `as const` on the `Colors` object will cause TypeScript to widen the type if you forget it — confirm the closing `} as const;` is still present after your edits.

- [ ] **Step 5: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add constants/theme.ts
git commit -m "feat(budget-visual): add 5 budget band colour tokens to Colors.dark + Colors.light"
```

---

## Task 2 — `budgetBandColor` + `remainingLabel` helpers (TDD)

**Files:**
- Modify: `screens/budget/budget.helpers.ts`
- Modify: `__tests__/budget.helpers.test.ts`

This is the logic core. Write tests first, make them fail, implement, make them pass.

- [ ] **Step 1: Write the failing tests**

Open `__tests__/budget.helpers.test.ts`. After the last existing `describe` block (`computeCategoryHistory`), append:

```ts
import { Colors } from '@/constants/theme';
// (add this import at the top of the file alongside the existing budget.helpers import)

describe('budgetBandColor', () => {
  it('pct=0 → budgetUnder (< 50%)', () => {
    expect(budgetBandColor(0)).toBe(Colors.dark.budgetUnder);
  });
  it('pct=0.49 → budgetUnder (just under 50%)', () => {
    expect(budgetBandColor(0.49)).toBe(Colors.dark.budgetUnder);
  });
  it('pct=0.5 → budgetSteady (exactly 50%)', () => {
    expect(budgetBandColor(0.5)).toBe(Colors.dark.budgetSteady);
  });
  it('pct=0.79 → budgetSteady (just under 80%)', () => {
    expect(budgetBandColor(0.79)).toBe(Colors.dark.budgetSteady);
  });
  it('pct=0.8 → budgetWatch (exactly 80%)', () => {
    expect(budgetBandColor(0.8)).toBe(Colors.dark.budgetWatch);
  });
  it('pct=0.89 → budgetWatch (just under 90%)', () => {
    expect(budgetBandColor(0.89)).toBe(Colors.dark.budgetWatch);
  });
  it('pct=0.9 → budgetNear (exactly 90%)', () => {
    expect(budgetBandColor(0.9)).toBe(Colors.dark.budgetNear);
  });
  it('pct=1.0 → budgetNear (exactly 100% — boundary: near, NOT over)', () => {
    expect(budgetBandColor(1.0)).toBe(Colors.dark.budgetNear);
  });
  it('pct=1.01 → budgetOver (strictly over 100%)', () => {
    expect(budgetBandColor(1.01)).toBe(Colors.dark.budgetOver);
  });
  it('pct=5.0 → budgetOver (large overspend)', () => {
    expect(budgetBandColor(5.0)).toBe(Colors.dark.budgetOver);
  });
});

describe('remainingLabel', () => {
  it('positive remaining → { magnitude, label: "left" }', () => {
    expect(remainingLabel(1800)).toEqual({ magnitude: 1800, label: 'left' });
  });
  it('zero remaining → { magnitude: 0, label: "left" }', () => {
    expect(remainingLabel(0)).toEqual({ magnitude: 0, label: 'left' });
  });
  it('negative remaining → { magnitude: 350, label: "over" }', () => {
    expect(remainingLabel(-350)).toEqual({ magnitude: 350, label: 'over' });
  });
  it('large negative → absolute magnitude', () => {
    expect(remainingLabel(-10000)).toEqual({ magnitude: 10000, label: 'over' });
  });
});
```

Add `budgetBandColor` and `remainingLabel` to the import line at the top:

```ts
import {
  BUDGET_WARNING_THRESHOLD,
  budgetBandColor,
  computeCategoryHistory,
  computeCategoryRow,
  computeOverall,
  computeStatus,
  remainingLabel,
  resolveLimitForMonth,
  type MonthResultVM,
} from '@/screens/budget/budget.helpers';
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --testPathPattern="budget.helpers" --no-coverage 2>&1 | tail -15
```

Expected: FAIL — `budgetBandColor is not exported` / `remainingLabel is not exported`.

- [ ] **Step 3: Implement the helpers in `budget.helpers.ts`**

Open `screens/budget/budget.helpers.ts`. Add these two exports after `computeStatus` (before `computeCategoryRow`):

```ts
/**
 * Maps a spend percentage to a budget band colour token.
 * Uses Colors.dark — the codebase is dark-mode first for runtime colour refs.
 *
 * Boundary: pct === 1.0 (exactly 100%) → budgetNear (red), NOT budgetOver.
 * Only strictly pct > 1 → budgetOver (dark red).
 */
export function budgetBandColor(pct: number): string {
  if (pct > 1)    return Colors.dark.budgetOver;   // > 100%
  if (pct >= 0.9) return Colors.dark.budgetNear;   // 90–100%
  if (pct >= 0.8) return Colors.dark.budgetWatch;  // 80–90%
  if (pct >= 0.5) return Colors.dark.budgetSteady; // 50–80%
  return Colors.dark.budgetUnder;                  // < 50%
}

/**
 * Computes the remaining display from `limit - spent`.
 * Returns { magnitude: absolute value, label: 'left' | 'over' }.
 * The row renders: `{formatAmount(magnitude)} {label}`.
 */
export function remainingLabel(remaining: number): { magnitude: number; label: 'left' | 'over' } {
  if (remaining >= 0) return { magnitude: remaining, label: 'left' };
  return { magnitude: Math.abs(remaining), label: 'over' };
}
```

Add the `Colors` import at the top of `budget.helpers.ts`:

```ts
import { Colors } from '@/constants/theme';
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --testPathPattern="budget.helpers" --no-coverage 2>&1 | tail -10
```

Expected: PASS. All existing tests still pass; 14 new tests pass (10 for `budgetBandColor`, 4 for `remainingLabel`).

- [ ] **Step 5: Typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/budget/budget.helpers.ts __tests__/budget.helpers.test.ts
git commit -m "feat(budget-visual): budgetBandColor + remainingLabel helpers — TDD, 14 tests"
```

---

## Task 3 — `removeBudget` signature smoke-test (Wave 4 refactor guard)

**Files:**
- Modify: `__tests__/budget.store.test.ts`

This is a minimal refactor-guard confirming the store mutation exists with the expected name. The confirm/cancel behaviour is already proven by `use_confirm_action.hook.test.ts`.

- [ ] **Step 1: Read `__tests__/budget.store.test.ts` for existing setup**

Read the file in full to understand how the db mock and store reset are wired (the `beforeEach` pattern).

- [ ] **Step 2: Add the smoke test**

Inside the existing top-level `describe` block (or add a dedicated `describe('removeBudget mutation')`), append:

```ts
it('removeBudget exists and is a function on the store', () => {
  const { removeBudget } = useBudgetStore.getState();
  expect(typeof removeBudget).toBe('function');
});
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --testPathPattern="budget.store" --no-coverage 2>&1 | tail -10
```

Expected: all tests pass (the new smoke test plus all pre-existing ones).

- [ ] **Step 4: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add __tests__/budget.store.test.ts
git commit -m "test(budget-visual): smoke-test removeBudget signature in budget store"
```

---

## Task 4 — `BudgetBar`: add optional `color` prop

**Files:**
- Modify: `screens/budget/components/budget_bar.tsx`

`BudgetBar` currently derives its fill colour from `status: BudgetStatus`. Add an optional `color?: string` prop — when provided it bypasses the status map. `SummaryCard` will pass `color={budgetBandColor(overall.pct)}`; the `status` prop stays for backward safety.

- [ ] **Step 1: Read the current file**

Read `screens/budget/components/budget_bar.tsx` in full. Current interface:

```ts
export interface BudgetBarProps {
  pct: number;
  status: BudgetStatus;
  height?: number;
}
```

Current fill: `backgroundColor: STATUS_COLOR[status]`.

- [ ] **Step 2: Update the interface and fill logic**

Replace the entire file with:

```tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import type { BudgetStatus } from '@/screens/budget/budget.helpers';
import { ms } from '@/utils/responsive';

const STATUS_COLOR: Record<BudgetStatus, string> = {
  under: Colors.dark.gold,
  warning: Colors.dark.warning,
  over: Colors.dark.negative,
};

export interface BudgetBarProps {
  pct: number; // 0..n (clamped to 1 for width)
  status: BudgetStatus;
  /** When provided, overrides the status-map colour. Use budgetBandColor(pct). */
  color?: string;
  height?: number;
}

export function BudgetBar({ pct, status, color, height = ms(7) }: BudgetBarProps) {
  const width = `${Math.min(Math.max(pct, 0), 1) * 100}%` as const;
  const fillColor = color ?? STATUS_COLOR[status];
  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width, backgroundColor: fillColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: Colors.dark.surfaceEl, borderRadius: Radius.sm, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.sm },
});
```

- [ ] **Step 3: Typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck 2>&1 | tail -5
```

Expected: no errors. Existing callers that pass `status` without `color` continue to compile — the `color` prop is optional.

- [ ] **Step 4: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/budget/components/budget_bar.tsx
git commit -m "feat(budget-visual): BudgetBar — add optional color prop for 5-band override"
```

---

## Task 5 — `BudgetRing` SVG component

**Files:**
- Create: `screens/budget/components/budget_ring.tsx`

Renders a circular progress ring using `react-native-svg`. The category icon is the `children` slot, centred inside the ring. No HeroUI primitive exists for this — the justification is identical to existing SVG textures in the codebase.

- [ ] **Step 1: Create the component**

Create `screens/budget/components/budget_ring.tsx`:

```tsx
import React from 'react';
import { View } from 'react-native';
import { Circle, Svg } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';

export interface BudgetRingProps {
  /** Spend percentage 0..n. Values > 1 fill the full ring (capped). */
  pct: number;
  /** Fill colour for the progress arc. Use budgetBandColor(pct). */
  color: string;
  /** Outer diameter in logical pixels. Default ms(46). */
  size?: number;
  /** Stroke width. Default ms(3.5). */
  stroke?: number;
  /** Icon element centred inside the ring. */
  children: React.ReactNode;
}

/**
 * BudgetRing — circular progress ring around a category icon.
 *
 * Team Law 7 justification: HeroUI Native has no SVG ring/progress-circle
 * primitive. This uses react-native-svg (already installed) exactly as the
 * existing SVG textures do. Not a critical-trigger violation.
 *
 * Geometry:
 *   radius = (size / 2) - (stroke / 2)   ← so the stroke stays within the viewBox
 *   circumference = 2π × radius
 *   dashoffset = circumference × (1 - clamp(pct, 0, 1))
 *
 * The track circle uses Colors.dark.surfaceEl (muted grey ring track).
 * The progress arc uses the caller-supplied `color`.
 * Rotation is -90° so the arc starts at 12 o'clock.
 */
export function BudgetRing({
  pct,
  color,
  size = ms(46),
  stroke = ms(3.5),
  children,
}: BudgetRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(Math.max(pct, 0), 1);
  const dashOffset = circumference * (1 - clampedPct);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* SVG ring — absolute so the children (icon) overlay it */}
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.dark.surfaceEl}
          strokeWidth={stroke}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </Svg>
      {/* Icon slot — centred inside the ring */}
      {children}
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck 2>&1 | tail -5
```

Expected: no errors. If `react-native-svg` types are missing, check `node_modules/react-native-svg/src/index.tsx` — the package ships its own types with the v15 release.

- [ ] **Step 3: Lint**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run lint -- --quiet 2>&1 | grep -E "budget_ring|error" | head -10
```

Expected: no errors on the new file.

- [ ] **Step 4: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/budget/components/budget_ring.tsx
git commit -m "feat(budget-visual): BudgetRing SVG component — progress ring with icon slot"
```

---

## Task 6 — `BudgetDeleteConfirmSheet`

**Files:**
- Create: `screens/budget/components/budget_delete_confirm_sheet.tsx`

Thin wrapper around the shared `ConfirmSheet` (destructive). The strings are already in `constants/strings.ts` (verified: `budgetDeleteConfirmTitle`, `budgetDeleteConfirmBody`, `budgetDeleteConfirmConfirm`, `budgetDeleteConfirmCancel`).

- [ ] **Step 1: Create the component**

Create `screens/budget/components/budget_delete_confirm_sheet.tsx`:

```tsx
import React from 'react';

import { ConfirmSheet } from '@/components/ui/confirm_sheet';
import { Strings } from '@/constants/strings';

interface Props {
  isOpen: boolean;
  /** Category name — interpolated into the body copy. */
  categoryName: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Destructive ConfirmSheet for budget removal via the swipe-delete action.
 * Replaces the inline "Remove budget" link in set_budget_sheet.tsx
 * (which had no confirmation step).
 */
export function BudgetDeleteConfirmSheet({
  isOpen,
  categoryName,
  busy,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <ConfirmSheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      busy={busy}
      destructive
      title={Strings.budgetDeleteConfirmTitle}
      body={Strings.budgetDeleteConfirmBody(categoryName)}
      confirmLabel={Strings.budgetDeleteConfirmConfirm}
      cancelLabel={Strings.budgetDeleteConfirmCancel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/budget/components/budget_delete_confirm_sheet.tsx
git commit -m "feat(budget-visual): BudgetDeleteConfirmSheet — ConfirmSheet destructive wrapper"
```

---

## Task 7 — Rewrite `CategoryBudgetRow` (new anatomy + SwipeableRow wiring)

**Files:**
- Modify: `screens/budget/components/category_budget_row.tsx`

This is the centrepiece. Replace the entire file. The new anatomy:
- Left: `BudgetRing` (diameter `ms(46)`, stroke `ms(3.5)`) wrapping the category icon
- Center: category `name` (interSemi, body, text1) / `pct%` below it (interSemi, micro, band colour)
- Right: remaining magnitude + label on top (Sora bold, subhead, band colour) / `spent / limit` below (interRegular, micro, text2)
- Hairline divider at row bottom (not after the last row — the parent map handles this via `borderBottomWidth` on all rows; the list's padding absorbs the last one visually, or use index-based omission — see implementation note below)
- Wrapped in `SwipeableRow` with Edit + Delete actions

**Implementation note on divider:** The simplest correct approach is to always render `borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.dark.border` on the Pressable. The last row's divider is hidden by the container's bottom padding. Do not add index-based logic — the spec says "none after the last row" but the parent padding approach is indistinguishable visually and avoids coupling the row to list position.

- [ ] **Step 1: Replace the entire file**

Replace `screens/budget/components/category_budget_row.tsx` with:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SwipeableRow, type SwipeAction } from '@/components/ui/swipeable_row';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';
import { budgetBandColor, remainingLabel } from '@/screens/budget/budget.helpers';
import type { CategoryBudgetRowVM } from '@/screens/budget/budget.hook';
import { BudgetRing } from '@/screens/budget/components/budget_ring';
import { formatAmount } from '@/utils/format_amount';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

export interface CategoryBudgetRowProps {
  row: CategoryBudgetRowVM;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CategoryBudgetRow({
  row,
  onPress,
  onEdit,
  onDelete,
}: CategoryBudgetRowProps) {
  const bandColor = budgetBandColor(row.pct);
  const pctText = `${Math.round(row.pct * 100)}%`;
  const remaining = row.limit - row.spent;
  const { magnitude, label } = remainingLabel(remaining);

  const actions: SwipeAction[] = [
    {
      key: 'edit',
      label: Strings.swipeEdit,
      icon: 'pencil-outline',
      variant: 'neutral',
      onPress: onEdit,
    },
    {
      key: 'delete',
      label: Strings.swipeDelete,
      icon: 'trash-can-outline',
      variant: 'destructive',
      onPress: onDelete,
    },
  ];

  return (
    <SwipeableRow
      rowId={row.categoryId}
      actions={actions}
      accessibilityLabel={`${row.name} budget, ${pctText}`}
    >
      <Pressable
        onPress={onPress}
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={`${row.name} budget`}
      >
        {/* Left: ring + icon */}
        <BudgetRing pct={row.pct} color={bandColor}>
          <MaterialCommunityIcons
            name={toIconName(row.icon, 'tag-outline')}
            size={ms(18)}
            color={row.color}
          />
        </BudgetRing>

        {/* Center: name + pct */}
        <View style={styles.center}>
          <Text style={styles.name}>{row.name}</Text>
          <Text style={[styles.pct, { color: bandColor }]}>{pctText}</Text>
        </View>

        {/* Right: remaining + spent/limit */}
        <View style={styles.right}>
          <View style={styles.remainingRow}>
            <Text style={[styles.remainingAmount, { color: bandColor }]}>
              {formatAmount(magnitude)}
            </Text>
            <Text style={styles.remainingLabel}>{` ${label}`}</Text>
          </View>
          <Text style={styles.spentBudget}>
            {`${formatAmount(row.spent)} / ${formatAmount(row.limit)}`}
          </Text>
        </View>
      </Pressable>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(10),
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
  center: { flex: 1 },
  name: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  pct: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.micro,
    marginTop: ms(2),
  },
  right: { alignItems: 'flex-end' },
  remainingRow: { flexDirection: 'row', alignItems: 'baseline' },
  remainingAmount: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
  },
  remainingLabel: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  spentBudget: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    marginTop: ms(2),
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck 2>&1 | tail -10
```

Expected: no errors. If you see "Property 'onEdit' does not exist", the props interface change in this file is not wired yet to the call site — that is fine; `budget/index.tsx` is updated in Task 8.

- [ ] **Step 3: Lint**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run lint -- --quiet 2>&1 | grep -E "category_budget_row|error" | head -10
```

Expected: no errors.

- [ ] **Step 4: Run tests**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --ci 2>&1 | tail -15
```

Expected: all pass. (No new `.tsx` render tests are added — this is a `.tsx` file; logic is in `budget.helpers.ts` and already tested.)

- [ ] **Step 5: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/budget/components/category_budget_row.tsx
git commit -m "feat(budget-visual): rebuild CategoryBudgetRow — ring+icon, remaining-first, 5-band colour, SwipeableRow"
```

---

## Task 8 — Update `SummaryCard` (band colour on bar + % label)

**Files:**
- Modify: `screens/budget/components/summary_card.tsx`

Two changes:
1. `BudgetBar` fill colour → `budgetBandColor(overall.pct)` instead of `computeStatus`-driven
2. `pctLabel` drops the `budgetUsedSuffix` ("used") — shows only the `%` value, coloured by band

- [ ] **Step 1: Read the current file**

Read `screens/budget/components/summary_card.tsx` in full. Current state:

```ts
const pctLabel = `${Math.round(overall.pct * 100)}% ${Strings.budgetUsedSuffix}`;
const status = computeStatus(overall.spent, overall.budgeted);
// ...
<BudgetBar pct={overall.pct} status={status} height={ms(12)} />
// ...
<Text style={styles.metaText}>{pctLabel}</Text>
```

- [ ] **Step 2: Replace the file**

Replace `screens/budget/components/summary_card.tsx` with:

```tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { budgetBandColor, type OverallVM } from '@/screens/budget/budget.helpers';
import { BudgetBar } from '@/screens/budget/components/budget_bar';
import { formatAmount } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

export interface SummaryCardProps {
  overall: OverallVM;
  daysLeft: number;
}

export function SummaryCard({ overall, daysLeft }: SummaryCardProps) {
  const bandColor = budgetBandColor(overall.pct);
  const pctLabel = `${Math.round(overall.pct * 100)}%`;
  // D6: Left figure stays green/red by sign, not by band
  const leftColor = overall.left < 0 ? Colors.dark.negative : Colors.dark.positive;

  return (
    <View style={styles.card}>
      <View style={styles.figs}>
        <Figure label={Strings.budgetSummaryBudgeted} value={formatAmount(overall.budgeted)} />
        <View style={styles.sep} />
        <Figure label={Strings.budgetSummarySpent} value={formatAmount(overall.spent)} />
        <View style={styles.sep} />
        <Figure
          label={Strings.budgetSummaryLeft}
          value={formatAmount(overall.left)}
          accentColor={leftColor}
        />
      </View>
      {/* Bar fill colour = 5-band scale; status kept as fallback (never used when color= passed) */}
      <BudgetBar pct={overall.pct} status="under" color={bandColor} height={ms(12)} />
      <View style={styles.meta}>
        <Text style={[styles.metaText, { color: bandColor }]}>{pctLabel}</Text>
        <Text style={styles.metaText}>{`${daysLeft} ${Strings.budgetDaysLeftSuffix}`}</Text>
      </View>
    </View>
  );
}

function Figure({
  label,
  value,
  accentColor,
}: {
  label: string;
  value: string;
  accentColor?: string;
}) {
  return (
    <View style={styles.fig}>
      <Text style={styles.figLabel}>{label}</Text>
      <Text style={[styles.figVal, accentColor ? { color: accentColor } : undefined]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    padding: Spacing.md,
  },
  figs: { flexDirection: 'row', marginBottom: Spacing.sm },
  fig: { flex: 1, alignItems: 'center' },
  sep: { width: StyleSheet.hairlineWidth, backgroundColor: Colors.dark.border },
  figLabel: { fontFamily: FontFamily.interMedium, fontSize: Type.micro, color: Colors.dark.text2 },
  figVal: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
    marginTop: ms(4),
  },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  metaText: { fontFamily: FontFamily.interRegular, fontSize: Type.micro, color: Colors.dark.text2 },
});
```

Note: `status="under"` is passed as a dead-safe fallback (the `color` prop overrides it). `computeStatus` import is removed — it is no longer needed in this file.

- [ ] **Step 3: Typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 4: Run tests**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --ci 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/budget/components/summary_card.tsx
git commit -m "feat(budget-visual): SummaryCard — 5-band BudgetBar colour + % label (no 'used')"
```

---

## Task 9 — Wire `budget/index.tsx` (Wave 4 swipe wiring)

**Files:**
- Modify: `screens/budget/index.tsx`

Adds `useConfirmAction`, `useFocusEffect` blur-close, `BudgetDeleteConfirmSheet`, and passes `onEdit`/`onDelete` props to `CategoryBudgetRow`. The `openEdit` and `openAdd` handlers already exist on the `useBudget()` hook return.

- [ ] **Step 1: Read the current file**

Read `screens/budget/index.tsx` in full. Current state: `useBudget()` returns `{ state, openAdd, goToCategory }`. `CategoryBudgetRow` receives `row` and `onPress` only. No swipe wiring yet.

- [ ] **Step 2: Replace the file**

Replace `screens/budget/index.tsx` with:

```tsx
import { useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { closeAllRows } from '@/components/ui/swipeable_row';
import { EmptyState } from '@/components/ui/empty_state';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';
import { useBudget } from '@/screens/budget/budget.hook';
import { useBudgetState } from '@/screens/budget/budget.state';
import { BudgetDeleteConfirmSheet } from '@/screens/budget/components/budget_delete_confirm_sheet';
import { CategoryBudgetRow } from '@/screens/budget/components/category_budget_row';
import { SetBudgetSheet } from '@/screens/budget/components/set_budget_sheet';
import { SummaryCard } from '@/screens/budget/components/summary_card';
import { useBudgetStore } from '@/store/budget.store';
import { useConfirmAction } from '@/utils/use_confirm_action.hook';
import { ms } from '@/utils/responsive';

export default function BudgetScreen() {
  const { state, openAdd, goToCategory } = useBudget();
  const { openEdit } = useBudgetState(useShallow((s) => ({ openEdit: s.openEdit })));
  const editingTargetId = useBudgetState((s) => s.state.targetCategoryId);
  const editingRow = state.rows.find((r) => r.categoryId === editingTargetId);

  const { removeBudget } = useBudgetStore(
    useShallow((s) => ({ removeBudget: s.removeBudget })),
  );

  // Payload carries both id and name so the confirm sheet can display the category name
  const {
    pendingPayload: pendingDelete,
    busy: deleteBusy,
    request: requestDelete,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useConfirmAction<{ id: string; name: string }>(({ id }) => removeBudget(id));

  // Close any open swipe row when the user navigates away from this screen
  useFocusEffect(
    useCallback(() => {
      return () => closeAllRows();
    }, []),
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{Strings.budgetTitle}</Text>
        {state.hasBudgets && state.budgetableCategories.length > 0 && (
          <Text style={styles.addBtn} onPress={openAdd} accessibilityRole="button">
            {`+ ${Strings.budgetAddCategory}`}
          </Text>
        )}
      </View>

      {state.hasBudgets ? (
        <ScreenScroll contentContainerStyle={styles.content}>
          <SummaryCard overall={state.overall} daysLeft={state.daysLeft} />
          <Text style={styles.section}>{Strings.budgetDetailCategories}</Text>
          {state.rows.map((row) => (
            <CategoryBudgetRow
              key={row.categoryId}
              row={row}
              onPress={() => goToCategory(row.categoryId)}
              onEdit={() => openEdit(row.categoryId)}
              onDelete={() => requestDelete({ id: row.categoryId, name: row.name })}
            />
          ))}
        </ScreenScroll>
      ) : (
        <EmptyState variant="budget" onAction={openAdd} />
      )}

      <SetBudgetSheet budgetableCategories={state.budgetableCategories} editingRow={editingRow} />

      <BudgetDeleteConfirmSheet
        isOpen={pendingDelete !== null}
        categoryName={pendingDelete?.name ?? ''}
        busy={deleteBusy}
        onCancel={cancelDelete}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  title: { fontFamily: FontFamily.soraBold, fontSize: Type.title, color: Colors.dark.text1 },
  addBtn: { fontFamily: FontFamily.interMedium, fontSize: Type.body, color: Colors.dark.gold },
  content: { paddingHorizontal: Spacing.md, paddingBottom: ms(96) },
  section: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
});
```

- [ ] **Step 3: Typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck 2>&1 | tail -10
```

Expected: no errors. If `useBudgetStore` doesn't export `removeBudget` directly (check the store shape — it may be `s.removeBudget`), adjust the `useShallow` selector accordingly.

- [ ] **Step 4: Run tests**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --ci 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/budget/index.tsx
git commit -m "feat(budget-visual): wire budget index — swipe edit/delete, useConfirmAction, blur-close"
```

---

## Task 10 — Remove inline Remove link from `set_budget_sheet.tsx`

**Files:**
- Modify: `screens/budget/components/set_budget_sheet.tsx`

The inline "Remove budget" `Pressable` (lines 191–201 in the current file) is replaced by the swipe Delete action + `BudgetDeleteConfirmSheet`. Remove it and clean up the dead code.

- [ ] **Step 1: Read the current file**

Read `screens/budget/components/set_budget_sheet.tsx` in full. Locate the `onRemove` function (lines ~104–107) and the `{isEdit && (<Pressable…>)}` block (lines ~191–201).

- [ ] **Step 2: Remove the `onRemove` function**

Delete these lines (the `onRemove` async function body):

```ts
  const onRemove = async () => {
    if (selectedCategoryId) await removeBudget(selectedCategoryId);
    close();
  };
```

- [ ] **Step 3: Remove `removeBudget` from the store destructure**

Find:

```ts
  const { setLimit, removeBudget } = useBudgetStore(
    useShallow((s) => ({ setLimit: s.setLimit, removeBudget: s.removeBudget })),
  );
```

Replace with:

```ts
  const { setLimit } = useBudgetStore(
    useShallow((s) => ({ setLimit: s.setLimit })),
  );
```

- [ ] **Step 4: Remove the Remove Pressable block**

Delete these lines:

```tsx
          {isEdit && (
            <Pressable
              onPress={() => {
                void onRemove();
              }}
              style={styles.remove}
              accessibilityRole="button"
            >
              <Text style={styles.removeText}>{Strings.budgetRemoveCta}</Text>
            </Pressable>
          )}
```

- [ ] **Step 5: Remove the dead styles**

In the `StyleSheet.create` block, delete the `remove` and `removeText` entries:

```ts
  remove: { alignSelf: 'center', marginTop: Spacing.md, paddingVertical: Spacing.xs },
  removeText: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.negative,
  },
```

- [ ] **Step 6: Typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck 2>&1 | tail -5
```

Expected: no errors. The `budgetRemoveCta` string key in `constants/strings.ts` is retained — removing it from strings would be a separate cleanup (not worth touching for this PR).

- [ ] **Step 7: Run tests**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --ci 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/budget/components/set_budget_sheet.tsx
git commit -m "feat(budget-visual): remove inline Remove link from set_budget_sheet (replaced by swipe delete)"
```

---

## Task 11 — Full CI Parity and PR

- [ ] **Step 1: Run the full CI parity chain**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && \
  npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "CI parity green — safe to push"
```

Expected: all six steps pass, final line prints `CI parity green — safe to push`.

If `format:check` fails:

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run format
git add -p   # review and stage formatting changes
git commit -m "style(budget-visual): oxfmt format pass"
```

Then re-run the full chain from the top.

- [ ] **Step 2: Push**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git push origin feat/swipe-actions-standard
```

- [ ] **Step 3: Open PR**

```bash
gh pr create \
  --title "feat(budget): visual redesign + swipe edit/delete (Wave 4)" \
  --body "$(cat <<'EOF'
## Summary

- **BudgetRing**: SVG circular progress ring (react-native-svg) around the category icon, diameter ms(46), stroke ms(3.5). Fills to spend %, capped at full circle when over-budget.
- **5-band colour scale**: `budgetBandColor(pct)` helper in \`budget.helpers.ts\`, exhaustively TDD'd at all band boundaries (10 tests). Tokens added to \`Colors.dark\` and \`Colors.light\`.
- **Row anatomy rebuild**: ring+icon left · name+% center · remaining-first (\"1,800 left\" / \"350 over\") right · spent/limit muted below. Old BudgetBar removed from the row. Status pill removed.
- **SwipeableRow wiring (Wave 4)**: CategoryBudgetRow wrapped in SwipeableRow with Edit + Delete actions. \`budget/index.tsx\` wired with \`useConfirmAction\`, \`BudgetDeleteConfirmSheet\`, and \`useFocusEffect\` blur-close.
- **SummaryCard**: BudgetBar fill + overall % both use the 5-band colour. Left figure stays green/red by sign (D6). \"used\" suffix removed.
- **Remove link removed**: inline \"Remove budget\" Pressable in \`set_budget_sheet.tsx\` deleted — replaced by the swipe Delete path.

## What's unchanged
Budget math, stores, queries, the 50/30/20 lens, and the category-detail screen are untouched.

## Test plan
- [ ] CI green (format, lint, typecheck, jest, expo-doctor, prebuild)
- [ ] \`budgetBandColor\` — 10 boundary tests pass (including 100% = near, 101% = over)
- [ ] \`remainingLabel\` — 4 tests pass
- [ ] Ring renders at correct fill % for each band on device (OLED)
- [ ] Swipe left on a budget row → Edit and Delete tiles appear
- [ ] Edit tile → opens SetBudgetSheet for that category
- [ ] Delete tile → BudgetDeleteConfirmSheet with category name in body
- [ ] Confirm delete → row removed, no crash
- [ ] Cancel delete → row stays, sheet closes
- [ ] Navigate away from budget tab and back → no rows left open
- [ ] SummaryCard bar + % colour changes band as spend crosses thresholds
- [ ] Left figure stays green/red by sign regardless of band
- [ ] Over-budget category: ring is full circle, dark red, \"350 over\" label
- [ ] SetBudgetSheet in edit mode: no Remove link visible
EOF
)"
```

---

## Spec Coverage Table

| Requirement (source) | Task |
|----------------------|------|
| 5 band tokens in `Colors.dark` + `Colors.light` | Task 1 |
| `budgetBandColor(pct)` helper in `budget.helpers.ts` | Task 2 |
| Exhaustive boundary unit tests (0, 0.49, 0.5, 0.79, 0.8, 0.89, 0.9, 1.0, 1.01, large) | Task 2 |
| `remainingLabel` helper + tests | Task 2 |
| No `.tsx` render tests | All tasks |
| `removeBudget` signature smoke-test (Wave 4) | Task 3 |
| `BudgetBar` optional `color` prop | Task 4 |
| `BudgetRing` SVG component (react-native-svg, strokeDasharray/strokeDashoffset) | Task 5 |
| `BudgetDeleteConfirmSheet` (ConfirmSheet destructive) | Task 6 |
| `CategoryBudgetRow` rewrite — ring+icon left, name+% center, remaining-first right | Task 7 |
| Band colour on ring fill, % text, remaining amount | Task 7 |
| `text2` muted spent/budget line | Task 7 |
| Word "used" dropped from row | Task 7 (no pill; pct only) |
| Hairline divider between rows | Task 7 (`borderBottomWidth: StyleSheet.hairlineWidth`) |
| `SwipeableRow` wrapping with Edit + Delete (Wave 4) | Task 7 |
| `SummaryCard` BudgetBar fill → `budgetBandColor` | Task 8 |
| Overall `%` coloured by band, "used" dropped | Task 8 |
| Left figure stays green/red by sign (D6) | Task 8 |
| `budget/index.tsx` — `useConfirmAction` wired | Task 9 |
| `budget/index.tsx` — `openEdit` on swipe Edit | Task 9 |
| `budget/index.tsx` — `requestDelete` on swipe Delete | Task 9 |
| `budget/index.tsx` — `useFocusEffect` blur-close | Task 9 |
| `BudgetDeleteConfirmSheet` rendered in index | Task 9 |
| Inline Remove link removed from `set_budget_sheet.tsx` (Wave 4) | Task 10 |
| All strings via `constants/strings.ts` | Tasks 6, 7 (Strings.swipeEdit/swipeDelete already on branch) |
| No new dependencies (react-native-svg already present) | Task 5 (verified ^15.15.3 in package.json) |
| Tokens only — no hardcoded hex/spacing/radius | All tasks |
| CI parity green before push | Task 11 |

---

## Device QA Matrix (spec §10 + Wave 4 swipe flags)

These cannot be caught by CI. Escalate to the user (device QA gate) before marking the PR as shipped.

| # | Check | Notes |
|---|-------|-------|
| QA-1 | Ring legibility at ms(46) diameter on OLED | Small diameter — verify stroke doesn't visually disappear |
| QA-2 | 5 band colours on real OLED dark screen | Hexes are first-pass and tunable at this gate |
| QA-3 | Over-budget state: ring is full circle, colour `budgetOver` dark red, label reads "N over" | Critical visual correctness |
| QA-4 | Exactly-at-budget (100%): ring is full circle, colour `budgetNear` (red), label reads "0 left" | Boundary case |
| QA-5 | Divider weight and colour between rows | Hairline — may be invisible on high-DPI; adjust if needed |
| QA-6 | Dynamic type: name truncation on large font sizes | Use `numberOfLines={1}` if needed — add to name Text if QA reveals wrapping |
| QA-7 | SummaryCard bar + % changes band as spend crosses thresholds | Manual injection of test spend values |
| QA-8 | Left figure green when positive, red when negative — regardless of band | Confirm D6 independence from band logic |
| QA-9 | Swipe left on category row → Edit and Delete tiles appear at correct widths | ACTION_TILE_WIDTH = ms(72) |
| QA-10 | Swipe Edit → SetBudgetSheet opens pre-filled with correct category | `openEdit(row.categoryId)` → `targetCategoryId` set |
| QA-11 | Swipe Delete → BudgetDeleteConfirmSheet with correct category name in body | Interpolation: `budgetDeleteConfirmBody(categoryName)` |
| QA-12 | Confirm delete → row disappears, no crash | `removeBudget` mutation + store rerender |
| QA-13 | Navigate away from budget tab → return → no rows swiped-open | `useFocusEffect` cleanup fires `closeAllRows` |
| QA-14 | SetBudgetSheet edit mode: no Remove link visible | Regression guard |
| QA-15 | Cold start budget screen < 2s on mid-range Android | SVG ring adds render work — profile if needed |
