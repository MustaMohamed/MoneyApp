# Transactions Standards and Test Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the signed Transactions remediation by replacing remaining parallel UI primitives, restoring MoneyApp module anatomy, completing pure presentation-state coverage, and removing unsafe transaction test infrastructure without changing financial behavior.

**Architecture:** Shared search composes HeroUI `SearchField`; transaction metadata and picker rows compose `ListGroup`; budget choice composes `RadioGroup`. Route templates bind hook-owned actions, fetched totals live in `.store.ts`, UI statuses remain in `.state.ts`, and rendering states use pure presentation helpers tested from `.test.ts`. Typed transaction, Zustand, and SQLite helpers replace local casts.

**Tech Stack:** Expo React Native, TypeScript strict, Expo Router, Zustand v5, HeroUI Native 1.0.3, Uniwind/Tailwind v4, React Native Testing Library, Jest 29, expo-sqlite, oxlint/tsgolint.

---

## Scope Disposition

| Signed PR4 requirement | Disposition |
| --- | --- |
| HeroUI migrations | Tasks 1, 6, and 7: `SearchField`, `ListGroup`, `RadioGroup`. HeroUI `Tabs` migration is already complete. |
| Header/module anatomy | Tasks 8-10: conditional detail edit, hook-owned list actions, totals data/UI split. `Screen` usage is already complete. |
| Strings/tokens/accessibility | Task 11: copy, canonical imports, token cleanup, accessible controls. |
| Rendering matrix | Task 12: pure screen/detail/form/row contracts. Existing summary and skeleton geometry tests remain authoritative. |
| Typed test infrastructure | Tasks 2-5: transaction builders, selector helpers, SQLite adapter, Gorhom mocks, exact warning removal. |
| Obsolete code | Task 11: stale filter name, animation re-export, delete alias, history comments. V1/V2 form directories are already removed. |

No schema, dependency, persisted-data, or financial-calculation change is permitted.

### Task 1: Migrate Shared Compact Search to HeroUI SearchField

**Files:**
- Modify: `src/components/ui/search_filter_row.tsx`
- Modify: `__tests__/components/ui/search_filter_row.test.tsx`
- Modify: `__tests__/screens/transactions/search_row.test.tsx`
- Modify: `__tests__/screens/commitments/search_row.test.tsx`

- [ ] **Step 1: Add failing semantics assertions**

```tsx
expect(screen.getByRole('search')).toHaveProp('value', 'coffee');
fireEvent.press(screen.getByLabelText(Strings.filterSearchClearAccessibility));
expect(onClear).toHaveBeenCalledTimes(1);
expect(screen.getByLabelText('Filter, 2 active')).toBeTruthy();
```

- [ ] **Step 2: Run RED**

```bash
npm test -- --runInBand __tests__/components/ui/search_filter_row.test.tsx
```

Expected: FAIL because the custom `Input` does not expose HeroUI search semantics.

- [ ] **Step 3: Compose SearchField**

```tsx
<SearchField value={value} onChange={onChangeText} className="flex-1">
  <SearchField.Group style={SEARCH_INPUT_COMPACT_STYLE}>
    <SearchField.SearchIcon />
    <SearchField.Input placeholder={placeholder} accessibilityLabel={placeholder} />
    <SearchField.ClearButton onPress={onClear} accessibilityLabel={clearAccessibilityLabel} />
  </SearchField.Group>
</SearchField>
```

Keep the HeroUI filter button and existing fixed dimensions. Do not add a custom clear icon.

- [ ] **Step 4: Extend all three existing HeroUI mocks**

In `search_filter_row.test.tsx`, Transactions `search_row.test.tsx`, and Commitments `search_row.test.tsx`, spread the typed real module before overriding the small pressable test double so compound `SearchField` remains available:

```tsx
const HeroUI = jest.requireActual<typeof import('heroui-native')>('heroui-native');
return {
  ...HeroUI,
  PressableFeedback: ({ children, ...props }: PressableProps & { children?: ReactNode }) => (
    <Pressable {...props}>{children}</Pressable>
  ),
};
```

- [ ] **Step 5: Run GREEN and commit**

```bash
npm test -- --runInBand __tests__/components/ui/search_filter_row.test.tsx __tests__/screens/transactions/search_row.test.tsx __tests__/screens/commitments/search_row.test.tsx
npm run typecheck
git add src/components/ui/search_filter_row.tsx __tests__/components/ui/search_filter_row.test.tsx __tests__/screens/transactions/search_row.test.tsx __tests__/screens/commitments/search_row.test.tsx
git commit -m "refactor(ui): compose compact search with HeroUI"
```

Expected: suites PASS and typecheck exits 0.

### Task 2: Add Typed Transaction and Zustand Test Helpers

**Files:**
- Create: `src/test_helpers/transaction.ts`
- Modify: `src/test_helpers/mock_zustand_selectors.ts`
- Modify: `__tests__/add_transaction.store.test.ts`
- Modify: `__tests__/edit_transaction.store.test.ts`
- Modify: `__tests__/format_transaction_title.test.ts`
- Modify: `__tests__/screens/transactions/transaction_form/add_transaction.hook.test.ts`
- Modify: `__tests__/screens/transactions/transaction_form/edit_transaction.hook.test.ts`
- Modify: `__tests__/screens/transactions/detail/detail_hook.test.ts`
- Modify: `__tests__/screens/transactions/detail/detail_store.test.ts`
- Modify: `__tests__/screens/transactions/transactions_hook.test.ts`

- [ ] **Step 1: Convert one test to the missing helper and run RED**

```ts
import { makeTestAccount, makeTestTransaction, installMockAddTransaction } from '@/test_helpers/transaction';
```

```bash
npm run typecheck
```

Expected: FAIL because the helper does not exist.

- [ ] **Step 2: Add deterministic complete builders**

Create `makeTestAccount`, `makeTestCategory`, `makeTestBudget`, and `makeTestTransaction` with `Partial<T>` overrides and a fixed timestamp. Every required entity field must have a valid default.

```ts
const TEST_TIMESTAMP = '2026-07-22T12:00:00.000Z';

export const makeTestAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'account-1', name: 'Cash', type: AccountType.PhysicalWallet,
  currency: Currency.EGP, opening_balance: 0, current_balance: 0, color: null,
  credit_limit: null, revolving_balance: null, minimum_payment: null,
  statement_due_day: null, interest_tracking: 0, apr: null, is_archived: 0,
  balance_review_required: 0, sort_order: 0, created_at: TEST_TIMESTAMP,
  updated_at: TEST_TIMESTAMP, ...overrides,
});

export const makeTestCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'category-1', name: 'Food', type: CategoryType.Expense, icon: 'food',
  color: '#000000', is_default: 0, sort_order: 0, budget_group: BudgetGroup.Need,
  created_at: TEST_TIMESTAMP, updated_at: TEST_TIMESTAMP, ...overrides,
});

export const makeTestBudget = (overrides: Partial<Budget> = {}): Budget => ({
  id: 'budget-1', category_id: 'category-1', name: 'Monthly food',
  limit_amount: 500, effective_from: '2026-07', created_at: TEST_TIMESTAMP,
  updated_at: TEST_TIMESTAMP, ...overrides,
});

export const makeTestTransaction = (
  overrides: Partial<Transaction> = {},
): Transaction => ({
  id: 'transaction-1', type: TransactionType.Expense, amount: 100,
  currency: Currency.EGP, egp_amount: 100, exchange_rate: null, to_amount: null,
  minimum_payment_snapshot: null, revolving_balance_delta: null,
  account_id: 'account-1', to_account_id: null, category_id: 'category-1',
  budget_id: null, note: null, transaction_date: '2026-07-22',
  transaction_time: '12:00:00', commitment_payment_id: null, installment_id: null,
  created_at: TEST_TIMESTAMP, updated_at: TEST_TIMESTAMP, ...overrides,
});
```

- [ ] **Step 3: Add Jest 29-compatible action installers**

```ts
type AddTransaction = ReturnType<typeof useTransactionStore.getState>['addTransaction'];
const action = jest.fn<ReturnType<AddTransaction>, Parameters<AddTransaction>>();
useTransactionStore.setState({ addTransaction: action });

export function installMockAddTransaction(): jest.MockedFunction<AddTransaction> {
  const mock = jest.fn<ReturnType<AddTransaction>, Parameters<AddTransaction>>();
  useTransactionStore.setState({ addTransaction: mock });
  return mock;
}

type UpdateTransaction = ReturnType<typeof useTransactionStore.getState>['updateTransaction'];
export function installMockUpdateTransaction(): jest.MockedFunction<UpdateTransaction> {
  const mock = jest.fn<ReturnType<UpdateTransaction>, Parameters<UpdateTransaction>>();
  useTransactionStore.setState({ updateTransaction: mock });
  return mock;
}
```

- [ ] **Step 4: Type selector mocks**

Make `attachMockSelectorStore` generic over its state factory and remove file-wide lint suppressions. Replace local `as any`, partial complete-store casts, unbound action assertions, and invalid Zustand fields in the listed files.

```ts
export type MockSelectorStore<T extends object> = {
  <U>(selector: (state: T) => U): U;
  getState: jest.MockedFunction<() => T>;
  use: { [K in keyof T]: () => T[K] };
  useState: { [K in keyof T]: () => T[K] };
};

export function attachMockSelectorStore<T extends object>(
  hook: jest.Mock,
  getState: jest.MockedFunction<() => T>,
): MockSelectorStore<T> {
  const selector = <U>(select: (state: T) => U): U => select(getState());
  const fields = new Proxy({} as MockSelectorStore<T>['use'], {
    get: (_target, key: string) => () => getState()[key as keyof T],
  });
  const store = Object.assign(selector, {
    getState,
    use: fields,
    useState: fields,
  });
  hook.mockImplementation(store);
  Object.assign(hook, store);
  return store;
}
```

Apply these exact conversions:

- add/edit hook tests: replace every `setState({ addTransaction/updateTransaction } as any)` with the typed installer; remove nonexistent category `loading`/`error`; remove currency-store casts; read saved payloads from typed mock call tuples;
- add/edit store and title tests: replace partial entity casts with the four builders;
- detail hook/store tests: create a complete form-state value by spreading the actual store state, bind repository/action mocks at declaration, and assert local mock functions;
- transactions hook test: type mocked store snapshots and navigation/actions from their real signatures.

- [ ] **Step 5: Run GREEN and commit**

```bash
npm test -- --runInBand __tests__/add_transaction.store.test.ts __tests__/edit_transaction.store.test.ts __tests__/format_transaction_title.test.ts __tests__/screens/transactions/transaction_form/add_transaction.hook.test.ts __tests__/screens/transactions/transaction_form/edit_transaction.hook.test.ts __tests__/screens/transactions/detail/detail_hook.test.ts __tests__/screens/transactions/detail/detail_store.test.ts __tests__/screens/transactions/transactions_hook.test.ts
npm run typecheck
npm run lint > /tmp/pr4-task9-lint.txt 2>&1
! rg 'add_transaction|edit_transaction|format_transaction_title|detail_(hook|store)|transactions_hook|mock_zustand_selectors' /tmp/pr4-task9-lint.txt
git add src/test_helpers/transaction.ts src/test_helpers/mock_zustand_selectors.ts __tests__/add_transaction.store.test.ts __tests__/edit_transaction.store.test.ts __tests__/format_transaction_title.test.ts __tests__/screens/transactions/transaction_form/add_transaction.hook.test.ts __tests__/screens/transactions/transaction_form/edit_transaction.hook.test.ts __tests__/screens/transactions/detail/detail_hook.test.ts __tests__/screens/transactions/detail/detail_store.test.ts __tests__/screens/transactions/transactions_hook.test.ts
git commit -m "test(transactions): add typed Zustand fixtures"
```

Expected: suites PASS; typecheck and scoped lint exit 0.

### Task 3: Add One Typed Expo-SQLite Test Adapter

**Files:**
- Create: `src/test_helpers/sqlite.ts`
- Modify: `jest.setup.js`
- Modify: `__tests__/database_get_transactions_filter.test.ts`
- Modify: `__tests__/transaction.migration.test.ts`
- Modify: `__tests__/transaction.query_executor.test.ts`
- Modify: `__tests__/transaction.repository.test.ts`
- Modify: `__tests__/transactions_get_period_totals.test.ts`
- Modify: `__tests__/update_transaction.query_executor.test.ts`

- [ ] **Step 1: Convert one database test to missing `createMockSQLiteDatabase` and run typecheck RED.**

- [ ] **Step 2: Implement typed SQLite facade**

Expose typed `runAsync`, `getAllAsync`, `getFirstAsync`, `execAsync`, and `withTransactionAsync` mocks plus an `isQueryPlanRow` runtime guard. Remove the nonexistent global reset helper from `jest.setup.js`.

```ts
export interface MockSQLiteDatabase {
  database: SQLiteDatabase;
  runAsync: jest.MockedFunction<SQLiteDatabase['runAsync']>;
  getAllAsync: jest.MockedFunction<SQLiteDatabase['getAllAsync']>;
  getFirstAsync: jest.MockedFunction<SQLiteDatabase['getFirstAsync']>;
  execAsync: jest.MockedFunction<SQLiteDatabase['execAsync']>;
  withTransactionAsync: jest.MockedFunction<SQLiteDatabase['withTransactionAsync']>;
}

export function createMockSQLiteDatabase(
  overrides: Partial<Omit<MockSQLiteDatabase, 'database'>> = {},
): MockSQLiteDatabase {
  const runAsync = overrides.runAsync ?? jest.fn();
  const getAllAsync = overrides.getAllAsync ?? jest.fn();
  const getFirstAsync = overrides.getFirstAsync ?? jest.fn();
  const execAsync = overrides.execAsync ?? jest.fn();
  const withTransactionAsync = overrides.withTransactionAsync ??
    jest.fn(async (task: () => Promise<void>) => task());
  const database = {
    runAsync,
    getAllAsync,
    getFirstAsync,
    execAsync,
    withTransactionAsync,
  } as unknown as SQLiteDatabase;
  return {
    database,
    runAsync: runAsync as MockSQLiteDatabase['runAsync'],
    getAllAsync: getAllAsync as MockSQLiteDatabase['getAllAsync'],
    getFirstAsync: getFirstAsync as MockSQLiteDatabase['getFirstAsync'],
    execAsync: execAsync as MockSQLiteDatabase['execAsync'],
    withTransactionAsync: withTransactionAsync as MockSQLiteDatabase['withTransactionAsync'],
  };
}

export function isQueryPlanRow(value: unknown): value is { detail: string } {
  return typeof value === 'object' && value !== null &&
    'detail' in value && typeof value.detail === 'string';
}
```

- [ ] **Step 3: Replace duplicated casts**

Apply the adapter in each exact suite: filter database, migration, query executor, repository, period totals, and update executor. In `transaction.repository.test.ts`, construct the database mock from named typed functions and assert those functions. In query-plan tests, filter `unknown[]` through `isQueryPlanRow` before reading `.detail`.

- [ ] **Step 4: Run GREEN and commit**

```bash
npm test -- --runInBand __tests__/database_get_transactions_filter.test.ts __tests__/transaction.migration.test.ts __tests__/transaction.query_executor.test.ts __tests__/transaction.repository.test.ts __tests__/transactions_get_period_totals.test.ts __tests__/update_transaction.query_executor.test.ts
npm run typecheck
npm run lint > /tmp/pr4-task10-lint.txt 2>&1
! rg 'database_get_transactions_filter|transaction\.(migration|query_executor|repository)|transactions_get_period_totals|update_transaction\.query_executor' /tmp/pr4-task10-lint.txt
git add src/test_helpers/sqlite.ts jest.setup.js __tests__/database_get_transactions_filter.test.ts __tests__/transaction.migration.test.ts __tests__/transaction.query_executor.test.ts __tests__/transaction.repository.test.ts __tests__/transactions_get_period_totals.test.ts __tests__/update_transaction.query_executor.test.ts
git commit -m "test(transactions): add typed SQLite adapter"
```

Expected: suites PASS; typecheck and scoped lint exit 0.

### Task 4: Type Remaining Render and Gorhom Mocks

**Files:**
- Modify: `__mocks__/@gorhom/bottom-sheet.tsx`
- Modify: `__tests__/screens/transactions/search_row.test.tsx`
- Modify: `__tests__/screens/transactions/detail/transfer_flow_card.test.tsx`
- Modify: `__tests__/screens/transactions/transaction_form/amount_hero.test.tsx`
- Modify: `__tests__/screens/transactions/transaction_form/transaction_form_body.test.tsx`
- Modify: `__tests__/screens/transactions/transaction_form/transaction_form_host.test.tsx`
- Modify: `__tests__/screens/transactions/transaction_form/transaction_form_sessions.test.tsx`
- Modify: `__tests__/screens/transactions/transaction_form/type_tabs.test.tsx`
- Modify: `__tests__/transaction.store.test.ts`

- [ ] **Step 1: Capture RED scoped lint**

```bash
npm run lint > /tmp/pr4-task11-before.txt 2>&1
rg 'bottom-sheet|search_row|transfer_flow_card|amount_hero|transaction_form_(body|host|sessions)|type_tabs|transaction\.store' /tmp/pr4-task11-before.txt
```

Expected: every listed warning-bearing file appears.

- [ ] **Step 2: Type render mocks**

Replace CommonJS `require` factories with `jest.requireActual<typeof import('react')>` and typed React Native modules. Give mock components explicit props; use `fireEvent`/`toHaveProp`, typed collections/refs, and typed repository functions instead of `.props`, `any`, or `jest.Mock` casts.

Apply these exact conversions:

- Gorhom mock: type each component with its exported Gorhom prop type, replace `any[]` collections with `ReactElement[]`, and type refs with the matching handle;
- search/amount/body tests: spread the typed HeroUI module, use typed input/pressable overrides, and replace direct `.props` reads with matchers;
- transfer test: press `getByLabelText(...)` results inline rather than assigning lint `error` values;
- host/session tests: type mock session/body props and captured callbacks;
- type-tabs test: use `SegmentedTabsProps<TransactionType>` at mock declaration and guard the first call;
- transaction store test: bind each repository method to a named typed Jest function and assert the bound function, never an unbound object method.

- [ ] **Step 3: Run GREEN**

```bash
npm test -- --runInBand __tests__/screens/transactions __tests__/transaction.store.test.ts
npm run typecheck
npm run lint > /tmp/pr4-task11-after.txt 2>&1
! rg 'bottom-sheet|search_row|transfer_flow_card|amount_hero|transaction_form_(body|host|sessions)|type_tabs|transaction\.store' /tmp/pr4-task11-after.txt
```

Expected: suites PASS; typecheck and scoped lint exit 0.

- [ ] **Step 4: Commit**

```bash
git add __mocks__/@gorhom/bottom-sheet.tsx __tests__/screens/transactions __tests__/transaction.store.test.ts
git commit -m "test(transactions): type remaining UI mocks"
```

### Task 5: Verify Typed Test Infrastructure

**Files:** No production changes; this is a bounded verification checkpoint for Tasks 2-4.

- [ ] **Step 1: Run typed-infrastructure verification**

```bash
npm test -- --runInBand --testPathPattern='transactions|transaction'
npm run typecheck
npm run lint > /tmp/pr4-typed-infrastructure.txt 2>&1
! rg '^(__tests__/.*(transaction|transactions)|src/test_helpers/(transaction|sqlite|mock_zustand_selectors)|__mocks__/@gorhom/bottom-sheet)' /tmp/pr4-typed-infrastructure.txt
```

Expected: all commands exit 0.

## Typed Infrastructure Checkpoint

- [ ] No transaction-scoped unsafe lint warnings or file-wide suppressions remain.
- [ ] All transaction suites and typecheck remain green before UI/anatomy work starts.

### Task 6: Migrate Detail and Form Picker Rows to HeroUI ListGroup

**Files:**
- Create: `src/modules/transactions/screens/transactions/transaction_form/components/form_picker_row.tsx`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx`
- Modify: `src/modules/transactions/screens/transactions/detail/components/detail_rows_card.tsx`
- Modify: `src/modules/transactions/screens/transactions/detail/components/detail_row.tsx`
- Modify: `__tests__/screens/transactions/transaction_form/transaction_form_body.test.tsx`
- Modify: `__tests__/screens/transactions/detail/detail_screen_actions.test.tsx`
- Modify: `jest.setup.js`

- [ ] **Step 1: Add failing row behavior assertions**

```tsx
expect(screen.getByTestId('from-account-row')).toHaveProp('accessibilityRole', 'button');
expect(screen.getByTestId('from-account-row')).toHaveProp('accessibilityState', { disabled: false });
fireEvent.press(screen.getByTestId('category-row'));
expect(baseProps.onOpenCategoryPicker).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: Run RED**

```bash
npm test -- --runInBand __tests__/screens/transactions/transaction_form/transaction_form_body.test.tsx __tests__/screens/transactions/detail/detail_screen_actions.test.tsx
```

Expected: FAIL on missing row semantics.

- [ ] **Step 3: Add a declarative FormPickerRow**

```tsx
<ListGroup variant="secondary" className="rounded-md">
  <ListGroup.Item
    testID={testID}
    onPress={disabled ? undefined : onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{ disabled }}
  >
    {prefix ? <ListGroup.ItemPrefix>{prefix}</ListGroup.ItemPrefix> : null}
    <ListGroup.ItemContent>
      <ListGroup.ItemDescription>{label}</ListGroup.ItemDescription>
      <ListGroup.ItemTitle numberOfLines={1}>{value}</ListGroup.ItemTitle>
    </ListGroup.ItemContent>
    <ListGroup.ItemSuffix>{suffix}</ListGroup.ItemSuffix>
  </ListGroup.Item>
</ListGroup>
```

The wrapper accepts props only and owns no state.

- [ ] **Step 4: Replace form/detail rows**

Use `FormPickerRow` for from/to/category/budget while keeping validation slots outside. Convert detail container/rows to `ListGroup` compound slots while retaining `DETAIL_ROW_HEIGHT`, badges, and sublabels.

- [ ] **Step 5: Extend the existing form-body HeroUI mock**

```tsx
const HeroUI = jest.requireActual<typeof import('heroui-native')>('heroui-native');
return { ...HeroUI, Input: MockInput, PressableFeedback: MockPressableFeedback };
```

This keeps real `ListGroup` compound members available while preserving focused input/press behavior.

Also add the `ListGroup` compound to the global `jest.setup.js` HeroUI mock in this task so detail tests do not depend on Task 7 ordering.

- [ ] **Step 6: Run GREEN and commit**

```bash
npm test -- --runInBand __tests__/screens/transactions/transaction_form/transaction_form_body.test.tsx __tests__/screens/transactions/detail
npm run typecheck
git add jest.setup.js src/modules/transactions/screens/transactions/transaction_form/components/form_picker_row.tsx src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx src/modules/transactions/screens/transactions/detail/components/detail_rows_card.tsx src/modules/transactions/screens/transactions/detail/components/detail_row.tsx __tests__/screens/transactions/transaction_form/transaction_form_body.test.tsx __tests__/screens/transactions/detail/detail_screen_actions.test.tsx
git commit -m "refactor(transactions): compose metadata rows with HeroUI"
```

Expected: suites PASS and typecheck exits 0.

### Task 7: Migrate Budget Choice to HeroUI RadioGroup

**Files:**
- Modify: `src/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet.tsx`
- Modify: `__tests__/screens/transactions/transaction_form/budget_picker_sheet.test.tsx`
- Modify: `jest.setup.js`

- [ ] **Step 1: Add failing controlled-selection tests**

```tsx
expect(screen.getByRole('radiogroup')).toBeTruthy();
expect(screen.getByLabelText('Food, 500 EGP')).toHaveAccessibilityState({ checked: true });
fireEvent.press(screen.getByLabelText('Travel, 700 EGP'));
expect(onSelect).toHaveBeenCalledWith(travelBudget);
```

- [ ] **Step 2: Run RED**

```bash
npm test -- --runInBand __tests__/screens/transactions/transaction_form/budget_picker_sheet.test.tsx
```

Expected: FAIL because selection is manually implemented.

- [ ] **Step 3: Compose RadioGroup**

Use controlled `RadioGroup value={selectedId} onValueChange={handleSelectId}`. Each row uses `RadioGroup.Item value={budget.id}` and `Radio`; resolve IDs through a memoized map and ignore unknown IDs.

```tsx
<RadioGroup value={selectedId} onValueChange={handleSelectId}>
  <RadioGroup.Item value={budget.id} accessibilityLabel={label}>
    <ListGroup.ItemContent>{/* name and amount */}</ListGroup.ItemContent>
    <Radio />
  </RadioGroup.Item>
</RadioGroup>
```

- [ ] **Step 4: Extend the global HeroUI radio compound mock**

Add `RadioGroup` and `Radio` to the global mock. `ListGroup` already exists from Task 6. The radio root renders `accessibilityRole="radiogroup"`; each item renders role `radio`, `accessibilityState={{ checked }}`, and invokes the root `onValueChange(value)` on press.

```js
const RadioGroupContext = React.createContext({ value: undefined, onValueChange: () => {} });
function RadioGroup({ value, onValueChange, children, ...props }) {
  return React.createElement(
    RadioGroupContext.Provider,
    { value: { value, onValueChange } },
    React.createElement(View, { accessibilityRole: 'radiogroup', ...props }, children),
  );
}
RadioGroup.Item = ({ value, children, accessibilityState, ...props }) => {
  const group = React.useContext(RadioGroupContext);
  return React.createElement(
    View,
    {
      accessibilityRole: 'radio',
      accessibilityState: { ...accessibilityState, checked: group.value === value },
      onPress: () => group.onValueChange(value),
      ...props,
    },
    children,
  );
};
const Radio = passThrough(View);
```

Use a React context for the controlled radio value/callback so tests exercise checked-state changes; do not return undefined compound members.

- [ ] **Step 5: Run GREEN and commit**

```bash
npm test -- --runInBand __tests__/screens/transactions/transaction_form/budget_picker_sheet.test.tsx
npm run typecheck
git add jest.setup.js src/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet.tsx __tests__/screens/transactions/transaction_form/budget_picker_sheet.test.tsx
git commit -m "refactor(transactions): use HeroUI budget selection"
```

Expected: suite PASS and typecheck exits 0.

### Task 8: Standardize Transaction Detail Header and Actions

**Files:**
- Modify: `src/components/ui/stack_header.tsx`
- Modify: `src/constants/strings.ts`
- Create: `src/modules/transactions/screens/transactions/detail/components/detail_header.tsx`
- Modify: `src/modules/transactions/screens/transactions/detail/detail.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/detail/index.tsx`
- Modify: `src/modules/transactions/screens/transactions/detail/components/action_row.tsx`
- Modify: `__tests__/screens/transactions/detail/detail_hook.test.ts`
- Modify: `__tests__/screens/transactions/detail/detail_screen_actions.test.tsx`

- [x] **Checkpoint: hook-owned route actions already implemented in this worktree**

The uncommitted worktree already adds and tests `goBack`, `openAccount`, and guarded `openEdit`. Preserve that work; do not recreate or revert it.

- [ ] **Step 1: Add RED tests** for the remaining contract: editable header action, hidden owned edit action, delete-only bottom action, and shared back accessibility copy.

```tsx
const onEdit = jest.fn();
const screen = render(
  <DetailHeader editable onBack={jest.fn()} onEdit={onEdit} />,
);
fireEvent.press(screen.getByLabelText(Strings.detailEditAccessibility));
expect(onEdit).toHaveBeenCalledTimes(1);

screen.rerender(
  <DetailHeader editable={false} onBack={jest.fn()} onEdit={onEdit} />,
);
expect(screen.queryByLabelText(Strings.detailEditAccessibility)).toBeNull();

const actions = render(<ActionRow onDelete={jest.fn()} />);
expect(actions.queryByText(Strings.detailEditButton)).toBeNull();
expect(actions.getByText(Strings.detailDeleteButton)).toBeTruthy();
```

- [ ] **Step 2: Run RED**

```bash
npm test -- --runInBand __tests__/screens/transactions/detail/detail_hook.test.ts __tests__/screens/transactions/detail/detail_screen_actions.test.tsx
```

Expected: FAIL because edit remains in the bottom row and the back label is local. Existing hook route-action tests remain GREEN.

- [ ] **Step 3: Implement header and hook ownership**

Add `Strings.goBackAccessibility` and `Strings.detailEditAccessibility`. Preserve the already-implemented `goBack`, `openAccount`, and guarded `openEdit` hook actions. Add a props-only `DetailHeader` that renders one pencil action through `StackHeader.right` only when `editable`. Remove edit from `ActionRow`; keep delete or commitment navigation only. `index.tsx` passes `editable={!state.isCommitmentOwned}`.

- [ ] **Step 4: Keep template declarative**

`detail/index.tsx` may import `useLocalSearchParams`, but contains no `router.` call and no `useTransactionFormState` import.

- [ ] **Step 5: Run GREEN and commit**

```bash
npm test -- --runInBand __tests__/screens/transactions/detail
npm run typecheck
git add src/components/ui/stack_header.tsx src/constants/strings.ts src/modules/transactions/screens/transactions/detail/detail.hook.ts src/modules/transactions/screens/transactions/detail/index.tsx src/modules/transactions/screens/transactions/detail/components/action_row.tsx src/modules/transactions/screens/transactions/detail/components/detail_header.tsx __tests__/screens/transactions/detail/detail_hook.test.ts __tests__/screens/transactions/detail/detail_screen_actions.test.tsx
git commit -m "refactor(transactions): standardize detail actions"
```

Expected: detail suites PASS and typecheck exits 0.

### Task 9: Move Transactions Screen Orchestration into the Hook

**Files:**
- Modify: `src/modules/transactions/screens/transactions/transactions.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/index.tsx`
- Modify: `__tests__/screens/transactions/transactions_hook.test.ts`
- Modify: `__tests__/screens/transactions.screen.test.tsx`

- [ ] **Step 1: Add failing hook tests**

```ts
act(() => result.current.openAddTransaction());
expect(openAdd).toHaveBeenCalledTimes(1);
act(() => result.current.requestDelete('tx-1'));
expect(result.current.state.pendingDeleteId).toBe('tx-1');
```

- [ ] **Step 2: Run RED**

```bash
npm test -- --runInBand __tests__/screens/transactions/transactions_hook.test.ts __tests__/screens/transactions.screen.test.tsx
```

Expected: FAIL because the template owns form and delete hooks.

- [ ] **Step 3: Move orchestration**

Call `useConfirmAction` inside `useTransactions`; use `useTransactionFormState.getState().openAdd`; return flat `openAddTransaction`, `requestDelete`, `confirmDelete`, and `cancelDelete`. Return `pendingDeleteId`, `deleteBusy`, and presentation-ready `deleteErrorMessage` inside `state`.

```ts
const openAddTransaction = useCallback(
  () => useTransactionFormState.getState().openAdd(),
  [],
);
const deleteTransaction = useTransactionStore.getState().deleteTransaction;
const deleteAction = useConfirmAction<string>((transactionId) =>
  deleteTransaction(transactionId),
);
```

- [ ] **Step 4: Make index declarative**

Remove `useTransactionFormState`, `useTransactionStore`, and `useConfirmAction` imports from `index.tsx`; bind only hook state/actions.

- [ ] **Step 5: Run GREEN and commit**

```bash
npm test -- --runInBand __tests__/screens/transactions/transactions_hook.test.ts __tests__/screens/transactions.screen.test.tsx
npm run typecheck
git add src/modules/transactions/screens/transactions/transactions.hook.ts src/modules/transactions/screens/transactions/index.tsx __tests__/screens/transactions/transactions_hook.test.ts __tests__/screens/transactions.screen.test.tsx
git commit -m "refactor(transactions): move screen orchestration into hook"
```

Expected: suites PASS and typecheck exits 0.

### Task 10: Split Totals Data from UI State

**Files:**
- Modify: `src/modules/transactions/screens/transactions/transactions.store.ts`
- Modify: `src/modules/transactions/screens/transactions/transactions.state.ts`
- Modify: `src/modules/transactions/screens/transactions/transactions.hook.ts`
- Modify: `__tests__/screens/transactions/transactions_store.test.ts`
- Modify: `__tests__/screens/transactions/transactions_state.test.ts`
- Modify: `__tests__/screens/transactions/transactions_hook.test.ts`

- [ ] **Step 1: Add RED ownership tests**

```ts
const first = store.beginTotalsRequest('2026-07', false);
const second = store.beginTotalsRequest('2026-07', false);
expect(store.resolveTotals('2026-07', first, older)).toBe(false);
expect(store.resolveTotals('2026-07', second, newer)).toBe(true);
expect(useTransactionsState.getState()).not.toHaveProperty('totals');
```

- [ ] **Step 2: Run RED**

```bash
npm test -- --runInBand __tests__/screens/transactions/transactions_store.test.ts __tests__/screens/transactions/transactions_state.test.ts
```

Expected: FAIL because totals payload and request ownership live in `.state.ts`.

- [ ] **Step 3: Implement data/UI split**

`transactions.store.ts` owns `totals`, `totalsYearMonth`, `totalsRequestId`, `beginTotalsRequest`, `resolveTotals`, and `hasTotalsForMonth`. `transactions.state.ts` owns `totalsStatus`, scroll state, and `beginTotalsLoad(hasData)`, `resolveTotalsLoad()`, `failTotalsLoad(hasData)`.

```ts
interface TransactionsDataShape {
  totals: TransactionTotalsState | null;
  totalsYearMonth: string | null;
  totalsRequestId: number;
}

type TransactionsDataStore = TransactionsDataShape & {
  beginTotalsRequest: (yearMonth: string, preserveData: boolean) => number;
  resolveTotals: (
    yearMonth: string,
    requestId: number,
    totals: TransactionTotalsState,
  ) => boolean;
  failTotals: (yearMonth: string, requestId: number) => boolean;
  hasTotalsForMonth: (yearMonth: string) => boolean;
};

interface TransactionsUiShape {
  totalsStatus: TransactionTotalsStatus;
  scrollOffset: number;
  scrollQueryKey: string | null;
}

type TransactionsUiState = TransactionsUiShape & {
  beginTotalsLoad: (hasData: boolean) => void;
  resolveTotalsLoad: () => void;
  failTotalsLoad: (hasData: boolean) => void;
  activateScrollQuery: (queryKey: string) => void;
  setScrollOffset: (queryKey: string, offset: number) => void;
};
```

The data actions use these exact ownership transitions:

```ts
beginTotalsRequest: (yearMonth, preserveData) => {
  const state = get();
  const requestId = state.totalsRequestId + 1;
  const keepTotals = preserveData && state.totalsYearMonth === yearMonth;
  set({
    totals: keepTotals ? state.totals : null,
    totalsYearMonth: yearMonth,
    totalsRequestId: requestId,
  });
  return requestId;
},
resolveTotals: (yearMonth, requestId, totals) => {
  const state = get();
  if (state.totalsYearMonth !== yearMonth || state.totalsRequestId !== requestId) return false;
  set({ totals });
  return true;
},
failTotals: (yearMonth, requestId) => {
  const state = get();
  return state.totalsYearMonth === yearMonth && state.totalsRequestId === requestId;
},
hasTotalsForMonth: (yearMonth) => {
  const state = get();
  return state.totalsYearMonth === yearMonth && state.totals !== null;
},
```

The UI transitions are `beginTotalsLoad(hasData)` → `refreshing` or `initialLoading`, `resolveTotalsLoad()` → `ready`, and `failTotalsLoad(hasData)` → `refreshErrorWithData` or `firstLoadError`. `loadTotals` calls a UI completion action only when the matching data-store action returns `true`.

- [ ] **Step 4: Preserve request ownership**

Update `loadTotals` so UI status changes only when `resolveTotals` confirms the current month/request. Preserve prior same-month totals during refresh.

- [ ] **Step 5: Run GREEN and commit**

```bash
npm test -- --runInBand __tests__/screens/transactions/transactions_store.test.ts __tests__/screens/transactions/transactions_state.test.ts __tests__/screens/transactions/transactions_hook.test.ts
npm run typecheck
git add src/modules/transactions/screens/transactions/transactions.store.ts src/modules/transactions/screens/transactions/transactions.state.ts src/modules/transactions/screens/transactions/transactions.hook.ts __tests__/screens/transactions/transactions_store.test.ts __tests__/screens/transactions/transactions_state.test.ts __tests__/screens/transactions/transactions_hook.test.ts
git commit -m "refactor(transactions): separate totals data and UI state"
```

Expected: suites PASS and typecheck exits 0.

### Task 11: Finish Canonical Imports, Copy, Tokens, and Obsolete Names

**Files:**
- Modify: `src/constants/strings.ts`
- Modify: `src/components/ui/stack_header.tsx`
- Modify: `src/modules/transactions/screens/transactions/components/transaction_row.tsx`
- Modify: `src/modules/transactions/screens/transactions/detail/components/detail_hero.tsx`
- Modify: `src/modules/transactions/screens/transactions/detail/components/transfer_flow_card.tsx`
- Modify: `src/modules/transactions/screens/transactions/filter/components/account_accordion.tsx`
- Modify: `src/modules/transactions/screens/transactions/filter/components/category_accordion.tsx`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/add_transaction.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/components/amount_hero.tsx`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row.tsx`
- Modify: `src/modules/transactions/screens/transactions/filter/filter.store.ts`
- Modify: `src/modules/transactions/screens/transactions/transactions.store.ts`
- Modify: `src/modules/transactions/screens/transactions/transactions.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/components/transaction_row.anim.ts`
- Delete: `src/modules/transactions/screens/transactions/transactions.anim.ts`
- Modify: `src/modules/transactions/screens/transactions/components/tx_delete_confirm_sheet.tsx`
- Delete: `src/modules/transactions/screens/transactions/detail/components/delete_confirm_dialog.tsx`
- Modify: `__tests__/screens/transactions.screen.test.tsx`
- Modify: `__tests__/screens/transactions/filter/filter_helpers.test.ts`
- Modify: `__tests__/screens/transactions/filter/filter_hook.test.ts`
- Modify: `__tests__/screens/transactions/filter/filter_store.test.ts`
- Modify: `__tests__/screens/transactions/transactions_hook.test.ts`
- Modify: `__tests__/screens/transactions/transactions_store.test.ts`
- Modify: `__tests__/screens/transactions/transaction_form/transaction_form_prerequisites.test.ts`

- [ ] **Step 1: Capture RED scans**

```bash
rg -n '@/database/entities/(account|category)|EMPTY_FILTERS_V2|transactions\.anim|DeleteConfirmDialog|placeholder="(0|0\.00)"' src/modules/transactions src/components/ui/stack_header.tsx __tests__/screens/transactions
rg -n 'text-\[[^]]+\]|rounded-\[[^]]+\]' src/modules/transactions/screens/transactions
```

Expected: both commands print audited violations.

- [ ] **Step 2: Centralize copy/accessibility**

Add canonical amount/rate placeholders, shared back label, picker action formatters, and exchange-rate edit/reset/input/error labels to `Strings`. Picker rows and rate controls receive role, label, disabled state, and error association. Never use an error message as `accessibilityHint`.

- [ ] **Step 3: Replace raw colors and arbitrary typography/radii**

Use `CoreTokens.text1/text2` for icon/fallback props. Use `Type`, `Radius`, `Size`, `Spacing`, `ms`, and `msFont` for typography, radius, and fixed geometry. Retain only documented percentage-width utilities used by progress geometry.

- [ ] **Step 4: Canonicalize imports and remove aliases**

Use module account/category entities; rename `EMPTY_FILTERS_V2` to `EMPTY_FILTERS`; move `useRowPressScale` into `components/transaction_row.anim.ts`; import the canonical delete sheet directly and remove the alias/history comments.

Apply the import migration to every production file listed above and to
`transaction_form_prerequisites.test.ts`; the scan must cover both `src/` and
transaction tests so compatibility imports cannot survive behind a mock.

- [ ] **Step 5: Run GREEN and commit**

```bash
! rg '@/database/entities/(account|category)|EMPTY_FILTERS_V2|transactions\.anim|DeleteConfirmDialog|placeholder="(0|0\.00)"' src/modules/transactions src/components/ui/stack_header.tsx __tests__/screens/transactions
npm test -- --runInBand __tests__/screens/transactions __tests__/screens/commitments/search_row.test.tsx
npm run typecheck
git add src/constants/strings.ts src/components/ui/stack_header.tsx src/modules/transactions __tests__
git commit -m "refactor(transactions): finish module standards cleanup"
```

Expected: scan exits 0, tests PASS, and typecheck exits 0.

### Task 12: Complete the Pure Presentation Matrix

**Files:**
- Create: `src/modules/transactions/screens/transactions/transactions.presentation.ts`
- Create: `__tests__/screens/transactions/transactions_presentation.test.ts`
- Modify: `src/modules/transactions/screens/transactions/transactions.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/detail/detail.helpers.ts`
- Modify: `__tests__/screens/transactions/detail/detail_helpers.test.ts`
- Modify: `__tests__/screens/transactions/transaction_row.helpers.test.ts`
- Modify: `__tests__/screens/transactions/transaction_form/transaction_form_host_state.test.ts`
- Modify: `__tests__/screens/transactions/filter/filter_helpers.test.ts`

- [ ] **Step 1: Add RED matrix tests**

Cover initial, refresh, empty, first-load error, refresh-error-with-data, pagination error, invalid amount range, add/edit saving/recoverable error, detail loading/refresh/not-found/owned/editable, and row note/FX/large/Card-credit/budget/commitment states.

```ts
it.each([
  ['initial', { listStatus: 'initialLoading', rowCount: 0 }, { showInitialSkeleton: true }],
  ['first error', { listStatus: 'firstLoadError', rowCount: 0 }, { showFirstLoadError: true }],
  ['refresh error', { listStatus: 'refreshErrorWithData', rowCount: 2 }, { loadErrorVariant: 'refresh' }],
])('%s', (_name, input, expected) => {
  expect(buildTransactionsPresentation(baseInput(input))).toMatchObject(expected);
});
```

- [ ] **Step 2: Run RED**

```bash
npm test -- --runInBand __tests__/screens/transactions/transactions_presentation.test.ts __tests__/screens/transactions/detail/detail_helpers.test.ts __tests__/screens/transactions/transaction_row.helpers.test.ts __tests__/screens/transactions/filter/filter_helpers.test.ts __tests__/screens/transactions/transaction_form/transaction_form_host_state.test.ts
```

Expected: FAIL because the main presentation helper and missing branches do not exist.

- [ ] **Step 3: Implement pure resolvers**

Move view derivation only from `transactions.hook.ts` into `buildTransactionsPresentation`; add `resolveDetailViewState(status, hasTransaction)`. Expand existing row/filter/form state tests. Add no `.test.tsx` suites and do not duplicate summary/skeleton geometry tests.

```ts
export interface TransactionsPresentationInput {
  listStatus: TransactionListStatus;
  totalsStatus: TransactionTotalsStatus;
  rowCount: number;
  hasLoadedOnce: boolean;
  paginationError: boolean;
}

export interface TransactionsPresentation {
  showInitialSkeleton: boolean;
  showEmptyState: boolean;
  showFirstLoadError: boolean;
  showRefreshIndicator: boolean;
  loadErrorVariant: TransactionLoadErrorVariant;
  showPaginationRetry: boolean;
}

export function buildTransactionsPresentation(
  input: TransactionsPresentationInput,
): TransactionsPresentation {
  const isInitial = input.listStatus === 'idle' || input.listStatus === 'initialLoading';
  const showFirstLoadError = input.listStatus === 'firstLoadError' && input.rowCount === 0;
  return {
    showInitialSkeleton: isInitial && input.rowCount === 0,
    showEmptyState: input.hasLoadedOnce && input.rowCount === 0 && !showFirstLoadError,
    showFirstLoadError,
    showRefreshIndicator: input.listStatus === 'refreshing',
    loadErrorVariant:
      showFirstLoadError
        ? 'none'
        : input.listStatus === 'refreshErrorWithData' ||
            input.totalsStatus === 'refreshErrorWithData'
          ? 'refresh'
          : input.totalsStatus === 'firstLoadError'
            ? 'totals'
            : 'none',
    showPaginationRetry: input.paginationError && input.rowCount > 0,
  };
}

export type TransactionDetailViewState =
  | 'loading'
  | 'refreshing'
  | 'ready'
  | 'notFound'
  | 'firstLoadError'
  | 'refreshErrorWithData';

export function resolveDetailViewState(
  status: TransactionDetailStatus,
  hasTransaction: boolean,
  revalidating: boolean,
  refreshError: boolean,
): TransactionDetailViewState {
  if ((status === 'idle' || status === 'initialLoading') && !hasTransaction) return 'loading';
  if (status === 'notFound') return 'notFound';
  if (status === 'firstLoadError' && !hasTransaction) return 'firstLoadError';
  if (revalidating && hasTransaction) return 'refreshing';
  if (refreshError && hasTransaction) return 'refreshErrorWithData';
  return 'ready';
}
```

- [ ] **Step 4: Run GREEN and commit**

```bash
npm test -- --runInBand __tests__/screens/transactions/transactions_presentation.test.ts __tests__/screens/transactions/detail/detail_helpers.test.ts __tests__/screens/transactions/transaction_row.helpers.test.ts __tests__/screens/transactions/filter/filter_helpers.test.ts __tests__/screens/transactions/transaction_form/transaction_form_host_state.test.ts
npm run typecheck
git add src/modules/transactions/screens/transactions/transactions.presentation.ts src/modules/transactions/screens/transactions/transactions.hook.ts src/modules/transactions/screens/transactions/detail/detail.helpers.ts __tests__/screens/transactions/transactions_presentation.test.ts __tests__/screens/transactions/detail/detail_helpers.test.ts __tests__/screens/transactions/transaction_row.helpers.test.ts __tests__/screens/transactions/filter/filter_helpers.test.ts __tests__/screens/transactions/transaction_form/transaction_form_host_state.test.ts
git commit -m "test(transactions): complete presentation matrix"
```

Expected: suites PASS and typecheck exits 0.

### Task 13: Final Verification and Device QA Matrix

**Files:**
- Modify: `docs/superpowers/qa/2026-07-20-transactions-ux-refinement-device-qa.md`

- [ ] **Step 1: Add physical-device checks**

Cover shared SearchField behavior on Transactions and Commitments, account/category/budget ListGroup rows, RadioGroup selection, detail header edit ownership, keyboard interaction, all presentation states, and no loading/ready geometry shift.

- [ ] **Step 2: Run focused verification**

```bash
npm test -- --runInBand --testPathPattern='transactions|transaction|search_filter_row|commitments/search_row'
npm run format:check
npm run lint
npm run typecheck
```

Expected: all commands exit 0.

- [ ] **Step 3: Run full local CI parity**

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

Expected: `CI parity green`.

- [ ] **Step 4: Commit QA documentation**

```bash
git add docs/superpowers/qa/2026-07-20-transactions-ux-refinement-device-qa.md
git commit -m "docs(transactions): extend remediation QA matrix"
```

## Completion Gate

- [ ] No financial, persisted-data, form-session, or row/skeleton geometry behavior changed.
- [ ] Required transaction surfaces compose HeroUI primitives.
- [ ] Templates are declarative and totals data/UI state obey module anatomy.
- [ ] Pure tests cover the signed presentation matrix without adding `.test.tsx` suites.
- [ ] No transaction-scoped unsafe lint warnings or file-wide suppressions remain.
- [ ] Full local CI parity is green.
- [ ] Physical-device QA remains the user-facing gate before merge.
