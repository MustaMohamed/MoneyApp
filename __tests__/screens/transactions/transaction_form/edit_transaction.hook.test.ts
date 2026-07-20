import { act, renderHook, waitFor } from '@testing-library/react-native';

import { AccountType, CategoryType, Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/database/entities/transaction.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { budgetRepository } from '@/modules/budget/repositories/budget.repository';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { useEditTransaction } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook';
import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';
import { useEditTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.store';
import { useTransactionStore } from '@/store/transaction.store';

const mockTxExpense: Transaction = {
  id: 't1',
  type: TransactionType.Expense,
  amount: 50,
  currency: Currency.EGP,
  egp_amount: 50,
  to_amount: null,
  exchange_rate: null,
  minimum_payment_snapshot: null,
  revolving_balance_delta: null,
  account_id: 'a1',
  to_account_id: null,
  category_id: 'c1',
  budget_id: null,
  note: 'lunch',
  transaction_date: '2026-05-18',
  transaction_time: '12:00:00',
  commitment_payment_id: null,
  installment_id: null,
  created_at: 'now',
  updated_at: 'now',
};

import type { Account } from '@/database/entities/account.entity';

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
  balance_review_required: 0,
  is_archived: 0,
  sort_order: 0,
  created_at: 'now',
  updated_at: 'now',
};
const mockAccountCC: Account = {
  ...mockAccountEGP,
  id: 'a-card',
  name: 'Visa',
  type: AccountType.CreditCard,
  current_balance: 500,
};
const mockAccountUSD: Account = {
  ...mockAccountEGP,
  id: 'a-usd',
  name: 'Archived USD',
  currency: Currency.USD,
  is_archived: 1,
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
const mockCategoryIncome = {
  ...mockCategoryFood,
  id: 'income',
  name: 'Salary',
  type: CategoryType.Income,
};

const mockBudget = (id: string, categoryId = 'c1'): Budget => ({
  id,
  category_id: categoryId,
  name: id,
  limit_amount: 500,
  effective_from: '2026-05',
  created_at: 'now',
  updated_at: 'now',
});

beforeEach(() => {
  jest.restoreAllMocks();
  jest.spyOn(budgetRepository, 'getBudgetsForCategoryMonth').mockResolvedValue([]);
  useAccountStore.getState().reset();
  useAccountStore.setState({
    accounts: [mockAccountEGP, mockAccountCC],
    accountLookup: [mockAccountUSD],
    hasLoaded: true,
  });
  useCategoryStore.setState({
    categories: [mockCategoryFood, mockCategoryShop],
    loading: false,
    error: undefined,
  } as any);
  useCurrencyStore.setState({ rate: 50, rate_updated_at: null } as any);
  useEditTransactionState.getState().reset();
  useEditTransactionStore.getState().reset();
  useEditTransactionStore.getState().loadFromTx(mockTxExpense);
});

describe('useEditTransaction', () => {
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
    const updateTx = jest.fn();
    useTransactionStore.setState({ updateTransaction: updateTx } as any);
    const { result } = renderHook(() => useEditTransaction(usdTx, jest.fn(), jest.fn()));
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));
    act(() => result.current.setExchangeRate('50abc'));

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
    const { result } = renderHook(() => useEditTransaction(creditTx, jest.fn(), jest.fn()));

    expect(result.current.state.isCardCredit).toBe(true);
    expect(result.current.state.visibleCategories).toEqual([mockCategoryFood, mockCategoryShop]);
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));
  });

  it('rejects an income category for an existing Card credit', async () => {
    useCategoryStore.setState({
      categories: [mockCategoryFood, mockCategoryShop, mockCategoryIncome],
    } as any);
    const creditTx = {
      ...mockTxExpense,
      type: TransactionType.Income,
      account_id: mockAccountCC.id,
    };
    useEditTransactionStore.getState().loadFromTx(creditTx);
    const updateTx = jest.fn();
    useTransactionStore.setState({ updateTransaction: updateTx } as any);
    const { result } = renderHook(() => useEditTransaction(creditTx, jest.fn(), jest.fn()));
    act(() => result.current.selectCategory(mockCategoryIncome));

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
    const updateTx = jest.fn();
    useTransactionStore.setState({ updateTransaction: updateTx } as any);
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, jest.fn(), jest.fn()));

    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(true));
    expect(result.current.state.showBudgetField).toBe(true);
    await act(async () => result.current.handleSave());

    expect(updateTx).not.toHaveBeenCalled();
    await act(async () => resolveBudgets([]));
    expect(result.current.state.showBudgetField).toBe(false);
  });

  it('blocks save, preserves assignment, and exposes retry when budget lookup fails', async () => {
    const assignedTx = { ...mockTxExpense, budget_id: 'b1' };
    useEditTransactionStore.getState().loadFromTx(assignedTx);
    jest
      .spyOn(budgetRepository, 'getBudgetsForCategoryMonth')
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValueOnce([mockBudget('b1')]);
    const updateTx = jest.fn();
    useTransactionStore.setState({ updateTransaction: updateTx } as any);
    const { result } = renderHook(() => useEditTransaction(assignedTx, jest.fn(), jest.fn()));

    await waitFor(() => expect(result.current.state.errors.budget).toBeDefined());
    expect(result.current.state.budgetId).toBe('b1');
    expect(result.current.state.showBudgetField).toBe(true);
    await act(async () => result.current.handleSave());
    expect(updateTx).not.toHaveBeenCalled();

    act(() => result.current.retryBudgetLookup());
    expect(result.current.state.errors.budget).toBeUndefined();
    await waitFor(() => expect(result.current.state.selectedBudget?.id).toBe('b1'));
  });

  it('shows a save error and preserves edits after update rejection', async () => {
    const updateTx = jest.fn().mockRejectedValue(new Error('write failed'));
    const onClose = jest.fn();
    const onSaved = jest.fn();
    useTransactionStore.setState({ updateTransaction: updateTx } as any);
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, onClose, onSaved));
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));
    act(() => result.current.setNote('keep this edit'));

    await act(async () => result.current.handleSave());

    expect(result.current.state.errorMessage).toBe(
      'Could not save this transaction. Please try again.',
    );
    expect(result.current.state.note).toBe('keep this edit');
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('initializes amount, category, note, date from the loaded tx', async () => {
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, jest.fn(), jest.fn()));
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));
    expect(result.current.state.amountStr).toBe('50');
    expect(result.current.state.categoryId).toBe('c1');
    expect(result.current.state.note).toBe('lunch');
    expect(result.current.state.date).toBe('2026-05-18');
  });

  it('lock policy: type / selectedAccount / selectedToAccount are read-only', async () => {
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, jest.fn(), jest.fn()));
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));
    expect(result.current.state.type).toBe(TransactionType.Expense);
    expect(result.current.state.selectedAccount?.id).toBe('a1');
    // No setType / selectAccount / selectToAccount exports
    expect((result.current as any).setType).toBeUndefined();
    expect((result.current as any).selectAccount).toBeUndefined();
    expect((result.current as any).selectToAccount).toBeUndefined();
  });

  it('allows category change', async () => {
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, jest.fn(), jest.fn()));
    act(() => result.current.selectCategory(mockCategoryShop));
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));
    expect(result.current.state.categoryId).toBe('c2');
  });

  it('calls updateTransaction with new values on save', async () => {
    const updateTx = jest.fn();
    useTransactionStore.setState({ updateTransaction: updateTx } as any);
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, jest.fn(), jest.fn()));
    await waitFor(() => expect(result.current.state.budgetsLoading).toBe(false));
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
    const updateTx = jest.fn();
    useTransactionStore.setState({ updateTransaction: updateTx } as any);
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, jest.fn(), jest.fn()));
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
    const updateTx = jest.fn();
    useTransactionStore.setState({ updateTransaction: updateTx } as any);
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, jest.fn(), jest.fn()));

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
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, jest.fn(), jest.fn()));

    act(() => result.current.selectCategory(mockCategoryShop));
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
    const { result } = renderHook(() => useEditTransaction(assignedTx, jest.fn(), jest.fn()));

    await waitFor(() => expect(result.current.state.selectedBudget?.id).toBe('may-budget'));
    act(() => result.current.setDate('2026-06-02'));

    await waitFor(() => expect(result.current.state.availableBudgets[0]?.id).toBe('june-budget'));
    expect(result.current.state.selectedBudget?.id).toBe('june-budget');
  });

  it('allows a historical unassigned transaction to be assigned deliberately', async () => {
    const budget = mockBudget('b1');
    jest.spyOn(budgetRepository, 'getBudgetsForCategoryMonth').mockResolvedValue([budget]);
    const updateTx = jest.fn();
    useTransactionStore.setState({ updateTransaction: updateTx } as any);
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, jest.fn(), jest.fn()));

    await waitFor(() => expect(result.current.state.availableBudgets).toEqual([budget]));
    act(() => result.current.selectBudget(budget));
    await act(async () => result.current.handleSave());

    expect(updateTx).toHaveBeenCalledWith('t1', expect.objectContaining({ budget_id: 'b1' }));
  });

  it('requires a selection when changed eligibility exposes multiple budgets', async () => {
    jest
      .spyOn(budgetRepository, 'getBudgetsForCategoryMonth')
      .mockImplementation(async (_categoryId, month) =>
        month === '2026-06' ? [mockBudget('june-1'), mockBudget('june-2')] : [],
      );
    const updateTx = jest.fn();
    useTransactionStore.setState({ updateTransaction: updateTx } as any);
    const { result } = renderHook(() => useEditTransaction(mockTxExpense, jest.fn(), jest.fn()));

    act(() => result.current.setDate('2026-06-02'));
    await waitFor(() => expect(result.current.state.availableBudgets).toHaveLength(2));
    expect(result.current.state.selectedBudget).toBeNull();
    await act(async () => result.current.handleSave());

    expect(result.current.state.errors.budget).toBeDefined();
    expect(updateTx).not.toHaveBeenCalled();
  });
});
