# Rendering Performance Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce avoidable React Native rendering work, duplicate SQLite loads, stale async repainting, and transition cost found in the performance review.

**Architecture:** Keep the existing Expo Router, Zustand, HeroUI Native, and module structure. Optimize by moving data loads closer to screen ownership, narrowing Zustand selectors, stabilizing virtualized-list render inputs, and adding request guards where asynchronous fetches can complete out of order.

**Tech Stack:** Expo Router v3, React Native, Zustand v5, expo-sqlite, HeroUI Native, Reanimated, Jest.

---

### Task 1: Defer Transaction List Loading Until Transactions Focus

**Files:**
- Modify: `app/(app)/_layout.tsx`
- Modify: `modules/transactions/screens/transactions/transactions.hook.ts`
- Test: `__tests__/app_layout_loading.test.ts`
- Test: `__tests__/screens/transactions/transactions_hook.test.ts`

- [ ] **Step 1: Write failing tests**

Add coverage that `AppLayout` calls account/category/currency loaders but does not call `setTransactionQuery({})`, and that `useTransactions()` triggers `setQuery` when focused.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- __tests__/app_layout_loading.test.ts __tests__/screens/transactions/transactions_hook.test.ts --runInBand
```

Expected: app layout test fails because the current layout still invokes `setTransactionQuery({})`.

- [ ] **Step 3: Implement**

Remove the transaction store import and `setTransactionQuery({})` call from `app/(app)/_layout.tsx`. In `useTransactions`, keep the existing query effect as the screen-owned load path.

- [ ] **Step 4: Verify GREEN**

Run the same focused test command and confirm both tests pass.

### Task 2: Narrow Hot Zustand Selectors

**Files:**
- Modify: `modules/dashboard/screens/dashboard/dashboard.hook.ts`
- Modify: `modules/transactions/screens/transactions/transactions.hook.ts`
- Modify: `modules/commitments/screens/commitments/commitments.hook.ts`
- Modify: `modules/transactions/screens/transactions/transaction_form/add_transaction.hook.ts`
- Modify: `modules/transactions/screens/transactions/transaction_form/edit_transaction.hook.ts`
- Modify: `modules/commitments/screens/commitments/detail/detail.hook.ts`

- [ ] **Step 1: Replace whole-state selections**

For high-churn hooks, select only the fields consumed by the hook. For example, select `transactions`, `loading`, `hasLoaded`, `hasMore`, and `refresh` instead of `state: s.state`.

- [ ] **Step 2: Preserve hook output**

Keep returned hook shapes unchanged so screen components and existing tests remain stable.

- [ ] **Step 3: Verify**

Run:

```bash
npm test -- __tests__/screens/dashboard/dashboard_hook.test.ts __tests__/screens/transactions/transactions_helpers.test.ts __tests__/screens/commitments.state.test.ts __tests__/screens/transactions/transaction_form/add_transaction.hook.test.ts __tests__/screens/transactions/transaction_form/edit_transaction.hook.test.ts __tests__/screens/commitments_detail.hook.test.ts --runInBand
```

Expected: all listed suites pass.

### Task 3: Reduce Duplicate Dashboard and Transactions DB Work

**Files:**
- Modify: `modules/dashboard/screens/dashboard/dashboard.hook.ts`
- Modify: `modules/transactions/screens/transactions/transactions.hook.ts`
- Test: `__tests__/screens/dashboard/dashboard_hook.test.ts`

- [ ] **Step 1: Write failing dashboard test**

Add a test proving the dashboard commitment summary loader is not invoked twice on initial focus.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- __tests__/screens/dashboard/dashboard_hook.test.ts --runInBand
```

Expected: test fails with the current duplicate effect/focus load.

- [ ] **Step 3: Implement**

Remove the redundant dashboard `useEffect` that reloads commitment payments from full commitment state changes. Keep focus load and explicit refresh/mutation-driven reloads. In Transactions, make totals depend on period/filter inputs rather than `transactions` page data.

- [ ] **Step 4: Verify GREEN**

Run the dashboard test plus existing transaction store tests.

### Task 4: Guard Commitment Month Loading Against Stale Results

**Files:**
- Modify: `modules/commitments/store/commitment.store.ts`
- Test: `__tests__/commitment.store.test.ts`

- [ ] **Step 1: Write failing test**

Add a test where `setSelectedMonth('2026-05')` and `setSelectedMonth('2026-06')` overlap; assert the slower May response cannot replace June payments and that `paymentsLoaded` is false while the latest month request is pending.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- __tests__/commitment.store.test.ts --runInBand
```

Expected: stale-result assertion fails before request guarding.

- [ ] **Step 3: Implement**

Add a `paymentRequestId` closure variable in `createCommitmentStore`, clear `paymentsLoaded` when loading a selected month, and ignore stale completions.

- [ ] **Step 4: Verify GREEN**

Run the commitment store test.

### Task 5: Stabilize List Rendering

**Files:**
- Modify: `modules/transactions/screens/transactions/index.tsx`
- Modify: `modules/transactions/screens/transactions/components/transaction_row.tsx`
- Modify: `modules/commitments/screens/commitments/index.tsx`
- Modify: `modules/commitments/screens/commitments/components/commitment_row.tsx`
- Modify: `modules/budget/screens/budget/components/category_budget_row.tsx`
- Modify: `modules/categories/screens/settings/categories/index.tsx`

- [ ] **Step 1: Memoize rows**

Wrap `TransactionRow`, `CommitmentRow`, and `CategoryBudgetRow` in `React.memo`.

- [ ] **Step 2: Stabilize row internals**

Use `useMemo` for `SwipeAction[]` arrays and `useCallback` for action handlers that are passed into `SwipeableRow`.

- [ ] **Step 3: Stabilize list renderers**

Use `useCallback` for `renderItem`, `renderSectionHeader`, and list empty/header components where they currently allocate inline render functions on every parent render.

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- __tests__/screens/transactions/transactions_state.test.ts __tests__/screens/commitments.state.test.ts __tests__/screens/settings_categories.hook.test.ts __tests__/budget.state.test.ts --runInBand
```

Expected: tests pass.

### Task 6: Trim Hot Dashboard Transitions

**Files:**
- Modify: `modules/dashboard/screens/dashboard/index.tsx`
- Modify: `modules/dashboard/screens/dashboard/dashboard.anim.ts`

- [ ] **Step 1: Remove segment remount animation**

Remove `key={segment}`, `FadeIn`, and `FadeOut` from the dashboard segment wrapper so tab changes do not remount and animate the whole content tree.

- [ ] **Step 2: Keep non-hot animations conservative**

Keep the hero entrance if it does not replay on segment switch; do not add new motion.

- [ ] **Step 3: Verify**

Run:

```bash
npm test -- __tests__/screens/dashboard/dashboard_hook.test.ts --runInBand
```

Expected: dashboard tests pass.

### Task 7: Final Verification

**Files:**
- All modified files

- [ ] **Step 1: Format**

Run `npm run format:check`.

- [ ] **Step 2: Lint**

Run `npm run lint`.

- [ ] **Step 3: Typecheck**

Run `npm run typecheck`.

- [ ] **Step 4: Unit tests**

Run `npm test -- --ci`.

- [ ] **Step 5: Commit**

Commit the implementation on `perf-rendering-audit-fixes`.
