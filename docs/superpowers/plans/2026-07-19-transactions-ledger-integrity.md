# Transactions Ledger Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make transaction and commitment-payment mutations financially correct, ownership-safe, historically resolvable, locally dated, strictly validated, and deterministically ordered.

**Architecture:** Add a pure transaction policy layer that derives reporting class and account effects from transaction/account types. Repositories load authoritative account/category/budget context, validate commands, and orchestrate one SQLite transaction; query modules perform focused SQL operations. Existing `income` rows on credit cards are derived as Card credits without changing the persisted transaction enum.

**Tech Stack:** Expo SQLite, TypeScript strict, Zustand v5, RHF v7, Zod v4, HeroUI Native, Expo Router, Jest, better-sqlite3 query-executor tests.

---

## File map

### New files

- `src/modules/transactions/domain/transaction_policy.ts` - pure reporting classification, normalized amounts, and account-effect resolution.
- `src/modules/transactions/repositories/transaction.errors.ts` - typed repository/domain errors.
- `src/database/migrations/017_add_account_balance_review.ts` - non-destructive historical-card review flag.
- `src/modules/accounts/screens/accounts/detail/components/balance_review_alert.tsx` - HeroUI-backed review prompt.
- `__tests__/transactions/transaction_policy.test.ts` - exhaustive pure policy matrix.
- `__tests__/database/migrations/017_add_account_balance_review.test.ts` - migration safety.

### Primary modified files

- `src/database/migrations/index.ts`
- `src/modules/accounts/entities/account.entity.ts`
- `src/modules/accounts/database/accounts.ts`
- `src/modules/accounts/repositories/account.repository.ts`
- `src/modules/accounts/screens/accounts/detail/account_detail.hook.ts`
- `src/modules/accounts/screens/accounts/detail/index.tsx`
- `src/modules/transactions/database/transactions.ts`
- `src/modules/transactions/repositories/transaction.repository.ts`
- `src/modules/transactions/screens/transactions/transaction_form/add_transaction.hook.ts`
- `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook.ts`
- `src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx`
- `src/modules/transactions/screens/transactions/components/transaction_row.tsx`
- `src/modules/transactions/screens/transactions/detail/detail.hook.ts`
- `src/modules/transactions/screens/transactions/detail/index.tsx`
- `src/modules/budget/database/budget_stats.ts`
- `src/modules/budget/database/budget_month_profiles.ts`
- `src/modules/commitments/repositories/commitment.repository.ts`
- `src/modules/commitments/database/commitment_payments.ts`
- `src/modules/commitments/screens/commitments/detail/components/pay_sheet.hook.ts`
- `src/constants/strings.ts`

### Existing tests extended

- `__tests__/transaction.query_executor.test.ts`
- `__tests__/update_transaction.query_executor.test.ts`
- `__tests__/transaction.repository.test.ts`
- `__tests__/transactions_get_period_totals.test.ts`
- `__tests__/budget_stats.query.test.ts`
- `__tests__/budget_month_profiles.query.test.ts`
- `__tests__/spending_plans.query.test.ts`
- `__tests__/database_get_transactions_filter.test.ts`
- `__tests__/commitment_payments.query.test.ts`
- `__tests__/commitment.repository.test.ts`
- `__tests__/screens/transactions/transaction_form/add_transaction.hook.test.ts`
- `__tests__/screens/transactions/transaction_form/edit_transaction.hook.test.ts`
- `__tests__/screens/transactions/transactions_hook.test.ts`
- `__tests__/screens/transactions/detail/detail_helpers.test.ts`
- `__tests__/screens/accounts/account_detail.hook.test.ts`
- account fixture builders affected by the new DB column.

---

### Task 1: Add the non-destructive card balance-review migration

**Files:**
- Create: `src/database/migrations/017_add_account_balance_review.ts`
- Create: `__tests__/database/migrations/017_add_account_balance_review.test.ts`
- Modify: `src/database/migrations/index.ts`
- Modify: `src/modules/accounts/entities/account.entity.ts`
- Modify: account fixtures that construct a complete `Account`

- [ ] **Step 1: Write the migration test before the migration**

Create a real SQLite test that applies migrations through 016, seeds:

```ts
const balances = {
  affected: { current: 850, opening: 1000, revolving: 300 },
  unaffected: { current: 400, opening: 400, revolving: 100 },
};

// affected card has a legacy expense; unaffected card has only a cc_payment.
expect(affected.balance_review_required).toBe(1);
expect(unaffected.balance_review_required).toBe(0);
expect(affected.current_balance).toBe(balances.affected.current);
expect(affected.opening_balance).toBe(balances.affected.opening);
expect(affected.revolving_balance).toBe(balances.affected.revolving);
```

Also assert migration version 17 is registered exactly once.

- [ ] **Step 2: Run the migration test and verify the red state**

Run:

```bash
npm test -- --runInBand __tests__/database/migrations/017_add_account_balance_review.test.ts
```

Expected: FAIL because migration 017 and `balance_review_required` do not exist.

- [ ] **Step 3: Add migration 017 and the entity field**

Implement:

```ts
export const migration017 = {
  version: 17,
  up: `
    ALTER TABLE accounts
      ADD COLUMN balance_review_required INTEGER NOT NULL DEFAULT 0
      CHECK(balance_review_required IN (0, 1));

    UPDATE accounts
       SET balance_review_required = 1
     WHERE type = 'credit_card'
       AND EXISTS (
         SELECT 1 FROM transactions t
          WHERE t.account_id = accounts.id
            AND t.type IN ('expense', 'income')
       );
  `,
};
```

Append it to `MIGRATIONS` and add `balance_review_required: 0 | 1` to `Account`. New accounts initialize it to `0` in the repository. Update complete account fixtures with `balance_review_required: 0`; do not make the field optional.

- [ ] **Step 4: Run migration and schema tests**

Run:

```bash
npm test -- --runInBand \
  __tests__/database/migrations/017_add_account_balance_review.test.ts \
  __tests__/schema.test.ts \
  __tests__/account.repository.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the migration slice**

```bash
git add src/database/migrations src/modules/accounts/entities/account.entity.ts \
  src/modules/accounts/repositories/account.repository.ts __tests__
git commit -m "feat(accounts): flag legacy card balances for review"
```

### Task 2: Build the pure transaction policy

**Files:**
- Create: `src/modules/transactions/domain/transaction_policy.ts`
- Create: `__tests__/transactions/transaction_policy.test.ts`
- Modify: `src/modules/transactions/entities/transaction.entity.ts`

- [ ] **Step 1: Write the exhaustive reporting-class tests**

Cover the complete matrix:

```ts
expect(resolveReportingClass(TransactionType.Income, AccountType.Bank)).toBe('income');
expect(resolveReportingClass(TransactionType.Income, AccountType.CreditCard)).toBe('card_credit');
expect(resolveReportingClass(TransactionType.Expense, AccountType.CreditCard)).toBe('expense');
expect(resolveReportingClass(TransactionType.CCPayment, AccountType.Bank)).toBe('cc_payment');
```

Add table-driven tests for source balance delta:

```ts
it.each([
  [TransactionType.Expense, AccountType.Bank, -100],
  [TransactionType.Expense, AccountType.CreditCard, 100],
  [TransactionType.Income, AccountType.Bank, 100],
  [TransactionType.Income, AccountType.CreditCard, -100],
] as const)('resolves %s on %s', (type, accountType, expected) => {
  expect(resolvePrimaryBalanceDelta({ type, sourceAccountType: accountType, amount: 100 })).toBe(
    expected,
  );
});
```

Test inverse and update behavior:

```ts
expect(resolveUpdateDelta(oldCommand, newCommand)).toEqual(
  mergeAccountDeltas(invertAccountDeltas(resolveCreateDeltas(oldCommand)), resolveCreateDeltas(newCommand)),
);
```

Include invalid Transfer/CCPayment account combinations, card credit beyond liability, and CC payment beyond liability.

- [ ] **Step 2: Run the policy test and verify failure**

```bash
npm test -- --runInBand __tests__/transactions/transaction_policy.test.ts
```

Expected: FAIL because the domain module does not exist.

- [ ] **Step 3: Implement the pure policy API**

Use explicit types:

```ts
export type TransactionReportingClass =
  | 'expense'
  | 'income'
  | 'card_credit'
  | 'transfer'
  | 'cc_payment';

export interface LedgerAccountSnapshot {
  id: string;
  type: AccountType;
  currency: Currency;
  currentBalance: number;
  revolvingBalance: number | null;
  minimumPayment: number | null;
}

export interface AccountDelta {
  accountId: string;
  currentBalance: number;
  revolvingBalance: number;
}

export interface TransactionPolicyCommand {
  type: TransactionType;
  amount: number;
  egpAmount: number;
  toAmount: number | null;
  minimumPaymentSnapshot: number | null;
  source: LedgerAccountSnapshot;
  destination?: LedgerAccountSnapshot;
}
```

Export pure functions for reporting class, create effects, inversion, update effects, and validation. Preserve the existing MENA card-payment rule: payment up to the captured minimum affects current liability only; excess reduces revolving balance.

Ordinary card expenses/credits change `current_balance`; `revolving_balance` remains governed by the existing explicit payment/installment model. Document this boundary in the helper so PR 1 does not silently redefine debt-principal tracking.

Update the transaction entity contract so `budget_id` is valid for ordinary expenses and derived Card credits, while transfers, cash income, and CC payments keep it null.

- [ ] **Step 4: Run policy tests**

```bash
npm test -- --runInBand __tests__/transactions/transaction_policy.test.ts
```

Expected: PASS with every matrix row named in output.

- [ ] **Step 5: Commit the policy**

```bash
git add src/modules/transactions/domain src/modules/transactions/entities \
  __tests__/transactions/transaction_policy.test.ts
git commit -m "feat(transactions): add account effect policy"
```

### Task 3: Move transaction mutations behind validated repository orchestration

**Files:**
- Create: `src/modules/transactions/repositories/transaction.errors.ts`
- Modify: `src/modules/transactions/repositories/transaction.repository.ts`
- Modify: `src/modules/transactions/database/transactions.ts`
- Modify: `src/modules/accounts/database/accounts.ts`
- Modify: `__tests__/transaction.repository.test.ts`
- Modify: `__tests__/transaction.query_executor.test.ts`
- Modify: `__tests__/update_transaction.query_executor.test.ts`

- [ ] **Step 1: Add failing repository tests for invalid commands and missing rows**

Cover typed failures:

```ts
await expect(repo.update('missing', validUpdate)).rejects.toBeInstanceOf(
  TransactionNotFoundError,
);
await expect(repo.delete('missing')).rejects.toBeInstanceOf(TransactionNotFoundError);
await expect(repo.add(cardPaymentAboveBalance)).rejects.toBeInstanceOf(
  TransactionBalanceError,
);
await expect(repo.add(transferFromCreditCard)).rejects.toBeInstanceOf(
  TransactionValidationError,
);
```

Assert every rejection leaves transaction count and all account balances unchanged.

- [ ] **Step 2: Add failing query-executor tests for card effects**

Required lifecycle assertions:

```ts
// Expense on CC: 500 -> 700
// Delete expense: 700 -> 500
// Update 200 -> 350: 700 -> 850
// Card credit: 850 -> 750
// Delete credit: 750 -> 850
// Update credit 100 -> 125: 750 -> 725
```

Also test update/delete rejection when an operation would drive a card below zero, and rollback after an injected SQL failure.

- [ ] **Step 3: Run the focused tests and verify failure**

```bash
npm test -- --runInBand \
  __tests__/transaction.repository.test.ts \
  __tests__/transaction.query_executor.test.ts \
  __tests__/update_transaction.query_executor.test.ts
```

Expected: FAIL on card signs, overpayment, and missing-row success.

- [ ] **Step 4: Add focused account SQL primitives**

In `accounts.ts`, add active/history lookup and delta operations:

```ts
export async function getAccountByIdIncludingArchived(
  db: SQLiteDatabase,
  id: string,
): Promise<Account | undefined>;

export async function applyAccountDelta(
  db: SQLiteDatabase,
  delta: AccountDelta,
  updatedAt: string,
): Promise<void>;
```

`applyAccountDelta` verifies one affected row. It updates `revolving_balance` only when the delta is non-zero and preserves null when the policy does not own that field.

- [ ] **Step 5: Make query functions SQL-only mutation primitives**

Refactor transaction database exports to:

```ts
insertTransactionRow(db, tx)
updateTransactionRow(db, id, updates, snapshots)
deleteTransactionRow(db, id)
```

Remove transaction-type branching and `withTransactionAsync` from those row primitives. Keep list/detail/total SQL in the same module.

- [ ] **Step 6: Implement repository command orchestration**

For add/update/delete:

1. Load transaction and active-or-archived account snapshots.
2. Resolve normalized policy command(s).
3. Validate account/type/category/budget/amount/rate/ownership rules.
4. Open one `db.withTransactionAsync`.
5. Write the transaction row and apply all account deltas.
6. Verify every affected row.

Create typed errors:

```ts
export class TransactionNotFoundError extends Error {}
export class TransactionValidationError extends Error {}
export class TransactionOwnershipError extends Error {}
export class TransactionBalanceError extends Error {}
```

For an updated CCPayment, validate the new destination amount against liability after reversing the old payment. For Card credit, validate against liability after reversing the old credit.

- [ ] **Step 7: Run repository and query tests**

```bash
npm test -- --runInBand \
  __tests__/transactions/transaction_policy.test.ts \
  __tests__/transaction.repository.test.ts \
  __tests__/transaction.query_executor.test.ts \
  __tests__/update_transaction.query_executor.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit repository orchestration**

```bash
git add src/modules/transactions src/modules/accounts/database/accounts.ts __tests__
git commit -m "fix(transactions): enforce atomic account effects"
```

### Task 4: Correct commitment payment normalization and ownership

**Files:**
- Modify: `src/modules/commitments/repositories/commitment.repository.ts`
- Modify: `src/modules/commitments/database/commitment_payments.ts`
- Modify: `src/modules/commitments/screens/commitments/detail/components/pay_sheet.hook.ts`
- Modify: `src/modules/transactions/repositories/transaction.repository.ts`
- Modify: `__tests__/commitment.repository.test.ts`
- Modify: `__tests__/commitment_payments.query.test.ts`
- Modify: `__tests__/screens/commitments_pay_sheet.hook.test.ts`

- [ ] **Step 1: Add failing conversion tests for commitment payments**

Test all source account combinations:

```text
EGP commitment -> EGP asset: amount=500 EGP, native=500, egp=500
USD commitment -> EGP asset at 50: face=10 USD, native=500 EGP, egp=500
EGP commitment -> USD asset at 50: face=500 EGP, native=10 USD, egp=500
USD commitment -> USD asset at 50: face=10 USD, native=10 USD, egp=500
EGP commitment -> EGP credit card: liability increases by 500
```

Assert the saved transaction `amount` and `currency` always match the selected account's native currency, while `egp_amount` remains EGP.

- [ ] **Step 2: Add failing ownership tests**

```ts
await expect(transactionRepository.update(linkedTx.id, update)).rejects.toBeInstanceOf(
  TransactionOwnershipError,
);
await expect(transactionRepository.delete(linkedTx.id)).rejects.toBeInstanceOf(
  TransactionOwnershipError,
);
```

Assert the payment, transaction, and account remain unchanged.

- [ ] **Step 3: Run commitment-focused tests and verify failure**

```bash
npm test -- --runInBand \
  __tests__/commitment.repository.test.ts \
  __tests__/commitment_payments.query.test.ts \
  __tests__/screens/commitments_pay_sheet.hook.test.ts \
  __tests__/transaction.repository.test.ts
```

Expected: FAIL on native amount/currency, credit-card sign, and ownership checks.

- [ ] **Step 4: Normalize commitment payment amounts in the repository**

Load the selected account and current USD/EGP rate. Resolve:

```ts
interface CommitmentPaymentAmounts {
  accountNativeAmount: number;
  accountCurrency: Currency;
  egpAmount: number;
  exchangeRate: number | null;
}
```

Use the same normalized conversion helper as Transactions. A USD account always captures a rate for EGP reporting, even when commitment and account are both USD. The pay-sheet schema requires a positive rate whenever either the commitment or selected account is USD; the stored currency rate may satisfy it without forcing manual override.

- [ ] **Step 5: Keep payment, transaction, and account effect atomic**

Change `markCommitmentAsPaid` to accept the validated account delta produced by policy. Inside one SQLite transaction:

1. update the payment;
2. insert the transaction row, including `budget_id` as null;
3. apply the account delta with correct card/asset sign;
4. link `transaction_id` back to the payment.

Do not call the generic transaction repository inside an existing SQLite transaction.

- [ ] **Step 6: Enforce ownership at the transaction repository boundary**

Before generic update/delete:

```ts
if (existing.commitment_payment_id !== null) {
  throw new TransactionOwnershipError(Strings.transactionOwnedByCommitment);
}
```

- [ ] **Step 7: Run commitment and transaction tests**

```bash
npm test -- --runInBand \
  __tests__/commitment.repository.test.ts \
  __tests__/commitment_payments.query.test.ts \
  __tests__/screens/commitments_pay_sheet.hook.test.ts \
  __tests__/transaction.repository.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit commitment ownership and conversion**

```bash
git add src/modules/commitments src/modules/transactions/repositories \
  __tests__/commitment.repository.test.ts __tests__/commitment_payments.query.test.ts \
  __tests__/screens/commitments_pay_sheet.hook.test.ts __tests__/transaction.repository.test.ts
git commit -m "fix(commitments): normalize owned transaction effects"
```

### Task 5: Correct reporting totals and historical lookup

**Files:**
- Modify: `src/modules/transactions/database/transactions.ts`
- Modify: `src/modules/transactions/repositories/transaction.repository.ts`
- Modify: `src/modules/accounts/repositories/account.repository.ts`
- Modify: `src/modules/accounts/store/account.store.ts`
- Modify: `src/modules/budget/database/budget_stats.ts`
- Modify: `src/modules/budget/database/budget_month_profiles.ts`
- Modify: `src/modules/transactions/screens/transactions/transactions.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/detail/detail.hook.ts`
- Modify: `__tests__/transactions_get_period_totals.test.ts`
- Modify: `__tests__/budget_stats.query.test.ts`
- Modify: `__tests__/budget_month_profiles.query.test.ts`
- Modify: `__tests__/spending_plans.query.test.ts`
- Modify: `__tests__/database_get_transactions_filter.test.ts`
- Modify: `__tests__/screens/transactions/transactions_hook.test.ts`
- Modify: `__tests__/screens/transactions/detail/detail_helpers.test.ts`

- [ ] **Step 1: Add failing Card-credit totals tests**

Seed `1000` cash income, `600` gross expense, and `150` Income on a credit card. Assert:

```ts
expect(totals).toEqual({
  incomeEgp: 1000,
  expenseEgp: 450,
  netEgp: 550,
});
```

Also assert transfer/CCPayment exclusion and a net-credit period where Card credits exceed expenses.

Add category/named-budget/temporary-plan tests that seed a `600` expense and `150` Card credit assigned to the same expense category/budget. Assert recorded spend is `450`, never `750`. Add an excess-credit case and assert user-facing category, named-budget, 50/30/20, and spending-plan results clamp at `0` while period totals retain the truthful negative net-spending amount.

Add dashboard month-stat tests that assert native and EGP spending subtract Card credits. The transaction count includes both expenses and Card-credit rows because both contributed to the displayed net-spending result. Add trailing-income tests proving Card credits never enter the income suggestion.

- [ ] **Step 2: Add failing archived-account lookup tests**

Archive a USD source account after creating a transaction. Assert list/detail account resolution still returns its name, type, and USD currency, while the new-transaction picker store remains active-only.

- [ ] **Step 3: Run the tests and verify failure**

```bash
npm test -- --runInBand \
  __tests__/transactions_get_period_totals.test.ts \
  __tests__/budget_stats.query.test.ts \
  __tests__/budget_month_profiles.query.test.ts \
  __tests__/spending_plans.query.test.ts \
  __tests__/database_get_transactions_filter.test.ts \
  __tests__/screens/transactions/transactions_hook.test.ts \
  __tests__/screens/transactions/detail/detail_helpers.test.ts
```

Expected: FAIL because card Income is counted as cash income and archived accounts are absent.

- [ ] **Step 4: Join accounts when calculating totals**

Use source account type to classify Income:

```sql
SELECT
  COALESCE(SUM(CASE WHEN t.type = 'income' AND a.type <> 'credit_card'
                    THEN t.egp_amount ELSE 0 END), 0) AS income,
  COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.egp_amount
                    WHEN t.type = 'income' AND a.type = 'credit_card'
                    THEN -t.egp_amount ELSE 0 END), 0) AS expense
FROM transactions t
JOIN accounts a ON a.id = t.account_id
WHERE t.transaction_date >= ? AND t.transaction_date <= ?
```

Return truthful negative `expenseEgp` for net-credit periods; presentation is PR 3.

Update budget/category spending subqueries to join the source account and aggregate:

```sql
SUM(CASE
      WHEN transaction_row.type = 'expense' THEN transaction_row.egp_amount
      WHEN transaction_row.type = 'income' AND account_row.type = 'credit_card'
        THEN -transaction_row.egp_amount
      ELSE 0
    END)
```

Clamp the returned category/budget `spent` value with `Math.max(0, value)` at the repository/view-model boundary. Do not clamp transaction period totals.

Apply the same reporting expression to `getMonthExpenseStats`, 50/30/20 recorded spend, and spending-plan category spend. Exclude credit-card Income from `getTrailingIncomeSuggestion` by joining the source account and requiring `account.type <> 'credit_card'`.

- [ ] **Step 5: Add active and historical account repository APIs**

Keep `getAll()` active-only. Add:

```ts
getByIdsIncludingArchived(ids: string[]): Promise<Account[]>;
getByIdIncludingArchived(id: string): Promise<Account | undefined>;
```

Transactions list/detail load missing IDs into an `accountLookup` map without adding archived accounts to `selectableAccounts`.

- [ ] **Step 6: Run totals and historical tests**

Run the Step 3 command. Expected: PASS.

- [ ] **Step 7: Commit reporting and historical lookup**

```bash
git add src/modules/accounts src/modules/transactions __tests__
git commit -m "fix(transactions): classify card credits in reporting"
```

### Task 6: Normalize forms, local dates, and card-credit category behavior

**Files:**
- Modify: `src/modules/transactions/screens/transactions/transaction_form/add_transaction.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.helpers.ts`
- Modify: `src/constants/strings.ts`
- Modify: `__tests__/screens/transactions/transaction_form/add_transaction.hook.test.ts`
- Modify: `__tests__/screens/transactions/transaction_form/edit_transaction.hook.test.ts`
- Modify: `__tests__/format_date.test.ts`

- [ ] **Step 1: Add failing schema and local-date tests**

Cover:

```text
50abc rate -> invalid
0 rate -> invalid
negative rate -> invalid
50.25 rate -> valid
Cairo 2026-07-01 00:30 -> 2026-07-01, not 2026-06-30
Income + credit-card account -> Card credit + expense categories
Card credit + income category -> invalid
Card credit amount above liability -> repository error shown without closing
```

- [ ] **Step 2: Run hook/date tests and verify failure**

```bash
npm test -- --runInBand \
  __tests__/screens/transactions/transaction_form/add_transaction.hook.test.ts \
  __tests__/screens/transactions/transaction_form/edit_transaction.hook.test.ts \
  __tests__/format_date.test.ts
```

Expected: FAIL on permissive rate parsing, UTC date, and Card-credit category behavior.

- [ ] **Step 3: Use shared normalized decimal validation**

Add or reuse a parser with a full-string decimal contract:

```ts
const normalizedRateSchema = z
  .string()
  .trim()
  .refine((value) => /^\d+(?:\.\d+)?$/.test(value), Strings.addTxErrRateInvalid)
  .transform(Number)
  .refine((value) => Number.isFinite(value) && value > 0, Strings.addTxErrRateInvalid);
```

Do not accept a malformed prefix through `parseFloat`. Derive normalized amounts once and pass them to the repository.

- [ ] **Step 4: Use local date and submit time**

Replace UTC slicing with:

```ts
const date = toLocalDateString(new Date());
const time = new Date().toTimeString().slice(0, 8);
```

Use submit time for a new transaction. Edit continues preserving its existing transaction time until PR 3 adds an explicit time control.

- [ ] **Step 5: Derive Card-credit UI semantics**

```ts
const isCardCredit =
  type === TransactionType.Income && selectedAccount?.type === AccountType.CreditCard;
const categoryType = isCardCredit ? CategoryType.Expense : CategoryType.Income;
const usesBudget = type === TransactionType.Expense || isCardCredit;
```

Use expense categories and budget eligibility for Card credits. Update repository budget assignment to accept `reportingClass === 'expense' || reportingClass === 'card_credit'`, not only persisted type `expense`. Pass `isCardCredit` and centralized title/supporting copy into the presentational form body. Keep storage type as `income`.

- [ ] **Step 6: Run hook/date tests**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 7: Commit form correctness**

```bash
git add src/modules/transactions/screens/transactions/transaction_form \
  src/constants/strings.ts __tests__/screens/transactions/transaction_form \
  __tests__/format_date.test.ts
git commit -m "fix(transactions): validate card credit and FX input"
```

### Task 7: Remove generic actions from commitment-owned transactions

**Files:**
- Modify: `src/modules/transactions/screens/transactions/components/transaction_row.tsx`
- Modify: `src/modules/transactions/screens/transactions/index.tsx`
- Modify: `src/modules/transactions/screens/transactions/detail/detail.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/detail/index.tsx`
- Modify: `src/modules/transactions/screens/transactions/detail/components/action_row.tsx`
- Modify: `src/constants/strings.ts`
- Test: `__tests__/screens/transactions/transaction_row.test.tsx`
- Test: `__tests__/screens/transactions/detail/detail_screen_actions.test.tsx`

- [ ] **Step 1: Add direct rendering tests for ownership actions**

```ts
render(<TransactionRow tx={linkedTx} {...props} />);
expect(screen.queryByText(Strings.swipeEdit)).toBeNull();
expect(screen.queryByText(Strings.swipeDelete)).toBeNull();

render(<TransactionDetailScreen />, { ownedTransaction });
expect(screen.queryByText(Strings.edit)).toBeNull();
expect(screen.queryByText(Strings.delete)).toBeNull();
expect(screen.getByText(Strings.viewCommitment)).toBeTruthy();
```

Pressing `View commitment` must route to `/commitments/[commitmentId]`, resolved through `commitmentRepository.getPaymentById`.

- [ ] **Step 2: Run the rendering tests and verify failure**

```bash
npm test -- --runInBand \
  __tests__/screens/transactions/transaction_row.test.tsx \
  __tests__/screens/transactions/detail/detail_screen_actions.test.tsx
```

Expected: FAIL because owned rows still expose generic actions.

- [ ] **Step 3: Make ownership presentation declarative**

Derive:

```ts
const isCommitmentOwned = tx.commitment_payment_id !== null;
const actions = isCommitmentOwned ? [] : ordinaryActions;
```

Detail hook resolves `commitmentId` once and returns:

```ts
state: { isEditable, isDeletable, commitmentId }
openCommitment: () => router.push(`/commitments/${commitmentId}`)
```

Keep the repository rejection as the authoritative safeguard.

- [ ] **Step 4: Run rendering and ownership tests**

```bash
npm test -- --runInBand \
  __tests__/screens/transactions/transaction_row.test.tsx \
  __tests__/screens/transactions/detail/detail_screen_actions.test.tsx \
  __tests__/transaction.repository.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit ownership UX**

```bash
git add src/modules/transactions/screens/transactions src/constants/strings.ts __tests__/screens/transactions
git commit -m "fix(transactions): protect commitment-owned rows"
```

### Task 8: Add the affected-card review UX

**Files:**
- Modify: `src/modules/accounts/database/accounts.ts`
- Modify: `src/modules/accounts/repositories/account.repository.ts`
- Modify: `src/modules/accounts/store/account.store.ts`
- Modify: `src/modules/accounts/screens/accounts/detail/account_detail.hook.ts`
- Create: `src/modules/accounts/screens/accounts/detail/components/balance_review_alert.tsx`
- Modify: `src/modules/accounts/screens/accounts/detail/index.tsx`
- Modify: `src/constants/strings.ts`
- Modify: `__tests__/account.repository.test.ts`
- Modify: `__tests__/screens/accounts/account_detail.hook.test.ts`
- Create: `__tests__/screens/accounts/balance_review_alert.test.tsx`

- [ ] **Step 1: Add failing clear/confirm tests**

```ts
expect(affected.balance_review_required).toBe(1);
await repo.confirmBalanceReviewed(affected.id);
expect((await repo.getByIdIncludingArchived(affected.id))?.balance_review_required).toBe(0);
```

Hook tests assert successful Adjust Balance also clears the flag, while closing/dismissing does not.

- [ ] **Step 2: Add failing alert rendering tests**

Render only for a credit card with `balance_review_required === 1`. Assert the primary action opens Adjust Balance and the secondary action confirms without changing the balance.

- [ ] **Step 3: Run account review tests and verify failure**

```bash
npm test -- --runInBand \
  __tests__/account.repository.test.ts \
  __tests__/screens/accounts/account_detail.hook.test.ts \
  __tests__/screens/accounts/balance_review_alert.test.tsx
```

Expected: FAIL because clear/query UI does not exist.

- [ ] **Step 4: Implement repository and hook actions**

Add SQL:

```sql
UPDATE accounts
   SET balance_review_required = 0, updated_at = ?
 WHERE id = ?
```

`confirmBalanceReviewed` verifies one affected row. `adjustBalance` clears the flag in the same repository operation after the balance update succeeds.

- [ ] **Step 5: Compose the HeroUI alert**

Use HeroUI Native `Alert` and project `Button`/tokens. The component is presentational and receives `onAdjust` and `onConfirm`; no local state or hardcoded copy.

- [ ] **Step 6: Run account review tests**

Run the Step 3 command. Expected: PASS.

- [ ] **Step 7: Commit the review prompt**

```bash
git add src/modules/accounts src/constants/strings.ts __tests__/account.repository.test.ts \
  __tests__/screens/accounts
git commit -m "feat(accounts): prompt review of legacy card balances"
```

### Task 9: Make transaction ordering deterministic

**Files:**
- Modify: `src/modules/transactions/database/transactions.ts`
- Modify: `__tests__/database_get_transactions_filter.test.ts`
- Modify: `__tests__/transaction.query_executor.test.ts`

- [ ] **Step 1: Add a failing equal-timestamp pagination test**

Seed at least 35 rows with identical `transaction_date` and `transaction_time`, fixed but distinct `created_at`/`id`, then fetch offsets 0 and 30. Assert no duplicate IDs, no missing IDs, and stable repeated fetch order.

- [ ] **Step 2: Run the test and verify failure**

```bash
npm test -- --runInBand __tests__/database_get_transactions_filter.test.ts
```

Expected: FAIL because ordering has no unique tie-breaker.

- [ ] **Step 3: Add the shared deterministic order**

Use in list and account history:

```sql
ORDER BY transaction_date DESC,
         transaction_time DESC,
         created_at DESC,
         id DESC
```

- [ ] **Step 4: Run pagination tests**

```bash
npm test -- --runInBand \
  __tests__/database_get_transactions_filter.test.ts \
  __tests__/transaction.query_executor.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit deterministic ordering**

```bash
git add src/modules/transactions/database/transactions.ts \
  __tests__/database_get_transactions_filter.test.ts __tests__/transaction.query_executor.test.ts
git commit -m "fix(transactions): stabilize history pagination"
```

### Task 10: Complete PR 1 regression and standards verification

**Files:**
- Modify only files required by failures found in this task.

- [ ] **Step 1: Run all transaction, account, and commitment tests**

```bash
npm test -- --runInBand --testPathPattern='transaction|account|commitment'
```

Expected: all matching suites pass.

- [ ] **Step 2: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: exit 0 with no new source warnings. Replace any new unsafe test casts with typed builders.

- [ ] **Step 3: Run the complete unit suite**

```bash
npm test -- --ci
```

Expected: all suites pass; baseline was 186 suites / 1,649 tests before PR 1.

- [ ] **Step 4: Run complete local CI parity**

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "CI parity green"
```

Expected: every command exits 0 and `android/` exists.

- [ ] **Step 5: Review the complete branch diff against the spec**

Verify:

```text
No automatic historical balance changes
No new persisted transaction enum
No generic mutation of commitment-owned rows
No archived accounts in new-transaction pickers
Card Income excluded from income and offset against spending
All add/update/delete account effects atomic and reversible
No hardcoded user copy or colors
No component-local state introduced
```

- [ ] **Step 6: Commit final remediation-only corrections**

```bash
git add src __tests__ docs/superpowers/plans/2026-07-19-transactions-ledger-integrity.md
git commit -m "test(transactions): harden ledger integrity coverage"
```

Skip this commit when verification required no changes.

## PR 1 completion gate

PR 1 is ready for review only when:

1. Tasks 1-10 are checked.
2. Full local CI parity is green.
3. The migration proves balances are unchanged.
4. Card expense, Card credit, CC payment, commitment payment, update, and delete effects are covered by database integration tests.
5. The repository rejects invalid/owned/missing mutations with typed errors.
6. Historical archived-account resolution works without making archived accounts selectable.
7. The branch contains no PR 2 query-state or PR 3 broad layout work.
