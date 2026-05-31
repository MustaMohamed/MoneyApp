# Signals Accounts Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the canonical accounts data store with Preact Signals while keeping the migration slice small.

**Architecture:** `modules/accounts/store/account.store.ts` exposes a class-based shared Signals store and exports one singleton through `useAccounts()`. Consumers read signal refs with `.value`, coerce unresolved account data locally when needed, and call flat actions from the hook return. Root `store/account.store.ts` remains a re-export compatibility surface and must not create another store instance.

**Tech Stack:** Expo Router, React Native, TypeScript strict, `@preact/signals-react`, Jest, oxlint/oxfmt.

---

### Task 1: Account Store API

**Files:**
- Modify: `__tests__/account.store.test.ts`
- Modify: `modules/accounts/store/account.store.ts`
- Modify: `store/account.store.ts`

- [x] Write failing tests that use the Signals API:
  - `store.state.accounts.value`
  - unresolved data is represented by `undefined`
  - direct actions such as `store.loadAccounts()`
- [x] Verify the tests fail against the Zustand implementation.
- [x] Replace the Zustand store with `AccountStore`, a class-based shared Signals store, and `useAccounts()`.
- [x] Use `batch(...)` when multiple account signals are updated together.
- [x] Do not keep a Zustand-shaped `useAccountStore` compatibility adapter in this migrated slice.
- [x] Run `npm test -- --runTestsByPath __tests__/account.store.test.ts --runInBand`.

### Task 2: Migrated Account Consumers

**Files:**
- Modify: `app/(app)/_layout.tsx`
- Modify: `modules/accounts/screens/accounts/add_account/add_account.hook.ts`
- Modify: `modules/accounts/screens/accounts/detail/account_detail.hook.ts`
- Modify: related account screen tests

- [x] Update account module consumers to call `useAccounts()`.
- [x] Read `state.accounts.value` and derive any screen readiness locally.
- [x] Keep non-account UI state stores unchanged.
- [x] Run account hook tests.

### Task 3: Onboarding Account Consumers

**Files:**
- Modify: `modules/onboarding/screens/onboarding/add_account/add_account.hook.ts`
- Modify: `modules/onboarding/screens/onboarding/more_accounts/more_accounts.hook.ts`
- Modify: `modules/onboarding/screens/onboarding/ready/ready.hook.ts`
- Modify: related onboarding tests

- [x] Replace account store reads/actions with `useAccounts()`.
- [x] Keep onboarding Signals store usage unchanged.
- [x] Run onboarding hook tests.

### Task 4: Verification

- [x] Run `npm run format:check`.
- [x] Run `npm run typecheck`.
- [x] Run focused account/onboarding Jest tests.
- [x] Run focused dashboard, transaction, and commitment hook tests touched by the account API update.
- [x] Commit the branch.
