import { act, renderHook } from '@testing-library/react-native';

import {
  AccountType,
  AmountType,
  BudgetGroup,
  CategoryType,
  CommitmentPaymentStatus,
  Currency,
} from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import type { Category } from '@/modules/categories/entities/category.entity';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { CommitmentMonthAggregate } from '@/modules/commitments/domain/commitment_month_totals';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type {
  CommitmentMonthPayment,
  CommitmentPayment,
} from '@/modules/commitments/entities/commitment_payment.entity';
import { useCommitments } from '@/modules/commitments/screens/commitments/commitments.hook';
import type { CommitmentStatusFilter } from '@/modules/commitments/screens/commitments/commitments.state';
import { useCommitmentsScreenState } from '@/modules/commitments/screens/commitments/commitments.state';
import { useCommitmentFilterState } from '@/modules/commitments/screens/commitments/filter/filter.state';
import {
  EMPTY_COMMITMENT_FILTERS,
  useCommitmentFilterStore,
} from '@/modules/commitments/screens/commitments/filter/filter.store';
import {
  monthAggregateKey,
  useCommitmentStore,
} from '@/modules/commitments/store/commitment.store';
import { useCommitmentFormHostState } from '@/modules/commitments/store/commitment_form_host.state';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import {
  makeTestCommitment,
  makeTestHeldBucket,
  makeTestMonthAggregate,
  makeTestMonthPayment,
} from '@/test_helpers/commitment';
import { deferred } from '@/test_helpers/deferred';
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
const capturedFocusCallbacks: Array<() => void | (() => void)> = [];
const mockInteractionTasks: Array<{ callback: () => void; cancel: jest.Mock }> = [];

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (cb: () => void | (() => void)) => {
    capturedFocusCallbacks.push(cb);
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
  monthAggregateKey: jest.requireActual<
    typeof import('@/modules/commitments/store/commitment.store')
  >('@/modules/commitments/store/commitment.store').monthAggregateKey,
}));
jest.mock('@/modules/currency/store/currency.store', () => ({ useCurrencyStore: jest.fn() }));
jest.mock('@/modules/accounts/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/commitments/screens/commitments/commitments.state', () => ({
  useCommitmentsScreenState: jest.fn(),
}));

const loadMonthSnapshotMock = jest.fn().mockResolvedValue(undefined);
const loadMonthAggregateMock = jest.fn().mockResolvedValue(undefined);
const loadAccountLookupMock = jest.fn<Promise<void>, [string[]]>().mockResolvedValue(undefined);
let currencyRate = 50;
let currencyRateLoaded = true;
const setSelectedMonthMock = jest.fn().mockResolvedValue(undefined);
const setRefreshingMock = jest.fn();
const setStatusFilterMock = jest.fn();
const setSearchQueryMock = jest.fn();
const clearSearchMock = jest.fn();
const setAppliedFiltersMock = jest.fn();
const { runAfterInteractions } = jest.requireMock('@/utils/run_after_interactions');
const { router: mockRouter } = jest.requireMock<{ router: { push: jest.Mock } }>('expo-router');

const TODAY = '2026-05-08';

// Each render registers the rows load first, then the aggregate load.
function rowsFocusCallback() {
  return capturedFocusCallbacks.at(-2);
}

function aggregateFocusCallback() {
  return capturedFocusCallbacks.at(-1);
}

function runAggregateFocusLoad() {
  aggregateFocusCallback()?.();
  mockInteractionTasks.at(-1)?.callback();
}

// Committed is the due row's 10 USD alone: 500 at rate 50, 480 at rate 48.
function usdDueAggregate(): CommitmentMonthAggregate {
  return makeTestMonthAggregate({ due: makeTestHeldBucket({ usd: 10, count: 1 }) });
}

type PaymentDates = Pick<CommitmentPayment, 'due_date' | 'paid_date' | 'skipped_date'>;

const DATES_BY_STATE: Record<CommitmentPaymentStatus, PaymentDates> = {
  [CommitmentPaymentStatus.Overdue]: {
    due_date: '2026-05-01',
    paid_date: null,
    skipped_date: null,
  },
  [CommitmentPaymentStatus.Due]: { due_date: TODAY, paid_date: null, skipped_date: null },
  [CommitmentPaymentStatus.Upcoming]: {
    due_date: '2026-05-20',
    paid_date: null,
    skipped_date: null,
  },
  [CommitmentPaymentStatus.Paid]: {
    due_date: '2026-05-01',
    paid_date: '2026-05-02',
    skipped_date: null,
  },
  [CommitmentPaymentStatus.Skipped]: {
    due_date: '2026-05-01',
    paid_date: null,
    skipped_date: '2026-05-02',
  },
};

function makePayment(
  id: string,
  state: CommitmentPaymentStatus,
  overrides: Partial<CommitmentMonthPayment> = {},
): CommitmentMonthPayment {
  return makeTestMonthPayment({
    id,
    commitment_id: `commitment-${id}`,
    ...DATES_BY_STATE[state],
    amount_due: 100,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    ...overrides,
  });
}

function dueCommitment(): Commitment {
  return makeCommitment('commitment-payment');
}

function duePayment(): CommitmentMonthPayment {
  return makePayment('payment', CommitmentPaymentStatus.Due);
}

function sectionIds(sections: { label: string; data: CommitmentMonthPayment[] }[]) {
  return sections.map((section) => [section.label, section.data.map((payment) => payment.id)]);
}

function makeCommitment(id: string, overrides: Partial<Commitment> = {}): Commitment {
  return makeTestCommitment({
    id,
    name: id,
    amount: 100,
    category_id: 'cat-bills',
    start_date: '2026-05-01',
    account_id: 'account-wallet',
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    ...overrides,
  });
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
    is_deleted: 0,
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
  archivedAccounts = [],
  accountLookupById = {},
  accountLookupError = false,
  accountsLoaded = false,
  categories = [],
  appliedFilters = EMPTY_COMMITMENT_FILTERS,
  loadedMonth = selectedMonth,
  commitmentsLoaded = true,
  paymentsLoaded = true,
  loading = false,
  loadError = false,
  withoutToday = false,
  monthAggregate = undefined,
  monthAggregateErrorKey = undefined,
}: {
  selectedMonth?: string;
  commitments?: Commitment[];
  payments?: CommitmentMonthPayment[];
  statusFilter?: CommitmentStatusFilter;
  searchQuery?: string;
  accounts?: Account[];
  archivedAccounts?: Account[];
  accountLookupById?: Record<string, Account>;
  accountLookupError?: boolean;
  accountsLoaded?: boolean;
  categories?: Category[];
  appliedFilters?: typeof EMPTY_COMMITMENT_FILTERS;
  loadedMonth?: string;
  commitmentsLoaded?: boolean;
  paymentsLoaded?: boolean;
  loading?: boolean;
  loadError?: boolean;
  withoutToday?: boolean;
  monthAggregate?: { key: string; aggregate: CommitmentMonthAggregate };
  monthAggregateErrorKey?: string;
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
    today: withoutToday ? undefined : TODAY,
    setSelectedMonth: setSelectedMonthMock,
    loadMonthSnapshot: loadMonthSnapshotMock,
    monthAggregate,
    monthAggregateErrorKey,
    loadMonthAggregate: loadMonthAggregateMock,
    skipPayment: jest.fn(),
    deactivateCommitment: jest.fn(),
  }));
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts,
    archivedAccounts,
    accountLookupById,
    accountLookupError,
    hasLoaded: accountsLoaded,
    loadAccountLookup: loadAccountLookupMock,
  }));
  attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
    rate: currencyRate,
    hasLoaded: currencyRateLoaded,
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

type EmptyVariant = ReturnType<typeof useCommitments>['state']['emptyVariant'];

const REFRESH_FAILURE = {
  commitments: [dueCommitment()],
  payments: [duePayment()],
  loadError: true,
};
const FIRST_LOAD_FAILURE = { loadedMonth: '2026-04', loadError: true };

describe('useCommitments', () => {
  beforeEach(() => {
    capturedFocusCallbacks.length = 0;
    mockInteractionTasks.length = 0;
    loadMonthSnapshotMock.mockReset().mockResolvedValue(undefined);
    loadMonthAggregateMock.mockReset().mockResolvedValue(undefined);
    loadAccountLookupMock.mockReset().mockResolvedValue(undefined);
    currencyRate = 50;
    currencyRateLoaded = true;
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

  it('opens the add sheet from goToAdd without a push', async () => {
    useCommitmentFormHostState.getState().reset();
    mockRouter.push.mockClear();
    const { result } = await renderHook(() => useCommitments());

    await act(() => result.current.goToAdd());

    expect(useCommitmentFormHostState.getState().phase).toBe('open');
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('opens the detail at the commitment id with the tapped payment as its cycle', async () => {
    mockRouter.push.mockClear();
    const { result } = await renderHook(() => useCommitments());

    await act(() => result.current.goToDetail('commitment-1', 'pay-1'));

    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith('/commitments/commitment-1?cycle=pay-1');
  });

  it('opens the edit sheet for the commitment from goToEdit, with no landing and no push', async () => {
    useCommitmentFormHostState.getState().reset();
    mockRouter.push.mockClear();
    const { result } = await renderHook(() => useCommitments());

    await act(() => result.current.goToEdit('c-1'));

    expect(useCommitmentFormHostState.getState()).toMatchObject({
      phase: 'open',
      sessionId: 1,
      mode: 'edit',
      editingCommitmentId: 'c-1',
    });
    expect(useCommitmentFormHostState.getState().landing).toBeUndefined();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('opens nothing from goToEdit with no commitment id, so the next Edit opens session 1', async () => {
    useCommitmentFormHostState.getState().reset();
    mockRouter.push.mockClear();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = await renderHook(() => useCommitments());

    await act(() => result.current.goToEdit(undefined));

    expect(useCommitmentFormHostState.getState().phase).toBe('closed');
    expect(mockRouter.push).not.toHaveBeenCalled();

    await act(() => result.current.goToEdit('c-1'));

    expect(useCommitmentFormHostState.getState()).toMatchObject({
      phase: 'open',
      sessionId: 1,
      editingCommitmentId: 'c-1',
    });
    warn.mockRestore();
  });

  it('isEmpty is true when no payments', async () => {
    const { result } = await renderHook(() => useCommitments());
    expect(result.current.state.isEmpty).toBe(true);
  });

  it('cancels pending focus reload work on cleanup', async () => {
    await renderHook(() => useCommitments());

    let cleanup: void | (() => void);
    await act(() => {
      cleanup = rowsFocusCallback()?.();
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
      rowsFocusCallback()?.();
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
    expect(result.current.state.emptyVariant).toBe('none');
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
  });

  it('keeps a selected-month payment visible after its parent deactivates', async () => {
    const inactiveParent = makeCommitment('commitment-payment', { is_active: 0 });
    const paidPayment = makePayment('payment', CommitmentPaymentStatus.Paid);
    setup({
      commitments: [inactiveParent],
      payments: [paidPayment],
    });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.emptyVariant).toBe('none');
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
    expect(
      result.current.state.sections.flatMap((section) => section.data.map((p) => p.id)),
    ).toEqual(['internet']);
  });

  it('searches the stored account name, so "Unnamed" matches no blank-named account', async () => {
    setup({
      commitments: [makeCommitment('commitment-blank', { account_id: 'account-wallet' })],
      payments: [makePayment('blank', CommitmentPaymentStatus.Due)],
      accounts: [makeAccount('account-wallet', 'Wallet')],
      searchQuery: 'wallet',
    });
    const { result: named } = await renderHook(() => useCommitments());
    expect(
      named.current.state.sections.flatMap((section) => section.data.map((p) => p.id)),
    ).toEqual(['blank']);

    setup({
      commitments: [makeCommitment('commitment-blank', { account_id: 'account-blank' })],
      payments: [makePayment('blank', CommitmentPaymentStatus.Due)],
      accounts: [makeAccount('account-blank', '')],
      searchQuery: 'Unnamed',
    });
    const { result: blank } = await renderHook(() => useCommitments());
    expect(
      blank.current.state.sections.flatMap((section) => section.data.map((p) => p.id)),
    ).toEqual([]);
  });

  it('keeps the account filter reaching a blank-named account', async () => {
    setup({
      commitments: [makeCommitment('commitment-blank', { account_id: 'account-blank' })],
      payments: [makePayment('blank', CommitmentPaymentStatus.Due)],
      accounts: [makeAccount('account-blank', '')],
      appliedFilters: { ...EMPTY_COMMITMENT_FILTERS, accountIds: ['account-blank'] },
    });

    const { result } = await renderHook(() => useCommitments());

    expect(
      result.current.state.sections.flatMap((section) => section.data.map((p) => p.id)),
    ).toEqual(['blank']);
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

  it('names the selected month in full for the empty month state', async () => {
    setup({ selectedMonth: '2026-12' });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.emptyMonthName).toBe('December');
  });

  it('sorts each row into its section and counter by its dates against today', async () => {
    setup({
      payments: [
        makePayment('upcoming', CommitmentPaymentStatus.Upcoming),
        makePayment('paid', CommitmentPaymentStatus.Paid),
        makePayment('skipped', CommitmentPaymentStatus.Skipped),
        makePayment('due', CommitmentPaymentStatus.Due),
        makePayment('overdue', CommitmentPaymentStatus.Overdue),
      ],
    });

    const { result } = await renderHook(() => useCommitments());

    expect(sectionIds(result.current.state.sections)).toEqual([
      [Strings.commitmentsOverdue, ['overdue']],
      ['Due today', ['due']],
      [Strings.commitmentsUpcoming, ['upcoming']],
      [Strings.commitmentsPaid, ['paid']],
      [Strings.commitmentsSkipped, ['skipped']],
    ]);
  });

  it('puts a row carried from the month before first in Overdue', async () => {
    setup({
      payments: [
        makePayment('carried', CommitmentPaymentStatus.Overdue, {
          due_date: '2026-04-20',
          amount_due: 300,
        }),
        makePayment('overdue', CommitmentPaymentStatus.Overdue),
        makePayment('due', CommitmentPaymentStatus.Due),
      ],
    });

    const { result } = await renderHook(() => useCommitments());

    expect(sectionIds(result.current.state.sections)[0]).toEqual([
      Strings.commitmentsOverdue,
      ['carried', 'overdue'],
    ]);
  });

  it('leaves a carried row paid or skipped since out of every section', async () => {
    setup({
      payments: [
        makePayment('carried-paid', CommitmentPaymentStatus.Paid, { due_date: '2026-04-20' }),
        makePayment('carried-skipped', CommitmentPaymentStatus.Skipped, {
          due_date: '2026-04-21',
        }),
        makePayment('may', CommitmentPaymentStatus.Upcoming),
      ],
    });

    const { result } = await renderHook(() => useCommitments());

    expect(sectionIds(result.current.state.sections)).toEqual([
      [Strings.commitmentsUpcoming, ['may']],
    ]);
  });

  it('publishes each section’s figures and spoken label, and the tally, under a search', async () => {
    setup({
      searchQuery: 'internet',
      commitments: [
        makeCommitment('commitment-home', { name: 'Home internet' }),
        makeCommitment('commitment-mobile', {
          name: 'Mobile internet',
          currency: Currency.USD,
          amount: 10,
        }),
        makeCommitment('commitment-gym', { name: 'Gym' }),
      ],
      payments: [
        makePayment('home', CommitmentPaymentStatus.Overdue, { amount_due: 300 }),
        makePayment('mobile', CommitmentPaymentStatus.Upcoming, {
          currency: Currency.USD,
          amount_due: 10,
        }),
        makePayment('gym', CommitmentPaymentStatus.Upcoming, { amount_due: 700 }),
      ],
    });

    const { result } = await renderHook(() => useCommitments());

    expect(
      result.current.state.sections.map(({ label, figures, accessibilityLabel }) => ({
        label,
        figures,
        accessibilityLabel,
      })),
    ).toEqual([
      {
        label: Strings.commitmentsOverdue,
        figures: { mode: 'figures', net: '300 EGP', count: '1' },
        accessibilityLabel: 'Overdue, 300 EGP, 1 payment',
      },
      {
        label: Strings.commitmentsUpcoming,
        figures: { mode: 'figures', net: '500 EGP', count: '1' },
        accessibilityLabel: 'Upcoming, 500 EGP, 1 payment',
      },
    ]);
    expect(result.current.state.tally).toEqual({
      mode: 'skeleton',
      count: undefined,
      label: '',
      filterSummary: undefined,
      sum: undefined,
      accessibilityLabel: undefined,
    });
  });

  it('publishes the tally of the matched rows once the hero holds its figures', async () => {
    setup({
      searchQuery: 'internet',
      commitments: [
        makeCommitment('commitment-home', { name: 'Home internet' }),
        makeCommitment('commitment-mobile', {
          name: 'Mobile internet',
          currency: Currency.USD,
          amount: 10,
        }),
        makeCommitment('commitment-gym', { name: 'Gym' }),
      ],
      payments: [
        makePayment('home', CommitmentPaymentStatus.Overdue, { amount_due: 300 }),
        makePayment('mobile', CommitmentPaymentStatus.Upcoming, {
          currency: Currency.USD,
          amount_due: 10,
        }),
        makePayment('gym', CommitmentPaymentStatus.Upcoming, { amount_due: 700 }),
      ],
      monthAggregate: {
        key: monthAggregateKey('2026-05', undefined),
        aggregate: usdDueAggregate(),
      },
    });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.tally).toEqual({
      mode: 'figures',
      count: '2',
      label: 'payments',
      filterSummary: undefined,
      sum: { text: '800', polarity: 'neutral', currencyCode: 'EGP' },
      accessibilityLabel: '2 payments 800 EGP',
    });
  });

  it('a section sum follows a change of the live rate', async () => {
    setup({
      commitments: [makeCommitment('commitment-mobile', { currency: Currency.USD, amount: 10 })],
      payments: [
        makePayment('mobile', CommitmentPaymentStatus.Upcoming, {
          currency: Currency.USD,
          amount_due: 10,
        }),
      ],
    });
    const hook = await renderHook(() => useCommitments());
    expect(hook.result.current.state.liveRate).toBe(50);
    expect(hook.result.current.state.sections[0]?.figures).toEqual({
      mode: 'figures',
      net: '500 EGP',
      count: '1',
    });

    currencyRate = 48;
    await hook.rerender({});

    expect(hook.result.current.state.liveRate).toBe(48);
    expect(hook.result.current.state.sections[0]?.figures).toEqual({
      mode: 'figures',
      net: '480 EGP',
      count: '1',
    });
  });

  it('holds a USD unpaid row’s section in its skeleton until the rate has loaded', async () => {
    currencyRateLoaded = false;
    setup({
      searchQuery: 'mobile',
      commitments: [makeCommitment('commitment-mobile', { currency: Currency.USD, amount: 10 })],
      payments: [
        makePayment('mobile', CommitmentPaymentStatus.Upcoming, {
          currency: Currency.USD,
          amount_due: 10,
        }),
      ],
      monthAggregate: {
        key: monthAggregateKey('2026-05', undefined),
        aggregate: usdDueAggregate(),
      },
    });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.liveRate).toBeUndefined();
    expect(result.current.state.sections[0]).toMatchObject({
      label: Strings.commitmentsUpcoming,
      figures: { mode: 'skeleton' },
      accessibilityLabel: 'Upcoming, loading',
    });
    expect(result.current.state.tally).toEqual({
      mode: 'skeleton',
      count: undefined,
      label: '',
      filterSummary: undefined,
      sum: undefined,
      accessibilityLabel: undefined,
    });
  });

  it('filters by the state the dates derive', async () => {
    setup({
      statusFilter: CommitmentPaymentStatus.Overdue,
      payments: [
        makePayment('aged', CommitmentPaymentStatus.Overdue),
        makePayment('due', CommitmentPaymentStatus.Due),
      ],
    });

    const { result } = await renderHook(() => useCommitments());

    expect(
      result.current.state.sections.flatMap((section) => section.data.map((p) => p.id)),
    ).toEqual(['aged']);
  });

  it('mirrors the store today and holds the snapshot until today is published', async () => {
    setup({ payments: [makePayment('due', CommitmentPaymentStatus.Due)] });
    const { result: withToday } = await renderHook(() => useCommitments());
    expect(withToday.current.state.today).toBe(TODAY);

    setup({ payments: [makePayment('due', CommitmentPaymentStatus.Due)], withoutToday: true });
    const { result: withoutToday } = await renderHook(() => useCommitments());

    expect(withoutToday.current.state.today).toBeUndefined();
    expect(withoutToday.current.state.hasLoaded).toBe(false);
    expect(withoutToday.current.state.sections).toEqual([]);
  });

  it('the aggregate focus callback loads the month on screen across every account', async () => {
    await renderHook(() => useCommitments());

    await act(() => {
      runAggregateFocusLoad();
    });

    expect(loadMonthAggregateMock).toHaveBeenCalledTimes(1);
    expect(loadMonthAggregateMock).toHaveBeenCalledWith('2026-05', undefined);
    expect(loadMonthSnapshotMock).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'one applied account', accountIds: ['a'], expected: 'a' },
    { name: 'two applied accounts', accountIds: ['a', 'b'], expected: undefined },
  ])('scopes the aggregate load to $name', async ({ accountIds, expected }) => {
    setup({ appliedFilters: { ...EMPTY_COMMITMENT_FILTERS, accountIds } });
    await renderHook(() => useCommitments());

    await act(() => {
      runAggregateFocusLoad();
    });

    expect(loadMonthAggregateMock).toHaveBeenCalledWith('2026-05', expected);
  });

  it('leaves the aggregate load across every account under a status filter and a search', async () => {
    setup({ statusFilter: CommitmentPaymentStatus.Paid, searchQuery: 'internet' });
    await renderHook(() => useCommitments());

    await act(() => {
      runAggregateFocusLoad();
    });

    expect(loadMonthAggregateMock).toHaveBeenCalledWith('2026-05', undefined);
  });

  it('keeps one applied account under a status filter, a search and a category', async () => {
    setup({
      statusFilter: CommitmentPaymentStatus.Paid,
      searchQuery: 'internet',
      appliedFilters: { ...EMPTY_COMMITMENT_FILTERS, accountIds: ['a'], categoryIds: ['c'] },
    });
    await renderHook(() => useCommitments());

    await act(() => {
      runAggregateFocusLoad();
    });

    expect(loadMonthAggregateMock).toHaveBeenCalledWith('2026-05', 'a');
  });

  it('defers the aggregate focus load until interactions finish and cancels it on cleanup', async () => {
    await renderHook(() => useCommitments());
    let cleanup: void | (() => void);

    await act(() => {
      cleanup = aggregateFocusCallback()?.();
    });

    expect(loadMonthAggregateMock).not.toHaveBeenCalled();
    const task = mockInteractionTasks.at(-1);

    await act(() => {
      cleanup?.();
      task?.callback();
    });

    expect(task?.cancel).toHaveBeenCalledTimes(1);
    expect(loadMonthAggregateMock).not.toHaveBeenCalled();
  });

  it('the latest aggregate callback follows a month change', async () => {
    const hook = await renderHook(() => useCommitments());
    setup({ selectedMonth: '2026-06' });
    await hook.rerender({});

    await act(() => {
      runAggregateFocusLoad();
    });

    expect(loadMonthAggregateMock).toHaveBeenCalledTimes(1);
    expect(loadMonthAggregateMock).toHaveBeenCalledWith('2026-06', undefined);
  });

  it('the latest aggregate callback follows an account-scope change', async () => {
    const hook = await renderHook(() => useCommitments());
    setup({ appliedFilters: { ...EMPTY_COMMITMENT_FILTERS, accountIds: ['a'] } });
    await hook.rerender({});

    await act(() => {
      runAggregateFocusLoad();
    });

    expect(loadMonthAggregateMock).toHaveBeenCalledTimes(1);
    expect(loadMonthAggregateMock).toHaveBeenCalledWith('2026-05', 'a');
  });

  it('pull-to-refresh reloads the aggregate beside the rows', async () => {
    const { result } = await renderHook(() => useCommitments());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(loadMonthAggregateMock).toHaveBeenCalledWith('2026-05', undefined);
    expect(loadMonthSnapshotMock).toHaveBeenCalledWith('2026-05');
  });

  it.each<[string, Parameters<typeof setup>[0], EmptyVariant]>([
    ['no commitment and no row of the month', {}, 'noCommitments'],
    ['a commitment with no row of the month', { commitments: [dueCommitment()] }, 'emptyMonth'],
    [
      'a search that matches none of the rows',
      { commitments: [dueCommitment()], payments: [duePayment()], searchQuery: 'no such name' },
      'noResults',
    ],
    [
      'a status tab that matches none of the rows',
      {
        commitments: [dueCommitment()],
        payments: [duePayment()],
        statusFilter: CommitmentPaymentStatus.Paid,
      },
      'noResults',
    ],
    ['rows that show', { commitments: [dueCommitment()], payments: [duePayment()] }, 'none'],
  ])('MA-214: reads the empty variant of %s', async (_label, input, emptyVariant) => {
    setup(input);

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.emptyVariant).toBe(emptyVariant);
  });

  it('MA-214: draws no empty state on the frame where the status tab lags behind All', async () => {
    mockUseDeferredValue.mockImplementation((value) =>
      value === 'all' ? CommitmentPaymentStatus.Paid : value,
    );
    setup({ commitments: [dueCommitment()], payments: [duePayment()] });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.sections).toEqual([]);
    expect(result.current.state.emptyVariant).toBe('none');
  });

  it('MA-214: keeps a loaded month on screen while it reloads', async () => {
    setup({ commitments: [dueCommitment()], payments: [duePayment()], loading: true });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.presentation).toBe('content');
    expect(result.current.state.sections[0]?.data[0]?.id).toBe('payment');
  });

  it('MA-214: retryLoad reads both once under the refresh flag on a refresh failure', async () => {
    setup(REFRESH_FAILURE);
    const { result } = await renderHook(() => useCommitments());
    expect(result.current.state.presentation).toBe('contentWithError');
    const snapshot = deferred();
    loadMonthSnapshotMock.mockReturnValueOnce(snapshot.promise);

    let retry: Promise<void> = Promise.resolve();
    await act(async () => {
      retry = result.current.retryLoad();
      await Promise.resolve();
    });

    expect(setRefreshingMock.mock.calls).toEqual([[true]]);

    await act(async () => {
      snapshot.resolve();
      await retry;
    });

    expect(setRefreshingMock.mock.calls).toEqual([[true], [false]]);
    expect(loadMonthSnapshotMock).toHaveBeenCalledTimes(1);
    expect(loadMonthSnapshotMock).toHaveBeenCalledWith('2026-05');
    expect(loadMonthAggregateMock).toHaveBeenCalledTimes(1);
    expect(loadMonthAggregateMock).toHaveBeenCalledWith('2026-05', undefined);
  });

  it('MA-214: retryLoad reads both once and leaves the refresh flag alone on a first-load failure', async () => {
    setup(FIRST_LOAD_FAILURE);
    const { result } = await renderHook(() => useCommitments());
    expect(result.current.state.presentation).toBe('coldError');

    await act(async () => {
      await result.current.retryLoad();
    });

    expect(setRefreshingMock).not.toHaveBeenCalled();
    expect(loadMonthSnapshotMock).toHaveBeenCalledTimes(1);
    expect(loadMonthSnapshotMock).toHaveBeenCalledWith('2026-05');
    expect(loadMonthAggregateMock).toHaveBeenCalledTimes(1);
    expect(loadMonthAggregateMock).toHaveBeenCalledWith('2026-05', undefined);
  });

  it.each([
    ['snapshot', loadMonthSnapshotMock],
    ['aggregate', loadMonthAggregateMock],
  ])(
    'MA-214: retryLoad resolves and lowers the flag on a rejected %s read',
    async (_read, read) => {
      read.mockRejectedValueOnce(new Error('read failed'));
      setup(REFRESH_FAILURE);
      const { result } = await renderHook(() => useCommitments());

      await expect(result.current.retryLoad()).resolves.toBeUndefined();

      expect(setRefreshingMock.mock.calls).toEqual([[true], [false]]);
    },
  );

  it('MA-214: retryLoad resolves on a rejected snapshot read after a first-load failure', async () => {
    loadMonthSnapshotMock.mockRejectedValueOnce(new Error('read failed'));
    setup(FIRST_LOAD_FAILURE);
    const { result } = await renderHook(() => useCommitments());

    await expect(result.current.retryLoad()).resolves.toBeUndefined();

    expect(setRefreshingMock).not.toHaveBeenCalled();
  });

  it('shows figures for a slot held on the key on screen once the rate has loaded', async () => {
    setup({
      monthAggregate: {
        key: monthAggregateKey('2026-05', undefined),
        aggregate: usdDueAggregate(),
      },
    });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.hero.mode).toBe('figures');
    expect(result.current.state.hero.committed.value).toBe('500');
  });

  it("holds the skeleton over another month's slot", async () => {
    setup({
      monthAggregate: {
        key: monthAggregateKey('2026-04', undefined),
        aggregate: usdDueAggregate(),
      },
    });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.hero.mode).toBe('skeleton');
    expect(result.current.state.hero.committed.value).toBe(Strings.listHeroUnavailable);
  });

  it('prints dashes for an error on the key on screen while the rows still publish', async () => {
    setup({
      payments: [makePayment('due', CommitmentPaymentStatus.Due)],
      monthAggregateErrorKey: monthAggregateKey('2026-05', undefined),
    });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.hero.mode).toBe('dashes');
    expect(result.current.state.hero.committed.value).toBe(Strings.listHeroUnavailable);
    expect(result.current.state.presentation).toBe('content');
    expect(result.current.state.loadError).toBe(false);
    expect(result.current.state.sections[0]?.data[0]?.id).toBe('due');
  });

  it('the held figures follow a change of the live rate', async () => {
    setup({
      monthAggregate: {
        key: monthAggregateKey('2026-05', undefined),
        aggregate: usdDueAggregate(),
      },
    });
    const hook = await renderHook(() => useCommitments());
    expect(hook.result.current.state.hero.committed.value).toBe('500');

    currencyRate = 48;
    await hook.rerender({});

    expect(hook.result.current.state.hero.committed.value).toBe('480');
  });
});

describe('useCommitments account read (MA-234)', () => {
  const wallet = makeAccount('account-wallet', 'Wallet');
  const archived: Account = { ...makeAccount('account-archived', 'Old Bank'), is_archived: 1 };
  const lookedUp: Account = { ...makeAccount('account-looked-up', 'Gone Bank'), is_deleted: 1 };

  function rows() {
    return {
      commitments: [
        makeCommitment('commitment-wallet'),
        makeCommitment('commitment-archived', { account_id: 'account-archived' }),
        makeCommitment('commitment-missing', { account_id: 'account-missing' }),
        makeCommitment('commitment-none', { account_id: null }),
      ],
      payments: [
        makePayment('wallet', CommitmentPaymentStatus.Due),
        makePayment('archived', CommitmentPaymentStatus.Due),
        makePayment('missing', CommitmentPaymentStatus.Upcoming),
        makePayment('none', CommitmentPaymentStatus.Due),
      ],
      accounts: [wallet],
      archivedAccounts: [archived],
    };
  }

  function rowIds(sections: { data: CommitmentMonthPayment[] }[]): string[] {
    return sections.flatMap((section) => section.data.map((payment) => payment.id));
  }

  beforeEach(() => {
    capturedFocusCallbacks.length = 0;
    mockInteractionTasks.length = 0;
    loadMonthSnapshotMock.mockReset().mockResolvedValue(undefined);
    loadMonthAggregateMock.mockReset().mockResolvedValue(undefined);
    loadAccountLookupMock.mockReset().mockResolvedValue(undefined);
    mockUseDeferredValue.mockReset().mockImplementation((value: unknown) => value);
  });

  it('holds archived and looked-up accounts beside the active ones', async () => {
    setup({ ...rows(), accountLookupById: { 'account-looked-up': lookedUp } });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.accountsById.get('account-wallet')).toBe(wallet);
    expect(result.current.state.accountsById.get('account-archived')).toBe(archived);
    expect(result.current.state.accountsById.get('account-looked-up')).toBe(lookedUp);
  });

  it('finds the rows on an archived account by its name', async () => {
    setup({ ...rows(), searchQuery: 'old bank' });

    const { result } = await renderHook(() => useCommitments());

    expect(rowIds(result.current.state.sections)).toEqual(['archived']);
  });

  it('reads the accounts its rows name once across two renders on the same payments', async () => {
    setup(rows());

    const hook = await renderHook(() => useCommitments());
    await hook.rerender({});

    expect(loadAccountLookupMock).toHaveBeenCalledTimes(1);
    const ids = loadAccountLookupMock.mock.calls[0][0];
    expect(ids).toEqual(expect.arrayContaining(['account-missing']));
    expect(ids.every((id) => typeof id === 'string')).toBe(true);
  });

  it('floats the account alert while a row names an account the failed read missed', async () => {
    setup({ ...rows(), accountLookupError: true });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.presentation).toBe('content');
    expect(result.current.state.floatingAlert).toBe('accounts');
  });

  it('floats the list alert in its place under a load error', async () => {
    setup({ ...rows(), accountLookupError: true, loadError: true });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.presentation).toBe('contentWithError');
    expect(result.current.state.floatingAlert).toBe('list');
  });

  it('drops the account alert once no row names a missing account', async () => {
    setup({ ...rows(), accountLookupError: true });
    const hook = await renderHook(() => useCommitments());
    expect(hook.result.current.state.floatingAlert).toBe('accounts');

    setup({
      ...rows(),
      accountLookupError: true,
      accountLookupById: { 'account-missing': makeAccount('account-missing', 'Found Bank') },
    });
    await hook.rerender({});

    expect(hook.result.current.state.floatingAlert).toBeUndefined();
  });

  it('reads the accounts again on Try again and keeps a second failure off the caller', async () => {
    setup({ ...rows(), accountLookupError: true });
    const { result } = await renderHook(() => useCommitments());
    loadAccountLookupMock.mockReset().mockRejectedValueOnce(new Error('read failed'));

    await act(() => result.current.retryAccountLookup());

    expect(loadAccountLookupMock).toHaveBeenCalledTimes(1);
    expect(loadAccountLookupMock.mock.calls[0][0]).toEqual(
      expect.arrayContaining(['account-missing']),
    );
  });
});

describe('useCommitments hero title (MA-258)', () => {
  const wallet = makeAccount('account-wallet', 'Wallet');
  const gone: Account = { ...makeAccount('account-gone', 'Gone Bank'), is_deleted: 1 };
  const accounts = [wallet];
  const archivedAccounts: Account[] = [];
  const accountLookupById = { 'account-gone': gone };
  const walletFilter = { ...EMPTY_COMMITMENT_FILTERS, accountIds: ['account-wallet'] };
  const walletAggregate = {
    key: monthAggregateKey('2026-05', 'account-wallet'),
    aggregate: usdDueAggregate(),
  };

  function scoped(overrides: Parameters<typeof setup>[0] = {}) {
    setup({
      accounts,
      archivedAccounts,
      accountLookupById,
      appliedFilters: walletFilter,
      monthAggregate: walletAggregate,
      ...overrides,
    });
  }

  beforeEach(() => {
    capturedFocusCallbacks.length = 0;
    mockInteractionTasks.length = 0;
    loadMonthSnapshotMock.mockReset().mockResolvedValue(undefined);
    loadMonthAggregateMock.mockReset().mockResolvedValue(undefined);
    loadAccountLookupMock.mockReset().mockResolvedValue(undefined);
    currencyRate = 50;
    currencyRateLoaded = true;
    mockUseDeferredValue.mockReset().mockImplementation((value: unknown) => value);
  });

  it('names the one applied account in the hero title', async () => {
    scoped();

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.hero.title).toBe('Left to pay · Wallet');
  });

  it('reads Left to pay alone while the one applied account is in no list', async () => {
    scoped({ appliedFilters: { ...EMPTY_COMMITMENT_FILTERS, accountIds: ['account-unread'] } });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.hero.title).toBe('Left to pay');
  });

  it('names a deleted applied account Deleted Account', async () => {
    scoped({ appliedFilters: { ...EMPTY_COMMITMENT_FILTERS, accountIds: ['account-gone'] } });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.hero.title).toBe('Left to pay · Deleted Account');
  });

  it('reads Left to pay alone with two applied accounts', async () => {
    scoped({
      appliedFilters: {
        ...EMPTY_COMMITMENT_FILTERS,
        accountIds: ['account-wallet', 'account-gone'],
      },
    });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.hero.title).toBe('Left to pay');
  });

  it('keeps the same scoped hero object across a search keystroke', async () => {
    scoped();
    const hook = await renderHook(() => useCommitments());
    const hero = hook.result.current.state.hero;
    expect(hero.title).toBe('Left to pay · Wallet');

    scoped({ searchQuery: 'rent' });
    await hook.rerender({});

    expect(hook.result.current.state.hero).toBe(hero);
  });

  it('keeps the same scoped hero object across a status tab change', async () => {
    scoped();
    const hook = await renderHook(() => useCommitments());
    const hero = hook.result.current.state.hero;
    expect(hero.title).toBe('Left to pay · Wallet');

    scoped({ statusFilter: CommitmentPaymentStatus.Due });
    await hook.rerender({});

    expect(hook.result.current.state.hero).toBe(hero);
  });
});

describe('useCommitments account chips, account prune and tally (MA-241)', () => {
  const wallet = makeAccount('account-wallet', 'Wallet');
  const cib = makeAccount('account-cib', 'CIB');
  const archived: Account = { ...makeAccount('account-archived', 'Old Bank'), is_archived: 1 };
  const accounts = [wallet, cib];
  const allAccountsAggregate = {
    key: monthAggregateKey('2026-05', undefined),
    aggregate: makeTestMonthAggregate(),
  };
  const NO_TALLY_TEXT = {
    count: undefined,
    label: '',
    filterSummary: undefined,
    sum: undefined,
    accessibilityLabel: undefined,
  };

  function listRows() {
    return {
      commitments: [
        makeCommitment('commitment-internet', { name: 'Home internet' }),
        makeCommitment('commitment-gym', { name: 'Gym', category_id: 'cat-fitness' }),
      ],
      payments: [
        makePayment('internet', CommitmentPaymentStatus.Due, { amount_due: 300 }),
        makePayment('gym', CommitmentPaymentStatus.Upcoming, { amount_due: 700 }),
      ],
      accounts,
      monthAggregate: allAccountsAggregate,
    };
  }

  beforeEach(() => {
    capturedFocusCallbacks.length = 0;
    mockInteractionTasks.length = 0;
    loadMonthSnapshotMock.mockReset().mockResolvedValue(undefined);
    loadMonthAggregateMock.mockReset().mockResolvedValue(undefined);
    loadAccountLookupMock.mockReset().mockResolvedValue(undefined);
    setAppliedFiltersMock.mockClear();
    currencyRate = 50;
    currencyRateLoaded = true;
    mockUseDeferredValue.mockReset().mockImplementation((value: unknown) => value);
  });

  it('lists All accounts first and then one chip per active account', async () => {
    setup({ accounts, archivedAccounts: [archived] });

    const { result } = await renderHook(() => useCommitments());

    expect(
      result.current.state.accountChips.map((chip) => [chip.accountId, chip.label, chip.selected]),
    ).toEqual([
      [undefined, Strings.filterAllAccounts, true],
      ['account-wallet', 'Wallet', false],
      ['account-cib', 'CIB', false],
    ]);
  });

  it('lights the one applied account’s chip, and no chip at two applied accounts', async () => {
    setup({
      accounts,
      appliedFilters: { ...EMPTY_COMMITMENT_FILTERS, accountIds: ['account-cib'] },
    });
    const one = await renderHook(() => useCommitments());
    expect(one.result.current.state.accountChips.map((chip) => chip.selected)).toEqual([
      false,
      false,
      true,
    ]);

    setup({
      accounts,
      appliedFilters: {
        ...EMPTY_COMMITMENT_FILTERS,
        accountIds: ['account-wallet', 'account-cib'],
      },
    });
    const two = await renderHook(() => useCommitments());
    expect(two.result.current.state.accountChips.some((chip) => chip.selected)).toBe(false);
  });

  it('toggleAccountChip writes one account, then none on the same chip, then none from All accounts', async () => {
    setup({ accounts });
    const hook = await renderHook(() => useCommitments());

    await act(() => hook.result.current.toggleAccountChip('account-wallet'));
    expect(setAppliedFiltersMock).toHaveBeenLastCalledWith({
      ...EMPTY_COMMITMENT_FILTERS,
      accountIds: ['account-wallet'],
    });

    const walletAndCategory = {
      ...EMPTY_COMMITMENT_FILTERS,
      accountIds: ['account-wallet'],
      categoryIds: ['cat-bills'],
    };
    setup({ accounts, appliedFilters: walletAndCategory });
    await hook.rerender({});

    await act(() => hook.result.current.toggleAccountChip('account-wallet'));
    expect(setAppliedFiltersMock).toHaveBeenLastCalledWith({
      ...walletAndCategory,
      accountIds: [],
    });

    await act(() => hook.result.current.toggleAccountChip(undefined));
    expect(setAppliedFiltersMock).toHaveBeenLastCalledWith({
      ...walletAndCategory,
      accountIds: [],
    });
    expect(setAppliedFiltersMock).toHaveBeenCalledTimes(3);
  });

  it('keeps an applied archived account until accounts load, then writes it out and scopes the hero to every account', async () => {
    const archivedFilter = {
      ...EMPTY_COMMITMENT_FILTERS,
      accountIds: ['account-archived'],
      categoryIds: ['cat-bills'],
    };
    setup({ accounts, archivedAccounts: [archived], appliedFilters: archivedFilter });
    const hook = await renderHook(() => useCommitments());

    await act(() => {
      runAggregateFocusLoad();
    });
    expect(setAppliedFiltersMock).not.toHaveBeenCalled();
    expect(loadMonthAggregateMock).toHaveBeenLastCalledWith('2026-05', 'account-archived');
    expect(hook.result.current.state.hero.title).toBe('Left to pay · Old Bank');

    setup({
      accounts,
      archivedAccounts: [archived],
      appliedFilters: archivedFilter,
      accountsLoaded: true,
    });
    await hook.rerender({});
    await act(() => {
      runAggregateFocusLoad();
    });

    expect(setAppliedFiltersMock).toHaveBeenCalledWith({ ...archivedFilter, accountIds: [] });
    expect(loadMonthAggregateMock).toHaveBeenLastCalledWith('2026-05', undefined);
    expect(hook.result.current.state.hero.title).toBe('Left to pay');
    expect(hook.result.current.state.accountChips[0]).toMatchObject({
      accountId: undefined,
      selected: true,
    });
  });

  it('opens the filter sheet without an archived account and keeps the category, once accounts have loaded', async () => {
    useCommitmentFilterStore.getState().resetDraft();
    useCommitmentFilterState.getState().reset();
    setup({
      accounts,
      archivedAccounts: [archived],
      appliedFilters: {
        ...EMPTY_COMMITMENT_FILTERS,
        accountIds: ['account-archived'],
        categoryIds: ['cat-bills'],
      },
      accountsLoaded: true,
    });
    const { result } = await renderHook(() => useCommitments());

    await act(() => result.current.openFilter());

    const { draft } = useCommitmentFilterStore.getState();
    expect(draft.accountIds).not.toContain('account-archived');
    expect(draft.categoryIds).toEqual(['cat-bills']);
    useCommitmentFilterStore.getState().resetDraft();
    useCommitmentFilterState.getState().reset();
  });

  it('counts no account on the filter button with one applied and one with two, while one still marks the list filtered', async () => {
    setup({
      accounts,
      commitments: [makeCommitment('commitment-wallet')],
      appliedFilters: { ...EMPTY_COMMITMENT_FILTERS, accountIds: ['account-wallet'] },
    });
    const one = await renderHook(() => useCommitments());
    expect(one.result.current.state.activeFilterCount).toBe(0);
    expect(one.result.current.state.emptyVariant).toBe('noResults');

    setup({
      accounts,
      appliedFilters: {
        ...EMPTY_COMMITMENT_FILTERS,
        accountIds: ['account-wallet', 'account-cib'],
      },
    });
    const two = await renderHook(() => useCommitments());
    expect(two.result.current.state.activeFilterCount).toBe(1);
  });

  it('leaves the tally slot empty under a status tab alone', async () => {
    setup({ ...listRows(), statusFilter: CommitmentPaymentStatus.Due });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.tally).toEqual({ mode: 'empty', ...NO_TALLY_TEXT });
  });

  it('turns the tally on under a search', async () => {
    setup({ ...listRows(), searchQuery: 'internet' });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.tally).toEqual({
      mode: 'figures',
      count: '1',
      label: 'payment',
      filterSummary: undefined,
      sum: { text: '300', polarity: 'neutral', currencyCode: 'EGP' },
      accessibilityLabel: '1 payment 300 EGP',
    });
  });

  it('turns the tally on under one lit chip', async () => {
    setup({
      ...listRows(),
      appliedFilters: { ...EMPTY_COMMITMENT_FILTERS, accountIds: ['account-wallet'] },
      monthAggregate: {
        key: monthAggregateKey('2026-05', 'account-wallet'),
        aggregate: makeTestMonthAggregate(),
      },
    });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.tally).toMatchObject({
      mode: 'figures',
      count: '2',
      label: 'payments',
      sum: { text: '1,000' },
      accessibilityLabel: '2 payments 1,000 EGP',
    });
  });

  it('turns the tally on under a category filter', async () => {
    setup({
      ...listRows(),
      appliedFilters: { ...EMPTY_COMMITMENT_FILTERS, categoryIds: ['cat-fitness'] },
    });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.tally).toMatchObject({
      mode: 'figures',
      count: '1',
      sum: { text: '700' },
      accessibilityLabel: '1 payment 700 EGP',
    });
  });

  it('prints "— payments" while the hero prints dashes', async () => {
    setup({
      ...listRows(),
      searchQuery: 'internet',
      monthAggregate: undefined,
      monthAggregateErrorKey: monthAggregateKey('2026-05', undefined),
    });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.hero.mode).toBe('dashes');
    expect(result.current.state.tally).toEqual({
      mode: 'failed',
      count: '—',
      label: 'payments',
      filterSummary: undefined,
      sum: undefined,
      accessibilityLabel: '— payments',
    });
  });

  it('holds the tally bar while the hero holds its skeleton', async () => {
    setup({ ...listRows(), searchQuery: 'internet', monthAggregate: undefined });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.hero.mode).toBe('skeleton');
    expect(result.current.state.tally).toEqual({ mode: 'skeleton', ...NO_TALLY_TEXT });
  });

  it('holds the tally bar, never 0 payments, while the snapshot is another month’s', async () => {
    setup({ ...listRows(), searchQuery: 'internet', loadedMonth: '2026-04' });

    const { result } = await renderHook(() => useCommitments());

    expect(result.current.state.hero.mode).toBe('figures');
    expect(result.current.state.tally).toEqual({ mode: 'skeleton', ...NO_TALLY_TEXT });
  });
});
