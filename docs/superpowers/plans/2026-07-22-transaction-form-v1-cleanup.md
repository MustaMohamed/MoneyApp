# Transaction Form V1 Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the rebuilt transaction form to the only canonical implementation and remove the V1/V2 architecture split without changing behavior.

**Architecture:** Move the rebuilt host and session lifecycle into the existing `transaction_form` module, which already owns the active shared form engine. Consolidate versioned types and prerequisite helpers into the canonical files, update every consumer atomically, and reject future versioned transaction-form surfaces with an architecture test.

**Tech Stack:** React Native, Expo Router, TypeScript strict, Zustand v5, React Hook Form, Zod, HeroUI Native, Jest.

---

### Task 1: Lock The Canonical Module Boundary

**Files:**
- Create: `__tests__/screens/transactions/transaction_form/transaction_form_architecture.test.ts`

- [x] **Step 1: Add a test that scans production transaction consumers and fails when a path contains `transaction_form_v2` or an exported identifier contains `TransactionFormV2`.**
- [x] **Step 2: Run `npm test -- --runInBand __tests__/screens/transactions/transaction_form/transaction_form_architecture.test.ts` and verify it fails against the current versioned module.**

### Task 2: Promote The Rebuilt Host

**Files:**
- Move: `src/modules/transactions/screens/transactions/transaction_form_v2/index.tsx` to `src/modules/transactions/screens/transactions/transaction_form/index.tsx`
- Move: `src/modules/transactions/screens/transactions/transaction_form_v2/transaction_form_v2.hook.ts` to `src/modules/transactions/screens/transactions/transaction_form/transaction_form_host.hook.ts`
- Move: `src/modules/transactions/screens/transactions/transaction_form_v2/transaction_form_v2.state.ts` to `src/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/transaction_form.types.ts`

- [x] **Step 1: Rename the host, hook, state, phase, footer, submit, and post-close symbols to their canonical non-versioned names.**
- [x] **Step 2: Reuse `TransactionFormMode` from `transaction_form.types.ts` instead of retaining a duplicate host mode type.**

### Task 3: Promote Sessions And Prerequisites

**Files:**
- Move: `transaction_form_v2/add_transaction_session.tsx` to `transaction_form/add_transaction_session.tsx`
- Move: `transaction_form_v2/edit_transaction_session.tsx` to `transaction_form/edit_transaction_session.tsx`
- Move: `transaction_form_v2/transaction_form_v2_prerequisites.hook.ts` to `transaction_form/transaction_form_prerequisites.hook.ts`
- Move: `transaction_form_v2/transaction_form_v2_session.hook.ts` to `transaction_form/transaction_form_session.hook.ts`
- Modify: `transaction_form/transaction_form_prerequisites.helpers.ts`
- Delete: `transaction_form_v2/transaction_form_v2_prerequisites.helpers.ts`

- [x] **Step 1: Rename session props, components, and hooks without changing render branches or lifecycle behavior.**
- [x] **Step 2: Merge missing-account and readiness helpers into the canonical prerequisite helper file.**
- [x] **Step 3: Remove the empty versioned directory.**

### Task 4: Migrate Consumers And Tests

**Files:**
- Modify: `src/modules/navigation/screens/tabs/index.tsx`
- Modify: `src/modules/navigation/screens/tabs/tabs.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/index.tsx`
- Modify: `src/modules/transactions/screens/transactions/transactions.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/detail/index.tsx`
- Move: `__tests__/screens/transactions/transaction_form_v2/*.test.*` to `__tests__/screens/transactions/transaction_form/`
- Modify: affected transaction, navigation, and architecture tests.

- [x] **Step 1: Point every runtime consumer to the canonical host/state exports.**
- [x] **Step 2: Rename test files, mocks, imports, and descriptions to canonical terminology.**
- [x] **Step 3: Run the architecture test and all transaction-form suites; verify they pass.**

### Task 5: Verify The Cleanup

**Files:**
- Verify all changed files.

- [x] **Step 1: Run `rg -n "transaction_form_v2|TransactionFormV2" src __tests__` and verify only the architecture guard's forbidden-pattern literals remain.**
- [x] **Step 2: Run `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`.**
- [x] **Step 3: Run `npx --yes expo-doctor` and `npx expo prebuild --no-install --platform android`, then verify `android/` exists.**
- [x] **Step 4: Review `git diff --check`, the final diff, and worktree status before requesting a push.**
