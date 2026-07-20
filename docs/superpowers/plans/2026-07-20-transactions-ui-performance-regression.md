# Transactions UI Performance Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore responsive tab transitions and list scrolling without changing transaction data, financial totals, refresh behavior, or scroll restoration.

**Architecture:** Keep scroll position hot-path data in a hook ref and persist it to the existing Zustand UI state only when a drag/momentum gesture ends or the screen blurs. Schedule focus-triggered revalidation with the shared `runAfterInteractions` helper used by Dashboard and Commitments, while keeping pull-to-refresh immediate.

**Tech Stack:** React Native SectionList, Expo Router focus effects, Zustand, Jest, React Native Testing Library.

---

### Task 1: Lock scroll persistence behavior

**Files:**
- Modify: `__tests__/screens/transactions/transactions_state.test.ts`
- Modify: `__tests__/screens/transactions/transactions_hook.test.ts`
- Modify: `__tests__/screens/transactions.screen.test.tsx`
- Modify: `src/modules/transactions/screens/transactions/transactions.state.ts`
- Modify: `src/modules/transactions/screens/transactions/transactions.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/index.tsx`

- [x] **Step 1: Write failing tests for end-of-gesture persistence**

Assert that `onListScroll` only tracks the latest offset in a ref, `onListScrollEnd` persists the final offset, and writing an unchanged offset does not notify Zustand subscribers.

- [x] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- --runInBand __tests__/screens/transactions/transactions_state.test.ts __tests__/screens/transactions/transactions_hook.test.ts __tests__/screens/transactions.screen.test.tsx`

Expected: FAIL because `onListScrollEnd` does not exist and duplicate offsets currently create a new state snapshot.

- [x] **Step 3: Implement nonreactive scroll tracking**

Add a hook-owned `currentScrollOffsetRef`, expose one `onListScrollEnd` callback, and wire it to both `SectionList.onScrollEndDrag` and `SectionList.onMomentumScrollEnd`. Remove the original high-frequency `onScroll` publication path. Persist the ref during focus cleanup and make `setScrollOffset` return the existing Zustand state when the normalized offset is unchanged. Review remediation restores a throttled `onScroll` handler that updates only the ref so blur can persist an in-flight momentum position without publishing render state.

- [x] **Step 4: Run the focused tests and verify GREEN**

Run the same focused Jest command and expect all tests to pass.

### Task 2: Defer focus revalidation

**Files:**
- Modify: `__tests__/screens/transactions/transactions_hook.test.ts`
- Modify: `src/modules/transactions/screens/transactions/transactions.hook.ts`

- [x] **Step 1: Write failing focus-scheduling tests**

Mock `runAfterInteractions` using the existing Commitments test pattern. Assert that focus revalidation does not call row refresh or totals queries before the interaction task runs, that blur cancels pending work, and that pull-to-refresh remains immediate.

- [x] **Step 2: Run the hook test and verify RED**

Run: `npm test -- --runInBand __tests__/screens/transactions/transactions_hook.test.ts`

Expected: FAIL because focus refresh currently starts synchronously.

- [x] **Step 3: Implement interaction-deferred focus work**

Import `runAfterInteractions`, move visible-snapshot refresh and subsequent-focus totals revalidation into its callback, and cancel the returned task from focus cleanup. Leave the existing `onRefresh` callback unchanged so direct user refresh remains immediate.

- [x] **Step 4: Run the hook test and verify GREEN**

Run the same hook Jest command and expect all tests to pass.

### Task 3: Verify the regression fix

**Files:**
- Verify only.

- [x] **Step 1: Run the Transactions test suite**

Run: `npm test -- --runInBand __tests__/screens/transactions`

Expected: PASS with no warnings or unhandled promises.

- [x] **Step 2: Run static checks**

Run: `npm run format:check && npm run lint && npm run typecheck`

Expected: all commands pass.

- [x] **Step 3: Review the final diff**

Confirm there are no financial calculation changes, no new dependencies, no per-frame Zustand writes, and no synchronous focus-triggered database refresh during tab transition.

### Review Remediation

- [x] Capture focus-time refresh ownership and skip work superseded before interaction settlement.
- [x] Track live list movement in a nonreactive ref while keeping Zustand writes at end/blur boundaries.
- [x] Add race, burst-scroll, and rendered-list wiring regression tests.
- [x] Re-run CI parity before the requested remediation push.
