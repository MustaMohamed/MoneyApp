# Transaction Form V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the failing transaction sheet lifecycle with one permanently mounted HeroUI shell and deterministic Add/Edit sessions.

**Architecture:** The tabs layout always mounts one V2 `Sheet`. A dedicated Zustand state owns mode, phase, session identity, prerequisite request ownership, and footer presentation. Add/Edit session hooks keep existing RHF/Zod and financial logic while consuming V2-owned prerequisite status.

**Tech Stack:** Expo Router, React Native, HeroUI Native, Zustand v5, React Hook Form, Zod, Jest, Testing Library.

---

### Task 1: Lock stable-shell behavior with tests

**Files:**
- Create: `__tests__/screens/transactions/transaction_form_v2/transaction_form_v2_state.test.ts`
- Create: `__tests__/screens/transactions/transaction_form_v2/transaction_form_v2_host.test.tsx`
- Modify: `__tests__/screens/navigation/tabs.hook.test.ts`

- [ ] Write a failing state test proving Add/Edit open atomically, saving blocks close, stale close completion is ignored, and prerequisite begin/complete is session-owned.
- [ ] Write a failing render test proving one closed Sheet exists before a request and the same Sheet instance receives `false -> true -> false`.
- [ ] Extend the tabs test to prove Add does not navigate and the FAB hides only for open/closing phases.
- [ ] Run the focused tests and confirm failure because V2 does not exist.

### Task 2: Implement the V2 host and state

**Files:**
- Create: `src/modules/transactions/screens/transactions/transaction_form_v2/transaction_form_v2.state.ts`
- Create: `src/modules/transactions/screens/transactions/transaction_form_v2/transaction_form_v2.hook.ts`
- Create: `src/modules/transactions/screens/transactions/transaction_form_v2/index.tsx`
- Modify: `src/modules/navigation/screens/tabs/index.tsx`
- Modify: `src/modules/navigation/screens/tabs/tabs.hook.ts`

- [ ] Implement the tested session, close, prerequisite, and footer state transitions.
- [ ] Implement a host hook with a nonreactive submit ref and declarative close/save callbacks.
- [ ] Render one unconditional project `Sheet` from V2 with dynamic title, body, and sticky footer.
- [ ] Wire the global FAB to V2 and run the focused tests until green.

### Task 3: Add session-owned prerequisite loading

**Files:**
- Create: `src/modules/transactions/screens/transactions/transaction_form_v2/transaction_form_v2_prerequisites.hook.ts`
- Create: `__tests__/screens/transactions/transaction_form_v2/transaction_form_v2_prerequisites.test.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/add_transaction.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook.ts`

- [ ] Write failing tests for Strict Mode replay, retry, stale success, stale failure, and Edit archived-account lookup.
- [ ] Implement one idempotent request per V2 session/generation without cleanup-owned completion.
- [ ] Remove first-load effects from Add/Edit hooks and inject V2 prerequisite status/retry.
- [ ] Run prerequisite and Add/Edit hook tests until green.

### Task 4: Build Add/Edit V2 sessions

**Files:**
- Create: `src/modules/transactions/screens/transactions/transaction_form_v2/add_transaction_session.tsx`
- Create: `src/modules/transactions/screens/transactions/transaction_form_v2/edit_transaction_session.tsx`
- Create: `src/modules/transactions/screens/transactions/transaction_form_v2/transaction_form_v2_session.hook.ts`
- Create: `__tests__/screens/transactions/transaction_form_v2/transaction_form_v2_sessions.test.tsx`

- [ ] Write failing tests for loading, error, ready, no-account, saving, and nested-picker closing states.
- [ ] Compose the existing form body and HeroUI pickers inside declarative V2 session components.
- [ ] Publish submit/footer state by session ID and keep close completion owned by the matching session.
- [ ] Run session and existing form-body tests until green.

### Task 5: Replace V1 and verify

**Files:**
- Modify: transaction list/detail callers of `openEdit`
- Remove: obsolete transaction-form host/session presentation files and tests
- Preserve: transaction form UI components, pure helpers, stores, and financial logic

- [ ] Switch list/detail Add/Edit callers to V2.
- [ ] Remove V1 host phases, presentation callbacks, and prerequisite coordinator after no consumers remain.
- [ ] Run transaction-form, navigation, transaction-screen, and detail-screen suites.
- [ ] Run format, lint, typecheck, full Jest, Expo Doctor, and Android prebuild.
- [ ] Start Expo with a clean cache, compile an Android Metro bundle, and hand off the real-device QA matrix.
