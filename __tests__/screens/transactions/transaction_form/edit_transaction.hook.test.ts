import { act, renderHook } from '@testing-library/react-native';

import { AccountType, CategoryType, Currency, TransactionType } from '@/constants/enums';
import type { Account } from '@/database/entities/account.entity';
import type { Transaction } from '@/database/entities/transaction.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { useEditTransaction } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook';
import { useEditTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.store';
import {
  useTransactionStore,
  type UpdateTransactionInput,
} from '@/modules/transactions/store/transaction.store';

const mockTxExpense: Transaction = {
  id: 't1',
  type: TransactionType.Expense,
  amount: 50,
  currency: Currency.EGP,
  egp_amount: 50,
  to_amount: null,
  exchange_rate: null,
  minimum_payment_snapshot: null,
  account_id: 'a1',
  to_account_id: null,
  category_id: 'c1',
  note: 'lunch',
  transaction_date: '2026-05-18',
  transaction_time: '12:00:00',
  commitment_payment_id: null,
  installment_id: null,
  created_at: 'now',
  updated_at: 'now',
};

const mockAccountEGP: Account = {
  id: 'a1',
  name: 'Cash',
  type: AccountType.PhysicalWallet,
  currency: Currency.EGP,
  opening_balance: 0,
  current_balance: 1000,
  color: '#fff',
  credit_limit: null,
  revolving_balance: null,
  minimum_payment: null,
  statement_due_day: null,
  interest_tracking: 0,
  apr: null,
  is_archived: 0,
  sort_order: 0,
  created_at: 'now',
  updated_at: 'now',
};
const mockCategoryFood = {
  id: 'c1',
  name: 'Food',
  type: CategoryType.Expense,
  icon: 'food',
  color: '#fff',
  is_default: 0 as const,
  sort_order: 0,
  budget_group: null,
  created_at: 'now',
  updated_at: 'now',
};
const mockCategoryShop = {
  id: 'c2',
  name: 'Shopping',
  type: CategoryType.Expense,
  icon: 'cart',
  color: '#fff',
  is_default: 0 as const,
  sort_order: 1,
  budget_group: null,
  created_at: 'now',
  updated_at: 'now',
};

type AccountRepositoryForTest = {
  repository: {
    getAll: () => Promise<Account[]>;
  };
};

type TransactionRepositoryForTest = {
  repository: {
    update: (id: string, data: UpdateTransactionInput) => Promise<void>;
    getAll: () => Promise<Transaction[]>;
  };
};

function getTransactionRepository() {
  return (useTransactionStore() as unknown as TransactionRepositoryForTest).repository;
}

function mockUpdateTransaction() {
  const repo = getTransactionRepository();
  const updateTx = jest.fn(async (_id: string, _data: UpdateTransactionInput) => {});
  jest.spyOn(repo, 'update').mockImplementation(updateTx);
  jest.spyOn(repo, 'getAll').mockResolvedValue([]);
  return updateTx;
}

beforeEach(() => {
  jest.restoreAllMocks();
  const accountsStore = useAccountStore();
  accountsStore.reset();
  accountsStore.accounts = [mockAccountEGP];
  jest
    .spyOn((accountsStore as unknown as AccountRepositoryForTest).repository, 'getAll')
    .mockResolvedValue(accountsStore.accounts);

  const categoryStore = useCategoryStore();
  categoryStore.reset();
  categoryStore.categories = [mockCategoryFood, mockCategoryShop];
  categoryStore.hasLoaded = true;

  const currencyStore = useCurrencyStore();
  currencyStore.reset();
  currencyStore.rate = 50;
  currencyStore.rate_updated_at = null;

  useTransactionStore().reset();

  const editStore = renderHook(() => useEditTransactionStore());
  act(() => editStore.result.current.reset());
  act(() => editStore.result.current.loadFromTx(mockTxExpense));
});

describe('useEditTransaction', () => {
  it('initializes amount, category, note, date from the loaded tx', () => {
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, jest.fn(), jest.fn()));
    expect(result.current.state.amountStr).toBe('50');
    expect(result.current.state.categoryId).toBe('c1');
    expect(result.current.state.note).toBe('lunch');
    expect(result.current.state.date).toBe('2026-05-18');
  });

  it('lock policy: type / selectedAccount / selectedToAccount are read-only', () => {
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, jest.fn(), jest.fn()));
    expect(result.current.state.type).toBe(TransactionType.Expense);
    expect(result.current.state.selectedAccount?.id).toBe('a1');
    // No setType / selectAccount / selectToAccount exports
    expect((result.current as any).setType).toBeUndefined();
    expect((result.current as any).selectAccount).toBeUndefined();
    expect((result.current as any).selectToAccount).toBeUndefined();
  });

  it('allows category change', () => {
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, jest.fn(), jest.fn()));
    act(() => result.current.selectCategory(mockCategoryShop));
    expect(result.current.state.categoryId).toBe('c2');
  });

  it('calls updateTransaction with new values on save', async () => {
    const updateTx = mockUpdateTransaction();
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, jest.fn(), jest.fn()));
    // Update amount via numpad
    act(() => result.current.handleNumpad('backspace'));
    act(() => result.current.handleNumpad('backspace'));
    act(() => result.current.handleNumpad('digit', '7'));
    act(() => result.current.handleNumpad('digit', '5'));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(updateTx).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({
        amount: 75,
        category_id: 'c1',
      }),
    );
  });

  it('preserves the original transaction_time on save (no time UI in edit either)', async () => {
    const updateTx = mockUpdateTransaction();
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, jest.fn(), jest.fn()));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(updateTx).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({
        transaction_time: '12:00:00',
      }),
    );
  });
});
