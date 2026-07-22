import { act, renderHook, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { CommitmentPaymentStatus, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { useTransactionDetail } from '@/modules/transactions/screens/transactions/detail/detail.hook';
import { useTxDetailState } from '@/modules/transactions/screens/transactions/detail/detail.state';
import { useTxDetailStore } from '@/modules/transactions/screens/transactions/detail/detail.store';
import { useTransactionFormState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

const mockGetBudgetById = jest.fn<Promise<Budget | undefined>, [string]>();
const mockGetCommitmentPaymentById = jest.fn<Promise<CommitmentPayment | undefined>, [string]>();

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@/modules/accounts/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/modules/transactions/store/transaction.store', () => ({
  useTransactionStore: jest.fn(),
}));
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state',
  () => ({ useTransactionFormState: { getState: jest.fn() } }),
);
jest.mock('@/modules/commitments/repositories/commitment.repository', () => ({
  commitmentRepository: {
    getPaymentById: (id: string) => mockGetCommitmentPaymentById(id),
  },
}));
jest.mock('@/modules/budget/repositories/budget.repository', () => ({
  budgetRepository: { getById: (id: string) => mockGetBudgetById(id) },
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
const openEdit = jest.fn();
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
  mockGetBudgetById.mockResolvedValue(undefined);
  const actualFormState = jest
    .requireActual<
      typeof import('@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state')
    >('@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state')
    .useTransactionFormState.getState();
  jest.mocked(useTransactionFormState.getState).mockReturnValue({
    ...actualFormState,
    openEdit,
  });

  attachMockSelectorStore(useTransactionStore, () => ({
    transactions: [],
    getById,
    deleteTransaction: jest.fn(),
  }));
  attachMockSelectorStore(useAccountStore, () => ({
    accounts: [],
    accountLookup: [],
    loadAccountLookup,
  }));
  attachMockSelectorStore(useCategoryStore, () => ({ categories: [] }));
  attachMockSelectorStore(useCommitmentStore, () => ({
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

    await waitFor(() => expect(failed.result.current.state.viewState).toBe('firstLoadError'));
    expect(failed.result.current.state.tx).toBeNull();
    consoleSpy.mockRestore();
  });

  it('keeps ready content visible while revalidating', async () => {
    const { result } = renderHook(() => useTransactionDetail(linkedTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    const pending = deferred<typeof linkedTransaction>();
    getById.mockReturnValueOnce(pending.promise);

    act(() => result.current.reload());

    expect(result.current.state.viewState).toBe('refreshing');
    expect(result.current.state.revalidating).toBe(true);
    expect(result.current.state.derived).not.toBeNull();

    pending.resolve({ ...linkedTransaction, note: 'updated' });
    await waitFor(() => expect(result.current.state.revalidating).toBe(false));
    expect(result.current.state.tx?.note).toBe('updated');
  });

  it('publishes the transaction before ancillary budget metadata resolves', async () => {
    const budget = {
      id: 'budget-1',
      category_id: 'category-1',
      name: 'Travel meals',
      limit_amount: 500,
      effective_from: '2026-04',
      created_at: '2026-04-01T00:00:00.000Z',
      updated_at: '2026-04-01T00:00:00.000Z',
    };
    const pendingBudget = deferred<typeof budget>();
    getById.mockResolvedValue({ ...linkedTransaction, budget_id: budget.id });
    mockGetBudgetById.mockReturnValue(pendingBudget.promise);

    const { result } = renderHook(() => useTransactionDetail(linkedTransaction.id));

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(mockGetBudgetById).toHaveBeenCalledWith('budget-1');
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
    mockGetBudgetById.mockRejectedValue(new Error('budget unavailable'));
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
    expect(result.current.state.viewState).toBe('refreshErrorWithData');
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
    mockGetCommitmentPaymentById.mockResolvedValue({
      id: 'payment-1',
      commitment_id: 'commitment-1',
      due_date: '2026-04-18',
      paid_date: '2026-04-18',
      skipped_date: null,
      amount_due: 200,
      amount_paid: 200,
      currency: Currency.EGP,
      exchange_rate_snapshot: null,
      account_id: 'account-1',
      transaction_id: linkedTransaction.id,
      status: CommitmentPaymentStatus.Paid,
      notes: null,
      created_at: '2026-04-18T10:00:00.000Z',
      updated_at: '2026-04-18T10:00:00.000Z',
    });
    const { result } = renderHook(() => useTransactionDetail(linkedTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    await act(async () => result.current.openCommitment());

    expect(mockGetCommitmentPaymentById).toHaveBeenCalledWith('payment-1');
    expect(loadCommitments).toHaveBeenCalledTimes(1);
    expect(setSelectedMonth).toHaveBeenCalledWith('2026-04');
    expect(router.push).toHaveBeenCalledWith('/commitments/payment-1');
  });

  it('does not navigate when the linked payment no longer exists', async () => {
    mockGetCommitmentPaymentById.mockResolvedValue(undefined);
    const { result } = renderHook(() => useTransactionDetail(linkedTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    await act(async () => result.current.openCommitment());

    expect(loadCommitments).not.toHaveBeenCalled();
    expect(setSelectedMonth).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });
});

describe('useTransactionDetail route actions', () => {
  it('owns back, account, and edit navigation outside the screen template', async () => {
    const ordinaryTransaction = { ...linkedTransaction, commitment_payment_id: null };
    getById.mockResolvedValue(ordinaryTransaction);
    const { result } = renderHook(() => useTransactionDetail(ordinaryTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    act(() => result.current.goBack());
    act(() => result.current.openAccount('account-2'));
    act(() => result.current.openEdit());

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/accounts/account-2');
    expect(openEdit).toHaveBeenCalledWith(ordinaryTransaction, result.current.reload);
  });

  it('does not open the generic edit flow for a commitment-owned transaction', async () => {
    const { result } = renderHook(() => useTransactionDetail(linkedTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    act(() => result.current.openEdit());

    expect(openEdit).not.toHaveBeenCalled();
  });
});
