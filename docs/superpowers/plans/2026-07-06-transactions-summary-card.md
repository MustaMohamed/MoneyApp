# Transactions Summary Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the transactions screen's three compare boxes with one commitments-style summary card.

**Architecture:** Keep `TotalsStrip` as the screen-facing component and preserve its current props. Move summary formatting decisions into pure helpers in `transactions.helpers.ts` so percentage, polarity, and progress behavior are covered by focused tests.

**Tech Stack:** React Native, Expo, TypeScript, HeroUI Native `Card`, MaterialCommunityIcons, existing Tailwind/Uniwind classes.

---

## File Structure

- Modify `src/modules/transactions/screens/transactions/transactions.helpers.ts`
  - Add pure summary helpers for amount labels, comparison deltas, and expense/income rail percent.
- Modify `src/modules/transactions/screens/transactions/components/totals_strip.tsx`
  - Replace the three standalone cells with one HeroUI `Card`.
  - Render compact aligned Income / Expense / Net values.
  - Render a thin red expense-share rail.
  - Render unsigned direction-icon comparison percentages with the visible previous-period caption.
- Modify `__tests__/screens/transactions/transactions_helpers.test.ts`
  - Add failing tests for the new pure helper behavior.

## Task 1: Summary Helper Model

**Files:**
- Modify: `src/modules/transactions/screens/transactions/transactions.helpers.ts`
- Test: `__tests__/screens/transactions/transactions_helpers.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests that expect:

```ts
expect(formatSignedAmount(25000, 'income')).toBe('+25,000');
expect(formatSignedAmount(13000, 'expense')).toBe('-13,000');
expect(formatSignedAmount(12000, 'net')).toBe('+12,000');
expect(formatSignedAmount(-1200, 'net')).toBe('-1,200');
expect(expenseSharePct({ incomeEgp: 25000, expenseEgp: 13000, netEgp: 12000 })).toBe(52);
expect(expenseSharePct({ incomeEgp: 0, expenseEgp: 13000, netEgp: -13000 })).toBe(0);
expect(deltaDisplay('expense', 15)).toEqual({
  direction: 'up',
  label: '15%',
  polarity: 'bad',
});
expect(deltaDisplay('net', -17)).toEqual({
  direction: 'down',
  label: '17%',
  polarity: 'bad',
});
```

- [ ] **Step 2: Run test and confirm red**

Run:

```bash
npm test -- __tests__/screens/transactions/transactions_helpers.test.ts --runInBand
```

Expected: FAIL because `formatSignedAmount`, `expenseSharePct`, and `deltaDisplay` do not exist.

- [ ] **Step 3: Implement helpers**

Add:

```ts
export type DeltaDirection = 'up' | 'down' | 'flat';

export function formatSignedAmount(value: number, metric: TotalsMetric): string {
  const abs = numberFmt.format(Math.abs(value));
  if (metric === 'expense') return `-${abs}`;
  return `${value >= 0 ? '+' : '-'}${abs}`;
}

export function expenseSharePct(current: PeriodTotals): number {
  if (current.incomeEgp <= 0) return 0;
  const raw = Math.round((current.expenseEgp / current.incomeEgp) * 100);
  return Math.max(0, Math.min(100, raw));
}

export function deltaDisplay(metric: TotalsMetric, deltaPct: number | null) {
  if (deltaPct === null) return null;
  return {
    direction: deltaPct > 0 ? 'up' : deltaPct < 0 ? 'down' : 'flat',
    label: `${Math.abs(deltaPct)}%`,
    polarity: polarityColor(metric, deltaPct),
  };
}
```

- [ ] **Step 4: Run test and confirm green**

Run:

```bash
npm test -- __tests__/screens/transactions/transactions_helpers.test.ts --runInBand
```

Expected: PASS.

## Task 2: Render Summary Card

**Files:**
- Modify: `src/modules/transactions/screens/transactions/components/totals_strip.tsx`

- [ ] **Step 1: Replace the three cells with one card**

Use HeroUI `Card` and existing app `Text`.

- [ ] **Step 2: Render the aligned metric columns**

Use a compact three-column row for current values:

```tsx
<MetricRow>
  <MetricText align="left" tone="success" value={incomeLabel} />
  <MetricText align="center" tone="danger" value={expenseLabel} />
  <MetricText align="right" tone="info" value={netLabel} />
</MetricRow>
```

- [ ] **Step 3: Render expense-share progress rail**

Use a red fill width from `expenseSharePct(current)`:

```tsx
<View className="bg-default h-[3px] overflow-hidden rounded-[2px]">
  <View className="bg-danger h-full rounded-full" style={{ width: `${expensePct}%` }} />
</View>
```

- [ ] **Step 4: Render unsigned comparison deltas**

For each metric, render `MaterialCommunityIcons` direction icon plus absolute percentage label. Use polarity class for both icon and text, so expense increases are red.

- [ ] **Step 5: Keep empty previous behavior**

If `previous` is `null`, omit the comparison row and caption while still rendering current values and the expense-share rail.

## Task 3: Verification

**Files:**
- Verify: `__tests__/screens/transactions/transactions_helpers.test.ts`
- Verify: `src/modules/transactions/screens/transactions/components/totals_strip.tsx`

- [ ] **Step 1: Run focused helper tests**

```bash
npm test -- __tests__/screens/transactions/transactions_helpers.test.ts --runInBand
```

- [ ] **Step 2: Run formatter check**

```bash
npm run format:check
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

## Plan Self-Review

- Spec coverage: all approved visual requirements map to Task 1 and Task 2.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: helper names and component responsibilities are consistent across tasks.

## Follow-up Compactness Pass

The approved card was tightened to match the commitments summary card density:

- Outer card uses compact vertical padding and row gaps.
- The outer card uses the same margin/sizing class as the commitments summary card.
- The visible metric-label/header rows are removed.
- The `vs {previousLabel}` caption is visible below the comparison row.
- The progress rail uses the same 3px visual weight as the commitments summary card.

## Follow-up Dashboard Placement

The approved transactions summary was also added to the dashboard overview:

- Dashboard store now keeps current and previous transaction period totals.
- Dashboard hook loads those totals with `getPeriodTotals` for the current and previous month.
- Dashboard overview renders a `TransactionsCard` above `CommitmentsCard`.
- The dashboard card follows the commitments dashboard card shell and opens the transactions tab on press.

## Execution Choice

MoneyApp autonomous team mode applies. Sarah approves this plan on the user's behalf because no critical trigger fired: no new dependency, no data migration, no secure-store/auth/data-loss surface, and no user-facing brand/header copy beyond existing utility labels.
