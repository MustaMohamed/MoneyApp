import { act, renderHook, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { CommitmentPaymentStatus, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { TransactionAccountArchivedError } from '@/modules/transactions/repositories/transaction.errors';
import type { DetailFactKind } from '@/modules/transactions/screens/transactions/detail/components/detail.geometry';
import type {
  DetailFact,
  TransactionDetailPresentation,
} from '@/modules/transactions/screens/transactions/detail/detail.helpers';
import { useTransactionDetail } from '@/modules/transactions/screens/transactions/detail/detail.hook';
import { useTxDetailState } from '@/modules/transactions/screens/transactions/detail/detail.state';
import { useTxDetailStore } from '@/modules/transactions/screens/transactions/detail/detail.store';
import { useTransactionDeleteState } from '@/modules/transactions/screens/transactions/transaction_delete.state';
import { useTransactionFormState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { deferred } from '@/test_helpers/deferred';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { makeTestAccount } from '@/test_helpers/transaction';

// The presentation exposes its rows as `facts` alone; this reads one back by kind.
function factOf(
  presentation: TransactionDetailPresentation | null | undefined,
  kind: DetailFactKind,
): DetailFact | undefined {
  return presentation?.facts.find((fact) => fact.kind === kind);
}

const mockGetBudgetById = jest.fn<Promise<Budget | undefined>, [string]>();
const mockGetCommitmentPaymentById = jest.fn<Promise<CommitmentPayment | undefined>, [string]>();

const mockPathname = { current: '/transactions/detail/transaction-1' };
type MockNavigatorState = { index: number; routes: { name: string; params?: object }[] };
const LIST_BELOW: MockNavigatorState = {
  index: 1,
  routes: [{ name: 'index' }, { name: 'detail/[id]/index', params: { id: 'transaction-1' } }],
};
const mockNavigationState: { current: MockNavigatorState } = { current: LIST_BELOW };
function routeBelow(name: string, params?: object): MockNavigatorState {
  return {
    index: 1,
    routes: [
      { name, params },
      { name: 'stacked/transactions/detail/[id]/index', params: { id: 'transaction-1' } },
    ],
  };
}
const mockFocusEffect: { current?: () => void | (() => void) } = {};

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  usePathname: () => mockPathname.current,
  useNavigation: () => ({ getState: () => mockNavigationState.current }),
  // Runs on mount like the real one, and keeps the callback so a test can refocus the screen.
  useFocusEffect: (effect: () => void | (() => void)) => {
    mockFocusEffect.current = effect;
    return jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]);
  },
}));
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

const mockToast = { show: jest.fn() };
// The wrapper, not HeroUI, so `show` sees exactly what the flow passed.
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({ toast: mockToast, isToastVisible: false }),
}));
const mockEnsure = jest.fn<Promise<void>, [unknown]>();
jest.mock('@/modules/accounts/screens/accounts/detail/account_activity.store', () => ({
  useAccountActivityStore: { getState: () => ({ ensure: mockEnsure }) },
}));
jest.mock('@/utils/run_after_interactions', () => ({
  runAfterInteractions: (task: () => void) => {
    task();
    return { cancel: jest.fn() };
  },
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
const deletableTransaction: Transaction = { ...linkedTransaction, commitment_payment_id: null };
const DELETED_TOAST = { label: Strings.transactionDeletedToast, variant: 'success' };

const loadCommitments = jest.fn().mockResolvedValue(undefined);
const setSelectedMonth = jest.fn().mockResolvedValue(undefined);
const loadAccountLookup = jest.fn().mockResolvedValue(undefined);
const loadAccounts = jest.fn().mockResolvedValue(undefined);
const archivedCounterparty = makeTestAccount({
  id: 'archived-a',
  name: 'Dollar Vault',
  currency: Currency.USD,
  is_archived: 1,
});
const deletedCounterparty = makeTestAccount({
  id: 'deleted-b',
  name: '',
  is_archived: 1,
  is_deleted: 1,
});
const LOOKUP_ROWS: Record<string, Account> = {
  [archivedCounterparty.id]: archivedCounterparty,
  [deletedCounterparty.id]: deletedCounterparty,
};
let accountStoreState: {
  accounts: Account[];
  archivedAccounts: Account[];
  accountLookupById: Record<string, Account>;
  accountLookupError: boolean;
  loadAccountLookup: jest.Mock;
  loadAccounts: jest.Mock;
};

function mergeLookupRows(ids: string[]): Promise<void> {
  const rows = Object.values(LOOKUP_ROWS).filter((row) => ids.includes(row.id));
  accountStoreState.accountLookupById = {
    ...accountStoreState.accountLookupById,
    ...Object.fromEntries(rows.map((row) => [row.id, row])),
  };
  return Promise.resolve();
}
const openEdit = jest.fn();
let getById: jest.Mock;
let transactionStoreState: {
  transactions: Transaction[];
  getById: jest.Mock;
  deleteTransaction: jest.Mock;
  mutationVersion: number;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname.current = '/transactions/detail/transaction-1';
  mockFocusEffect.current = undefined;
  loadAccountLookup.mockImplementation(mergeLookupRows);
  jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  useTxDetailStore.getState().reset();
  useTxDetailState.getState().reset();
  useTransactionDeleteState.getState().reset();
  mockNavigationState.current = LIST_BELOW;
  mockEnsure.mockResolvedValue(undefined);
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

  transactionStoreState = {
    transactions: [],
    getById,
    deleteTransaction: jest.fn(),
    mutationVersion: 0,
  };
  attachMockSelectorStore(useTransactionStore, () => transactionStoreState);
  accountStoreState = {
    accounts: [],
    archivedAccounts: [],
    accountLookupById: {},
    accountLookupError: false,
    loadAccountLookup,
    loadAccounts,
  };
  attachMockSelectorStore(useAccountStore, () => accountStoreState);
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

    const { result } = await renderHook(() => useTransactionDetail(linkedTransaction.id));

    expect(result.current.state.viewState).toBe('loading');
    expect(result.current.state.tx).toBeNull();

    pending.resolve(linkedTransaction);
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.tx).toEqual(linkedTransaction);
  });

  it('distinguishes a missing transaction from a repository failure', async () => {
    getById.mockResolvedValue(null);
    const missing = await renderHook(() => useTransactionDetail('missing'));
    await waitFor(() => expect(missing.result.current.state.viewState).toBe('notFound'));
    await missing.unmount();

    useTxDetailStore.getState().reset();
    useTxDetailState.getState().reset();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    getById.mockRejectedValue(new Error('db unavailable'));
    const failed = await renderHook(() => useTransactionDetail('failed'));

    await waitFor(() => expect(failed.result.current.state.viewState).toBe('firstLoadError'));
    expect(failed.result.current.state.tx).toBeNull();
    consoleSpy.mockRestore();
  });

  it('keeps ready content visible while revalidating', async () => {
    const { result } = await renderHook(() => useTransactionDetail(linkedTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    const pending = deferred<typeof linkedTransaction>();
    getById.mockReturnValueOnce(pending.promise);

    await act(() => result.current.reload());

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

    const { result } = await renderHook(() => useTransactionDetail(linkedTransaction.id));

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(mockGetBudgetById).toHaveBeenCalledWith('budget-1');
    expect(result.current.state.tx?.id).toBe(linkedTransaction.id);
    expect(factOf(result.current.state.derived, 'budget')?.value).toBe(
      Strings.detailBudgetUnavailable,
    );

    pendingBudget.resolve(budget);
    await waitFor(() =>
      expect(factOf(result.current.state.derived, 'budget')?.value).toBe('Travel meals'),
    );
  });

  it('publishes the transaction before ancillary account metadata resolves', async () => {
    const pendingLookup = deferred<void>();
    loadAccountLookup.mockReturnValueOnce(pendingLookup.promise);

    const { result } = await renderHook(() => useTransactionDetail(linkedTransaction.id));

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.tx?.id).toBe(linkedTransaction.id);

    pendingLookup.resolve();
    await pendingLookup.promise;
  });

  it('keeps a valid transaction visible when its budget metadata cannot load', async () => {
    getById.mockResolvedValue({ ...linkedTransaction, budget_id: 'budget-1' });
    mockGetBudgetById.mockRejectedValue(new Error('budget unavailable'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = await renderHook(() => useTransactionDetail(linkedTransaction.id));

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.tx?.id).toBe(linkedTransaction.id);
    expect(factOf(result.current.state.derived, 'budget')?.value).toBe(
      Strings.detailBudgetUnavailable,
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      '[transactionDetail] budget lookup failed',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it('keeps a valid transaction visible when account metadata cannot load', async () => {
    loadAccountLookup.mockRejectedValue(new Error('account unavailable'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = await renderHook(() => useTransactionDetail(linkedTransaction.id));

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(result.current.state.tx?.id).toBe(linkedTransaction.id);
    expect(factOf(result.current.state.derived, 'account')?.value).toBe(Strings.unknownAccount);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[transactionDetail] account lookup failed',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it('keeps ready content and exposes retry when revalidation fails', async () => {
    const { result } = await renderHook(() => useTransactionDetail(linkedTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    const pending = deferred<typeof linkedTransaction>();
    getById.mockReturnValueOnce(pending.promise);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await act(() => result.current.reload());
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
    const { result, rerender } = await renderHook(
      ({ id }: { id: string }) => useTransactionDetail(id),
      {
        initialProps: { id: linkedTransaction.id },
      },
    );
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    await rerender({ id: 'transaction-2' });

    expect(result.current.state.viewState).toBe('loading');
    expect(result.current.state.tx).toBeNull();
    expect(result.current.state.derived).toBeNull();
  });
});

const paidPayment: CommitmentPayment = {
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
  transaction_id: 'transaction-1',
  status: CommitmentPaymentStatus.Paid,
  notes: null,
  created_at: '2026-04-18T10:00:00.000Z',
  updated_at: '2026-04-18T10:00:00.000Z',
};

describe('useTransactionDetail commitment navigation', () => {
  it('loads the linked payment month before navigating', async () => {
    mockGetCommitmentPaymentById.mockResolvedValue(paidPayment);
    const { result } = await renderHook(() => useTransactionDetail(linkedTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    await act(async () => result.current.openCommitment());

    expect(mockGetCommitmentPaymentById).toHaveBeenCalledWith('payment-1');
    expect(loadCommitments).not.toHaveBeenCalled();
    expect(setSelectedMonth).toHaveBeenCalledWith('2026-04');
    expect(router.push).toHaveBeenCalledWith(
      '/stacked/commitments/payment-1?originTxId=transaction-1&originTxCopy=tabbed',
    );
  });

  it('keeps the stacked copy inside the stacked subtree', async () => {
    mockPathname.current = '/stacked/transactions/detail/transaction-1';
    mockGetCommitmentPaymentById.mockResolvedValue(paidPayment);
    const { result } = await renderHook(() => useTransactionDetail(linkedTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    await act(async () => result.current.openCommitment());

    expect(router.push).toHaveBeenCalledWith(
      '/stacked/commitments/payment-1?originTxId=transaction-1',
    );
  });

  it('does not navigate when the linked payment no longer exists', async () => {
    mockGetCommitmentPaymentById.mockResolvedValue(undefined);
    const { result } = await renderHook(() => useTransactionDetail(linkedTransaction.id));
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
    const { result } = await renderHook(() => useTransactionDetail(ordinaryTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    await act(() => result.current.goBack());
    await act(() => result.current.openAccount('account-2'));
    await act(() => result.current.openEdit());

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/accounts/account-2');
    expect(openEdit).toHaveBeenCalledWith(ordinaryTransaction, result.current.reload);
  });

  it('does not open the generic edit flow for a commitment-owned transaction', async () => {
    const { result } = await renderHook(() => useTransactionDetail(linkedTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    await act(() => result.current.openEdit());

    expect(openEdit).not.toHaveBeenCalled();
  });
});

const otherTransaction: Transaction = {
  ...linkedTransaction,
  id: 'transaction-2',
  amount: 900,
  egp_amount: 900,
};

describe('useTransactionDetail focus refresh', () => {
  it('shows its transaction again without a round trip when nothing was written', async () => {
    const { result } = await renderHook(() => useTransactionDetail(linkedTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(getById).toHaveBeenCalledTimes(1);

    await act(async () => mockFocusEffect.current?.());

    expect(getById).toHaveBeenCalledTimes(1);
    expect(result.current.state.viewState).toBe('ready');
    expect(result.current.state.tx).toEqual(linkedTransaction);
  });

  it('re-queries and renders the edit when the transaction was written elsewhere', async () => {
    const { result } = await renderHook(() => useTransactionDetail(linkedTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    getById.mockResolvedValue({ ...linkedTransaction, note: 'edited elsewhere' });
    transactionStoreState.mutationVersion += 1;
    await act(async () => mockFocusEffect.current?.());

    await waitFor(() => expect(result.current.state.tx?.note).toBe('edited elsewhere'));
    expect(getById).toHaveBeenCalledTimes(2);
    expect(getById).toHaveBeenLastCalledWith(linkedTransaction.id);
  });

  it('stamps the version read before the query, so a write mid-read still refreshes', async () => {
    const pending = deferred<typeof linkedTransaction>();
    getById.mockReturnValueOnce(pending.promise);
    const { result } = await renderHook(() => useTransactionDetail(linkedTransaction.id));

    transactionStoreState.mutationVersion += 1;
    pending.resolve(linkedTransaction);
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    await act(async () => mockFocusEffect.current?.());

    expect(getById).toHaveBeenCalledTimes(2);
  });
});

describe('useTransactionDetail two copies mounted at once', () => {
  it('each copy reads its own transaction and neither reloads when the other unmounts', async () => {
    getById.mockImplementation((txId: string) =>
      Promise.resolve(txId === linkedTransaction.id ? linkedTransaction : otherTransaction),
    );
    const lower = await renderHook(() => useTransactionDetail(linkedTransaction.id));
    const lowerFocus = mockFocusEffect.current;
    await waitFor(() => expect(lower.result.current.state.viewState).toBe('ready'));
    const upper = await renderHook(() => useTransactionDetail(otherTransaction.id));
    await waitFor(() => expect(upper.result.current.state.viewState).toBe('ready'));

    expect(lower.result.current.state.tx).toEqual(linkedTransaction);
    expect(upper.result.current.state.tx).toEqual(otherTransaction);

    await upper.unmount();
    await act(async () => lowerFocus?.());

    expect(lower.result.current.state.viewState).toBe('ready');
    expect(lower.result.current.state.tx).toEqual(linkedTransaction);
    expect(getById).toHaveBeenCalledTimes(2);
  });

  it('two copies of the same transaction do not release each other', async () => {
    const lower = await renderHook(() => useTransactionDetail(linkedTransaction.id));
    const lowerFocus = mockFocusEffect.current;
    await waitFor(() => expect(lower.result.current.state.viewState).toBe('ready'));
    const upper = await renderHook(() => useTransactionDetail(linkedTransaction.id));
    await waitFor(() => expect(upper.result.current.state.viewState).toBe('ready'));
    expect(getById).toHaveBeenCalledTimes(2);

    await upper.unmount();

    expect(lower.result.current.state.viewState).toBe('ready');
    expect(lower.result.current.state.tx).toEqual(linkedTransaction);

    await act(async () => lowerFocus?.());

    expect(lower.result.current.state.viewState).toBe('ready');
    expect(getById).toHaveBeenCalledTimes(2);
  });

  it('a copy whose transaction was deleted elsewhere goes not-found alone', async () => {
    const lower = await renderHook(() => useTransactionDetail(linkedTransaction.id));
    await waitFor(() => expect(lower.result.current.state.viewState).toBe('ready'));
    const upper = await renderHook(() => useTransactionDetail(linkedTransaction.id));
    const upperFocus = mockFocusEffect.current;
    await waitFor(() => expect(upper.result.current.state.viewState).toBe('ready'));

    getById.mockResolvedValue(null);
    transactionStoreState.mutationVersion += 1;
    await act(async () => upperFocus?.());

    await waitFor(() => expect(upper.result.current.state.viewState).toBe('notFound'));
    expect(lower.result.current.state.viewState).toBe('ready');
    expect(lower.result.current.state.tx).toEqual(linkedTransaction);
  });

  it("one copy opening its delete dialog leaves the other copy's dialog closed and empty", async () => {
    getById.mockResolvedValue(deletableTransaction);
    accountStoreState.accountLookupById = {
      'account-1': makeTestAccount({ id: 'account-1', name: 'Cash' }),
    };
    const lower = await renderHook(() => useTransactionDetail(deletableTransaction.id));
    await waitFor(() => expect(lower.result.current.state.viewState).toBe('ready'));
    const upper = await renderHook(() => useTransactionDetail(deletableTransaction.id));
    await waitFor(() => expect(upper.result.current.state.viewState).toBe('ready'));

    await act(async () => upper.result.current.openDeleteConfirm());

    expect(upper.result.current.state.confirmVisible).toBe(true);
    expect(lower.result.current.state.confirmVisible).toBe(false);
    expect(lower.result.current.state.deleteBody).toBe('');
  });

  it('a copy unmounting releases its delete entry and leaves the other copy open', async () => {
    getById.mockResolvedValue(deletableTransaction);
    accountStoreState.accountLookupById = {
      'account-1': makeTestAccount({ id: 'account-1', name: 'Cash' }),
    };
    const lower = await renderHook(() => useTransactionDetail(deletableTransaction.id));
    await waitFor(() => expect(lower.result.current.state.viewState).toBe('ready'));
    const upper = await renderHook(() => useTransactionDetail(deletableTransaction.id));
    await waitFor(() => expect(upper.result.current.state.viewState).toBe('ready'));
    await act(async () => lower.result.current.openDeleteConfirm());
    await act(async () => upper.result.current.openDeleteConfirm());
    expect(Object.keys(useTransactionDeleteState.getState().entries)).toHaveLength(2);

    await upper.unmount();

    expect(Object.keys(useTransactionDeleteState.getState().entries)).toHaveLength(1);
    expect(lower.result.current.state.confirmVisible).toBe(true);
  });
});

describe('useTransactionDetail account lookup', () => {
  it('floats the refresh error while the lookup failed and an account on screen is unresolved', async () => {
    accountStoreState.accountLookupError = true;

    const { result } = await renderHook(() => useTransactionDetail(linkedTransaction.id));

    await waitFor(() => expect(result.current.state.tx).toEqual(linkedTransaction));
    expect(result.current.state.refreshError).toBe(true);
    expect(result.current.state.viewState).toBe('refreshErrorWithData');
  });

  it('does not float the lookup error over a transaction whose accounts resolved', async () => {
    accountStoreState.accountLookupError = true;
    accountStoreState.accountLookupById = { 'account-1': makeTestAccount() };

    const { result } = await renderHook(() => useTransactionDetail(linkedTransaction.id));

    await waitFor(() => expect(result.current.state.tx).toEqual(linkedTransaction));
    expect(result.current.state.refreshError).toBe(false);
    expect(result.current.state.viewState).toBe('ready');
  });

  it('two copies on different counterparties each keep theirs after the other loads and unmounts', async () => {
    accountStoreState.accounts = [makeTestAccount({ name: 'Cash' })];
    const toArchived: Transaction = {
      ...linkedTransaction,
      id: 'transfer-a',
      type: TransactionType.Transfer,
      category_id: null,
      commitment_payment_id: null,
      to_account_id: archivedCounterparty.id,
      to_amount: 4,
      exchange_rate: 50,
    };
    const toDeleted: Transaction = {
      ...toArchived,
      id: 'transfer-b',
      to_account_id: deletedCounterparty.id,
    };
    getById.mockImplementation((txId: string) =>
      Promise.resolve(txId === toArchived.id ? toArchived : toDeleted),
    );

    const lower = await renderHook(() => useTransactionDetail(toArchived.id));
    const lowerFocus = mockFocusEffect.current;
    await waitFor(() => expect(lower.result.current.state.viewState).toBe('ready'));
    const upper = await renderHook(() => useTransactionDetail(toDeleted.id));
    await waitFor(() => expect(upper.result.current.state.viewState).toBe('ready'));
    await lower.rerender({});
    await upper.rerender({});

    expect(lower.result.current.state.derived?.transferFlow?.to.name).toBe('Dollar Vault');
    expect(upper.result.current.state.derived?.transferFlow?.to.name).toBe(Strings.deletedAccount);

    await upper.unmount();
    await act(async () => lowerFocus?.());
    await lower.rerender({});

    expect(lower.result.current.state.derived?.transferFlow?.to.name).toBe('Dollar Vault');
  });
});

describe('useTransactionDetail transfer flow lookup (MA-196)', () => {
  const cash = makeTestAccount({ name: 'Cash' });
  const transferTo = (toAccountId: string): Transaction => ({
    ...linkedTransaction,
    id: 'transfer-1',
    type: TransactionType.Transfer,
    category_id: null,
    commitment_payment_id: null,
    to_account_id: toAccountId,
    to_amount: 4,
    exchange_rate: 50,
  });

  type Detail = ReturnType<typeof useTransactionDetail>;
  interface SeenRender {
    pending: boolean | undefined;
    flow: NonNullable<Detail['state']['derived']>['transferFlow'] | undefined;
  }

  // Every render's pending flag and flow, so a skeleton or an Unknown account between waits is caught.
  async function renderTransfer(tx: Transaction) {
    getById.mockResolvedValue(tx);
    const seen: SeenRender[] = [];
    const rendered = await renderHook(() => {
      const detail = useTransactionDetail(tx.id);
      seen.push({
        pending: detail.state.transferFlowView.kind === 'pending',
        flow: detail.state.derived?.transferFlow,
      });
      return detail;
    });
    return { ...rendered, seen };
  }

  beforeEach(() => {
    accountStoreState.accounts = [cash];
  });

  it('a transfer to a deleted account holds the skeleton until its lookup lands, then draws Deleted Account with no tap', async () => {
    const pending = deferred();
    loadAccountLookup.mockImplementationOnce(async (ids: string[]) => {
      await pending.promise;
      await mergeLookupRows(ids);
    });

    const { result } = await renderTransfer(transferTo(deletedCounterparty.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    expect(result.current.state.transferFlowView.kind).toBe('pending');

    await act(async () => {
      pending.resolve();
      await pending.promise;
    });

    await waitFor(() => expect(result.current.state.transferFlowView.kind).toBe('cells'));
    expect(result.current.state.derived?.transferFlow?.to.name).toBe(Strings.deletedAccount);
    expect(result.current.state.derived?.transferFlow?.to.open).toBeUndefined();
  });

  it('a transfer to an id no row holds asks the lookup twice, then draws Unknown account with no amount', async () => {
    const { result } = await renderTransfer(transferTo('missing-z'));

    await waitFor(() => expect(loadAccountLookup).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect(result.current.state.viewState).toBe('ready');
      expect(result.current.state.transferFlowView.kind).toBe('cells');
    });

    const flow = result.current.state.derived?.transferFlow;
    expect(flow?.to.name).toBe(Strings.unknownAccount);
    expect(flow?.to.amountText).toBeUndefined();
    expect(flow?.to.open).toBeUndefined();
    expect(loadAccountLookup).toHaveBeenCalledTimes(2);
    expect(loadAccountLookup).toHaveBeenNthCalledWith(2, expect.arrayContaining(['missing-z']));
  });

  it('a lookup that resolves without writing is asked once more, so a deleted side never reads Unknown account once settled', async () => {
    loadAccountLookup.mockImplementationOnce(() => Promise.resolve());

    const { result, seen } = await renderTransfer(transferTo(deletedCounterparty.id));

    await waitFor(() => expect(loadAccountLookup).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect(result.current.state.viewState).toBe('ready');
      expect(result.current.state.transferFlowView.kind).toBe('cells');
    });

    expect(result.current.state.derived?.transferFlow?.to.name).toBe(Strings.deletedAccount);
    const settledNames = seen
      .filter((render) => render.pending === false && render.flow)
      .map((render) => render.flow?.to.name);
    expect(settledNames).not.toContain(Strings.unknownAccount);
  });

  it('a lookup that rejects without writing is asked once more, so a deleted side never reads Unknown account once settled', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    loadAccountLookup.mockImplementationOnce(() => Promise.reject(new Error('overtaken')));

    const { result, seen } = await renderTransfer(transferTo(deletedCounterparty.id));

    await waitFor(() => expect(loadAccountLookup).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.state.transferFlowView.kind).toBe('cells'));

    expect(result.current.state.derived?.transferFlow?.to.name).toBe(Strings.deletedAccount);
    const settledNames = seen
      .filter((render) => render.pending === false && render.flow)
      .map((render) => render.flow?.to.name);
    expect(settledNames).not.toContain(Strings.unknownAccount);
    consoleSpy.mockRestore();
  });

  it('a refresh that fails while the first lookup is in flight draws the cells under the refresh error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const pending = deferred();
    loadAccountLookup.mockImplementationOnce(() => pending.promise);

    const { result } = await renderTransfer(transferTo('missing-z'));
    await waitFor(() => expect(result.current.state.transferFlowView.kind).toBe('pending'));

    getById.mockRejectedValueOnce(new Error('refresh failed'));
    await act(async () => result.current.reload());

    await waitFor(() => expect(result.current.state.refreshError).toBe(true));
    expect(result.current.state.transferFlowView.kind).toBe('cells');
    expect(result.current.state.derived?.transferFlow?.to.name).toBe(Strings.unknownAccount);

    await act(async () => {
      pending.resolve();
      await pending.promise;
    });
    consoleSpy.mockRestore();
  });

  it('a rejected lookup settles: both cells draw and the refresh error shows', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    loadAccountLookup.mockImplementation(() => {
      accountStoreState.accountLookupError = true;
      return Promise.reject(new Error('lookup unavailable'));
    });

    const { result } = await renderTransfer(transferTo(deletedCounterparty.id));

    await waitFor(() => {
      expect(result.current.state.viewState).toBe('refreshErrorWithData');
      expect(result.current.state.transferFlowView.kind).toBe('cells');
    });

    const flow = result.current.state.derived?.transferFlow;
    expect(flow?.from.name).toBe('Cash');
    expect(flow?.to.name).toBe(Strings.unknownAccount);
    expect(result.current.state.refreshError).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[transactionDetail] account lookup failed',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it('a transfer whose accounts the active list holds draws its cells from its first ready render', async () => {
    const savings = makeTestAccount({ id: 'account-2', name: 'Savings' });
    accountStoreState.accounts = [cash, savings];

    const { result, seen } = await renderTransfer(transferTo(savings.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    const withFlow = seen.filter((render) => render.flow);
    expect(withFlow.length).toBeGreaterThan(0);
    expect(withFlow.map((render) => render.pending)).toEqual(withFlow.map(() => false));
    expect(result.current.state.derived?.transferFlow?.to.name).toBe('Savings');
  });

  it('a refresh by reload on a settled transfer with an unknown side never returns to the skeleton', async () => {
    const { result, seen } = await renderTransfer(transferTo('missing-z'));
    await waitFor(() => {
      expect(result.current.state.viewState).toBe('ready');
      expect(result.current.state.transferFlowView.kind).toBe('cells');
    });
    expect(result.current.state.derived?.transferFlow?.to.name).toBe(Strings.unknownAccount);
    const rendersBefore = seen.length;
    const lookupsBefore = loadAccountLookup.mock.calls.length;

    await act(async () => result.current.reload());
    await waitFor(() => expect(getById).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(loadAccountLookup).toHaveBeenCalledTimes(lookupsBefore + 2));
    await waitFor(() => expect(result.current.state.revalidating).toBe(false));
    await act(async () => {});

    const afterReload = seen.slice(rendersBefore);
    expect(afterReload.length).toBeGreaterThan(0);
    expect(afterReload.map((render) => render.pending)).toEqual(afterReload.map(() => false));
  });
});

describe('useTransactionDetail archived account (MA-053)', () => {
  const ordinaryTransaction: Transaction = { ...linkedTransaction, commitment_payment_id: null };

  it('hides edit and delete on an archived source and names the account', async () => {
    getById.mockResolvedValue(ordinaryTransaction);
    accountStoreState.accountLookupById = {
      'account-1': makeTestAccount({ id: 'account-1', name: 'Old Card', is_archived: 1 }),
    };
    const { result } = await renderHook(() => useTransactionDetail(ordinaryTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    expect(result.current.state.isEditable).toBe(false);
    expect(result.current.state.isDeletable).toBe(false);
    expect(result.current.state.actions).toEqual({
      actionSet: 'archivedNotice',
      notice: Strings.transactionAccountArchived('Old Card'),
    });
    expect(result.current.state.actions.actionSet).toBe('archivedNotice');

    await act(() => result.current.openEdit());
    await act(() => result.current.openDeleteConfirm());

    expect(openEdit).not.toHaveBeenCalled();
    expect(result.current.state.confirmVisible).toBe(false);
  });

  it('MA-073: names a blank-named archived source "Unnamed account"', async () => {
    getById.mockResolvedValue(ordinaryTransaction);
    accountStoreState.accountLookupById = {
      'account-1': makeTestAccount({ id: 'account-1', name: '   ', is_archived: 1 }),
    };
    const { result } = await renderHook(() => useTransactionDetail(ordinaryTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    expect(result.current.state.actions).toEqual({
      actionSet: 'archivedNotice',
      notice: Strings.transactionAccountArchived(Strings.unnamedAccount),
    });
    expect(result.current.state.isEditable).toBe(false);
    expect(result.current.state.isDeletable).toBe(false);
    expect(result.current.state.actions.actionSet).toBe('archivedNotice');
  });

  it('keeps edit and delete on a deleted source, with no line', async () => {
    getById.mockResolvedValue(ordinaryTransaction);
    accountStoreState.accountLookupById = {
      'account-1': makeTestAccount({ id: 'account-1', name: '', is_archived: 1, is_deleted: 1 }),
    };
    const { result } = await renderHook(() => useTransactionDetail(ordinaryTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

    expect(result.current.state.isEditable).toBe(true);
    expect(result.current.state.isDeletable).toBe(true);
    expect(result.current.state.actions).toEqual({ actionSet: 'editDelete' });
    expect(result.current.state.actions.actionSet).toBe('editDelete');
  });

  const paymentAccounts: Array<[string, Partial<Account>]> = [
    ['an archived account', { name: 'Old Card', is_archived: 1 }],
    ['a deleted account', { name: '', is_archived: 1, is_deleted: 1 }],
  ];

  it.each(paymentAccounts)(
    "frame C6: a commitment's payment on %s shows View commitment alone",
    async (_name, overrides) => {
      accountStoreState.accountLookupById = {
        'account-1': makeTestAccount({ id: 'account-1', ...overrides }),
      };
      const { result } = await renderHook(() => useTransactionDetail(linkedTransaction.id));
      await waitFor(() => expect(result.current.state.viewState).toBe('ready'));

      expect(result.current.state.actions).toEqual({ actionSet: 'viewCommitment' });
      expect(result.current.state.actions.notice).toBeUndefined();
    },
  );

  it('hides edit and delete on a transfer whose destination is archived', async () => {
    accountStoreState.accounts = [makeTestAccount({ name: 'Cash' })];
    getById.mockResolvedValue({
      ...ordinaryTransaction,
      type: TransactionType.Transfer,
      category_id: null,
      to_account_id: archivedCounterparty.id,
      to_amount: 4,
      exchange_rate: 50,
    });
    const { result } = await renderHook(() => useTransactionDetail(ordinaryTransaction.id));
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    await waitFor(() =>
      expect(result.current.state.actions).toEqual({
        actionSet: 'archivedNotice',
        notice: Strings.transactionAccountArchived(archivedCounterparty.name),
      }),
    );

    expect(result.current.state.isEditable).toBe(false);
    expect(result.current.state.isDeletable).toBe(false);
    expect(result.current.state.actions.actionSet).toBe('archivedNotice');
  });
});

describe('useTransactionDetail loading action set (MA-181)', () => {
  const ordinaryTransaction: Transaction = { ...linkedTransaction, commitment_payment_id: null };

  async function loadingActionSetFor(hint?: Transaction) {
    const pending = deferred<Transaction>();
    getById.mockReturnValue(pending.promise);
    transactionStoreState.transactions = hint ? [hint] : [];

    const { result } = await renderHook(() => useTransactionDetail(linkedTransaction.id));
    expect(result.current.state.viewState).toBe('loading');
    const actionSet = result.current.state.loadingActionSet;

    pending.resolve(hint ?? ordinaryTransaction);
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    return actionSet;
  }

  it('frame C10: holds the archived notice for a listed transaction on an archived account', async () => {
    accountStoreState.archivedAccounts = [
      makeTestAccount({ id: 'account-1', name: 'Old Card', is_archived: 1 }),
    ];

    expect(await loadingActionSetFor(ordinaryTransaction)).toBe('archivedNotice');
  });

  it("frame C10: holds View commitment for a listed commitment's payment", async () => {
    accountStoreState.accounts = [makeTestAccount({ id: 'account-1' })];

    expect(await loadingActionSetFor(linkedTransaction)).toBe('viewCommitment');
  });

  it('holds Edit and Delete when the list does not hold the transaction', async () => {
    expect(await loadingActionSetFor()).toBe('editDelete');
  });
});

describe('useTransactionDetail delete (MA-182)', () => {
  const EXPENSE_BODY = '200 EGP returns to Cash. This cannot be undone.';

  beforeEach(() => {
    getById.mockResolvedValue(deletableTransaction);
    accountStoreState.accountLookupById = {
      'account-1': makeTestAccount({ id: 'account-1', name: 'Cash' }),
    };
  });

  async function renderOpenDialog() {
    const rendered = await renderHook(() => useTransactionDetail(deletableTransaction.id));
    await waitFor(() => expect(rendered.result.current.state.viewState).toBe('ready'));
    await act(async () => rendered.result.current.openDeleteConfirm());
    return rendered;
  }

  function backThenToastOnce(): void {
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(mockToast.show).toHaveBeenCalledTimes(1);
    expect(mockToast.show).toHaveBeenCalledWith(DELETED_TOAST);
    expect(jest.mocked(router.back).mock.invocationCallOrder[0]).toBeLessThan(
      mockToast.show.mock.invocationCallOrder[0],
    );
  }

  it("frame C11: the open dialog prints the expense's body, not busy and with no line", async () => {
    const { result } = await renderOpenDialog();

    expect(result.current.state.confirmVisible).toBe(true);
    expect(result.current.state.deleteBody).toBe(EXPENSE_BODY);
    expect(result.current.state.deleteBusy).toBe(false);
    expect(result.current.state.deleteErrorMessage).toBeUndefined();
  });

  it('reads busy with no back and no toast while the delete is in flight, then closes, backs once and toasts once', async () => {
    const deletion = deferred();
    const pendingDelete = jest.fn<Promise<void>, [string]>(() => deletion.promise);
    transactionStoreState.deleteTransaction = pendingDelete;
    const { result } = await renderOpenDialog();

    let confirmed: Promise<void> | undefined;
    await act(() => {
      confirmed = result.current.confirmDelete();
    });

    expect(pendingDelete).toHaveBeenCalledWith(deletableTransaction.id);
    expect(result.current.state.deleteBusy).toBe(true);
    expect(result.current.state.confirmVisible).toBe(true);
    expect(router.back).not.toHaveBeenCalled();
    expect(mockToast.show).not.toHaveBeenCalled();

    await act(async () => {
      deletion.resolve();
      await confirmed;
    });

    expect(result.current.state.deleteBusy).toBe(false);
    expect(result.current.state.confirmVisible).toBe(false);
    expect(result.current.state.deleteBody).toBe(EXPENSE_BODY);
    expect(loadAccounts).toHaveBeenCalledTimes(1);
    backThenToastOnce();
  });

  it('prints the generic failure in the open dialog, with no back and no toast', async () => {
    transactionStoreState.deleteTransaction = jest.fn().mockRejectedValue(new Error('disk full'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = await renderOpenDialog();

    await act(async () => result.current.confirmDelete());

    expect(result.current.state.deleteErrorMessage).toBe(Strings.errDeleteFailed);
    expect(result.current.state.confirmVisible).toBe(true);
    expect(result.current.state.deleteBusy).toBe(false);
    expect(loadAccounts).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(mockToast.show).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('prints the archived refusal in the dialog as the list does, with no system alert', async () => {
    transactionStoreState.deleteTransaction = jest
      .fn()
      .mockRejectedValue(
        new TransactionAccountArchivedError('source', makeTestAccount({ name: 'Old Card' })),
      );
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = await renderOpenDialog();

    await act(async () => result.current.confirmDelete());

    expect(result.current.state.deleteErrorMessage).toBe(
      Strings.transactionAccountArchived('Old Card'),
    );
    expect(result.current.state.confirmVisible).toBe(true);
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(mockToast.show).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("over an account detail, backs, reloads that account's activity at the new version, and toasts only once it settles", async () => {
    mockNavigationState.current = routeBelow('accounts/[id]/index', { id: 'account-1' });
    const reload = deferred();
    mockEnsure.mockReturnValue(reload.promise);
    transactionStoreState.deleteTransaction = jest.fn(() => {
      transactionStoreState.mutationVersion += 1;
      return Promise.resolve();
    });
    const { result } = await renderOpenDialog();

    let confirmed: Promise<void> | undefined;
    await act(() => {
      confirmed = result.current.confirmDelete();
    });
    await waitFor(() => expect(mockEnsure).toHaveBeenCalledTimes(1));

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(mockEnsure).toHaveBeenCalledWith({
      accountId: 'account-1',
      mutationVersion: 1,
      now: expect.any(Date),
    });
    expect(mockToast.show).not.toHaveBeenCalled();

    await act(async () => {
      reload.resolve();
      await confirmed;
    });

    backThenToastOnce();
  });

  it('still backs and toasts once when the activity reload after the delete fails', async () => {
    mockNavigationState.current = routeBelow('accounts/[id]/index', { id: 'account-1' });
    mockEnsure.mockRejectedValue(new Error('activity read failed'));
    transactionStoreState.deleteTransaction = jest.fn().mockResolvedValue(undefined);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = await renderOpenDialog();

    await act(async () => result.current.confirmDelete());

    expect(mockEnsure).toHaveBeenCalledTimes(1);
    expect(result.current.state.deleteErrorMessage).toBeUndefined();
    backThenToastOnce();
    consoleSpy.mockRestore();
  });

  it('over a transfer opened from an account detail, waits on that account with no snapshot read', async () => {
    getById.mockResolvedValue({
      ...deletableTransaction,
      type: TransactionType.Transfer,
      category_id: null,
      to_account_id: 'account-2',
    });
    mockNavigationState.current = routeBelow('accounts/[id]/index', { id: 'account-1' });
    const reload = deferred();
    mockEnsure.mockReturnValue(reload.promise);
    transactionStoreState.deleteTransaction = jest.fn().mockResolvedValue(undefined);
    const { result } = await renderOpenDialog();

    let confirmed: Promise<void> | undefined;
    await act(() => {
      confirmed = result.current.confirmDelete();
    });
    await waitFor(() => expect(mockEnsure).toHaveBeenCalledTimes(1));

    expect(mockEnsure).toHaveBeenCalledWith(expect.objectContaining({ accountId: 'account-1' }));
    expect(mockToast.show).not.toHaveBeenCalled();

    await act(async () => {
      reload.resolve();
      await confirmed;
    });

    backThenToastOnce();
  });

  it.each([
    ['the list', LIST_BELOW],
    ['a commitment', routeBelow('stacked/commitments/[id]/index', { id: 'commitment-1' })],
  ])('with %s under it, reloads no activity and toasts after the back', async (_label, state) => {
    mockNavigationState.current = state;
    transactionStoreState.deleteTransaction = jest.fn().mockResolvedValue(undefined);
    const { result } = await renderOpenDialog();

    await act(async () => result.current.confirmDelete());

    expect(mockEnsure).not.toHaveBeenCalled();
    backThenToastOnce();
  });

  it('a copy unmounted during the delete does not back, and the toast still shows once', async () => {
    const deletion = deferred();
    transactionStoreState.deleteTransaction = jest.fn(() => deletion.promise);
    const { result, unmount } = await renderOpenDialog();
    let confirmed: Promise<void> | undefined;
    await act(() => {
      confirmed = result.current.confirmDelete();
    });

    await unmount();
    await act(async () => {
      deletion.resolve();
      await confirmed;
    });

    expect(router.back).not.toHaveBeenCalled();
    expect(mockToast.show).toHaveBeenCalledTimes(1);
    expect(mockToast.show).toHaveBeenCalledWith(DELETED_TOAST);
  });

  it('keeps the dialog open and busy when it is closed during the delete', async () => {
    const deletion = deferred();
    transactionStoreState.deleteTransaction = jest.fn(() => deletion.promise);
    const { result } = await renderOpenDialog();
    let confirmed: Promise<void> | undefined;
    await act(() => {
      confirmed = result.current.confirmDelete();
    });

    await act(async () => result.current.closeDeleteConfirm());

    expect(result.current.state.confirmVisible).toBe(true);
    expect(result.current.state.deleteBusy).toBe(true);

    await act(async () => {
      deletion.resolve();
      await confirmed;
    });
  });

  it('a back that throws once still ends in one toast, with the write standing', async () => {
    jest.mocked(router.back).mockImplementationOnce(() => {
      throw new Error('navigation gone');
    });
    transactionStoreState.deleteTransaction = jest.fn().mockResolvedValue(undefined);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = await renderOpenDialog();

    await act(async () => result.current.confirmDelete());

    expect(mockToast.show).toHaveBeenCalledTimes(1);
    expect(mockToast.show).toHaveBeenCalledWith(DELETED_TOAST);
    expect(result.current.state.confirmVisible).toBe(false);
    expect(result.current.state.deleteErrorMessage).toBeUndefined();
    expect(Alert.alert).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
