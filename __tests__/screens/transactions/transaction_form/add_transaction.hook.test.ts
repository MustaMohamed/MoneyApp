import { act, renderHook, waitFor } from '@testing-library/react-native';

import { AccountType, CategoryType, Currency, TransactionType } from '@/constants/enums';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { budgetRepository } from '@/modules/budget/repositories/budget.repository';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { useAddTransaction } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.hook';
import { useAddTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.state';
import { useAddTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.store';
import { useTransactionFormState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state';
import {
  installMockAddTransaction,
  makeTestAccount,
  makeTestBudget,
  makeTestCategory,
  makeTestTransaction,
} from '@/test_helpers/transaction';

const mockAccountEGP = makeTestAccount({
  id: 'a1',
  name: 'Cash',
  current_balance: 1000,
});
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
const mockAccountCCUSD = {
  ...mockAccountCC,
  id: 'a6',
  name: 'USD Visa',
  currency: Currency.USD,
};

const mockCategoryExpense = makeTestCategory({
  id: 'c1',
  name: 'Food',
  type: CategoryType.Expense,
  budget_group: null,
});
const mockCategoryIncome = makeTestCategory({
  id: 'c2',
  name: 'Salary',
  type: CategoryType.Income,
  icon: 'cash',
  sort_order: 1,
  budget_group: null,
});

const mockBudget = (id: string, name: string): Budget =>
  makeTestBudget({
    id,
    category_id: mockCategoryExpense.id,
    name,
  });

const originalLoadAccounts = useAccountStore.getState().loadAccounts;
const originalLoadCategories = useCategoryStore.getState().loadCategories;

beforeEach(() => {
  jest.restoreAllMocks();
  useTransactionFormState.getState().reset();
  useAccountStore.setState({ loadAccounts: originalLoadAccounts });
  useCategoryStore.setState({ loadCategories: originalLoadCategories });
  jest.spyOn(budgetRepository, 'getBudgetsForCategoryMonth').mockResolvedValue([]);
  useAccountStore.getState().reset();
  useAccountStore.setState({
    accounts: [mockAccountEGP, mockAccountUSD, mockAccountCC, mockAccountCC2, mockAccountCCUSD],
    hasLoaded: true,
  });
  useCategoryStore.setState({
    categories: [mockCategoryExpense, mockCategoryIncome],
    hasLoaded: true,
    loadError: false,
  });
  useCurrencyStore.setState({
    rate: 50,
    rate_updated_at: new Date().toISOString(),
  });
  useAddTransactionState.getState().reset();
  useAddTransactionStore.getState().reset();
});

describe('useAddTransaction — named budget assignment', () => {
  it('uses an injected prerequisite controller without starting its legacy loader', async () => {
    const loadAccounts = jest.fn();
    const loadCategories = jest.fn();
    const retry = jest.fn();
    useAccountStore.setState({ loadAccounts });
    useCategoryStore.setState({ loadCategories });

    const { result } = await renderHook(() =>
      useAddTransaction(jest.fn(), { status: 'ready', retry }),
    );

    expect(result.current.state.formDataReady).toBe(true);
    expect(loadAccounts).not.toHaveBeenCalled();
    expect(loadCategories).not.toHaveBeenCalled();

    await act(() => result.current.retryFormData());
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('does not republish the full form hook for ordinary amount typing', async () => {
    let renderCount = 0;
    const { result } = await renderHook(() => {
      renderCount += 1;
      return useAddTransaction(jest.fn());
    });
    await waitFor(() => expect(result.current.state.formDataReady).toBe(true));
    const beforeTyping = renderCount;

    await act(() => result.current.setAmountStr('125'));

    expect(useAddTransactionStore.getState().amountStr).toBe('125');
    expect(renderCount).toBe(beforeTyping);
  });

  it('does not save while matching budgets are still loading', async () => {
    let resolveBudgets: (budgets: Budget[]) => void = () => {};
    const pendingBudgets = new Promise<Budget[]>((resolve) => {
      resolveBudgets = resolve;
    });
    jest.spyOn(budgetRepository, 'getBudgetsForCategoryMonth').mockReturnValue(pendingBudgets);
    const addTx = installMockAddTransaction();
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));

    await act(() => result.current.setDate('2026-07-10'));
    await act(() => result.current.selectCategory(mockCategoryExpense));
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(true));
    expect(result.current.state.showBudgetField).toBe(true);
    await act(() => result.current.setAmountStr('5'));
    await act(() => result.current.selectAccount(mockAccountEGP));
    await act(async () => result.current.handleSave());

    expect(addTx).not.toHaveBeenCalled();
    await act(async () => resolveBudgets([]));
    expect(result.current.state.showBudgetField).toBe(false);
  });

  it('blocks an immediate save until the selected category budget is resolved', async () => {
    const pendingBudgets = new Promise<Budget[]>(() => {});
    jest.spyOn(budgetRepository, 'getBudgetsForCategoryMonth').mockReturnValue(pendingBudgets);
    const addTx = installMockAddTransaction();
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));

    await act(() => result.current.selectAccount(mockAccountEGP));
    await act(() => result.current.setAmountStr('5'));
    await act(async () => {
      result.current.selectCategory(mockCategoryExpense);
      await result.current.handleSave();
    });

    expect(addTx).not.toHaveBeenCalled();
    expect(useAddTransactionState.getState().budgetsLoading).toBe(true);
  });

  it('blocks save and exposes retry when the budget lookup fails', async () => {
    const budgetLookupSpy = jest
      .spyOn(budgetRepository, 'getBudgetsForCategoryMonth')
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValueOnce([]);
    const addTx = installMockAddTransaction();
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));

    await act(() => result.current.setDate('2026-07-10'));
    await act(() => result.current.selectCategory(mockCategoryExpense));
    await waitFor(() => expect(result.current.state.errors.budget).toBeDefined());

    expect(result.current.state.showBudgetField).toBe(true);
    await act(() => result.current.setAmountStr('5'));
    await act(() => result.current.selectAccount(mockAccountEGP));
    await act(async () => result.current.handleSave());
    expect(addTx).not.toHaveBeenCalled();

    await act(() => result.current.retryBudgetLookup());
    expect(result.current.state.errors.budget).toBeUndefined();
    await waitFor(() => expect(budgetLookupSpy).toHaveBeenCalledTimes(2));
  });

  it('does not write a completed budget lookup after unmount', async () => {
    let resolveBudgets: (budgets: Budget[]) => void = () => {};
    const pendingBudgets = new Promise<Budget[]>((resolve) => {
      resolveBudgets = resolve;
    });
    jest.spyOn(budgetRepository, 'getBudgetsForCategoryMonth').mockReturnValue(pendingBudgets);
    const setAvailableBudgets = jest.spyOn(
      useAddTransactionStore.getState(),
      'setAvailableBudgets',
    );
    const setBudgetsLoading = jest.spyOn(useAddTransactionState.getState(), 'setBudgetsLoading');
    const { result, unmount } = await renderHook(() => useAddTransaction(jest.fn()));

    await act(() => result.current.selectCategory(mockCategoryExpense));
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(true));
    await unmount();
    setAvailableBudgets.mockClear();
    setBudgetsLoading.mockClear();
    await act(async () => resolveBudgets([mockBudget('b1', 'Monthly meals')]));

    expect(setAvailableBudgets).not.toHaveBeenCalled();
    expect(setBudgetsLoading).not.toHaveBeenCalled();
  });

  it('clears a stale budget selection while another month is loading', async () => {
    let resolveAugust: (budgets: Budget[]) => void = () => {};
    const augustBudgets = new Promise<Budget[]>((resolve) => {
      resolveAugust = resolve;
    });
    jest
      .spyOn(budgetRepository, 'getBudgetsForCategoryMonth')
      .mockImplementation(async (_categoryId, yearMonth) => {
        if (yearMonth === '2026-07') return [mockBudget('b1', 'Monthly meals')];
        return augustBudgets;
      });
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));

    await act(() => result.current.setDate('2026-07-10'));
    await act(() => result.current.selectCategory(mockCategoryExpense));
    await waitFor(() => expect(result.current.state.selectedBudget?.id).toBe('b1'));

    await act(() => result.current.setDate('2026-08-10'));
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(true));
    expect(result.current.state.selectedBudget).toBeNull();
    expect(result.current.state.availableBudgets).toEqual([]);
    await act(async () => resolveAugust([]));
  });

  it('auto-selects one matching budget and saves its id', async () => {
    const budget = mockBudget('b1', 'Monthly meals');
    jest.spyOn(budgetRepository, 'getBudgetsForCategoryMonth').mockResolvedValue([budget]);
    const addTx = installMockAddTransaction();
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));

    await act(() => result.current.setDate('2026-07-10'));
    await act(() => result.current.selectCategory(mockCategoryExpense));
    await waitFor(() => expect(result.current.state.selectedBudget?.id).toBe('b1'));
    await act(() => result.current.setAmountStr('5'));
    await act(() => result.current.selectAccount(mockAccountEGP));
    await act(async () => result.current.handleSave());

    expect(addTx).toHaveBeenCalledWith(expect.objectContaining({ budget_id: 'b1' }));
  });

  it('requires an explicit choice when several budgets match', async () => {
    jest
      .spyOn(budgetRepository, 'getBudgetsForCategoryMonth')
      .mockResolvedValue([mockBudget('b1', 'Monthly meals'), mockBudget('b2', 'Dining out')]);
    const addTx = installMockAddTransaction();
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));

    await act(() => result.current.setDate('2026-07-10'));
    await act(() => result.current.selectCategory(mockCategoryExpense));
    await waitFor(() => expect(result.current.state.availableBudgets).toHaveLength(2));
    await act(() => result.current.setAmountStr('5'));
    await act(() => result.current.selectAccount(mockAccountEGP));
    await act(async () => result.current.handleSave());

    expect(result.current.state.errors.budget).toBeDefined();
    expect(addTx).not.toHaveBeenCalled();
  });
});

describe('useAddTransaction — validation', () => {
  it('rejects a malformed exchange-rate prefix', async () => {
    const addTx = installMockAddTransaction();
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));
    await act(() => result.current.setAmountStr('5'));
    await act(() => result.current.selectAccount(mockAccountUSD));
    await act(() => result.current.selectCategory(mockCategoryExpense));
    await act(() => result.current.setExchangeRate('50abc'));

    await act(async () => result.current.handleSave());

    expect(result.current.state.errors.rate).toBeDefined();
    expect(addTx).not.toHaveBeenCalled();
  });

  it('uses expense categories and budgets for a Card credit', async () => {
    const budget = mockBudget('credit-budget', 'Refunded meal');
    jest.spyOn(budgetRepository, 'getBudgetsForCategoryMonth').mockResolvedValue([budget]);
    const addTx = installMockAddTransaction();
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));
    await act(() => result.current.setType(TransactionType.Income));
    await act(() => result.current.selectAccount(mockAccountCC));

    expect(result.current.state.isCardCredit).toBe(true);
    expect(result.current.state.typeLabel).toBe('Card credit');
    expect(result.current.state.visibleCategories).toEqual([mockCategoryExpense]);

    await act(() => result.current.setAmountStr('5'));
    await act(() => result.current.selectCategory(mockCategoryExpense));
    await waitFor(() => expect(result.current.state.selectedBudget?.id).toBe('credit-budget'));
    await act(async () => result.current.handleSave());

    expect(addTx).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TransactionType.Income,
        category_id: mockCategoryExpense.id,
        budget_id: 'credit-budget',
      }),
    );
  });

  it('rejects an income category for a Card credit', async () => {
    const addTx = installMockAddTransaction();
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));
    await act(() => result.current.setType(TransactionType.Income));
    await act(() => result.current.selectAccount(mockAccountCC));
    await act(() => result.current.setAmountStr('5'));
    await act(() => result.current.selectCategory(mockCategoryIncome));

    await act(async () => result.current.handleSave());

    expect(result.current.state.errors.category).toBeDefined();
    expect(addTx).not.toHaveBeenCalled();
  });

  it('keeps an over-credit draft open and shows the balance error', async () => {
    installMockAddTransaction(() =>
      Promise.reject({ issues: [{ code: 'card_credit_exceeds_liability' }] }),
    );
    const onClose = jest.fn();
    const { result } = await renderHook(() => useAddTransaction(onClose));
    await act(() => result.current.setType(TransactionType.Income));
    await act(() => result.current.selectAccount(mockAccountCC));
    await act(() => result.current.setAmountStr('5'));
    await act(() => result.current.selectCategory(mockCategoryExpense));
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));

    await act(async () => result.current.handleSave());

    expect(result.current.state.errorMessage).toBe(
      'Card credit cannot exceed the current card balance',
    );
    expect(result.current.state.categoryId).toBe(mockCategoryExpense.id);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows a save error and preserves entered values after save rejection', async () => {
    installMockAddTransaction(() => Promise.reject(new Error('write failed')));
    const onClose = jest.fn();
    const { result } = await renderHook(() => useAddTransaction(onClose));

    await act(() => result.current.setAmountStr('5'));
    await act(() => result.current.selectAccount(mockAccountEGP));
    await act(() => result.current.selectCategory(mockCategoryExpense));
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));
    await act(async () => result.current.handleSave());

    expect(result.current.state.errorMessage).toBe(
      'Could not save this transaction. Please try again.',
    );
    expect(useAddTransactionStore.getState().amountStr).toBe('5');
    expect(result.current.state.categoryId).toBe('c1');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('completes a committed save even when account revalidation fails', async () => {
    const addTx = installMockAddTransaction(() => Promise.resolve(makeTestTransaction()));
    const loadAccounts = jest.fn().mockRejectedValue(new Error('refresh failed'));
    const onSaved = jest.fn();
    useAccountStore.setState({ loadAccounts });
    const { result } = await renderHook(() => useAddTransaction(onSaved));

    await act(() => result.current.setAmountStr('5'));
    await act(() => result.current.selectAccount(mockAccountEGP));
    await act(() => result.current.selectCategory(mockCategoryExpense));
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));
    await act(async () => result.current.handleSave());

    expect(addTx).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(result.current.state.errorMessage).toBeUndefined();
  });

  it('preserves entered values while the sheet close animation is running', async () => {
    useTransactionFormState.getState().openAdd();
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));

    await act(() => result.current.selectAccount(mockAccountEGP));
    await act(() => result.current.selectCategory(mockCategoryExpense));
    await act(() => result.current.setNote('keep through close'));
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));

    await act(() => {
      useTransactionFormState.getState().requestClose();
    });

    expect(result.current.state.accountId).toBe(mockAccountEGP.id);
    expect(result.current.state.categoryId).toBe(mockCategoryExpense.id);
    expect(result.current.state.note).toBe('keep through close');
  });

  it('submits once and completes once when save is pressed twice', async () => {
    let resolveSave: (transaction: ReturnType<typeof makeTestTransaction>) => void = () => {};
    const pendingSave = new Promise<ReturnType<typeof makeTestTransaction>>((resolve) => {
      resolveSave = resolve;
    });
    const addTx = installMockAddTransaction(() => pendingSave);
    const onSaved = jest.fn(() => {
      expect(useAddTransactionState.getState().saving).toBe(true);
    });
    const { result } = await renderHook(() => useAddTransaction(onSaved));

    await act(() => result.current.setAmountStr('5'));
    await act(() => result.current.selectAccount(mockAccountEGP));
    await act(() => result.current.selectCategory(mockCategoryExpense));
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));

    let firstSave: Promise<void>;
    let secondSave: Promise<void>;
    await act(() => {
      firstSave = result.current.handleSave();
      secondSave = result.current.handleSave();
    });
    await waitFor(() => expect(addTx).toHaveBeenCalledTimes(1));

    await act(async () => {
      resolveSave(makeTestTransaction());
      await Promise.all([firstSave!, secondSave!]);
    });

    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('rejects amount=0', async () => {
    const onClose = jest.fn();
    const { result } = await renderHook(() => useAddTransaction(onClose));
    // amountStr defaults to '0', accountId selected
    await act(() => result.current.selectAccount(mockAccountEGP));
    await act(() => result.current.selectCategory(mockCategoryExpense));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.state.errors.amount).toBeDefined();
  });

  it('rejects expense without an account', async () => {
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));
    await act(() => result.current.setAmountStr('50'));
    await act(() => result.current.selectCategory(mockCategoryExpense));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.state.errors.account).toBeDefined();
  });

  it('rejects expense without a category', async () => {
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));
    await act(() => result.current.setAmountStr('5'));
    await act(() => result.current.selectAccount(mockAccountEGP));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.state.errors.category).toBeDefined();
  });

  it('rejects transfer with same from/to', async () => {
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));
    await act(() => result.current.setType(TransactionType.Transfer));
    await act(() => result.current.setAmountStr('5'));
    await act(() => result.current.selectAccount(mockAccountEGP));
    await act(() => result.current.selectToAccount(mockAccountEGP));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.state.errors.toAccount).toBeDefined();
  });

  it('rejects transfer with CC source', async () => {
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));
    await act(() => result.current.setType(TransactionType.Transfer));
    await act(() => result.current.setAmountStr('5'));
    await act(() => result.current.selectAccount(mockAccountCC));
    await act(() => result.current.selectToAccount(mockAccountEGP));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.state.errors.account).toBeDefined();
  });

  it('rejects CC payment with CC source (must be a non-CC asset)', async () => {
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));
    await act(() => result.current.setType(TransactionType.CCPayment));
    await act(() => result.current.setAmountStr('5'));
    await act(() => result.current.selectAccount(mockAccountCC));
    await act(() => result.current.selectToAccount(mockAccountCC2));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.state.errors.account).toBeDefined();
  });

  it('rejects CC payment with non-CC target', async () => {
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));
    await act(() => result.current.setType(TransactionType.CCPayment));
    await act(() => result.current.setAmountStr('5'));
    await act(() => result.current.selectAccount(mockAccountEGP));
    await act(() => result.current.selectToAccount(mockAccountUSD));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.state.errors.toAccount).toBeDefined();
  });
});

describe('useAddTransaction — cross-currency math', () => {
  it('non-transfer USD source: egp_amount = amount × rate (rounded)', async () => {
    const addTx = installMockAddTransaction();
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));
    await act(() => result.current.setAmountStr('10'));
    await act(() => result.current.selectAccount(mockAccountUSD));
    await act(() => result.current.selectCategory(mockCategoryExpense));
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
    const addTx = installMockAddTransaction();
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));
    await act(() => result.current.setType(TransactionType.Transfer));
    await act(() => result.current.setAmountStr('100'));
    await act(() => result.current.selectAccount(mockAccountEGP));
    await act(() => result.current.selectToAccount(mockAccountUSD));
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
    const addTx = installMockAddTransaction();
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));
    await act(() => result.current.setType(TransactionType.Transfer));
    await act(() => result.current.setAmountStr('5'));
    await act(() => result.current.selectAccount(mockAccountUSD));
    await act(() => result.current.selectToAccount(mockAccountEGP));
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
    useAccountStore.setState({
      accounts: [...useAccountStore.getState().accounts, mockAccountUSD2],
    });
    const addTx = installMockAddTransaction();
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));
    await act(() => result.current.setType(TransactionType.Transfer));
    await act(() => result.current.setAmountStr('5'));
    await act(() => result.current.selectAccount(mockAccountUSD));
    await act(() => result.current.selectToAccount(mockAccountUSD2));
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

  it('cc_payment: stores the amount in the EGP card destination currency', async () => {
    const addTx = installMockAddTransaction();
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));
    await act(() => result.current.setType(TransactionType.CCPayment));
    await act(() => result.current.setAmountStr('20'));
    await act(() => result.current.selectAccount(mockAccountUSD));
    await act(() => result.current.selectToAccount(mockAccountCC));
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

  it('cc_payment: converts an EGP payment to the USD card destination currency', async () => {
    const addTx = installMockAddTransaction();
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));
    await act(() => result.current.setType(TransactionType.CCPayment));
    await act(() => result.current.setAmountStr('500'));
    await act(() => result.current.selectAccount(mockAccountEGP));
    await act(() => result.current.selectToAccount(mockAccountCCUSD));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(addTx).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 500,
        currency: Currency.EGP,
        egp_amount: 500,
        to_amount: 10,
        exchange_rate: 50,
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
      rate: 30.005,
      rate_updated_at: null,
    });
    const addTx = installMockAddTransaction();
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));
    await act(() => result.current.setAmountStr('1'));
    await act(() => result.current.selectAccount(mockAccountUSD));
    await act(() => result.current.selectCategory(mockCategoryExpense));
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
  afterEach(() => jest.useRealTimers());

  it('sets transaction_time from the submit clock and never exposes a setter', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 1, 9, 0, 0));
    const addTx = installMockAddTransaction();
    const { result } = await renderHook(() => useAddTransaction(jest.fn()));
    jest.setSystemTime(new Date(2026, 6, 1, 9, 5, 30));
    await act(() => result.current.setAmountStr('5'));
    await act(() => result.current.selectAccount(mockAccountEGP));
    await act(() => result.current.selectCategory(mockCategoryExpense));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(addTx).toHaveBeenCalled();
    const arg = addTx.mock.calls[0][0];
    expect(arg.transaction_time).toBe('09:05:30');
    // No setTime exposed
    expect(result.current).not.toHaveProperty('setTime');
  });
});
