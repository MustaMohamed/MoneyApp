# Transactions Remediation Program Design

- **Date:** 2026-07-19
- **Status:** Approved direction; awaiting written-spec review
- **Scope:** Transactions list, summary, search/filter, detail, add/edit flows, transaction persistence, linked commitment ownership, credit-card effects, historical account resolution, UI state, and transaction test architecture
- **Source audit:** `docs/superpowers/reviews/2026-07-19-transactions-section-audit.md`
- **Delivery:** Four ordered pull requests

## Summary

This program corrects the Transactions section from the ledger boundary outward. Financial mutations and ownership rules land first, loading and navigation state second, presentation refinements third, and architecture/test hardening fourth.

The four-PR structure is intentional. Financial behavior must be reviewable independently from visual work, and loading-state changes must stabilize before skeleton and geometry work is judged. Every PR includes tests for the behavior it changes; the fourth PR completes the broader render matrix and standards cleanup rather than postponing regression coverage.

The work preserves the approved compact Cairo Nights visual direction. It is a correctness and usability remediation, not a new information architecture or a replacement Transactions product.

## Goals

1. Make every transaction type produce financially correct, reversible account effects.
2. Prevent linked commitment payments from being mutated outside their owning aggregate.
3. Preserve historical account identity after accounts are archived.
4. Make date, currency, exchange-rate, and repository validation authoritative.
5. Prevent query controls, totals, rows, and details from representing different data snapshots.
6. Remove visible layout shifts during query changes, refresh, edit, save, and first load.
7. Improve transfer, budget, source, error, and edge-state presentation without losing compactness.
8. Align Transactions with the current HeroUI Native, module anatomy, strings, tokens, and testing standards.

## Non-goals

1. No bank connections, import, reconciliation service, or remote synchronization.
2. No automatic rewrite of existing credit-card balances.
3. No new persisted transaction enum for refunds; the existing `income` value remains storage-compatible.
4. No receipt, attachment, merchant, split-transaction, duplicate, or sharing feature.
5. No new chart or analytics screen.
6. No cursor-pagination migration unless deterministic offset pagination proves insufficient in implementation testing.
7. No redesign of Commitments, Accounts, Dashboard, or Budget beyond the minimum integration surfaces specified here.
8. No new dependency or native-code change.

## Locked product and financial decisions

1. Delivery uses four ordered PRs.
2. Credit-card Income is presented and treated as a **Card credit**.
3. A card credit decreases card liability and never counts as monthly income.
4. A new card credit uses an expense category and offsets that category's recorded spending.
5. Monthly expense totals are net spending: gross expenses minus card credits.
6. Monthly net is `cash income - net spending`; the three summary values remain mathematically reconcilable.
7. Net spending may become negative when credits exceed expenses. The summary presents that state as a credit, not as a negative expense error.
8. A credit-card payment cannot exceed the card's current liability. Positive credit balances are not supported in this program.
9. Commitment-generated transactions are read-only in Transactions and route users to the owning commitment.
10. Archived accounts remain available for historical display and existing-transaction context, but not for new transaction selection.
11. Historical credit-card balances are never recalculated automatically because manual balance adjustments are not ledger entries.
12. Credit cards with potentially affected historical rows receive a persistent balance-review flag. The user clears it by confirming or adjusting that account.
13. Monthly totals remain independent of list search and filters.
14. Transfers and credit-card payments remain excluded from income and spending totals.
15. The selected month, type, search, filters, rows, and totals remain intact when navigating to and from transaction detail.

## Financial model

### Reporting classification

Storage remains compatible with `TransactionType`. Presentation and reporting resolve a derived class from the transaction plus source account type.

```text
if type = income and account.type = credit_card:
  reportingClass = card_credit
else:
  reportingClass = type
```

`card_credit` is a domain/reporting classification, not a new SQLite enum value.

### Balance-effect matrix

All amounts below are in the affected account's native currency.

| Reporting class | Source account | Source effect | Destination effect | Reporting effect |
| --- | --- | ---: | ---: | --- |
| Expense | Asset account | `-amount` | none | `+egp_amount` spending |
| Expense | Credit card | `+amount` liability | none | `+egp_amount` spending |
| Income | Asset account | `+amount` | none | `+egp_amount` income |
| Card credit | Credit card | `-amount` liability | none | `-egp_amount` spending |
| Transfer | Asset account | `-amount` | `+to_amount` | excluded |
| CC payment | Asset account | `-amount` | `-to_amount` card liability | excluded |

Credit-card Expense, Card credit, and CC payment must also update `revolving_balance` consistently with the existing installment/minimum-payment rules. The effect resolver must preserve current installment behavior and never produce a negative `current_balance` or `revolving_balance` for a card.

### Card-credit form behavior

When Income is selected and the chosen account is a credit card:

- The visible type label changes to `Card credit`.
- Supporting copy explains that it reduces card debt and offsets spending.
- The category picker shows expense categories.
- The budget picker follows the selected expense category and month.
- The saved SQLite type remains `income` for compatibility.
- List and detail presentation use the derived Card credit label/icon/tone.
- Editing an existing credit-card Income follows the same form and reporting rules.

Legacy credit-card Income rows with an income category remain readable. They reduce liability and net spending, but do not alter an expense-category budget until the user edits the row and selects an expense category.

### Monthly totals

For period `P`:

```text
cashIncome = sum(egp_amount where type = income and source account is not credit_card)
grossSpending = sum(egp_amount where type = expense)
cardCredits = sum(egp_amount where type = income and source account is credit_card)
netSpending = grossSpending - cardCredits
net = cashIncome - netSpending
```

Transactions generated for transfers and credit-card payments remain excluded. Search, type, account, category, and amount filters do not alter the monthly summary.

### Category and budget spending

New Card credits require an expense category. Their EGP amount subtracts from that category's selected-month spending and from the assigned named budget when present. Category and budget spending may not fall below zero in display; an excess credit is retained in the transaction/month totals and presented as unapplied credit rather than fabricating negative budget usage.

### Effect resolver

PR 1 introduces one pure domain resolver that receives:

- transaction type and normalized amounts;
- source and destination account types/currencies/balances;
- captured exchange rate and minimum-payment snapshot;
- whether the operation is create, update, or delete.

It returns:

- derived reporting class;
- source account delta;
- optional destination account delta;
- optional revolving-balance delta/result;
- income, spending, and budget reporting effects;
- validation errors when the combination is invalid.

Create applies the effect, delete applies its inverse, and update applies `inverse(old) + new` in one SQLite transaction. UI components never reproduce this logic.

## Ownership and mutation policy

### Commitment-owned transactions

A non-null `commitment_payment_id` identifies a commitment-owned ledger row.

- Transactions list and detail do not offer generic edit/delete.
- The source badge and action navigate to `/commitments/[commitmentId]`.
- If ownership cannot be resolved, the row remains read-only and presents a source-unavailable error rather than enabling generic mutation.
- Commitment payment edits/deletes update the payment, transaction, and account effects atomically through the commitment repository.
- Generic transaction repository update/delete rejects commitment-owned rows even if called outside the UI.

### Archived accounts

Accounts are split into two repository concepts:

- `selectableAccounts`: active accounts valid for new transactions.
- `accountLookup`: active and archived accounts valid for history, details, filtering historical rows, and existing-transaction context.

An existing transaction on an archived account can be corrected without silently changing currency. Its current archived account remains visible but cannot be selected for a new transaction or as a replacement account.

## Data migration and historical safety

### Migration 017

Append `017_add_account_balance_review.ts`.

```sql
ALTER TABLE accounts
ADD COLUMN balance_review_required INTEGER NOT NULL DEFAULT 0
CHECK(balance_review_required IN (0, 1));

UPDATE accounts
SET balance_review_required = 1
WHERE type = 'credit_card'
  AND EXISTS (
    SELECT 1
    FROM transactions t
    WHERE t.account_id = accounts.id
      AND t.type IN ('expense', 'income')
  );
```

The migration does not change `current_balance`, `opening_balance`, `revolving_balance`, or any transaction amount.

### Balance-review UX

Affected credit cards show a neutral warning on account detail:

- Title: `Review this card balance`.
- Body: transaction rules were corrected and the saved balance was not changed automatically.
- Primary action: opens Adjust Balance.
- Secondary action: confirms the balance is already correct.

Either successful adjustment or explicit confirmation clears `balance_review_required`. Dismissing the screen does not clear it.

## Validation contracts

### Repository authority

The repository validates every create/update/delete before opening a database mutation:

- source account exists;
- destination exists when required;
- source and destination differ;
- source/destination account types match the transaction type;
- archived accounts are allowed only when correcting an existing transaction that already references them;
- category type matches reporting class;
- budget belongs to the category and transaction month;
- amount and exchange rate are finite and positive;
- native, EGP, and destination amounts reconcile after rounding;
- card payment does not exceed current liability;
- commitment ownership permits the operation.

Missing rows and conflicts throw typed domain errors. Successful UI completion requires a confirmed affected row.

### Form validation

Add and edit use the shared RHF/Zod and normalized decimal parser patterns. The same schema rules drive inline errors and repository input. `Number.parseFloat` is not used as acceptance validation.

Dates use the shared local-calendar helper. Tests cover Cairo local midnight, month-end, and year-end.

### Pagination

List and account-history queries use:

```sql
ORDER BY transaction_date DESC,
         transaction_time DESC,
         created_at DESC,
         id DESC
```

The same ordering is used for every page and refresh.

## Query and state design

### Query key

The active transaction query is a serializable value containing:

- selected month;
- selected transaction type;
- debounced search;
- account/category selections;
- normalized amount range and currency;
- page size.

Rows, totals, loading/error state, request ID, and pagination metadata are stored with the query key that produced them. A result is rendered as current only when its key matches the active controls.

### Screen lifecycle

- Entering transaction detail preserves list state and scroll offset.
- Returning from detail restores the same context.
- Tab changes do not clear Transactions state.
- Explicit Clear resets search and filters but not the selected month unless the user requests it.
- Sign-out/app reset clears the module state.
- Pull-to-refresh preserves visible rows and marks them refreshing.

### State model

Use explicit states rather than nullable-data inference:

```text
idle
initialLoading
ready
refreshing
empty
firstLoadError
refreshErrorWithData
notFound (detail only)
```

Totals errors never become financial zeroes. Refresh failures keep the last successful values and expose Retry.

### Sheet lifecycle

- Add/edit sheets set `isDismissable={!saving}`.
- Save is idempotent while active.
- Form values remain mounted through the close animation.
- Form reset occurs after close completion.
- Reopening cannot observe a prior request's saving/error state.
- Footer sheets use `SHEET_FOOTER_CLEARANCE`.

## UI design

### Screen hierarchy

The Transactions screen remains a work-focused data surface:

1. Standard Transactions header.
2. Stable month and transaction-type scope rail.
3. SectionList whose header contains the monthly summary and compact search/filter row.
4. Date-grouped transaction rows.

The month/type scope remains visible while summary and search/filter can scroll away, increasing list space on small devices. The hierarchy should match the interaction model used by Commitments where equivalent controls exist.

### Monthly summary

Preserve the approved compact three-value structure and comparison row. Add explicit presentation-ready states:

- `No income`: spending is shown without a misleading income ratio.
- `Within income`: ordinary expense-to-income rail.
- `Over income`: rail caps visually but copy and marker preserve the true amount/percentage.
- `Net credit`: card credits exceed gross spending; the spending cell presents a credit state.
- Error with previous data: previous values remain visible with a retry affordance.

Loading, success, edge, and error variants share one geometry contract.

### Transaction row geometry

Use stable columns:

```text
[fixed icon] [shrinking content] [fixed value/time] [optional action]
```

- Category/type title truncates to one line.
- Note and account context use bounded secondary rows.
- Values use Sora/tabular numerals and never shrink into unreadable text.
- Transfer rows show source amount and destination native amount.
- Card credits use a distinct neutral/positive credit treatment, not ordinary income copy.
- Commitment-owned rows show source context and no generic destructive actions.
- Long labels and large amounts grow vertically only within documented row variants.

### Detail screen

- Use the standard `StackHeader` with one edit action only when mutation is allowed.
- Initial load uses geometry-matched skeletons.
- Refresh/edit revalidation keeps existing content visible.
- Hero resolves the derived Card credit type.
- Transfer/CC flow shows source and destination native amounts.
- Details include named budget and source ownership when present.
- Commitment source action navigates to the owning commitment.
- Error and not-found states remain distinct and retryable.

### Add/edit sheets

- Type selection uses HeroUI `Tabs`.
- Account/category/budget rows use existing HeroUI-backed project wrappers.
- Card-credit semantics update labels and category options immediately without layout jumps.
- FX preview shows `You send` and `Recipient gets` using the shared conversion model.
- Date selection uses a compact controlled sheet/dialog with Done and Cancel.
- Budget selection uses a scrollable bottom-sheet list.
- Save buttons expose loading and cannot be double-submitted or dismissed mid-save.

### Search and filters

- Search covers note, account, category, named budget, derived type label, and normalized amount where practical.
- Min/max values use normalized parsing.
- `min > max` shows an inline error and disables Apply.
- Filter section headers use stable label/summary/chevron columns with truncation.
- Existing compact filter badge remains.

### Skeleton and transition contract

Skeletons reuse the same outer containers, paddings, fixed columns, and minimum heights as loaded content. The list skeleton includes a representative date header and compact/expanded row variants. Refresh never replaces loaded content with skeletons.

No control selection may resize its rail, and no async state may change the summary card's outer height.

### Accessibility

- Summary progress exposes `accessibilityRole="progressbar"` and numeric value text.
- Tabs, picker rows, filter selections, and actions expose role/state.
- Transfer rows announce both accounts and native amounts.
- Icon-only controls use centralized labels and standard touch targets.
- Error messages are announced and associated with their inputs.

## Architecture and code standards

1. Route files remain one-line re-exports.
2. Full screens use `Screen`/`ScreenScroll` and standard headers.
3. `index.tsx` files remain declarative and contain no `useState` or navigation orchestration.
4. Reactive data belongs in `.store.ts`; view-only state belongs in `.state.ts`; behavior belongs in `.hook.ts`; Reanimated belongs in `.anim.ts`.
5. HeroUI Native primitives are used wherever available, including `Tabs`, `Skeleton`, `SearchField`/`Input`, `ListGroup`, and `BottomSheet` through the project `Sheet` wrapper.
6. All user-visible copy belongs in `src/constants/strings.ts`.
7. Colors, spacing, radius, and typography use canonical tokens/classes. Runtime colors use `theme_tokens.ts`.
8. Financial and display calculations are pure helpers/view models with direct unit tests.
9. Database files contain SQL mechanics; repository/domain code owns business rules and transaction orchestration.
10. No new dependency, custom HeroUI-equivalent primitive, or hardcoded hex value is introduced.

## Error handling

Typed errors cover:

- transaction not found;
- account/category/budget not found;
- invalid account/type combination;
- invalid amount/rate/currency conversion;
- archived account not selectable;
- card payment exceeds liability;
- commitment-owned mutation rejected;
- database write conflict/failure.

Hooks translate typed errors into centralized, actionable copy. Unknown errors use the standard fallback and remain logged for debugging. Sheets retain user input after recoverable failures.

## Pull request sequence

### PR 1: Transaction ledger integrity

**Branch:** `fix/transactions-ledger-integrity`

Includes:

- effect resolver and reporting classification;
- card expense, Card credit, CC payment, update, and delete correctness;
- payment cap;
- commitment ownership enforcement and navigation metadata;
- historical account lookup;
- migration 017 and balance-review UX;
- local-date, normalized rate, repository, and pagination fixes;
- direct unit/database integration tests for all changed behavior.

Does not alter list loading architecture or broad presentation geometry.

### PR 2: Transaction state stability

**Branch:** `fix/transactions-state-stability`

Includes:

- query-keyed snapshots;
- explicit loading/error state model;
- navigation and scroll preservation;
- stale-while-refresh behavior;
- detail revalidation;
- add/edit save and close lifecycle;
- focused state and transition tests.

Does not perform the larger list/detail visual refinement.

### PR 3: Transaction UI refinement

**Branch:** `feat/transactions-ux-refinement`

Includes:

- screen scrolling hierarchy;
- summary edge states and shared geometry;
- stable row columns and richer transfer/Card credit/source/budget presentation;
- detail layout refinement;
- compact date and scrollable budget pickers;
- search/filter validation and reach;
- matching skeletons and accessibility;
- rendering tests for all approved visual states.

Requires physical-device QA before approval.

### PR 4: Transaction standards and test hardening

**Branch:** `refactor/transactions-standards-tests`

Includes:

- remaining HeroUI migrations;
- standard header and module-anatomy cleanup;
- strings/tokens/comment cleanup;
- typed test builders and unsafe-`any` removal;
- complete cross-screen rendering/geometry matrix;
- removal of obsolete transaction code exposed by the first three PRs.

No new product behavior is introduced in this PR.

## Test strategy

### Pure unit tests

- effect resolver matrix for every valid/invalid account/type pair;
- create/update/delete inversion;
- card-credit reporting and budget effects;
- currency conversion in every direction;
- local-date boundaries;
- summary edge-state view models;
- filter normalization and validation.

### Database integration tests

- asset expense/income lifecycle;
- credit-card expense/Card credit lifecycle;
- CC payment and overpayment rejection;
- revolving/installment behavior preservation;
- commitment-owned mutation rejection;
- archived account resolution;
- transaction rollback after any failed account update;
- deterministic equal-timestamp pagination;
- migration 017 marking without balance changes.

### Rendering tests

- summary loading/success/no-income/over-income/net-credit/error states;
- rows with long labels, large values, notes, FX, transfer, Card credit, budget, and commitment source;
- initial, refresh, empty, first-load error, and refresh-error-with-data states;
- add/edit saving and recoverable failure;
- filter invalid range;
- detail loading, refresh, not-found, owned, and editable states;
- loaded-versus-skeleton outer geometry.

### Manual device QA

Run on physical Android and iOS-class layouts where available:

1. Small and large viewport geometry.
2. Keyboard open/close in add/edit/filter sheets.
3. Date and budget picker interaction.
4. Month/type/search/filter changes under slow loading.
5. Pull-to-refresh success and failure.
6. Detail round-trip preserving list position.
7. Card expense, Card credit, and CC payment balances.
8. Affected-card review prompt and clearing behavior.
9. Commitment-owned transaction navigation.
10. Long labels, large amounts, and all skeleton transitions.

## Acceptance criteria

1. Every supported transaction operation has a tested reversible balance effect.
2. Card credits reduce liability and spending, never income.
3. CC overpayment is rejected without partial writes.
4. Commitment-owned rows cannot be generically edited or deleted.
5. Existing balances are unchanged by migration 017.
6. Archived-account transactions retain correct names, currencies, and flow context.
7. No database failure is presented as zero totals, empty data, or not found.
8. Controls and displayed rows always share the same query key.
9. Detail navigation preserves month, filters, search, rows, and scroll position.
10. Saving sheets cannot be dismissed or double-submitted.
11. Loading, loaded, edge, and error variants retain stable outer geometry.
12. Transfers show source and destination native amounts correctly.
13. Budget and commitment ownership are visible in detail.
14. Transactions use the required HeroUI/project primitives and module anatomy.
15. Focused tests, full unit suite, format, lint, typecheck, Expo Doctor, and Android prebuild pass before every push.
16. PR 3 passes the physical-device QA gate.

## Risks and mitigations

### Financial regression

Mitigation: land the pure effect resolver and exhaustive database matrix before changing UI. Keep all account writes inside one SQLite transaction.

### Historical balance ambiguity

Mitigation: never recalculate automatically. Mark potentially affected cards and require explicit user review.

### Cross-domain commitment regression

Mitigation: make the ownership rule repository-enforced and add commitment payment integration tests before removing UI actions.

### Large state refactor

Mitigation: isolate it in PR 2, preserve the existing visual contract, and test query races before PR 3 changes geometry.

### UI shift regressions

Mitigation: shared geometry constants/primitives, direct render tests, slow-request testing, and mandatory device QA.

### PR overlap

Mitigation: merge in order. Each later branch starts from the merged predecessor; no parallel implementation worktrees edit the same Transactions files.

## Rollout

1. Merge PRs in order after local CI parity and review.
2. PR 1 activates corrected mutation behavior immediately; no feature flag is required because tests cover the old and new effects at the database boundary.
3. PR 3 remains blocked on device QA.
4. After all four PRs merge, run a whole-app financial and UI audit as previously agreed for Budget Phases 3 and 4 completion.
