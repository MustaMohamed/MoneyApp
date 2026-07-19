# Transactions Section Audit

**Date:** 2026-07-19
**Scope:** Transactions list, summary, search and filters, transaction rows, detail screen, add/edit sheets, picker sheets, stores, repositories, database mutations, and transaction-focused tests.
**Lenses:** UI structure and usability, layout stability, system consistency, financial and programming logic, code quality, and project-standard compliance.
**Status:** Review only. No production code changed.
**Branch:** `refactor/transactions-audit`

---

## Executive verdict

The Transactions section has a useful compact summary, capable filters, transactional balance writes, and broad automated coverage. It is not ready for a presentation-only redesign yet, however. Several issues are ledger-integrity or historical-data defects rather than cosmetic problems:

1. Commitment-generated transactions can be mutated outside the commitment aggregate.
2. Generic credit-card income and expense mutations use asset-account signs.
3. Archived accounts are absent from historical transaction resolution and edit context.
4. Date, exchange-rate, and repository validation have correctness gaps.

Those defects should be fixed before the screen receives a visual redesign. Otherwise the improved UI could make financially incorrect behavior appear trustworthy.

## Severity summary

| Severity | Count | Theme |
| --- | ---: | --- |
| Critical | 2 | Ledger ownership and credit-card accounting |
| High | 6 | Historical data, date/FX validation, repository behavior, pagination, error handling |
| Medium | 15 | Query transitions, sheet lifecycle, skeleton geometry, transfer presentation, accessibility, standards |
| Low | 6 | Search reach, copy/tokens, test architecture, maintenance quality |

---

## Critical findings

### C1. Commitment-generated transactions can be edited or deleted as ordinary transactions

**Evidence**

- `src/modules/transactions/screens/transactions/components/transaction_row.tsx:127` exposes edit and delete actions without checking transaction ownership.
- `src/modules/transactions/screens/transactions/detail/index.tsx:161` exposes the same actions on the detail screen.
- `src/modules/commitments/repositories/commitment.repository.ts:159` creates the linked expense using the commitment payment and its exchange rate.
- `src/modules/commitments/database/commitment_payments.ts:261` applies `tx.egp_amount` to the account balance.
- `src/modules/transactions/database/transactions.ts:388` later computes a generic expense edit delta from native transaction amounts.

**Impact**

A commitment payment and its generated transaction are one financial event, but the Transactions section treats the generated row as independently mutable. Editing a foreign-currency commitment transaction can update the account by an incorrect native delta while leaving the commitment payment unchanged. Deleting the transaction can fail because the commitment payment references it, yet the UI still offers the action.

**Recommendation**

- Introduce an explicit transaction source/ownership policy.
- Render commitment-generated transactions as read-only in Transactions.
- Replace edit/delete with `View commitment` or `Edit payment` and deep-link to the owner.
- Perform payment mutations atomically through the commitment repository so payment, ledger row, and account balance remain synchronized.
- Add integration tests for EGP and foreign-currency commitment payments, edits, and deletion policy.

### C2. Generic credit-card transaction signs are financially incorrect

**Evidence**

- `src/modules/transactions/screens/transactions/transaction_form/add_transaction.hook.ts:284` allows credit-card accounts in generic income and expense flows.
- `src/modules/transactions/database/transactions.ts:91` always subtracts an expense and adds income regardless of account type.
- `src/modules/dashboard/screens/dashboard/dashboard.helpers.ts:12` treats a positive credit-card balance as a liability and subtracts it from net worth.
- `src/modules/transactions/database/transactions.ts:129` allows a card payment to reduce the liability below zero without an explicit credit-balance rule.

**Impact**

A card purchase can reduce the stored liability and incorrectly improve net worth. Income on a card can increase its liability. Card overpayment can also create a negative liability and inflate net worth unless positive card balances are intentionally supported.

**Recommendation**

- Short term: exclude credit cards from generic income/expense account pickers and route card activity through explicit card purchase, refund, and payment flows.
- Long term: centralize account-type-aware balance effects at the repository/domain boundary.
- Decide whether card credit balances are supported. If not, reject payments above the outstanding balance.
- Add add/update/delete integration tests for purchases, refunds, payments, and overpayment.

---

## High-severity findings

### H1. Archived-account history loses account context and can corrupt FX edits

**Evidence**

- `src/modules/accounts/database/accounts.ts:5` loads only non-archived accounts into the active account store.
- `src/modules/transactions/screens/transactions/transactions.hook.ts:59` and `:133` resolve list accounts from that active store.
- `src/modules/transactions/screens/transactions/detail/detail.hook.ts:84` and `:118` use the same active-only source.
- `src/modules/transactions/screens/transactions/edit_transaction.hook.ts:137` falls back to EGP when the source account cannot be found.
- `src/modules/transactions/screens/transactions/edit_transaction.hook.ts:263` can save using that fallback.

**Impact**

Historical rows can show `Unknown Account`, transfer context disappears, archived accounts cannot be filtered, and editing a historical USD transaction can rewrite it as EGP.

**Recommendation**

- Add a historical account lookup that includes archived accounts.
- Use archived accounts for display and existing-transaction edit context, but exclude them from new-transaction pickers.
- Disable edit with an explicit explanation if required ownership/account context cannot be resolved.

### H2. The default transaction date uses UTC instead of the user's local date

**Evidence**

- `src/modules/transactions/screens/transactions/add_transaction.hook.ts:146` uses `new Date().toISOString().slice(0, 10)`.
- `src/modules/transactions/screens/transactions/transaction_form/components/date_row.tsx:18` follows the same UTC conversion pattern.
- `src/utils/format_date.ts:46` already provides a local-date helper.

**Impact**

Around midnight in Cairo and other positive UTC offsets, a new transaction can default to the previous calendar day or month.

**Recommendation**

Use the shared local-date formatter consistently and add tests around local midnight, month-end, and year-end.

### H3. Exchange-rate input is not fully normalized or validated

**Evidence**

- `src/modules/transactions/screens/transactions/edit_transaction.hook.ts:26` validates the core form but does not fully validate the exchange rate.
- `src/modules/transactions/screens/transactions/edit_transaction.hook.ts:263` parses and applies the submitted rate.
- `src/modules/transactions/screens/transactions/add_transaction.hook.ts:123` uses `Number.parseFloat`, which accepts malformed prefixes such as `50abc`.

**Impact**

Malformed, zero, or directionally invalid rates can write incorrect EGP or destination amounts.

**Recommendation**

- Use one shared normalized monetary/rate parser.
- Put exchange-rate rules in the RHF/Zod schema for add and edit.
- Validate rate positivity and required currency direction.
- Derive previews and persisted values from the same pure conversion helper.

### H4. Repository methods do not enforce all transaction invariants

**Evidence**

- `src/modules/transactions/repositories/transaction.repository.ts:104` constructs transactions without a complete account-type/type/category/currency invariant check.
- `src/modules/transactions/repositories/transaction.repository.ts:160` silently returns when the updated transaction does not exist.

**Impact**

Invalid combinations can reach the database, and an edit can close as successful even though no row was updated.

**Recommendation**

- Add a pure domain validator at the repository boundary.
- Validate required and forbidden fields for Expense, Income, Transfer, and CCPayment.
- Throw typed not-found/conflict errors and verify affected-row counts.
- Keep UI validation for guidance, but treat repository validation as authoritative.

### H5. Offset pagination is nondeterministic for equal timestamps

**Evidence**

- `src/modules/transactions/database/transactions.ts:224` orders by date and time without a unique tie-breaker.
- The account transaction query around `src/modules/transactions/database/transactions.ts:261` follows the same ordering model.

**Impact**

Rows sharing the same second can be duplicated or omitted across offset pages, especially when a new transaction is inserted while paging.

**Recommendation**

Add deterministic `created_at DESC, id DESC` tie-breakers. Prefer cursor pagination if the history becomes large. Test identical timestamps across the page boundary.

### H6. Load failures are displayed as legitimate data or endless loading

**Evidence**

- `src/modules/transactions/screens/transactions/transactions.hook.ts:79` replaces totals failures with zero-like data.
- `src/modules/transactions/screens/transactions/transactions.hook.ts:109` swallows list query failures.
- `src/modules/transactions/store/transaction.store.ts:84` can leave first-load state unresolved.
- `src/modules/transactions/screens/transactions/detail/detail.hook.ts:87` maps failed detail loading into an absent/not-found presentation.

**Impact**

A database error can appear as zero income/expense, an endless skeleton, or a missing transaction. Zero totals are especially dangerous in a finance app because they look authoritative.

**Recommendation**

- Model first-load error, refresh error, empty result, and not-found as separate states.
- Preserve the last successful content during refresh failures.
- Add retry actions and error-specific copy.
- Never convert a database failure into financial zeroes.

---

## UI structure, usability, and data presentation

### U1. The fixed controls consume too much list viewport

`src/modules/transactions/screens/transactions/index.tsx:185` keeps the summary and search/filter controls outside the `SectionList`. On smaller devices, the month/type area, summary, and search permanently reduce the transaction viewport. Commitments uses list-header composition, so the two primary ledger screens also behave differently.

**Enhancement:** Keep the standard screen header and month/type scope sticky, but let summary and search/filter scroll with the content. Preserve quick filter access through a compact sticky search/filter row if testing shows it is needed.

### U2. The summary does not communicate no-income or extreme overspending well

`src/modules/transactions/screens/transactions/transactions.helpers.ts:51` returns a neutral percentage when income is zero and clamps expense share at 100 percent. The progress rail therefore cannot distinguish spending equal to income from spending many times above income.

**Enhancement:** Add explicit `No income`, `Within income`, and `Over income` states. Keep the compact approved card but add an overflow marker or semantic caption instead of encoding every condition in a capped rail.

### U3. Transfer presentation omits the amount the destination actually received

- `src/modules/transactions/screens/transactions/components/transaction_row.tsx:117` presents an EGP equivalent rather than `to_amount` and destination currency.
- `src/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row.tsx:20` always multiplies the amount and labels EGP.
- `src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx:293` gives the preview too little directional context.

**Enhancement:** Use a shared direction-aware view model and display `You send` and `Recipient gets`. On rows, prioritize source native amount and destination native amount; show EGP equivalent only as secondary context when useful.

### U4. Budget and source ownership are missing from transaction presentation

Transactions can carry a `budget_id`, but list and detail presentation do not resolve or display the named budget. Commitment-generated transactions show a source badge but do not offer ownership-aware navigation.

**Enhancement:** Add a Budget row to detail, optionally a small budget/source chip to list rows, and a direct link to the originating commitment. This gives users an audit trail rather than only a category and note.

### U5. Search reach is narrower than the placeholder implies

`src/modules/transactions/database/transactions.ts:192` searches note, account, and category text but not amounts, destination amounts, transaction type, named budget, or source entity.

**Enhancement:** Either expand search to those fields or make the scope explicit. Amount search should use normalized numeric parsing rather than text matching.

### U6. Filter amount validation is too permissive

- `src/modules/transactions/screens/transactions/filter/filter.helpers.ts:26` uses permissive parsing and silently drops malformed or negative values.
- `src/modules/transactions/screens/transactions/filter/filter.hook.ts:61` does not validate that minimum is less than or equal to maximum.

**Enhancement:** Show inline validation, disable Apply for invalid ranges, preserve entered values, and consider Budget and Source filters after the ownership model is corrected.

### U7. Transaction entry time becomes stale while the sheet stays open

`src/modules/transactions/screens/transactions/add_transaction.hook.ts:217` captures the time when the form opens and saves it later around `:443`.

**Enhancement:** Use submit time by default. If users need historical time entry, expose an explicit time field rather than silently using form-open time.

### U8. Long labels and large monetary values can crowd transaction rows

`src/modules/transactions/screens/transactions/components/transaction_row.tsx:171` relies on flexible columns without fully stable icon/content/value tracks. Long category/account names and large signed values can compete for width.

**Enhancement:** Use fixed icon and value columns, a shrinking middle column, explicit `numberOfLines`, and tabular numeric typography. Ensure optional notes and equivalents grow only vertically.

---

## UI shifts, broken states, and transitions

### T1. New controls can temporarily describe old rows

- `src/modules/transactions/screens/transactions/transactions.store.ts:39` changes month/filter state immediately.
- `src/modules/transactions/store/transaction.store.ts:63` starts a new request but keeps old rows visible.

The month or type rail can say July or Expense while June or Income rows are still rendered.

**Recommendation:** Key displayed rows by the complete query. Atomically swap cached query results, or show same-geometry updating rows/dimmed stale content with a clear updating state. Header state and row data must always describe the same query.

### T2. Navigating to detail resets list context

`src/modules/transactions/screens/transactions/transactions.hook.ts:121` resets the selected month, search, type, filters, rows, and totals when the screen loses focus.

**Recommendation:** Preserve screen state across nested detail navigation and restore list scroll position. Reset only at an intentional root lifecycle such as sign-out or an explicit clear action.

### T3. Save sheets can be dismissed while an async mutation is active

- `src/modules/transactions/screens/transactions/add_transaction_sheet.tsx:27` does not lock dismissal while saving.
- `src/modules/transactions/screens/transactions/transaction_form/index.tsx:37` has the same issue for edit.
- `src/modules/transactions/screens/transactions/add_transaction_sheet.hook.ts:6` delays unmount, while `add_transaction.hook.ts:325` resets form state as soon as visibility changes.
- `src/modules/transactions/screens/transactions/index.tsx:237` clears the edit target before the close transition finishes.

**Recommendation:** Set `isDismissable={!saving}`, make save idempotent, preserve content through the closing animation, and reset only after close completion. Use one owner for sheet lifecycle.

### T4. The form footer can cover the last scrollable controls

`src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx:121` uses small bottom padding despite rendering a fixed footer. The shared contract in `src/components/ui/sheet.tsx:20` provides `SHEET_FOOTER_CLEARANCE` for this case.

**Recommendation:** Apply the shared footer clearance to every sheet with a footer and verify keyboard-open geometry.

### T5. Detail refresh collapses into a spinner

- `src/modules/transactions/screens/transactions/detail/index.tsx:66` replaces content with a centered spinner.
- `src/modules/transactions/screens/transactions/detail/detail.hook.ts:87` clears the transaction before reload.

An edit or refresh causes content-to-spinner-to-content movement.

**Recommendation:** Keep the last transaction during revalidation or optimistically apply the saved edit. Use a geometry-matched skeleton only for the initial load.

### T6. Row skeleton geometry does not match actual content variants

`src/modules/transactions/screens/transactions/components/transaction_rows_skeleton.tsx:6` renders identical two-line rows. Real rows may include date headers, notes, destination amounts, and EGP equivalents.

**Recommendation:** Model at least one date header and representative compact/expanded row variants. Share dimensions with loaded row primitives and compare skeleton/loaded geometry in render tests.

### T7. Totals skeleton and loaded content do not share a geometry contract

`src/modules/transactions/screens/transactions/components/totals_strip.tsx:144` gives skeleton elements explicit heights without equivalent shared dimensions for all loaded/error states. The error state can omit delta rows and shrink the card.

**Recommendation:** Define one internal layout contract used by loading, success, edge, and error states. Test exact outer and row geometry rather than only checking skeleton constants.

### T8. The iOS date picker expands the sheet without a clear completion action

`src/modules/transactions/screens/transactions/transaction_form/components/date_row.tsx:22` controls an inline picker locally. On iOS it can remain expanded and materially shift the form.

**Recommendation:** Use a compact picker sheet/dialog with explicit Done and Cancel actions, or an app-standard date picker component. Keep picker state in the prescribed hook/state layer.

### T9. The budget picker cannot safely display many budgets

`src/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet.tsx:20` maps options in a small non-scrollable sheet.

**Recommendation:** Use `BottomSheetFlatList` or `BottomSheetScrollView`, stable option rows, empty/search states where needed, and a fixed footer only if an explicit confirmation step is retained.

---

## Whole-system UI consistency

### S1. Transaction type selection reimplements HeroUI Tabs

`src/modules/transactions/screens/transactions/components/type_tabs.tsx:53` builds a custom segmented control with `PressableFeedback`. The project requires a HeroUI primitive wherever one exists.

**Recommendation:** Compose HeroUI `Tabs` and retain transaction-specific icons/tones through variants.

### S2. Detail uses a non-standard header and owns behavior in the template

`src/modules/transactions/screens/transactions/detail/index.tsx:24` contains lifecycle, navigation, and edit orchestration, then manually builds the screen header around `:57`.

**Recommendation:** Use the app-standard `StackHeader`, move behavior to `detail.hook.ts`, and keep `index.tsx` declarative.

### S3. Component-local state violates the screen anatomy convention

`src/modules/transactions/screens/transactions/transaction_form/components/date_row.tsx:23` uses component-local `useState` for UI state.

**Recommendation:** Move picker visibility/value coordination to a sibling `.state.ts` or the form hook, following the existing module anatomy.

### S4. Hardcoded colors, copy, and typography drift remain

- `src/modules/transactions/screens/transactions/detail/components/detail_row.tsx:70` hardcodes a color.
- `src/modules/transactions/screens/transactions/detail/components/note_card.tsx:40` repeats it.
- `src/modules/transactions/screens/transactions/detail/components/detail_hero.tsx:55` contains local user-facing labels and fallback colors.
- `src/modules/transactions/screens/transactions/detail/components/detail_hero.tsx:97` uses negative letter spacing, contrary to the design guidance.
- `src/modules/transactions/screens/transactions/components/transfer_flow_card.tsx:65` contains local accessibility copy.

**Recommendation:** Move copy to `Strings`, runtime colors to canonical tokens, and sizing/radius to project tokens. Remove negative letter spacing and reduce historical narration comments to concise rationale.

### S5. Main Transactions and Commitments screens use different content-scrolling models

Transactions keeps summary/search outside the list while Commitments composes equivalent content into its list header. This creates inconsistent behavior across the app's two recurring ledger workflows.

**Recommendation:** Choose and document one scrolling model for data-heavy tabs, then use the same sticky/non-sticky hierarchy in both screens.

### S6. Accessibility semantics are incomplete

`src/modules/transactions/screens/transactions/components/totals_strip.tsx:246` labels the rail but does not expose a progress value. Picker rows and segmented controls also need complete roles/states, and transfer labels should announce both accounts and amounts.

**Recommendation:** Add `accessibilityRole`, `accessibilityState`, and `accessibilityValue`; ensure icon-only controls have full labels and minimum touch targets.

---

## Programming logic and maintainability

### P1. Conversion display and persistence do not share one view model

The form preview, list row, detail flow card, and database write path each interpret exchange direction separately. This has already produced the EGP-to-foreign preview defect.

**Recommendation:** Create a pure transaction conversion model that resolves source amount/currency, destination amount/currency, EGP equivalent, rate direction, and display copy. Use it in validation, persistence, list, and detail.

### P2. Account balance effects belong in a domain policy

Balance mutation logic is spread across transaction types and assumes ordinary asset-account signs. That makes new account types and linked sources risky.

**Recommendation:** Resolve a typed balance-effect plan before opening the database transaction. The plan should describe source delta, destination delta, EGP equivalent, and ownership constraints and should be exhaustively tested per account and transaction type.

### P3. Query and UI state do not form an atomic snapshot

The selected query lives in one store while loaded rows and request status live in another. Request IDs prevent stale responses from winning, which is good, but they do not prevent controls and rows from representing different snapshots during loading.

**Recommendation:** Introduce a query key on both request and displayed result, or keep a keyed cache. Render only a result whose key matches the active controls.

### P4. Error semantics are under-modeled

Not-found, empty data, first-load failure, refresh failure, and totals failure are collapsed into a few nullable/loading values.

**Recommendation:** Use a small discriminated state model and typed repository errors. This simplifies UI branching and prevents financial errors from becoming zeroes.

### P5. Historical account resolution should not depend on the active-account picker store

Using the same account collection for selection and historical display couples two different policies.

**Recommendation:** Separate `selectableAccounts` from `accountLookupById`. The latter includes archived records needed for history.

---

## Test and verification gaps

The focused transaction suite is broad, but important screens and invariants are mocked or untested.

**Current evidence**

- Focused command: `npm test -- --runInBand --testPathPattern='transactions|transaction'`
- Result: 36 suites passed, 367 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: exited successfully, with numerous unsafe-`any` warnings in transaction tests.

**Gaps**

1. `__tests__/screens/transactions.screen.test.tsx:70` mocks the summary, search, transaction row, filters, and forms, so it does not validate their integration or geometry.
2. No direct rendering matrix covers real transaction rows with long labels, large values, notes, foreign currency, transfers, source badges, and archived accounts.
3. No direct detail-screen tests cover first loading, refresh, error, ownership actions, or transfer direction.
4. No database integration test covers commitment-generated transaction mutation policy.
5. No account-type integration test covers credit-card purchase, refund, payment, update, delete, and overpayment.
6. No test covers equal-timestamp pagination at the page boundary.
7. No local-time test covers midnight and month-end defaults.
8. No transition test verifies query/header/rows remain synchronized.
9. No loaded-versus-skeleton geometry test covers summary, section headers, or row variants.
10. Unsafe test mocks weaken type fidelity and can conceal contract drift.

**Recommendation**

Keep narrowly useful architecture tests, but add direct render tests for user-visible states and database integration tests for financial invariants. Replace broad `any` mocks with typed builders from `src/test_helpers`.

---

## Confirmed strengths

These behaviors are correct and should be preserved:

1. Monthly totals are intentionally independent of search and filters.
2. Period totals exclude transfers and credit-card payments, avoiding double counting.
3. Account balance writes are wrapped in database transactions.
4. Request IDs prevent older database responses from overwriting newer requests.
5. Budget assignment validates category and month compatibility at the repository boundary.
6. Monetary paths generally use `roundMoney` instead of uncontrolled floating-point display.
7. Search/filter UI is shared with Commitments and mostly uses the HeroUI-backed `Sheet` and `ListGroup` patterns.
8. Pull-to-refresh preserves loaded rows rather than replacing the entire list immediately.
9. The compact filter badge and summary comparison pattern are useful and should remain recognizable after remediation.

---

## Recommended remediation sequence

### Wave 1: Ledger integrity

1. Lock commitment-owned transactions and route mutations through Commitments.
2. Correct or block generic credit-card income/expense behavior.
3. Define overpayment/credit-balance policy.
4. Separate historical account lookup from selectable accounts.
5. Add repository invariants, typed errors, and affected-row checks.
6. Fix local-date and exchange-rate normalization.
7. Make pagination deterministic.

**Exit condition:** Integration tests prove balances, linked entities, currencies, and history remain correct across add/edit/delete.

### Wave 2: State and transition stability

1. Key displayed data to the active query.
2. Preserve filters, month, and scroll position across detail navigation.
3. Model first-load, refresh, empty, not-found, and error states separately.
4. Lock sheet dismissal during save and unify close/reset lifecycle.
5. Preserve detail content during revalidation.

**Exit condition:** No screen shows controls for one query with rows from another, and no loading or close transition changes layout unexpectedly.

### Wave 3: Presentation redesign

1. Adopt stable row columns and matching skeleton geometry.
2. Make transfer conversion and destination amounts explicit.
3. Add budget and source ownership context.
4. Improve no-income and over-income summary states.
5. Unify the Transactions and Commitments scrolling hierarchy.
6. Improve search/filter validation and accessibility.

**Exit condition:** Device QA passes small/large Android and iOS layouts with long labels, large values, keyboard-open forms, refresh, and all empty/error states.

### Wave 4: Standards and test hardening

1. Replace the custom type rail with HeroUI `Tabs`.
2. Use the standard header and declarative screen anatomy.
3. Move component state and behavior to prescribed hook/state files.
4. Centralize strings, tokens, conversion models, and accessibility copy.
5. Add rendering and integration coverage for the identified state matrix.
6. Remove unsafe test mocks and lint warnings.

**Exit condition:** Local CI parity is green and Tariq's code review finds no domain, architecture, or UI-state blockers before device QA.

---

## Audit limitation

This was a code, logic, architecture, and automated-test audit. Runtime visual QA was not performed because no local app server was available during the review. The transition and geometry findings are confirmed from state/lifecycle and component structure, but the final remediation must still pass the mandatory physical-device QA gate.
