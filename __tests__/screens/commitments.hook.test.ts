import { act, renderHook } from '@testing-library/react-native';

import {
  AccountType,
  AmountType,
  BudgetGroup,
  CategoryType,
  CommitmentPaymentStatus,
  Currency,
  DurationType,
  RecurrencePeriod,
} from '@/constants/enums';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import type { Category } from '@/modules/categories/entities/category.entity';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import { useCommitments } from '@/modules/commitments/screens/commitments/commitments.hook';
import type { CommitmentStatusFilter } from '@/modules/commitments/screens/commitments/commitments.state';
import { useCommitmentsScreenState } from '@/modules/commitments/screens/commitments/commitments.state';
import { EMPTY_COMMITMENT_FILTERS } from '@/modules/commitments/screens/commitments/filter/filter.store';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

const mockUseDeferredValue = jest.fn((value: unknown) => value);

jest.mock('react', () => {
  const actual = jest.requireActual<typeof import('react')>('react');
  return {
    ...actual,
    useDeferredValue: (value: unknown) => mockUseDeferredValue(value),
  };
});
jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
let capturedFocusCallback: (() => void | (() => void)) | null = null;
const mockInteractionTasks: Array<{ callback: () => void; cancel: jest.Mock }> = [];

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (cb: () => void | (() => void)) => {
    capturedFocusCallback = cb;
  },
}));
jest.mock('@/utils/run_after_interactions', () => ({
  runAfterInteractions: jest.fn((callback: () => void, _options?: { onError?: unknown }) => {
    let cancelled = false;
    const cancel = jest.fn(() => {
      cancelled = true;
    });
    const task = {
      callback: () => {
        if (!cancelled) callback();
      },
      cancel,
    };
    mockInteractionTasks.push(task);
    return { cancel: task.cancel };
  }),
}));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/commitments/screens/commitments/commitments.state', () => ({
  useCommitmentsScreenState: jest.fn(),
}));

const loadMonthSnapshotMock = jest.fn().mockResolvedValue(undefined);
const setSelectedMonthMock = jest.fn().mockResolvedValue(undefined);
const setRefreshingMock = jest.fn();
const setStatusFilterMock = jest.fn();
const setSearchQueryMock = jest.fn();
const clearSearchMock = jest.fn();
const setAppliedFiltersMock = jest.fn();
const { runAfterInteractions } = jest.requireMock('@/utils/run_after_interactions');

function makePayment(id: string, status: CommitmentPaymentStatus): CommitmentPayment {
  return {
    id,
    commitment_id: `commitment-${id}`,
    due_date: '2026-05-01',
    paid_date: null,
    skipped_date: null,
    amount_due: 100,
    amount_paid: null,
    currency: Currency.EGP,
    exchange_rate_snapshot: null,
    account_id: null,
    transaction_id: null,
    status,
    notes: null,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
  };
}

function makeCommitment(id: string, overrides: Partial<Commitment> = {}): Commitment {
  return {
    id,
    name: id,
    amount_type: AmountType.Fixed,
    amount: 100,
    currency: Currency.EGP,
    category_id: 'cat-bills',
    recurrence_every: 1,
    recurrence_period: RecurrencePeriod.Months,
    start_date: '2026-05-01',
    account_id: 'account-wallet',
    notes: null,
    duration_type: DurationType.Forever,
    end_date: null,
    end_after_count: null,
    is_active: 1,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeAccount(id: string, name: string): Account {
  return {
    id,
    name,
    type: AccountType.Bank,
    currency: Currency.EGP,
    opening_balance: 0,
    current_balance: 0,
    color: null,
    credit_limit: null,
    revolving_balance: null,
    minimum_payment: null,
    statement_due_day: null,
    interest_tracking: 0,
    apr: null,
    balance_review_required: 0,
    is_archived: 0,
    sort_order: 0,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
  };
}

function makeCategory(id: string, name: string): Category {
  return {
    id,
    name,
    type: CategoryType.Expense,
    icon: 'tag',
    color: '#ffffff',
    is_default: 0,
    sort_order: 0,
    budget_group: BudgetGroup.Need,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
  };
}

function setup({
  selectedMonth = '2026-05',
  commitments = [],
  payments = [],
  statusFilter = 'all',
  searchQuery = '',
  accounts = [],
  categories = [],
  appliedFilters = EMPTY_COMMITMENT_FILTERS,
  loadedMonth = selectedMonth,
  commitmentsLoaded = true,
  paymentsLoaded = true,
  loading = false,
  loadError = false,
}: {
  selectedMonth?: string;
  commitments?: Commitment[];
  payments?: CommitmentPayment[];
  statusFilter?: CommitmentStatusFilter;
  searchQuery?: string;
  accounts?: Account[];
  categories?: Category[];
  appliedFilters?: typeof EMPTY_COMMITMENT_FILTERS;
  loadedMonth?: string;
  commitmentsLoaded?: boolean;
  paymentsLoaded?: boolean;
  loading?: boolean;
  loadError?: boolean;
} = {}) {
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    commitments,
    payments,
    selectedMonth,
    commitmentsLoaded,
    paymentsLoaded,
    loadedMonth,
    loading,
    loadError,
    setSelectedMonth: setSelectedMonthMock,
    loadMonthSnapshot: loadMonthSnapshotMock,
    skipPayment: jest.fn(),
    deactivateCommitment: jest.fn(),
  }));
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts,
  }));
  attachMockSelectorStore(useCategoryStore as unknown as jest.Mock, () => ({
    categories,
  }));
  attachMockSelectorStore(useCommitmentsScreenState as unknown as jest.Mock, () => ({
    refreshing: false,
    statusFilter,
    searchQuery,
    appliedFilters,
    setRefreshing: setRefreshingMock,
    setStatusFilter: setStatusFilterMock,
    setSearchQuery: setSearchQueryMock,
    clearSearch: clearSearchMock,
    setAppliedFilters: setAppliedFiltersMock,
  }));
}

describe('useCommitments', () => {
  beforeEach(() => {
    capturedFocusCallback = null;
    mockInteractionTasks.length = 0;
    loadMonthSnapshotMock.mockReset().mockResolvedValue(undefined);
    setSelectedMonthMock.mockReset().mockResolvedValue(undefined);
    setRefreshingMock.mockClear();
    setStatusFilterMock.mockClear();
    setSearchQueryMock.mockClear();
    clearSearchMock.mockClear();
    setAppliedFiltersMock.mockClear();
    mockUseDeferredValue.mockReset().mockImplementation((value: unknown) => value);
    runAfterInteractions.mockClear();
    setup();
  });

  it('renders without throwing', async () => {
    await expect(renderHook(() => useCommitments())).resolves.toBeDefined();
  });

  it('isEmpty is true when no payments', async () => {
    const { result } = await renderHook(() => useCommitments());
    expect(result.current.state.isEmpty).toBe(true);
  });

  it('cancels pending focus reload work on cleanup', async () => {
    await renderHook(() => useCommitments());

    let cleanup: void | (() => void);
    await act(() => {
      cleanup = capturedFocusCallback?.();
    });

    expect(runAfterInteractions).toHaveBeenCalledTimes(1);
    expect(loadMonthSnapshotMock).not.toHaveBeenCalled();

    await act(() => {
      cleanup?.();
      mockInteractionTasks[0]?.callback();
    });

    expect(mockInteractionTasks[0]?.cancel).toHaveBeenCalledTimes(1);
    expect(loadMonthSnapshotMock).not.toHaveBeenCalled();
  });

  it('focus delegates all housekeeping and snapshot ownership to one selected-month load', async () => {
    await renderHook(() => useCommitments());

    await act(() => {
      capturedFocusCallback?.();
    });
    await act(async () => {
      mockInteractionTasks[0]?.callback();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(runAfterInteractions).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ onError: expect.any(Function) }),
    );
    expect(loadMonthSnapshotMock).toHaveBeenCalledTimes(1);
    expect(loadMonthSnapshotMock).toHaveBeenCalledWith('2026-05');
  });

  it('pull-to-refresh reloads immediately without waiting for interactions', async () => {
    const { result } = await renderHook(() => useCommitments());
    runAfterInteractions.mockClear();

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(runAfterInteractions).not.toHaveBeenCalled();
    expect(setRefreshingMock).toHaveBeenNthCalledWith(1, true);
    expect(loadMonthSnapshotMock).toHaveBeenCalledWith('2026-05');
    expect(setRefreshingMock).toHaveBeenLastCalledWith(false);
  });

  it('contains selected-month load rejection at the navigation event boundary', async () => {
    setSelectedMonthMock.mockRejectedValueOnce(new Error('month load failed'));
    const { result } = await renderHook(() => useCommitments());

    await expect(result.current.navigateMonth('next')).resolves.toBeUndefined();

    expect(setSelectedMonthMock).toHaveBeenCalledWith('2026-06');
  });

  it('contains refresh rejection after the store records its load error', async () => {
    loadMonthSnapshotMock.mockRejectedValueOnce(new Error('refresh failed'));
    const { result } = await renderHook(() => useCommitments());

    await expect(result.current.onRefresh()).resolves.toBeUndefined();

    expect(setRefreshingMock).toHaveBeenNthCalledWith(1, true);
    expect(setRefreshingMock).toHaveBeenLastCalledWith(false);
  });

  it('does not derive rows or summary from a stale month snapshot', async () => {
    setup({
      selectedMonth: '2026-05',
      loadedMonth: '2026-04',
      commitments: [makeCommitment('commitment-payment')],
      payments: [makePayment('payment', CommitmentPaymentStatus.Due)],
    });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.hasLoaded).toBe(false);
    expect(result.current.state.presentation).toBe('coldLoading');
    expect(result.current.state.sections).toEqual([]);
    expect(result.current.state.counts.total).toBe(0);
    expect(result.current.state.totalsByCurrency.size).toBe(0);
    expect(result.current.state.hasCommitments).toBe(false);
  });

  it.each([
    { commitmentsLoaded: false, paymentsLoaded: true },
    { commitmentsLoaded: true, paymentsLoaded: false },
  ])(
    'requires both commitment and payment data before publishing a matching snapshot',
    async ({ commitmentsLoaded, paymentsLoaded }) => {
      setup({ commitmentsLoaded, paymentsLoaded });

      const { result } = await renderHook(() => useCommitments());

      expect(result.current.state.hasLoaded).toBe(false);
      expect(result.current.state.presentation).toBe('coldLoading');
    },
  );

  it('publishes a cold error without exposing stale month data', async () => {
    setup({
      selectedMonth: '2026-05',
      loadedMonth: '2026-04',
      commitments: [makeCommitment('commitment-payment')],
      payments: [makePayment('payment', CommitmentPaymentStatus.Due)],
      loadError: true,
    });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.presentation).toBe('coldError');
    expect(result.current.state.sections).toEqual([]);
  });

  it('keeps matching rows visible when a warm refresh fails', async () => {
    setup({
      commitments: [makeCommitment('commitment-payment')],
      payments: [makePayment('payment', CommitmentPaymentStatus.Due)],
      loadError: true,
    });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.hasLoaded).toBe(true);
    expect(result.current.state.presentation).toBe('contentWithError');
    expect(result.current.state.sections[0]?.data[0]?.id).toBe('payment');
    expect(result.current.state.counts.total).toBe(1);
  });

  it('keeps a selected-month payment visible after its parent deactivates', async () => {
    const inactiveParent = makeCommitment('commitment-payment', { is_active: 0 });
    const paidPayment = makePayment('payment', CommitmentPaymentStatus.Paid);
    setup({
      commitments: [inactiveParent],
      payments: [paidPayment],
    });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.hasCommitments).toBe(true);
    expect(result.current.state.commitmentsById.get(inactiveParent.id)).toBe(inactiveParent);
    expect(result.current.state.sections[0]?.data).toEqual([paidPayment]);
  });

  it('selectMonth delegates to the commitment store selected month', async () => {
    const { result } = await renderHook(() => useCommitments());

    await act(async () => result.current.selectMonth('2026-08'));

    expect(setSelectedMonthMock).toHaveBeenCalledWith('2026-08');
  });

  it('keeps selected status immediate while deferring section regrouping', async () => {
    mockUseDeferredValue.mockImplementation((value) =>
      value === CommitmentPaymentStatus.Paid ? 'all' : value,
    );
    setup({
      statusFilter: CommitmentPaymentStatus.Paid,
      payments: [
        makePayment('overdue-payment', CommitmentPaymentStatus.Overdue),
        makePayment('paid-payment', CommitmentPaymentStatus.Paid),
      ],
    });

    const { result } = await renderHook(() => useCommitments());

    expect(mockUseDeferredValue).toHaveBeenCalledWith(CommitmentPaymentStatus.Paid);
    expect(result.current.state.statusFilter).toBe(CommitmentPaymentStatus.Paid);
    expect(
      result.current.state.sections.flatMap((section) => section.data.map((p) => p.id)),
    ).toEqual(['overdue-payment', 'paid-payment']);
  });

  it('combines status, search, and advanced filters before grouping sections', async () => {
    const payments = [
      makePayment('internet', CommitmentPaymentStatus.Due),
      makePayment('gym', CommitmentPaymentStatus.Due),
      makePayment('paid-internet', CommitmentPaymentStatus.Paid),
    ];
    const commitments = [
      makeCommitment('commitment-internet', {
        name: 'Home internet',
        category_id: 'cat-bills',
        account_id: 'account-wallet',
      }),
      makeCommitment('commitment-gym', {
        name: 'Gym',
        category_id: 'cat-fitness',
        account_id: 'account-wallet',
      }),
      makeCommitment('commitment-paid-internet', {
        name: 'Home internet paid',
        category_id: 'cat-bills',
        account_id: 'account-wallet',
      }),
    ];
    setup({
      commitments,
      payments,
      statusFilter: CommitmentPaymentStatus.Due,
      searchQuery: 'internet',
      accounts: [makeAccount('account-wallet', 'Wallet')],
      categories: [makeCategory('cat-bills', 'Bills'), makeCategory('cat-fitness', 'Fitness')],
      appliedFilters: {
        ...EMPTY_COMMITMENT_FILTERS,
        categoryIds: ['cat-bills'],
        amountTypes: [AmountType.Fixed],
      },
    });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.activeFilterCount).toBe(2);
    expect(result.current.state.hasListFilters).toBe(true);
    expect(
      result.current.state.sections.flatMap((section) => section.data.map((p) => p.id)),
    ).toEqual(['internet']);
  });

  it('navigateMonth moves January to previous December', async () => {
    setup({ selectedMonth: '2026-01' });
    const { result } = await renderHook(() => useCommitments());

    await act(async () => result.current.navigateMonth('prev'));

    expect(setSelectedMonthMock).toHaveBeenCalledWith('2025-12');
  });

  it('navigateMonth moves December to next January', async () => {
    setup({ selectedMonth: '2026-12' });
    const { result } = await renderHook(() => useCommitments());

    await act(async () => result.current.navigateMonth('next'));

    expect(setSelectedMonthMock).toHaveBeenCalledWith('2027-01');
  });
});
