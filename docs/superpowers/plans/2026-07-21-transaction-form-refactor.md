# Transaction Form Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Add/Edit Transaction open reliably over the current tab, remove amount-input surprises, prevent duplicate financial mutations, and keep the sheet responsive and geometrically stable.

**Architecture:** A single transaction-form host lives in the canonical tabs module and owns one Add/Edit sheet portal. Mode and edit target are opened atomically; route files return to routing-only exports. Existing financial validation remains in the form hooks, while sheet lifecycle, picker mounting, input state, and post-save refresh behavior are simplified around explicit sessions.

**Tech Stack:** Expo Router, React Native, HeroUI Native, React Hook Form/Zod, Zustand, Jest and Testing Library.

---

### Task 1: One global transaction-form host

**Files:**
- Create: `src/modules/navigation/screens/tabs/index.tsx`
- Create: `src/modules/transactions/screens/transactions/transaction_form/transaction_form_host.tsx`
- Create: `src/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state.ts`
- Modify: `src/app/(app)/(tabs)/_layout.tsx`
- Modify: `src/modules/transactions/screens/transactions/index.tsx`
- Modify: `src/modules/transactions/screens/transactions/detail/index.tsx`
- Modify: `src/modules/transactions/screens/transactions/transactions.hook.ts`
- Test: `__tests__/screens/transactions/transaction_form/transaction_form_host.test.tsx`
- Test: `__tests__/screens/transactions/transaction_form/transaction_form_host_state.test.ts`

- [ ] Write failing tests proving Add opens directly without navigation or a timer, Edit stores its target atomically, only one sheet host renders, and the current tab remains selected.
- [ ] Run the focused tests and confirm they fail for the existing route-owned/timer-owned implementation.
- [ ] Move the tabs implementation into the canonical module, make the route file a one-line export, mount `TransactionFormHost` once, and remove both screen-owned sheet instances.
- [ ] Replace `pendingOpen` and duplicate edit ownership with direct `openAdd()` / `openEdit(transaction)` session actions.
- [ ] Run the focused host, transactions screen, and detail screen tests until green.

### Task 2: Predictable amount and form session behavior

**Files:**
- Modify: `src/modules/transactions/screens/transactions/transaction_form/components/amount_hero.tsx`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/add_transaction.store.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.store.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/add_transaction.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook.ts`
- Test: `__tests__/screens/transactions/transaction_form/amount_hero.test.tsx`
- Test: `__tests__/add_transaction.store.test.ts`
- Test: `__tests__/edit_transaction.store.test.ts`

- [ ] Write failing tests proving Add starts empty, clearing stays empty, opening does not focus/select text, and changing type preserves the entered amount.
- [ ] Run the tests and verify the expected failures.
- [ ] Remove delayed autofocus, `selectTextOnFocus`, forced zero normalization, global keyboard dismissal, and legacy numpad actions.
- [ ] Remove the amount-to-RHF synchronization effect by validating the normalized amount once at submit through a shared helper.
- [ ] Run amount, Add hook, and Edit hook tests until green.

### Task 3: Make mutation success final and refresh nonblocking

**Files:**
- Modify: `src/modules/transactions/screens/transactions/transaction_form/add_transaction.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook.ts`
- Test: `__tests__/screens/transactions/transaction_form/add_transaction.hook.test.ts`
- Test: `__tests__/screens/transactions/transaction_form/edit_transaction.hook.test.ts`

- [ ] Write failing tests where the database mutation succeeds and account refresh rejects; assert the form closes once and no save error is shown.
- [ ] Run the focused tests and verify they fail under the current combined try/catch.
- [ ] End the save transaction immediately after the committed mutation, close the form, and launch account revalidation as a consumed nonblocking promise.
- [ ] Preserve mutation failures as blocking form errors and prevent repeated submission while saving.
- [ ] Run Add/Edit hook suites until green.

### Task 4: Stable HeroUI form layout and picker lifecycle

**Files:**
- Modify: `src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/components/type_tabs.tsx`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row.tsx`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/components/add_transaction_sheet.tsx`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/index.tsx`
- Test: `__tests__/screens/transactions/transaction_form/transaction_form_body.test.ts`
- Test: `__tests__/screens/transactions/transaction_form/add_transaction_sheet.test.ts`

- [ ] Write failing rendering tests for fixed error slots, single-line/truncated values, stable type-tab height, bottom-sheet-aware inputs, and only the active nested picker being mounted.
- [ ] Run the tests and confirm the current conditional geometry and eager picker mounts fail them.
- [ ] Replace the custom selector with HeroUI `Tabs`, compose HeroUI inputs with bottom-sheet handlers, and reserve error/conditional section geometry.
- [ ] Mount only the active account/category/budget picker while retaining close-animation ownership.
- [ ] Keep template components declarative by moving footer and session lifecycle logic into hooks.
- [ ] Run form body and sheet rendering suites until green.

### Task 5: Cleanup and regression verification

**Files:**
- Remove when unused: `src/modules/transactions/screens/transactions/transaction_form/components/add_transaction_sheet.state.ts`
- Modify: related transaction-form tests and imports

- [ ] Remove dead pending-open, duplicate-host, numpad, timer, and footer-publication code after all replacement tests are green.
- [ ] Run transaction-form, transactions-screen, and detail-screen suites.
- [ ] Run `npm run format:check`, `npm run lint`, and `npm run typecheck`.
- [ ] Run the full Jest suite and confirm no existing transaction, budget, currency, or account behavior regresses.
- [ ] Inspect the final diff for unrelated changes and preserve the pre-existing row/date fixes.

