import { act, renderHook, waitFor } from '@testing-library/react-native';

import { AccountType, CategoryType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { budgetRepository } from '@/modules/budget/repositories/budget.repository';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { useEditTransaction } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook';
import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';
import { useEditTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.store';
import { useTransactionFormState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state';
import {
  installMockUpdateTransaction,
  makeTestAccount,
  makeTestBudget,
  makeTestCategory,
  makeTestTransaction,
} from '@/test_helpers/transaction';

const mockTxExpense = makeTestTransaction({
  id: 't1',
  amount: 50,
  egp_amount: 50,
  account_id: 'a1',
  category_id: 'c1',
  note: 'lunch',
  transaction_date: '2026-05-18',
  transaction_time: '12:00:00',
  created_at: 'now',
  updated_at: 'now',
});

const mockAccountEGP = makeTestAccount({
  id: 'a1',
  name: 'Cash',
  current_balance: 1000,
});
const mockAccountCC = makeTestAccount({
  ...mockAccountEGP,
  id: 'a-card',
  name: 'Visa',
  type: AccountType.CreditCard,
  current_balance: 500,
});
const mockAccountUSD = makeTestAccount({
  ...mockAccountEGP,
  id: 'a-usd',
  name: 'Archived USD',
  currency: Currency.USD,
  is_archived: 1,
});
const mockCategoryFood = makeTestCategory({
  id: 'c1',
  name: 'Food',
  type: CategoryType.Expense,
  budget_group: null,
});
const mockCategoryShop = makeTestCategory({
  id: 'c2',
  name: 'Shopping',
  icon: 'cart',
  sort_order: 1,
  budget_group: null,
});
const mockCategoryIncome = makeTestCategory({
  ...mockCategoryFood,
  id: 'income',
  name: 'Salary',
  type: CategoryType.Income,
});

const mockBudget = (id: string, categoryId = 'c1'): Budget =>
  makeTestBudget({
    id,
    category_id: categoryId,
    name: id,
    effective_from: '2026-05',
  });

const originalLoadAccountLookup = useAccountStore.getState().loadAccountLookup;

beforeEach(() => {
  jest.restoreAllMocks();
  useTransactionFormState.getState().reset();
  useAccountStore.setState({ loadAccountLookup: originalLoadAccountLookup });
  jest.spyOn(budgetRepository, 'getBudgetsForCategoryMonth').mockResolvedValue([]);
  useAccountStore.getState().reset();
  useAccountStore.setState({
    accounts: [mockAccountEGP, mockAccountCC],
    accountLookup: [mockAccountUSD],
    hasLoaded: true,
  });
  useCategoryStore.setState({
    categories: [mockCategoryFood, mockCategoryShop],
    hasLoaded: true,
    loadError: false,
  });
  useCurrencyStore.setState({ rate: 50, rate_updated_at: null });
  useEditTransactionState.getState().reset();
  useEditTransactionStore.getState().reset();
  useEditTransactionStore.getState().loadFromTx(mockTxExpense);
});

describe('useEditTransaction', () => {
  it('uses an injected prerequisite controller without starting its legacy loader', async () => {
    const loadAccounts = jest.fn();
    const loadCategories = jest.fn();
    const loadAccountLookup = jest.fn();
    const retry = jest.fn();
    useAccountStore.setState({ loadAccounts, loadAccountLookup });
    useCategoryStore.setState({ loadCategories });

    const { result } = await renderHook(() =>
      useEditTransaction(mockTxExpense, jest.fn(), jest.fn(), {
        status: 'ready',
        retry,
      }),
    );

    expect(result.current.state.formDataReady).toBe(true);
    expect(loadAccounts).not.toHaveBeenCalled();
    expect(loadCategories).not.toHaveBeenCalled();
    expect(loadAccountLookup).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));

    await act(() => result.current.retryFormData());
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed exchange rates for an archived USD transaction', async () => {
    const usdTx = {
      ...mockTxExpense,
      account_id: mockAccountUSD.id,
      currency: Currency.USD,
      amount: 10,
      egp_amount: 500,
      exchange_rate: 50,
    };
    useEditTransactionStore.getState().loadFromTx(usdTx);
    const updateTx = installMockUpdateTransaction();
    const { result } = await renderHook(() => useEditTransaction(usdTx, jest.fn(), jest.fn()));
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));
    await act(() => result.current.setExchangeRate('50abc'));

    await act(async () => result.current.handleSave());

    expect(result.current.state.selectedAccount?.id).toBe(mockAccountUSD.id);
    expect(result.current.state.errors.rate).toBeDefined();
    expect(updateTx).not.toHaveBeenCalled();
  });

  it('uses expense categories and budget eligibility for an existing Card credit', async () => {
    const creditTx = {
      ...mockTxExpense,
      type: TransactionType.Income,
      account_id: mockAccountCC.id,
    };
    useEditTransactionStore.getState().loadFromTx(creditTx);
    const { result } = await renderHook(() => useEditTransaction(creditTx, jest.fn(), jest.fn()));

    expect(result.current.state.isCardCredit).toBe(true);
    expect(result.current.state.visibleCategories).toEqual([mockCategoryFood, mockCategoryShop]);
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));
  });

  it('rejects an income category for an existing Card credit', async () => {
    useCategoryStore.setState({
      categories: [mockCategoryFood, mockCategoryShop, mockCategoryIncome],
    });
    const creditTx = {
      ...mockTxExpense,
      type: TransactionType.Income,
      account_id: mockAccountCC.id,
    };
    useEditTransactionStore.getState().loadFromTx(creditTx);
    const updateTx = installMockUpdateTransaction();
    const { result } = await renderHook(() => useEditTransaction(creditTx, jest.fn(), jest.fn()));
    await act(() => result.current.selectCategory(mockCategoryIncome));

    await act(async () => result.current.handleSave());

    expect(result.current.state.errors.category).toBeDefined();
    expect(updateTx).not.toHaveBeenCalled();
  });

  it('does not save while matching budgets are still loading', async () => {
    let resolveBudgets: (budgets: Budget[]) => void = () => {};
    const pendingBudgets = new Promise<Budget[]>((resolve) => {
      resolveBudgets = resolve;
    });
    jest.spyOn(budgetRepository, 'getBudgetsForCategoryMonth').mockReturnValue(pendingBudgets);
    const updateTx = installMockUpdateTransaction();
    const { result } = await renderHook(() =>
      useEditTransaction(mockTxExpense, jest.fn(), jest.fn()),
    );

    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(true));
    expect(result.current.state.showBudgetField).toBe(true);
    await act(async () => result.current.handleSave());

    expect(updateTx).not.toHaveBeenCalled();
    await act(async () => resolveBudgets([]));
    expect(result.current.state.showBudgetField).toBe(false);
  });

  it('blocks an immediate save until a changed month budget is resolved', async () => {
    const assignedTx = { ...mockTxExpense, budget_id: 'b1' };
    useEditTransactionStore.getState().loadFromTx(assignedTx);
    jest
      .spyOn(budgetRepository, 'getBudgetsForCategoryMonth')
      .mockResolvedValueOnce([mockBudget('b1')])
      .mockImplementationOnce(() => new Promise<Budget[]>(() => {}));
    const updateTx = installMockUpdateTransaction();
    const { result } = await renderHook(() => useEditTransaction(assignedTx, jest.fn(), jest.fn()));
    await waitFor(() => expect(result.current.state.selectedBudget?.id).toBe('b1'));

    await act(async () => {
      result.current.setDate('2026-06-18');
      await result.current.handleSave();
    });

    expect(updateTx).not.toHaveBeenCalled();
    expect(useEditTransactionState.getState().budgetsLoading).toBe(true);
  });

  it('blocks save, preserves assignment, and exposes retry when budget lookup fails', async () => {
    const assignedTx = { ...mockTxExpense, budget_id: 'b1' };
    useEditTransactionStore.getState().loadFromTx(assignedTx);
    jest
      .spyOn(budgetRepository, 'getBudgetsForCategoryMonth')
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValueOnce([mockBudget('b1')]);
    const updateTx = installMockUpdateTransaction();
    const { result } = await renderHook(() => useEditTransaction(assignedTx, jest.fn(), jest.fn()));

    await waitFor(() => expect(result.current.state.errors.budget).toBeDefined());
    expect(result.current.state.budgetId).toBe('b1');
    expect(result.current.state.showBudgetField).toBe(true);
    await act(async () => result.current.handleSave());
    expect(updateTx).not.toHaveBeenCalled();

    await act(() => result.current.retryBudgetLookup());
    expect(result.current.state.errors.budget).toBeUndefined();
    await waitFor(() => expect(result.current.state.selectedBudget?.id).toBe('b1'));
  });

  it('shows a save error and preserves edits after update rejection', async () => {
    installMockUpdateTransaction(() => Promise.reject(new Error('write failed')));
    const onClose = jest.fn();
    const onSaved = jest.fn();
    const { result } = await renderHook(() => useEditTransaction(mockTxExpense, onClose, onSaved));
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));
    await act(() => result.current.setNote('keep this edit'));

    await act(async () => result.current.handleSave());

    expect(result.current.state.errorMessage).toBe(
      'Could not save this transaction. Please try again.',
    );
    expect(result.current.state.note).toBe('keep this edit');
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('preserves edits while the sheet close animation is running', async () => {
    useTransactionFormState.getState().openEdit(mockTxExpense);
    const { result } = await renderHook(() =>
      useEditTransaction(mockTxExpense, jest.fn(), jest.fn()),
    );
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));
    await act(() => result.current.setNote('keep through close'));

    await act(() => {
      useTransactionFormState.getState().requestClose();
    });

    expect(result.current.state.note).toBe('keep through close');
  });

  it('submits once and completes once when save is pressed twice', async () => {
    let resolveSave: () => void = () => {};
    const pendingSave = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    const updateTx = installMockUpdateTransaction(() => pendingSave);
    const onSaved = jest.fn(() => {
      expect(useEditTransactionState.getState().saving).toBe(true);
    });
    const { result } = await renderHook(() =>
      useEditTransaction(mockTxExpense, jest.fn(), onSaved),
    );
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));

    let firstSave: Promise<void>;
    let secondSave: Promise<void>;
    await act(() => {
      firstSave = result.current.handleSave();
      secondSave = result.current.handleSave();
    });
    await waitFor(() => expect(updateTx).toHaveBeenCalledTimes(1));

    await act(async () => {
      resolveSave();
      await Promise.all([firstSave!, secondSave!]);
    });

    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('completes a committed update even when account revalidation fails', async () => {
    const updateTx = installMockUpdateTransaction(() => Promise.resolve());
    const loadAccounts = jest.fn().mockRejectedValue(new Error('refresh failed'));
    const onSaved = jest.fn();
    useAccountStore.setState({ loadAccounts });
    const { result } = await renderHook(() =>
      useEditTransaction(mockTxExpense, jest.fn(), onSaved),
    );
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));

    await act(async () => result.current.handleSave());

    expect(updateTx).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(result.current.state.errorMessage).toBeUndefined();
  });

  it('initializes amount, category, note, date from the loaded tx', async () => {
    const { result } = await renderHook(() =>
      useEditTransaction(mockTxExpense, jest.fn(), jest.fn()),
    );
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));
    expect(useEditTransactionStore.getState().amountStr).toBe('50');
    expect(result.current.state.categoryId).toBe('c1');
    expect(result.current.state.note).toBe('lunch');
    expect(result.current.state.date).toBe('2026-05-18');
  });

  it('lock policy: type / selectedAccount / selectedToAccount are read-only', async () => {
    const { result } = await renderHook(() =>
      useEditTransaction(mockTxExpense, jest.fn(), jest.fn()),
    );
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));
    expect(result.current.state.type).toBe(TransactionType.Expense);
    expect(result.current.state.selectedAccount?.id).toBe('a1');
    expect(result.current).not.toHaveProperty('setType');
    expect(result.current).not.toHaveProperty('selectAccount');
    expect(result.current).not.toHaveProperty('selectToAccount');
  });

  it('allows category change', async () => {
    const { result } = await renderHook(() =>
      useEditTransaction(mockTxExpense, jest.fn(), jest.fn()),
    );
    await act(() => result.current.selectCategory(mockCategoryShop));
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));
    expect(result.current.state.categoryId).toBe('c2');
  });

  it('calls updateTransaction with new values on save', async () => {
    const updateTx = installMockUpdateTransaction();
    const { result } = await renderHook(() =>
      useEditTransaction(mockTxExpense, jest.fn(), jest.fn()),
    );
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));
    await act(() => result.current.setAmountStr('75'));
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
    const updateTx = installMockUpdateTransaction();
    const { result } = await renderHook(() =>
      useEditTransaction(mockTxExpense, jest.fn(), jest.fn()),
    );
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));
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

  it('preserves a historical unassigned expense when eligibility is unchanged', async () => {
    jest
      .spyOn(budgetRepository, 'getBudgetsForCategoryMonth')
      .mockResolvedValue([mockBudget('b1')]);
    const updateTx = installMockUpdateTransaction();
    const { result } = await renderHook(() =>
      useEditTransaction(mockTxExpense, jest.fn(), jest.fn()),
    );

    await waitFor(() => expect(result.current.state.availableBudgets).toHaveLength(1));
    expect(result.current.state.selectedBudget).toBeNull();
    await act(async () => result.current.handleSave());

    expect(updateTx).toHaveBeenCalledWith('t1', expect.objectContaining({ budget_id: null }));
  });

  it('re-evaluates assignment when the category changes', async () => {
    const shopBudget = mockBudget('shop', 'c2');
    jest
      .spyOn(budgetRepository, 'getBudgetsForCategoryMonth')
      .mockImplementation(async (categoryId) => (categoryId === 'c2' ? [shopBudget] : []));
    const { result } = await renderHook(() =>
      useEditTransaction(mockTxExpense, jest.fn(), jest.fn()),
    );

    await act(() => result.current.selectCategory(mockCategoryShop));
    await waitFor(() => expect(result.current.state.selectedBudget?.id).toBe('shop'));
  });

  it('clears a stale assignment when the transaction moves to another month', async () => {
    const assignedTx = { ...mockTxExpense, budget_id: 'may-budget' };
    useEditTransactionStore.getState().loadFromTx(assignedTx);
    jest
      .spyOn(budgetRepository, 'getBudgetsForCategoryMonth')
      .mockImplementation(async (_categoryId, month) =>
        month === '2026-05' ? [mockBudget('may-budget')] : [mockBudget('june-budget')],
      );
    const { result } = await renderHook(() => useEditTransaction(assignedTx, jest.fn(), jest.fn()));

    await waitFor(() => expect(result.current.state.selectedBudget?.id).toBe('may-budget'));
    await act(() => result.current.setDate('2026-06-02'));

    await waitFor(() => expect(result.current.state.availableBudgets[0]?.id).toBe('june-budget'));
    expect(result.current.state.selectedBudget?.id).toBe('june-budget');
  });

  it('allows a historical unassigned transaction to be assigned deliberately', async () => {
    const budget = mockBudget('b1');
    jest.spyOn(budgetRepository, 'getBudgetsForCategoryMonth').mockResolvedValue([budget]);
    const updateTx = installMockUpdateTransaction();
    const { result } = await renderHook(() =>
      useEditTransaction(mockTxExpense, jest.fn(), jest.fn()),
    );

    await waitFor(() => expect(result.current.state.availableBudgets).toEqual([budget]));
    await act(() => result.current.selectBudget(budget));
    await act(async () => result.current.handleSave());

    expect(updateTx).toHaveBeenCalledWith('t1', expect.objectContaining({ budget_id: 'b1' }));
  });

  it('requires a selection when changed eligibility exposes multiple budgets', async () => {
    jest
      .spyOn(budgetRepository, 'getBudgetsForCategoryMonth')
      .mockImplementation(async (_categoryId, month) =>
        month === '2026-06' ? [mockBudget('june-1'), mockBudget('june-2')] : [],
      );
    const updateTx = installMockUpdateTransaction();
    const { result } = await renderHook(() =>
      useEditTransaction(mockTxExpense, jest.fn(), jest.fn()),
    );

    await act(() => result.current.setDate('2026-06-02'));
    await waitFor(() => expect(result.current.state.availableBudgets).toHaveLength(2));
    expect(result.current.state.selectedBudget).toBeNull();
    await act(async () => result.current.handleSave());

    expect(result.current.state.errors.budget).toBeDefined();
    expect(updateTx).not.toHaveBeenCalled();
  });
});

describe('useEditTransaction — the MIN_MONEY_AMOUNT floor', () => {
  it('rejects 0.005 typed into the amount field, and never calls updateTransaction', async () => {
    const updateTx = installMockUpdateTransaction();
    const { result } = await renderHook(() =>
      useEditTransaction(mockTxExpense, jest.fn(), jest.fn()),
    );
    await act(() => result.current.setAmountStr('0.005'));

    await act(async () => result.current.handleSave());

    expect(updateTx).not.toHaveBeenCalled();
    expect(result.current.state.errors.amount).toBe(Strings.addTxErrAmountZero);
  });

  it('rejects 0.006 rather than silently rounding it up to 0.01', async () => {
    const updateTx = installMockUpdateTransaction();
    const { result } = await renderHook(() =>
      useEditTransaction(mockTxExpense, jest.fn(), jest.fn()),
    );
    await act(() => result.current.setAmountStr('0.006'));

    await act(async () => result.current.handleSave());

    expect(updateTx).not.toHaveBeenCalled();
    expect(result.current.state.errors.amount).toBe(Strings.addTxErrAmountZero);
  });

  it('accepts 0.01, the floor itself', async () => {
    const updateTx = installMockUpdateTransaction();
    const { result } = await renderHook(() =>
      useEditTransaction(mockTxExpense, jest.fn(), jest.fn()),
    );
    await act(() => result.current.setAmountStr('0.01'));

    await act(async () => result.current.handleSave());

    expect(updateTx).toHaveBeenCalledTimes(1);
    expect(result.current.state.errors.amount).toBeUndefined();
  });

  it('rejects a stored 0.005 on Save without the amount field ever being touched', async () => {
    const subCentTx = makeTestTransaction({
      ...mockTxExpense,
      amount: 0.005,
    });
    useEditTransactionStore.getState().loadFromTx(subCentTx);
    const updateTx = installMockUpdateTransaction();
    const { result } = await renderHook(() => useEditTransaction(subCentTx, jest.fn(), jest.fn()));

    await act(async () => result.current.handleSave());

    expect(updateTx).not.toHaveBeenCalled();
    expect(result.current.state.errors.amount).toBe(Strings.addTxErrAmountZero);
  });

  // `String(1e-7)` is exponential text that `DECIMAL_PATTERN` cannot parse; the prefill formats it.
  it('rejects a stored 1e-7 on Save as the floor message, never as unparseable text', async () => {
    const exponentialTx = makeTestTransaction({
      ...mockTxExpense,
      amount: 1e-7,
    });
    useEditTransactionStore.getState().loadFromTx(exponentialTx);
    const updateTx = installMockUpdateTransaction();
    expect(useEditTransactionStore.getState().amountStr).toBe('0.0000001');
    const { result } = await renderHook(() =>
      useEditTransaction(exponentialTx, jest.fn(), jest.fn()),
    );

    await act(async () => result.current.handleSave());

    expect(updateTx).not.toHaveBeenCalled();
    expect(result.current.state.errors.amount).toBe(Strings.addTxErrAmountZero);
  });

  it("binds the resolver's rounded amount into the payload, not the raw typed value", async () => {
    const usdTx = {
      ...mockTxExpense,
      account_id: mockAccountUSD.id,
      currency: Currency.USD,
      amount: 10,
      egp_amount: 500,
      exchange_rate: 48,
    };
    useEditTransactionStore.getState().loadFromTx(usdTx);
    const updateTx = installMockUpdateTransaction();
    const { result } = await renderHook(() => useEditTransaction(usdTx, jest.fn(), jest.fn()));
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));
    await act(() => result.current.setAmountStr('10.005'));
    await act(() => result.current.setExchangeRate('48'));

    await act(async () => result.current.handleSave());

    expect(updateTx).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({
        amount: 10,
        egp_amount: 480,
        exchange_rate: 48,
      }),
    );
  });
});

describe('useEditTransaction — rate prefills re-parse', () => {
  // `String(1e-7)` is exponential text the rate field's own validator rejects on save.
  it('prefills a stored exponential-band rate as positional text that saves', async () => {
    const exponentialRateTx = makeTestTransaction({
      ...mockTxExpense,
      account_id: mockAccountUSD.id,
      currency: Currency.USD,
      amount: 10,
      egp_amount: 0.5,
      exchange_rate: 1e-7,
    });
    useEditTransactionStore.getState().loadFromTx(exponentialRateTx);
    const updateTx = installMockUpdateTransaction();
    const { result } = await renderHook(() =>
      useEditTransaction(exponentialRateTx, jest.fn(), jest.fn()),
    );

    expect(result.current.state.exchangeRate).toBe('0.0000001');

    await act(async () => result.current.handleSave());

    expect(result.current.state.errors.rate).toBeUndefined();
    expect(updateTx).toHaveBeenCalledWith('t1', expect.objectContaining({ exchange_rate: 1e-7 }));
  });

  it('prefills a sub-2 stored rate unchanged and converts with it', async () => {
    const subTwoRateTx = makeTestTransaction({
      ...mockTxExpense,
      account_id: mockAccountUSD.id,
      currency: Currency.USD,
      amount: 10,
      egp_amount: 5,
      exchange_rate: 0.5,
    });
    useEditTransactionStore.getState().loadFromTx(subTwoRateTx);
    const updateTx = installMockUpdateTransaction();
    const { result } = await renderHook(() =>
      useEditTransaction(subTwoRateTx, jest.fn(), jest.fn()),
    );

    expect(result.current.state.exchangeRate).toBe('0.5');

    await act(async () => result.current.handleSave());

    expect(updateTx).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ egp_amount: 5, exchange_rate: 0.5 }),
    );
  });
});

describe('useEditTransaction — destination-leg floor', () => {
  const transferTx = makeTestTransaction({
    ...mockTxExpense,
    id: 't-transfer',
    type: TransactionType.Transfer,
    account_id: mockAccountEGP.id,
    to_account_id: mockAccountUSD.id,
    category_id: null,
    amount: 100,
    egp_amount: 100,
    to_amount: 2,
    exchange_rate: 50,
  });

  beforeEach(() => useEditTransactionStore.getState().loadFromTx(transferTx));

  it('transfer EGP → USD: refuses an edit to 0.2 at rate 50 as a field error', async () => {
    const updateTx = installMockUpdateTransaction();
    const { result } = await renderHook(() => useEditTransaction(transferTx, jest.fn(), jest.fn()));
    await act(() => result.current.setAmountStr('0.2'));
    await act(() => result.current.setExchangeRate('50'));

    await act(async () => result.current.handleSave());

    expect(updateTx).not.toHaveBeenCalled();
    expect(result.current.state.errors.amount).toBe(
      Strings.addTxErrConvertedBelowMin(Currency.USD),
    );
    expect(result.current.state.errorMessage).toBeUndefined();
  });

  it('transfer EGP → USD: 0.26 at rate 50 survives as to_amount 0.01', async () => {
    const updateTx = installMockUpdateTransaction();
    const { result } = await renderHook(() => useEditTransaction(transferTx, jest.fn(), jest.fn()));
    await act(() => result.current.setAmountStr('0.26'));
    await act(() => result.current.setExchangeRate('50'));

    await act(async () => result.current.handleSave());

    expect(result.current.state.errors.amount).toBeUndefined();
    expect(updateTx).toHaveBeenCalledWith(
      't-transfer',
      expect.objectContaining({ to_amount: 0.01 }),
    );
  });
});
