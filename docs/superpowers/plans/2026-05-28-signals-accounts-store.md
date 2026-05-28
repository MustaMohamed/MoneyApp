# Signals Accounts Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the canonical accounts data store with Preact Signals while keeping the migration slice small.

**Architecture:** `modules/accounts/store/account.store.ts` owns module-level Signals and exports `useAccounts()`. Migrated consumers read signal refs with `.value` and call flat actions from the hook return. Root `store/account.store.ts` remains a re-export compatibility surface and must not create another store instance.

**Tech Stack:** Expo Router, React Native, TypeScript strict, `@preact/signals-react`, Jest, oxlint/oxfmt.

---

### Task 1: Account Store API

**Files:**
- Modify: `__tests__/account.store.test.ts`
- Modify: `modules/accounts/store/account.store.ts`
- Modify: `store/account.store.ts`

- [ ] Write failing tests that use the Signals API:
  - `store.state.accounts.value`
  - `store.state.hasLoaded.value`
  - direct actions such as `store.loadAccounts()`
- [ ] Verify the tests fail against the Zustand implementation.
- [ ] Replace the Zustand store with module-level Signals and `useAccounts()`.
- [ ] Keep a temporary `useAccountStore` compatibility export only where needed for unmigrated consumers.
- [ ] Run `npm test -- --runTestsByPath __tests__/account.store.test.ts --runInBand`.

### Task 2: Migrated Account Consumers

**Files:**
- Modify: `app/(app)/_layout.tsx`
- Modify: `modules/accounts/screens/accounts/add_account/add_account.hook.ts`
- Modify: `modules/accounts/screens/accounts/detail/account_detail.hook.ts`
- Modify: related account screen tests

- [ ] Update account module consumers to call `useAccounts()`.
- [ ] Read `state.accounts.value` and `state.hasLoaded.value`.
- [ ] Keep non-account UI state stores unchanged.
- [ ] Run account hook tests.

### Task 3: Onboarding Account Consumers

**Files:**
- Modify: `modules/onboarding/screens/onboarding/add_account/add_account.hook.ts`
- Modify: `modules/onboarding/screens/onboarding/more_accounts/more_accounts.hook.ts`
- Modify: `modules/onboarding/screens/onboarding/ready/ready.hook.ts`
- Modify: related onboarding tests

- [ ] Replace account store reads/actions with `useAccounts()`.
- [ ] Keep onboarding Signals store usage unchanged.
- [ ] Run onboarding hook tests.

### Task 4: Verification

- [ ] Run `npm run format:check`.
- [ ] Run `npm run typecheck`.
- [ ] Run focused account/onboarding Jest tests.
- [ ] Review diff for accidental broad migration into dashboard, transactions, or commitments.
- [ ] Commit the branch.

