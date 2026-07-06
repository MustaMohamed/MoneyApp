# Commitments Search Filter Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add compact search and advanced filters to the commitments screen while preserving the existing status rail.

**Architecture:** Commitments owns its filter state and helper logic under `src/modules/commitments/screens/commitments/filter/`. The screen hook composes status filtering, search filtering, and advanced filtering before grouping sections. UI reuses existing HeroUI-backed sheet, buttons, accordions, pills, and the compact SearchRow styling pattern from transactions.

**Tech Stack:** Expo React Native, TypeScript, Zustand, HeroUI Native, Jest with React Native Testing Library.

---

### Task 1: Commitments Advanced Filter Helpers

**Files:**
- Create: `src/modules/commitments/screens/commitments/filter/filter.store.ts`
- Create: `src/modules/commitments/screens/commitments/filter/filter.helpers.ts`
- Test: `__tests__/screens/commitments/filter/filter_helpers.test.ts`

- [ ] Write failing tests for active filter counting, equality, recurrence preset matching, amount filtering, and text search.
- [ ] Implement `CommitmentAdvancedFilters`, `EMPTY_COMMITMENT_FILTERS`, `countActiveCommitmentFilters`, `commitmentFiltersEqual`, `commitmentMatchesAdvancedFilters`, and `commitmentMatchesSearch`.
- [ ] Run `npm test -- --runTestsByPath __tests__/screens/commitments/filter/filter_helpers.test.ts`.
- [ ] Commit with `git commit -m "feat: add commitment filter helpers"`.

### Task 2: Commitments Screen State

**Files:**
- Modify: `src/modules/commitments/screens/commitments/commitments.state.ts`
- Test: `__tests__/screens/commitments.state.test.ts`

- [ ] Write failing tests for `searchQuery`, `appliedFilters`, `setSearchQuery`, `clearSearch`, and `setAppliedFilters`.
- [ ] Extend the Zustand state with those fields/actions while preserving `refreshing` and `statusFilter`.
- [ ] Run `npm test -- --runTestsByPath __tests__/screens/commitments.state.test.ts`.
- [ ] Commit with `git commit -m "feat: add commitment search filter state"`.

### Task 3: Commitments Search Row

**Files:**
- Create: `src/modules/commitments/screens/commitments/components/search_row.tsx`
- Test: `__tests__/screens/commitments/search_row.test.tsx`
- Modify: `src/constants/strings.ts`

- [ ] Write failing tests for compact input/button parity, active badge display, clear padding, and handlers.
- [ ] Implement the commitments SearchRow using the fixed compact sizing from transactions and `Strings.searchCommitmentsPlaceholder`.
- [ ] Run `npm test -- --runTestsByPath __tests__/screens/commitments/search_row.test.tsx`.
- [ ] Commit with `git commit -m "feat: add commitment search row"`.

### Task 4: Commitments Filter Sheet

**Files:**
- Create: `src/modules/commitments/screens/commitments/filter/filter.state.ts`
- Create: `src/modules/commitments/screens/commitments/filter/filter.hook.ts`
- Create: `src/modules/commitments/screens/commitments/filter/index.tsx`
- Create: `src/modules/commitments/screens/commitments/filter/components/account_accordion.tsx`
- Create: `src/modules/commitments/screens/commitments/filter/components/category_accordion.tsx`
- Create: `src/modules/commitments/screens/commitments/filter/components/amount_accordion.tsx`
- Create: `src/modules/commitments/screens/commitments/filter/components/amount_type_accordion.tsx`
- Create: `src/modules/commitments/screens/commitments/filter/components/recurrence_accordion.tsx`
- Test: `__tests__/screens/commitments/filter/filter_hook.test.ts`
- Test: `__tests__/screens/commitments/filter/filter_sheet.test.tsx`

- [ ] Write failing hook tests for opening with applied filters, `canApply`, reset-then-apply, and extra filter toggles.
- [ ] Write failing sheet tests for the five accordion sections and equal-width Reset/Apply footer.
- [ ] Implement the sheet with HeroUI `Accordion`, shared `Sheet`, `Button`, and selectable pills.
- [ ] Run the two filter tests.
- [ ] Commit with `git commit -m "feat: add commitment advanced filter sheet"`.

### Task 5: Wire Commitments Screen and Hook

**Files:**
- Modify: `src/modules/commitments/screens/commitments/commitments.hook.ts`
- Modify: `src/modules/commitments/screens/commitments/index.tsx`
- Test: `__tests__/screens/commitments.hook.test.ts`
- Test: `__tests__/screens/commitments.screen.test.tsx`

- [ ] Write failing hook tests proving search and advanced filters combine with the existing status filter.
- [ ] Write failing screen tests proving SearchRow and FilterSheet are rendered and wired.
- [ ] Update the hook to read accounts/categories, search query, applied filters, and return filter actions/counts.
- [ ] Update the screen to render SearchRow below SummaryHeader and mount FilterSheet.
- [ ] Run commitments hook/screen tests plus filter/search tests.
- [ ] Commit with `git commit -m "feat: wire commitment search filters"`.

### Task 6: Verification

**Files:**
- No new files.

- [ ] Run focused commitments tests.
- [ ] Run `npm run format:check`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test -- --ci`.
- [ ] Run `npx --yes expo-doctor`.
- [ ] Run `npx expo prebuild --no-install --platform android`.
