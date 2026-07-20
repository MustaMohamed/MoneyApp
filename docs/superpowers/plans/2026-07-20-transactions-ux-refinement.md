# Transactions UX Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver PR3 of the approved Transactions remediation program: a compact, stable, data-rich transaction experience whose loading, edge, error, and loaded states use the same geometry.

**Architecture:** Keep financial and query behavior from PR1/PR2 intact. Add pure presentation view models for summary, rows, and detail; keep screen/component templates declarative; resolve budgets and commitment ownership in hooks; and compose existing HeroUI/project primitives. Every behavior change starts with a failing rendering or helper test.

**Tech Stack:** Expo React Native, TypeScript strict, Expo Router, Zustand, HeroUI Native, Uniwind/Tailwind classes, React Native Testing Library, Jest.

---

## File Map

- `src/modules/transactions/screens/transactions/transactions.helpers.ts`: pure summary and row presentation models.
- `src/modules/transactions/screens/transactions/transactions.hook.ts`: resolve accounts/categories/budgets and expose query-owned list presentation.
- `src/modules/transactions/screens/transactions/index.tsx`: compose the sticky scope controls and scrolling summary/search/list hierarchy.
- `src/modules/transactions/screens/transactions/components/totals_strip.tsx`: one shared geometry contract for loading, success, and edge states.
- `src/modules/transactions/screens/transactions/components/transaction_row.tsx`: declarative fixed-column row renderer.
- `src/modules/transactions/screens/transactions/components/transaction_rows_skeleton.tsx`: skeleton rows built from loaded-row dimensions.
- `src/modules/transactions/screens/transactions/detail/detail.helpers.ts`: pure detail presentation model, including transfer and ownership copy.
- `src/modules/transactions/screens/transactions/detail/detail.hook.ts`: resolve budget and commitment ownership and preserve content while revalidating.
- `src/modules/transactions/screens/transactions/detail/index.tsx`: compact detail composition using the standard app header.
- `src/modules/transactions/screens/transactions/transaction_form/components/date_row.tsx`: declarative compact date trigger.
- `src/modules/transactions/screens/transactions/transaction_form/components/date_picker_sheet.tsx`: HeroUI-backed compact picker with Done/Cancel.
- `src/modules/transactions/screens/transactions/transaction_form/components/date_picker_sheet.state.ts`: picker draft/open UI state.
- `src/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet.tsx`: scrollable fixed-height budget list with empty state.
- `src/modules/transactions/screens/transactions/filter/filter.helpers.ts`: strict amount parsing and range validation.
- `src/modules/transactions/screens/transactions/filter/filter.hook.ts`: presentation-ready validation and apply state.
- `src/modules/transactions/screens/transactions/filter/components/amount_accordion.tsx`: inline validation rendering.
- `src/modules/transactions/database/transactions.ts`: expanded normalized search projection without changing monthly totals.
- `src/constants/strings.ts`: all new visible and accessibility copy.
- `__tests__/screens/transactions/*.test.tsx`: direct rendering tests for approved visual states.
- `__tests__/screens/transactions/**/*.test.ts`: pure helper and hook behavior tests.

### Task 1: Shared summary geometry and edge states

**Files:**
- Modify: `src/modules/transactions/screens/transactions/transactions.helpers.ts`
- Modify: `src/modules/transactions/screens/transactions/components/totals_strip.tsx`
- Modify: `src/constants/strings.ts`
- Modify: `__tests__/screens/transactions/totals_strip.test.tsx`
- Modify: `__tests__/screens/transactions/totals_strip_skeleton.test.tsx`

- [ ] **Step 1: Write failing summary-model and rendering tests**

Cover `noIncome`, `withinIncome`, `overIncome`, and `netCredit` states. Assert the loaded, loading, and missing-comparison variants retain the same value, rail, comparison, and caption slots.

```ts
expect(buildTotalsPresentation({ incomeEgp: 0, expenseEgp: 500, netEgp: -500 }).state)
  .toBe('noIncome');
expect(buildTotalsPresentation({ incomeEgp: 100, expenseEgp: 350, netEgp: -250 }).overflowPct)
  .toBe(250);
expect(screen.getByTestId('transactions-totals-comparison-row')).toBeTruthy();
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- --runInBand __tests__/screens/transactions/totals_strip.test.tsx __tests__/screens/transactions/totals_strip_skeleton.test.tsx`

Expected: FAIL because the presentation model and stable edge-state slots do not exist.

- [ ] **Step 3: Implement the pure model and shared geometry**

Return resolved labels, tones, capped rail width, overflow marker, accessibility copy, and comparison placeholders from `buildTotalsPresentation`. Render all states through the same card structure; loading replaces inner content only.

- [ ] **Step 4: Re-run focused tests and verify GREEN**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Commit the slice**

```bash
git add src/constants/strings.ts src/modules/transactions/screens/transactions/transactions.helpers.ts src/modules/transactions/screens/transactions/components/totals_strip.tsx __tests__/screens/transactions/totals_strip.test.tsx __tests__/screens/transactions/totals_strip_skeleton.test.tsx
git commit -m "feat(transactions): clarify monthly summary states"
```

### Task 2: Scrolling hierarchy without query-state mismatch

**Files:**
- Modify: `src/modules/transactions/screens/transactions/index.tsx`
- Modify: `src/modules/transactions/screens/transactions/transactions.hook.ts`
- Modify: `__tests__/screens/transactions.screen.test.tsx`

- [ ] **Step 1: Write failing hierarchy tests**

Render the screen and assert the standard header and `FilterRail` remain outside the list while `TotalsStrip` and `SearchRow` are supplied through `ListHeaderComponent`. Dispatch month/type changes and assert rows are hidden by the existing query-owned updating state until the matching snapshot is ready.

- [ ] **Step 2: Run the screen test and verify RED**

Run: `npm test -- --runInBand __tests__/screens/transactions.screen.test.tsx`

Expected: FAIL because totals and search are fixed above the list.

- [ ] **Step 3: Move summary/search into a memoized list header**

Keep header/month/type scope fixed. Put totals and search in a stable `ListHeaderComponent`, preserve refresh and error presentation, and retain bottom/FAB clearance.

- [ ] **Step 4: Re-run the screen test and verify GREEN**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Commit the slice**

```bash
git add src/modules/transactions/screens/transactions/index.tsx src/modules/transactions/screens/transactions/transactions.hook.ts __tests__/screens/transactions.screen.test.tsx
git commit -m "feat(transactions): improve ledger scroll hierarchy"
```

### Task 3: Stable, data-rich transaction rows

**Files:**
- Modify: `src/modules/transactions/screens/transactions/transactions.helpers.ts`
- Modify: `src/modules/transactions/screens/transactions/transactions.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/components/transaction_row.tsx`
- Modify: `src/modules/transactions/screens/transactions/components/transaction_rows_skeleton.tsx`
- Modify: `src/constants/strings.ts`
- Modify: `__tests__/screens/transactions/transaction_row.test.tsx`
- Create: `__tests__/screens/transactions/transaction_row.helpers.test.ts`
- Modify: `__tests__/screens/transactions/transaction_rows_skeleton.test.tsx`

- [ ] **Step 1: Write failing row-model and geometry tests**

Cover expense, income, card credit, transfer with different currencies, commitment-owned rows, named budget, long labels, and large values. Assert fixed icon/value tracks, shrinking/truncated content, and source/destination native transfer amounts. Assert unassigned transfer destinations do not invent an amount.

- [ ] **Step 2: Run focused row tests and verify RED**

Run: `npm test -- --runInBand __tests__/screens/transactions/transaction_row.test.tsx __tests__/screens/transactions/transaction_row.helpers.test.ts __tests__/screens/transactions/transaction_rows_skeleton.test.tsx`

Expected: FAIL because ownership and transfer-native presentation are not modeled.

- [ ] **Step 3: Add `buildTransactionRowPresentation` and declarative rendering**

Resolve title, primary amount, secondary amount, account path, budget/source badges, icon/tone, and accessibility label in the helper. Use stable icon/content/value columns and shared row dimension constants for loaded and skeleton variants.

- [ ] **Step 4: Re-run focused row tests and verify GREEN**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Commit the slice**

```bash
git add src/constants/strings.ts src/modules/transactions/screens/transactions/transactions.helpers.ts src/modules/transactions/screens/transactions/transactions.hook.ts src/modules/transactions/screens/transactions/components/transaction_row.tsx src/modules/transactions/screens/transactions/components/transaction_rows_skeleton.tsx __tests__/screens/transactions/transaction_row.test.tsx __tests__/screens/transactions/transaction_row.helpers.test.ts __tests__/screens/transactions/transaction_rows_skeleton.test.tsx
git commit -m "feat(transactions): enrich stable ledger rows"
```

### Task 4: Compact detail with ownership-aware navigation

**Files:**
- Modify: `src/modules/transactions/screens/transactions/detail/detail.helpers.ts`
- Modify: `src/modules/transactions/screens/transactions/detail/detail.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/detail/index.tsx`
- Modify: `src/modules/transactions/screens/transactions/detail/components/detail_rows_card.tsx`
- Modify: `src/modules/transactions/screens/transactions/detail/components/transfer_flow_card.tsx`
- Modify: `src/constants/strings.ts`
- Modify: `__tests__/screens/transactions/detail/detail_helpers.test.ts`
- Modify: `__tests__/screens/transactions/detail/detail_screen_actions.test.tsx`
- Create: `__tests__/screens/transactions/detail/detail_screen_states.test.tsx`

- [ ] **Step 1: Write failing detail-model and rendering tests**

Cover standard, transfer, card credit, named budget, commitment-owned, initial loading, refresh, and failure states. Assert the last successful detail stays visible while revalidating and ownership actions route to the commitment.

- [ ] **Step 2: Run focused detail tests and verify RED**

Run: `npm test -- --runInBand __tests__/screens/transactions/detail/detail_helpers.test.ts __tests__/screens/transactions/detail/detail_screen_actions.test.tsx __tests__/screens/transactions/detail/detail_screen_states.test.tsx`

Expected: FAIL because budget/source ownership and shared revalidation geometry are absent.

- [ ] **Step 3: Implement a pure detail presentation model and compact screen composition**

Resolve account path, transfer send/receive values, budget name, source ownership, editability, and accessible action labels in helpers. Use the standard screen header, keep content mounted during refresh, and show initial skeleton only before the first successful record.

- [ ] **Step 4: Re-run focused detail tests and verify GREEN**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Commit the slice**

```bash
git add src/constants/strings.ts src/modules/transactions/screens/transactions/detail __tests__/screens/transactions/detail
git commit -m "feat(transactions): refine ownership-aware detail"
```

### Task 5: Compact date and scalable budget selection

**Files:**
- Modify: `src/modules/transactions/screens/transactions/transaction_form/components/date_row.tsx`
- Create: `src/modules/transactions/screens/transactions/transaction_form/components/date_picker_sheet.tsx`
- Create: `src/modules/transactions/screens/transactions/transaction_form/components/date_picker_sheet.state.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet.tsx`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx`
- Modify: `src/constants/strings.ts`
- Create: `__tests__/screens/transactions/transaction_form/date_picker_sheet.test.tsx`
- Create: `__tests__/screens/transactions/transaction_form/budget_picker_sheet.test.tsx`

- [ ] **Step 1: Write failing picker tests**

Assert iOS date changes stay in a draft until Done, Cancel restores the original date, Android selection applies once, the trigger keeps compact geometry, and a long budget list renders in a bottom-sheet scrollable with selected/empty states.

- [ ] **Step 2: Run focused picker tests and verify RED**

Run: `npm test -- --runInBand __tests__/screens/transactions/transaction_form/date_picker_sheet.test.tsx __tests__/screens/transactions/transaction_form/budget_picker_sheet.test.tsx`

Expected: FAIL because the compact picker sheet and scalable list do not exist.

- [ ] **Step 3: Implement HeroUI-backed picker composition**

Keep state outside templates, use the shared `Sheet`, `BottomSheetFlatList`/`BottomSheetScrollView`, fixed footer clearance, and existing theme tokens/classes. Do not add a custom bottom-sheet primitive.

- [ ] **Step 4: Re-run focused picker tests and verify GREEN**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Commit the slice**

```bash
git add src/constants/strings.ts src/modules/transactions/screens/transactions/transaction_form/components src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx __tests__/screens/transactions/transaction_form
git commit -m "feat(transactions): compact transaction pickers"
```

### Task 6: Strict filter validation and honest search reach

**Files:**
- Modify: `src/modules/transactions/screens/transactions/filter/filter.helpers.ts`
- Modify: `src/modules/transactions/screens/transactions/filter/filter.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/filter/components/amount_accordion.tsx`
- Modify: `src/modules/transactions/database/transactions.ts`
- Modify: `src/constants/strings.ts`
- Modify: `__tests__/screens/transactions/filter/filter_helpers.test.ts`
- Modify: `__tests__/screens/transactions/filter/filter_hook.test.ts`
- Modify: `__tests__/transactions/transaction_query.test.ts`

- [ ] **Step 1: Write failing validation and search tests**

Reject malformed, negative, and reversed ranges without clearing user input; expose inline errors; disable Apply while invalid. Search transaction type labels, budget names, source account/destination account, exact normalized amounts, and destination amounts while preserving monthly totals independence.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- --runInBand __tests__/screens/transactions/filter/filter_helpers.test.ts __tests__/screens/transactions/filter/filter_hook.test.ts __tests__/transactions/transaction_query.test.ts`

Expected: FAIL because malformed values are silently discarded and query search is narrower.

- [ ] **Step 3: Implement validation and expanded query projection**

Use the shared normalized amount parser, a presentation-ready `validateAmountRange`, and parameterized SQL joins/conditions for budgets and destination accounts. Keep search/filter predicates out of monthly totals queries.

- [ ] **Step 4: Re-run focused tests and verify GREEN**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Commit the slice**

```bash
git add src/constants/strings.ts src/modules/transactions/database/transactions.ts src/modules/transactions/screens/transactions/filter __tests__/screens/transactions/filter __tests__/transactions/transaction_query.test.ts
git commit -m "feat(transactions): validate filters and expand search"
```

### Task 7: Rendering matrix, accessibility, and verification

**Files:**
- Modify: `__tests__/screens/transactions.screen.test.tsx`
- Modify: `__tests__/screens/transactions/transaction_row.test.tsx`
- Modify: `__tests__/screens/transactions/totals_strip.test.tsx`
- Modify: `__tests__/screens/transactions/detail/detail_screen_states.test.tsx`
- Create: `docs/superpowers/qa/2026-07-20-transactions-ux-refinement-device-qa.md`

- [ ] **Step 1: Add the final rendering/accessibility matrix**

Cover compact/long labels, EGP/USD, transfer, card credit, commitment, budget, empty, first-load, refresh, pagination error, and large accessibility-font states. Assert accessible names and invariant outer geometry rather than source strings.

- [ ] **Step 2: Run all transaction tests**

Run: `npm test -- --runInBand __tests__/screens/transactions __tests__/transactions`

Expected: PASS.

- [ ] **Step 3: Run repository verification**

Run:

```bash
npm run format:check && npm run lint && npm run typecheck && npm test -- --ci
```

Expected: all checks pass without warnings or unhandled promise rejections.

- [ ] **Step 4: Write the required device QA matrix**

Include Android/iOS checks for first load, pull-to-refresh, month/type transitions, search/filter validation, long rows, transfer native amounts, card credit, detail refresh, date picker keyboard geometry, long budget lists, commitment routing, and screen-reader labels.

- [ ] **Step 5: Commit verification artifacts**

```bash
git add __tests__/screens/transactions __tests__/transactions docs/superpowers/qa/2026-07-20-transactions-ux-refinement-device-qa.md
git commit -m "test(transactions): lock UX rendering matrix"
```

## Final Verification Before Push

Run the complete local CI parity chain required by `AGENTS.md`:

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android
```

PR3 is not merge-ready until this chain is green and the user completes the physical-device QA gate.
