import { act, renderHook } from '@testing-library/react-native';

import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useTransactionStore } from '@/store/transaction.store';
import { useAddTransaction } from '@/screens/transactions/transaction_form_v2/add_transaction.hook';
import { useAddTransactionState } from '@/screens/transactions/transaction_form_v2/add_transaction.state';
import { useAddTransactionStore } from '@/screens/transactions/transaction_form_v2/add_transaction.store';

// AccountType.Cash does not exist in the enum; PhysicalWallet is a non-CC
// asset type that satisfies all "non-credit-card" rules in the schema.
const mockAccountEGP = {
  id: 'a1',
  name: 'Cash',
  type: AccountType.PhysicalWallet,
  currency: Currency.EGP,
  opening_balance: 0,
  current_balance: 1000,
  color: '#fff',
  is_archived: 0,
  icon: 'cash',
  minimum_payment: null,
  credit_limit: null,
  statement_day: null,
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
  type: 'expense' as const,
  icon: 'food',
  color: '#fff',
  created_at: 'now',
};
const mockCategoryIncome = {
  id: 'c2',
  name: 'Salary',
  type: 'income' as const,
  icon: 'cash',
  color: '#fff',
  created_at: 'now',
};

beforeEach(() => {
  useAccountStore.setState({
    state: {
      accounts: [mockAccountEGP, mockAccountUSD, mockAccountCC, mockAccountCC2],
      loading: false,
      error: undefined,
    },
  } as any);
  useCategoryStore.setState({
    state: {
      categories: [mockCategoryExpense, mockCategoryIncome],
      loading: false,
      error: undefined,
    },
  } as any);
  useCurrencyStore.setState({
    state: { rate: 50, rate_updated_at: new Date().toISOString() },
  } as any);
  useAddTransactionState.getState().reset();
  useAddTransactionStore.getState().reset();
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
    const addTx = jest.fn();
    useTransactionStore.setState({ addTransaction: addTx } as any);
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
        egp_amount: 500, // 10 × 50.0 = 500
        exchange_rate: 50,
      }),
    );
  });

  it('transfer EGP → USD: to_amount = amount / rate (rounded)', async () => {
    const addTx = jest.fn();
    useTransactionStore.setState({ addTransaction: addTx } as any);
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
    const addTx = jest.fn();
    useTransactionStore.setState({ addTransaction: addTx } as any);
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
        egp_amount: 250, // 5 × 50
        to_amount: 250,
      }),
    );
  });

  it('transfer USD → USD: rate required (for egp_amount); to_amount = amount', async () => {
    const mockAccountUSD2 = { ...mockAccountUSD, id: 'a5', name: 'USD Wallet' };
    useAccountStore.setState({
      state: {
        accounts: [...useAccountStore.getState().state.accounts, mockAccountUSD2],
        loading: false,
        error: undefined,
      },
    } as any);
    const addTx = jest.fn();
    useTransactionStore.setState({ addTransaction: addTx } as any);
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
    const addTx = jest.fn();
    useTransactionStore.setState({ addTransaction: addTx } as any);
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
        egp_amount: 1000, // 20 × 50
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
    useCurrencyStore.setState({
      state: { rate: 30.005, rate_updated_at: null },
    } as any);
    const addTx = jest.fn();
    useTransactionStore.setState({ addTransaction: addTx } as any);
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
    const addTx = jest.fn();
    useTransactionStore.setState({ addTransaction: addTx } as any);
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
    expect(arg.transaction_time >= before).toBe(true);
    expect(arg.transaction_time <= after).toBe(true);
    // No setTime exposed
    expect((result.current as any).setTime).toBeUndefined();
  });
});
