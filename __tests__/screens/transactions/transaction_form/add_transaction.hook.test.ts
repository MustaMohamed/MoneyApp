import { act, renderHook } from '@testing-library/react-native';

import { AccountType, CategoryType, Currency, TransactionType } from '@/constants/enums';
// AccountType.Cash does not exist in the enum; PhysicalWallet is a non-CC
// asset type that satisfies all "non-credit-card" rules in the schema.
import type { Account } from '@/database/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { useAddTransaction } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.hook';
import { useAddTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.store';
import {
  useTransactionStore,
  type NewTransactionInput,
} from '@/modules/transactions/store/transaction.store';

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
const mockAccountUSD = { ...mockAccountEGP, id: 'a2', name: 'USD Bank', currency: Currency.USD };
const mockAccountCC = {
  ...mockAccountEGP,
  id: 'a3',
  name: 'Visa',
  type: AccountType.CreditCard,
};
const mockAccountCC2 = {
  ...mockAccountEGP,
  id: 'a4',
  name: 'Mastercard',
  type: AccountType.CreditCard,
};

const mockCategoryExpense = {
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
const mockCategoryIncome = {
  id: 'c2',
  name: 'Salary',
  type: CategoryType.Income,
  icon: 'cash',
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
    add: (data: NewTransactionInput) => Promise<Transaction>;
    getAll: () => Promise<Transaction[]>;
  };
};

function getTransactionRepository() {
  return (useTransactionStore() as unknown as TransactionRepositoryForTest).repository;
}

function mockSavedTransaction(input: NewTransactionInput): Transaction {
  return {
    id: 'saved-tx',
    type: input.type,
    amount: input.amount,
    currency: input.currency,
    egp_amount: input.egp_amount,
    exchange_rate: input.exchange_rate ?? null,
    to_amount: input.to_amount ?? null,
    minimum_payment_snapshot: null,
    account_id: input.account_id,
    to_account_id: input.to_account_id ?? null,
    category_id: input.category_id ?? null,
    note: input.note ?? null,
    transaction_date: input.transaction_date ?? '2026-05-01',
    transaction_time: input.transaction_time ?? '12:00:00',
    commitment_payment_id: null,
    installment_id: null,
    created_at: 'now',
    updated_at: 'now',
  };
}

function mockAddTransaction() {
  const repo = getTransactionRepository();
  const addTx = jest.fn(async (input: NewTransactionInput) => mockSavedTransaction(input));
  jest.spyOn(repo, 'add').mockImplementation(addTx);
  jest.spyOn(repo, 'getAll').mockResolvedValue([]);
  return addTx;
}

beforeEach(() => {
  jest.restoreAllMocks();
  const accountsStore = useAccountStore();
  accountsStore.reset();
  accountsStore.accounts = [mockAccountEGP, mockAccountUSD, mockAccountCC, mockAccountCC2];
  jest
    .spyOn((accountsStore as unknown as AccountRepositoryForTest).repository, 'getAll')
    .mockResolvedValue(accountsStore.accounts);

  const categoryStore = useCategoryStore();
  categoryStore.reset();
  categoryStore.categories = [mockCategoryExpense, mockCategoryIncome];
  categoryStore.hasLoaded = true;

  const currencyStore = useCurrencyStore();
  currencyStore.reset();
  currencyStore.rate = 50;
  currencyStore.rate_updated_at = new Date().toISOString();

  useTransactionStore().reset();

  const addStore = renderHook(() => useAddTransactionStore());
  act(() => addStore.result.current.reset());
});

describe('useAddTransaction — validation', () => {
  it('rejects amount=0', async () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => useAddTransaction(onClose));
    // amountStr defaults to '0', accountId selected
    act(() => result.current.selectAccount(mockAccountEGP));
    act(() => result.current.selectCategory(mockCategoryExpense));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.state.errors.amount).toBeDefined();
  });

  it('rejects expense without an account', async () => {
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.handleNumpad('digit', '0'));
    act(() => result.current.selectCategory(mockCategoryExpense));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.state.errors.account).toBeDefined();
  });

  it('rejects expense without a category', async () => {
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.selectAccount(mockAccountEGP));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.state.errors.category).toBeDefined();
  });

  it('rejects transfer with same from/to', async () => {
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.setType(TransactionType.Transfer));
    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.selectAccount(mockAccountEGP));
    act(() => result.current.selectToAccount(mockAccountEGP));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.state.errors.toAccount).toBeDefined();
  });

  it('rejects transfer with CC source', async () => {
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.setType(TransactionType.Transfer));
    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.selectAccount(mockAccountCC));
    act(() => result.current.selectToAccount(mockAccountEGP));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.state.errors.account).toBeDefined();
  });

  it('rejects CC payment with CC source (must be a non-CC asset)', async () => {
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.setType(TransactionType.CCPayment));
    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.selectAccount(mockAccountCC));
    act(() => result.current.selectToAccount(mockAccountCC2));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.state.errors.account).toBeDefined();
  });

  it('rejects CC payment with non-CC target', async () => {
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.setType(TransactionType.CCPayment));
    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.selectAccount(mockAccountEGP));
    act(() => result.current.selectToAccount(mockAccountUSD));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.state.errors.toAccount).toBeDefined();
  });
});

describe('useAddTransaction — cross-currency math', () => {
  it('non-transfer USD source: egp_amount = amount × rate (rounded)', async () => {
    const addTx = mockAddTransaction();
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.handleNumpad('digit', '1'));
    act(() => result.current.handleNumpad('digit', '0'));
    act(() => result.current.selectAccount(mockAccountUSD));
    act(() => result.current.selectCategory(mockCategoryExpense));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(addTx).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 10,
        currency: Currency.USD,
        egp_amount: 500, // 10 × 50.0 = 500,
        exchange_rate: 50,
      }),
    );
  });

  it('transfer EGP → USD: to_amount = amount / rate (rounded)', async () => {
    const addTx = mockAddTransaction();
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.setType(TransactionType.Transfer));
    act(() => result.current.handleNumpad('digit', '1'));
    act(() => result.current.handleNumpad('digit', '0'));
    act(() => result.current.handleNumpad('digit', '0'));
    act(() => result.current.selectAccount(mockAccountEGP));
    act(() => result.current.selectToAccount(mockAccountUSD));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(addTx).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 100,
        currency: Currency.EGP,
        egp_amount: 100,
        to_amount: 2, // 100 / 50 = 2.00
      }),
    );
  });

  it('transfer USD → EGP: to_amount = egp_amount = amount × rate', async () => {
    const addTx = mockAddTransaction();
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.setType(TransactionType.Transfer));
    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.selectAccount(mockAccountUSD));
    act(() => result.current.selectToAccount(mockAccountEGP));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(addTx).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5,
        currency: Currency.USD,
        egp_amount: 250, // 5 × 50,
        to_amount: 250,
      }),
    );
  });

  it('transfer USD → USD: rate required (for egp_amount); to_amount = amount', async () => {
    const mockAccountUSD2 = { ...mockAccountUSD, id: 'a5', name: 'USD Wallet' };
    const accountsStore = useAccountStore();
    accountsStore.accounts = [...accountsStore.accounts, mockAccountUSD2];
    const addTx = mockAddTransaction();
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.setType(TransactionType.Transfer));
    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.selectAccount(mockAccountUSD));
    act(() => result.current.selectToAccount(mockAccountUSD2));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(addTx).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5,
        currency: Currency.USD,
        egp_amount: 250,
        to_amount: 5, // same-currency
      }),
    );
  });

  it('cc_payment: to_amount = egp_amount (CC debt always EGP-denominated)', async () => {
    const addTx = mockAddTransaction();
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.setType(TransactionType.CCPayment));
    act(() => result.current.handleNumpad('digit', '2'));
    act(() => result.current.handleNumpad('digit', '0'));
    act(() => result.current.selectAccount(mockAccountUSD));
    act(() => result.current.selectToAccount(mockAccountCC));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(addTx).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 20,
        currency: Currency.USD,
        egp_amount: 1000, // 20 × 50,
        to_amount: 1000,
      }),
    );
  });
});

describe('useAddTransaction — rounding', () => {
  it("applies banker's rounding to egp_amount on cross-currency expense", async () => {
    // Plan test entered `3.275` via numpad, but the shipped store caps inputs at
    // 2 decimal places — the `5` digit is silently dropped, giving `3.27`.
    // Adjusted case: amount=1 (integer, no decimal issues), rate=30.005.
    //   1 × 30.005 = 30.005 → scaled=3000.5, truncated=3000 (even).
    //   Banker's rounding: stays at 3000 → 30.00.
    //   Regular Math.round(3000.5) = 3001 → 30.01 (would fail without roundMoney).
    const currencyStore = useCurrencyStore();
    currencyStore.rate = 30.005;
    currencyStore.rate_updated_at = null;
    const addTx = mockAddTransaction();
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.handleNumpad('digit', '1'));
    act(() => result.current.selectAccount(mockAccountUSD));
    act(() => result.current.selectCategory(mockCategoryExpense));
    await act(async () => {
      await result.current.handleSave();
    });
    // amount = 1, rate = 30.005 → 30.005 → banker's rounds to 30.00 (even)
    expect(addTx).toHaveBeenCalledWith(
      expect.objectContaining({
        egp_amount: 30.0,
      }),
    );
  });
});

describe('useAddTransaction — auto-now time', () => {
  it('sets transaction_time to the current device clock and never exposes a setter', async () => {
    const addTx = mockAddTransaction();
    const before = new Date().toTimeString().slice(0, 8);
    const { result } = renderHook(() => useAddTransaction(jest.fn()));
    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.selectAccount(mockAccountEGP));
    act(() => result.current.selectCategory(mockCategoryExpense));
    await act(async () => {
      await result.current.handleSave();
    });
    const after = new Date().toTimeString().slice(0, 8);
    expect(addTx).toHaveBeenCalled();
    const arg = addTx.mock.calls[0][0];
    const transactionTime = arg.transaction_time;
    if (transactionTime === undefined) throw new Error('transaction_time was not submitted');
    expect(transactionTime >= before).toBe(true);
    expect(transactionTime <= after).toBe(true);
    // No setTime exposed
    expect((result.current as any).setTime).toBeUndefined();
  });
});
