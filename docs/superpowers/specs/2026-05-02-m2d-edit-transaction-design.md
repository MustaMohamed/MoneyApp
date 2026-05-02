# M2d — Edit Transaction Design Spec

**Date:** 2026-05-02
**Cycle:** M2d
**Scope:** Edit Transaction (U7 Edit action)
**Unlocks:** M2e — U31 Advanced Filter Drawer

---

## 1. Goal & Non-goals

**Goal:** Enable users to edit an existing transaction from the U7 Detail screen. The edit surface reuses the Add Transaction sheet UI in a locked-type, locked-account edit mode. Saving delta-applies the balance change atomically.

**Non-goals (deferred):**
- Changing transaction type after creation — type is permanently locked.
- Changing account(s) after creation — source/destination accounts are locked.
- U31 Advanced Filter Drawer — pushed to M2e.
- Toast feedback on save success — deferred to M3 polish.

---

## 2. Folder Structure Refactor

Rename `app/(app)/(tabs)/transactions/add_transaction/` → `transaction_form/`. Two isolated hooks inside, shared UI and sub-components.

```
app/(app)/(tabs)/transactions/transaction_form/
├── index.tsx                     # exports AddTransactionSheet + EditTransactionSheet
├── transaction_form_body.tsx     # shared presentational form body
├── transaction_form.anim.ts      # sheet open/close animation (rename of add_transaction.anim.ts)
├── add_transaction.hook.ts       # useAddTransaction(onClose)
├── add_transaction.store.ts      # add-mode UI state
├── edit_transaction.hook.ts      # useEditTransaction(initialTx, onClose)
├── edit_transaction.store.ts     # edit-mode UI state
└── components/
    ├── account_picker_sheet.tsx
    ├── category_picker_sheet.tsx
    ├── exchange_rate_row.tsx
    ├── numpad.tsx
    └── type_tabs.tsx              # extended with disabled prop
```

**Import updates:**
- `transactions/index.tsx` — update import from `./add_transaction` → `./transaction_form`.
- `transactions/detail/[id]/index.tsx` — add import of `EditTransactionSheet`.

---

## 3. Database Layer

### New function: `updateTransaction` (`database/transactions.ts`)

```typescript
export interface UpdateTransactionInput {
  amount: number;
  currency: Currency;
  egp_amount: number;
  exchange_rate?: number | null;
  category_id?: string | null;
  note?: string | null;
  transaction_date: string;
  transaction_time: string;
}

export async function updateTransaction(
  db: SQLiteDatabase,
  id: string,
  updates: UpdateTransactionInput,
): Promise<void>
```

**Implementation** — single `withTransactionAsync` block:

1. Fetch existing transaction row. Early-return if not found.
2. Compute `delta = updates.egp_amount - existing.egp_amount`.
3. Apply balance changes based on type (accounts are locked, never change):

| Type | Balance delta |
|---|---|
| `expense` | `account_id`: `current_balance - delta` |
| `income` | `account_id`: `current_balance + delta` |
| `transfer` | `account_id`: `- delta`; `to_account_id`: `+ delta` |
| `cc_payment` | Reverse old split on CC + asset, apply new split — see below |

4. `UPDATE transactions SET amount=?, currency=?, egp_amount=?, exchange_rate=?, category_id=?, note=?, transaction_date=?, transaction_time=?, updated_at=? WHERE id=?`

**CC payment balance update:**
CC payment uses installment-first split math that cannot cleanly delta. Instead:
1. Reverse the old payment: restore `account_id.current_balance + old_egp_amount`; compute old `installmentCovered` and `revolvingRestore` using `minimum_payment`, restore CC `current_balance + old_egp_amount` and `revolving_balance + revolvingRestore`.
2. Apply new payment: deduct `account_id.current_balance - new_egp_amount`; compute new `installmentCovered` and `revolvingReduction` using `minimum_payment`, update CC `current_balance - new_egp_amount` and `revolving_balance = max(0, revolving - revolvingReduction)`.
All within the same transaction block.

---

## 4. Repository Layer

`repositories/transaction.repository.ts`:

```typescript
// Interface addition:
update(id: string, data: UpdateTransactionInput): Promise<void>;

// Implementation:
async update(id: string, data: UpdateTransactionInput): Promise<void> {
  const db = await getDb();
  await updateTransaction(db, id, data);
}
```

---

## 5. Store Layer

`store/transaction.store.ts` — new action on `TransactionState`:

```typescript
updateTransaction: (id: string, data: UpdateTransactionInput) => Promise<void>;
```

Implementation:
```typescript
updateTransaction: async (id, data) => {
  await repo.update(id, data);
  await get()
    .refresh()
    .catch((err) => console.error('[transactionStore] post-update refresh failed:', err));
},
```

Same swallow-refresh-errors pattern as `addTransaction` / `deleteTransaction`.

---

## 6. Edit Transaction Hook & Store

### `useEditTransactionStore` (`edit_transaction.store.ts`)

State shape:
```typescript
{
  visible: boolean;
  editingTx: Transaction | null;
  amountStr: string;
  saving: boolean;
  showAccountPicker: boolean;
  showToPicker: boolean;
  showCategoryPicker: boolean;
  open: (tx: Transaction) => void;  // pre-loads amountStr from tx.amount
  close: () => void;
  setSaving: (v: boolean) => void;
  setAmountStr: (v: string) => void;
  handleNumpad: (key: string) => void;
  setShowAccountPicker: (v: boolean) => void;
  setShowToPicker: (v: boolean) => void;
  setShowCategoryPicker: (v: boolean) => void;
  reset: () => void;
}
```

No `type` state — type is fixed from `editingTx.type`. `open(tx)` sets `editingTx = tx` and pre-loads `amountStr = String(tx.amount)` (drops trailing zeros for clean numpad display).

### `useEditTransaction` (`edit_transaction.hook.ts`)

Signature: `useEditTransaction(initialTx: Transaction, onClose: () => void)`

Key differences from `useAddTransaction`:

| | `useAddTransaction` | `useEditTransaction` |
|---|---|---|
| `type` | user-selectable from store | fixed from `initialTx.type` |
| account(s) | user-selectable | locked — read from `initialTx` |
| `currency` / `isUSD` | derived from selected account | derived from locked account |
| default values | blank | pre-filled from `initialTx` |
| save action | `store.addTransaction` | `store.updateTransaction` |
| schema factory | `createAddTransactionSchema(type, accounts)` | same schema, `type` fixed |

Default values pre-fill:
```typescript
{
  amount: initialTx.amount,
  categoryId: initialTx.category_id ?? '',
  note: initialTx.note ?? '',
  date: initialTx.transaction_date,
  time: initialTx.transaction_time,
  exchangeRate: String(initialTx.exchange_rate ?? currentRate),
}
```

`accountId` and `toAccountId` are locked — not part of the form schema, read directly from `initialTx`.

**`onValid`** — calls `store.updateTransaction(initialTx.id, { ... })`, then `loadAccounts()` (to refresh account balances in the account store, same as add flow), then `onClose()`.

**Sync effect** — same numpad `amountStr → form.setValue('amount', ...)` sync as add flow.

**Reset on close** — `useEffect(() => { if (!visible) form.reset(prefilledDefaults) }, [visible])`.

---

## 7. Shared UI: `TransactionFormBody`

`transaction_form_body.tsx` — presentational component, no hooks. Accepts the full hook output plus:
- `locked: boolean` — when true: type tabs are disabled, account rows show lock icon.
- `title: string` — sheet header title.

`TypeTabs` — add `disabled?: boolean` prop. When disabled: all 4 tabs render, active tab styled normally, others at 30% opacity, `onSelect` is no-op.

Account picker rows — when `locked`:
- `<Pressable>` replaced by `<View>` (no tap response).
- Chevron-right icon replaced by `lock-outline` (`MaterialCommunityIcons`, `color={Colors.dark.text2}`).

CTA label: `Strings.addTxSaveCta` ("Save") in both modes.

---

## 8. Sheet Components (`index.tsx`)

```typescript
// AddTransactionSheet — unchanged behavior
export function AddTransactionSheet({ visible, onClose }: { visible: boolean; onClose: () => void })

// EditTransactionSheet — new
export function EditTransactionSheet({
  visible,
  onClose,
  tx,
}: {
  visible: boolean;
  onClose: () => void;
  tx: Transaction | null;
})
```

`EditTransactionSheet` guards `if (!tx) return null`. Calls `useEditTransaction(tx, onClose)` and renders `<TransactionFormBody locked title={Strings.editTxTitle} ... />`.

---

## 9. Detail Screen Integration

`app/(app)/(tabs)/transactions/detail/[id]/index.tsx`:

- Remove the disabled state and "Coming in M2d" caption from the Edit button.
- Wire Edit button `onPress` to `useEditTransactionStore.getState().open(d.tx)`.
- Add state: `const { visible: editVisible, editingTx, close: closeEdit } = useEditTransactionStore(...)`.
- Mount below `<DeleteConfirmDialog>`:
  ```tsx
  <EditTransactionSheet visible={editVisible} onClose={closeEdit} tx={editingTx} />
  ```
- The `onClose` the detail screen passes in is a composed function: `() => { closeEdit(); d.reload(); }`. This is the only reload mechanism — no `useEffect` watching visibility needed.

---

## 10. Helpers & Pure Logic Extraction

`edit_transaction.helpers.ts` — pure functions covering the delta calculation logic, extracted for testability:

```typescript
computeBalanceDelta(oldEgp: number, newEgp: number): number
computeCCPaymentReversal(oldEgp: number, minimumPayment: number | null): { balanceDelta: number; revolvingDelta: number }
computeCCPaymentForward(newEgp: number, minimumPayment: number | null): { balanceDelta: number; newRevolving: (revolving: number) => number }
```

---

## 11. Strings

New entries in `constants/strings.ts`:

```typescript
editTxTitle: 'Edit Transaction',
```

No new save CTA string — reuses `addTxSaveCta`.

---

## 12. Tests

- `__tests__/edit_transaction_helpers.test.ts` — pure unit tests for all 4 transaction type delta computations (expense, income, transfer, cc_payment), including edge cases (zero delta, amount reduction, cc min-payment larger than amount).
- Existing M2a/M2b/M2c tests must remain green.
- Coverage thresholds: 80% lines / 95% functions / 100% branches on the logic layer.

---

## 13. Definition of Done

- ✅ Edit button on U7 detail is tappable — no disabled state, no "Coming in M2d" caption.
- ✅ Tapping Edit opens the edit sheet pre-filled with all existing values (amount, category, note, date, time, exchange rate if applicable).
- ✅ Type tabs show active type highlighted; all tabs are non-pressable.
- ✅ Account/to-account rows display with lock icon; non-pressable.
- ✅ Amount, category, note, date, time, and exchange rate (USD only) are editable.
- ✅ Save applies delta balance update atomically in a single SQLite transaction.
- ✅ Account balances reflect the change correctly for all 4 transaction types.
- ✅ CC payment amount edit correctly re-runs the revolving/installment split.
- ✅ Sheet closes; detail screen refreshes with updated values.
- ✅ Transaction list reflects the updated row after returning from detail.
- ✅ Existing add-transaction flow is unaffected.
- ✅ Test coverage thresholds met; all existing tests green.

---

## 14. Notes & Deferrals

- **U31 Advanced Filter Drawer (M2e)** — multi-axis filter (account / category / date-range / amount).
- **Toast on save (M3)** — no success toast this cycle.
- **Edit from list (future)** — swipe-to-edit on transaction row is not in scope; edit is only accessible from U7 detail.
- **Currency change on edit** — not possible since account is locked; currency is always determined by the locked account.
