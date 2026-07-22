import { act, renderHook, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { budgetRepository } from '@/modules/budget/repositories/budget.repository';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { commitmentRepository } from '@/modules/commitments/repositories/commitment.repository';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { useTransactionDetail } from '@/modules/transactions/screens/transactions/detail/detail.hook';
import { useTxDetailState } from '@/modules/transactions/screens/transactions/detail/detail.state';
import { useTxDetailStore } from '@/modules/transactions/screens/transactions/detail/detail.store';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@/modules/accounts/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/modules/transactions/store/transaction.store', () => ({
  useTransactionStore: jest.fn(),
}));
jest.mock('@/modules/commitments/repositories/commitment.repository', () => ({
  commitmentRepository: { getPaymentById: jest.fn() },
}));
jest.mock('@/modules/budget/repositories/budget.repository', () => ({
  budgetRepository: { getById: jest.fn() },
}));

const linkedTransaction: Transaction = {
  id: 'transaction-1',
  type: TransactionType.Expense,
  amount: 200,
  currency: Currency.EGP,
  egp_amount: 200,
  exchange_rate: null,
  to_amount: null,
  minimum_payment_snapshot: null,
  revolving_balance_delta: null,
  account_id: 'account-1',
  to_account_id: null,
  category_id: 'category-1',
  budget_id: null,
  note: null,
  transaction_date: '2026-04-18',
  transaction_time: '10:00:00',
  commitment_payment_id: 'payment-1',
  installment_id: null,
  created_at: 'now',
  updated_at: 'now',
};

const loadCommitments = jest.fn().mockResolvedValue(undefined);
const setSelectedMonth = jest.fn().mockResolvedValue(undefined);
const loadAccountLookup = jest.fn().mockResolvedValue(undefined);
let getById: jest.Mock;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.clearAllMocks();
  loadAccountLookup.mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  useTxDetailStore.getState().reset();
  useTxDetailState.getState().reset();
  getById = jest.fn().mockResolvedValue(linkedTransaction);
  (budgetRepository.getById as jest.Mock).mockResolvedValue(undefined);

  attachMockSelectorStore(useTransactionStore as unknown as jest.Mock, () => ({
    transactions: [],
    getById,
    deleteTransaction: jest.fn(),
  }));
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: [],
    accountLookup: [],
    loadAccountLookup,
  }));
  attachMockSelectorStore(useCategoryStore as unknown as jest.Mock, () => ({ categories: [] }));
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    loadCommitments,
    setSelectedMonth,
  }));
});

describe('useTransactionDetail loading', () => {
  it('uses an explicit initial loading state until the transaction resolves', async () => {
    const pending = deferred<typeof linkedTransaction>();
    getById.mockReturnValue(pending.promise);

    const { result } = renderHook(() => useTransactionDetail(linkedTransaction.id));

    expect(result.current.state.viewState).toBe('loading');
    expect(result.current.state.tx).toBeNull();

    pending.resolve(linkedTransaction);
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.tx).toEqual(linkedTransaction);
  });

  it('distinguishes a missing transaction from a repository failure', async () => {
    getById.mockResolvedValue(null);
    const missing = renderHook(() => useTransactionDetail('missing'));
    await waitFor(() => expect(missing.result.current.state.viewState).toBe('notFound'));
    missing.unmount();

    useTxDetailStore.getState().reset();
    useTxDetailState.getState().reset();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    getById.mockRejectedValue(new Error('db unavailable'));
    const failed = renderHook(() => useTransactionDetail('failed'));

    await waitFor(() => expect(failed.result.current.state.viewState).toBe('error'));
    expect(failed.result.current.state.tx).toBeNull();
    consoleSpy.mockRestore();
  });

  it('keeps ready content visible while revalidating', async () => {
    const { result } = renderHook(() => useTransactionDetail(linkedTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    const pending = deferred<typeof linkedTransaction>();
    getById.mockReturnValueOnce(pending.promise);

    act(() => result.current.reload());

    expect(result.current.state.viewState).toBe('ready');
    expect(result.current.state.revalidating).toBe(true);
    expect(result.current.state.derived).not.toBeNull();

    pending.resolve({ ...linkedTransaction, note: 'updated' });
    await waitFor(() => expect(result.current.state.revalidating).toBe(false));
    expect(result.current.state.tx?.note).toBe('updated');
  });

  it('publishes the transaction before ancillary budget metadata resolves', async () => {
    const budget = { id: 'budget-1', name: 'Travel meals' };
    const pendingBudget = deferred<typeof budget>();
    getById.mockResolvedValue({ ...linkedTransaction, budget_id: budget.id });
    (budgetRepository.getById as jest.Mock).mockReturnValue(pendingBudget.promise);

    const { result } = renderHook(() => useTransactionDetail(linkedTransaction.id));

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(budgetRepository.getById).toHaveBeenCalledWith('budget-1');
    expect(result.current.state.tx?.id).toBe(linkedTransaction.id);
    expect(result.current.state.derived?.budgetLabel).toBe(Strings.detailBudgetUnavailable);

    pendingBudget.resolve(budget);
    await waitFor(() => expect(result.current.state.derived?.budgetLabel).toBe('Travel meals'));
  });

  it('publishes the transaction before ancillary account metadata resolves', async () => {
    const pendingLookup = deferred<void>();
    loadAccountLookup.mockReturnValueOnce(pendingLookup.promise);

    const { result } = renderHook(() => useTransactionDetail(linkedTransaction.id));

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.tx?.id).toBe(linkedTransaction.id);

    pendingLookup.resolve();
    await pendingLookup.promise;
  });

  it('keeps a valid transaction visible when its budget metadata cannot load', async () => {
    getById.mockResolvedValue({ ...linkedTransaction, budget_id: 'budget-1' });
    (budgetRepository.getById as jest.Mock).mockRejectedValue(new Error('budget unavailable'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useTransactionDetail(linkedTransaction.id));

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.tx?.id).toBe(linkedTransaction.id);
    expect(result.current.state.derived?.budgetLabel).toBe(Strings.detailBudgetUnavailable);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[transactionDetail] budget lookup failed',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it('keeps a valid transaction visible when account metadata cannot load', async () => {
    loadAccountLookup.mockRejectedValue(new Error('account unavailable'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useTransactionDetail(linkedTransaction.id));

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.tx?.id).toBe(linkedTransaction.id);
    expect(result.current.state.derived?.accountLabel).toBe(Strings.unknownAccount);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[transactionDetail] account lookup failed',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it('keeps ready content and exposes retry when revalidation fails', async () => {
    const { result } = renderHook(() => useTransactionDetail(linkedTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    const pending = deferred<typeof linkedTransaction>();
    getById.mockReturnValueOnce(pending.promise);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    act(() => result.current.reload());
    pending.reject(new Error('refresh failed'));

    await waitFor(() => expect(result.current.state.refreshError).toBe(true));
    expect(result.current.state.viewState).toBe('ready');
    expect(result.current.state.tx).toEqual(linkedTransaction);
    consoleSpy.mockRestore();
  });

  it('never renders the previous transaction after the route id changes', async () => {
    const nextPending = deferred<typeof linkedTransaction>();
    getById.mockImplementation((id: string) =>
      id === linkedTransaction.id ? Promise.resolve(linkedTransaction) : nextPending.promise,
    );
    const { result, rerender } = renderHook(({ id }: { id: string }) => useTransactionDetail(id), {
      initialProps: { id: linkedTransaction.id },
    });
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    rerender({ id: 'transaction-2' });

    expect(result.current.state.viewState).toBe('loading');
    expect(result.current.state.tx).toBeNull();
    expect(result.current.state.derived).toBeNull();
  });
});

describe('useTransactionDetail commitment navigation', () => {
  it('loads the linked payment month before navigating', async () => {
    (commitmentRepository.getPaymentById as jest.Mock).mockResolvedValue({
      id: 'payment-1',
      due_date: '2026-04-18',
    });
    const { result } = renderHook(() => useTransactionDetail(linkedTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    await act(async () => result.current.openCommitment());

    expect(commitmentRepository.getPaymentById).toHaveBeenCalledWith('payment-1');
    expect(loadCommitments).toHaveBeenCalledTimes(1);
    expect(setSelectedMonth).toHaveBeenCalledWith('2026-04');
    expect(router.push).toHaveBeenCalledWith('/commitments/payment-1');
  });

  it('does not navigate when the linked payment no longer exists', async () => {
    (commitmentRepository.getPaymentById as jest.Mock).mockResolvedValue(undefined);
    const { result } = renderHook(() => useTransactionDetail(linkedTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    await act(async () => result.current.openCommitment());

    expect(loadCommitments).not.toHaveBeenCalled();
    expect(setSelectedMonth).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });
});
