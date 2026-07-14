# Spending Plan Review Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the spending-plan data-integrity, stale-state, loading-error, date-validation, and skeleton-layout findings from the final PR review.

**Architecture:** Keep spending-plan invariants at repository/database boundaries, expose recoverable errors through the existing Zustand screen-state pattern, and let save success explicitly refresh the independently owned detail store. Presentation fixes continue to compose HeroUI Native primitives with Uniwind classes and preserve the user’s current uncommitted detail-card work.

**Tech Stack:** Expo, TypeScript, expo-sqlite, Zustand, Zod, HeroUI Native, Uniwind, Jest.

---

### Task 1: Preserve plans during category deletion and reassignment

**Files:**
- Modify: `src/modules/categories/repositories/category.repository.ts`
- Modify: `src/modules/budget/database/spending_plan_categories.ts`
- Test: `__tests__/repositories/category_repository.test.ts`

- [ ] Add failing repository tests for deleting a sole plan category, merging allocations within one plan, and rejecting reassignment that would create an overlapping category.
- [ ] Run the focused repository tests and confirm each fails for the reviewed reason.
- [ ] Add plan-assignment inspection, allocation merging, orphan-plan cleanup, and overlap validation inside the existing category transaction.
- [ ] Run the focused repository and spending-plan query tests until green.

### Task 2: Refresh and protect detail-screen state

**Files:**
- Modify: `src/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.hook.ts`
- Modify: `src/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.hook.ts`
- Modify: `src/modules/budget/screens/budget/spending_plan_sheet/index.tsx`
- Test: `__tests__/screens/budget/spending_plan_detail_hook.test.ts`
- Test: `__tests__/screens/budget/spending_plan_sheet_hook.test.ts`

- [ ] Add failing tests for save-success refresh and out-of-order detail loads.
- [ ] Confirm the tests fail before implementation.
- [ ] Add an optional save callback and a latest-request guard following the Budget store’s existing request-ownership pattern.
- [ ] Run both focused hook suites until green.

### Task 3: Add recoverable Budget loading errors

**Files:**
- Modify: `src/modules/budget/store/budget.store.ts`
- Modify: `src/modules/budget/screens/budget/budget.state.ts`
- Modify: `src/modules/budget/screens/budget/budget.hook.ts`
- Modify: `src/modules/budget/screens/budget/index.tsx`
- Test: `__tests__/budget.store.test.ts`
- Test: `__tests__/screens/budget/budget_hook.test.ts`

- [ ] Add failing tests for first-load rejection, stale failed requests, and retry recovery.
- [ ] Confirm the focused tests fail.
- [ ] Store a load-error state without discarding previously loaded data and expose retry through the screen hook/UI.
- [ ] Run focused Budget tests until green.

### Task 4: Validate strict calendar dates

**Files:**
- Modify: `src/utils/schemas/budget.schema.ts`
- Test: `__tests__/schemas/budget_schema.test.ts`

- [ ] Add failing cases for malformed, non-padded, and impossible dates.
- [ ] Add strict `YYYY-MM-DD` calendar validation before range comparison.
- [ ] Run schema and spending-plan helper tests until green.

### Task 5: Match skeletons to loaded UI

**Files:**
- Modify: `src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx`
- Modify: `src/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_skeleton.tsx`
- Modify: `__tests__/screens/budget/spending_plan_styling_architecture.test.ts`

- [ ] Add failing architecture assertions for summary status geometry, card footer actions, HeroUI/Uniwind styling, and conditional detail-card height.
- [ ] Replace the plan skeleton’s parallel StyleSheet geometry with HeroUI/Uniwind structures matching the loaded summary and card.
- [ ] Use a stable one-insight detail placeholder so loading does not exceed the common loaded-card height.
- [ ] Run the styling architecture tests until green.

### Task 6: Full verification

**Files:**
- Verify all modified files.

- [ ] Run format check, lint, typecheck, all Jest tests, Expo Doctor, and Android prebuild dry-run.
- [ ] Review the final diff for unrelated changes and confirm the user’s existing detail-card edits remain intact.
