import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fireEvent, render, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { Currency, TransactionType } from '@/constants/enums';
import TransactionsScreen from '@/modules/transactions/screens/transactions';
import { useTransactions } from '@/modules/transactions/screens/transactions/transactions.hook';

jest.mock('@/modules/transactions/screens/transactions/transactions.hook', () => ({
  useTransactions: jest.fn(),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}));
jest.mock('heroui-native', () => {
  const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
  const Typography = {
    Heading: ({ children }: { children?: ReactNode }) => <Text>{children}</Text>,
  };
  const SkeletonGroupRoot = ({ children }: { children?: ReactNode }) => (
    <View testID="skeleton-group">{children}</View>
  );
  const SkeletonGroupItem = ({ children }: { children?: ReactNode }) => (
    <View testID="skeleton-item">{children}</View>
  );
  return {
    Separator: () => <View testID="separator" />,
    Spinner: () => <Text>spinner</Text>,
    Surface: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
    Typography,
    SkeletonGroup: Object.assign(SkeletonGroupRoot, { Item: SkeletonGroupItem }),
    PressableFeedback: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});
jest.mock('@/components/ui/screen', () => ({
  Screen: ({ children }: { children?: ReactNode }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return <View>{children}</View>;
  },
}));
jest.mock('@/components/ui/filter_rail', () => ({
  FilterRail: ({ selectedMonth }: { selectedMonth: string }) => {
    const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View testID="transactions-filter-rail">
        <Text>{selectedMonth}</Text>
      </View>
    );
  },
}));
jest.mock('@/components/ui/empty_state', () => ({
  EmptyState: ({ variant }: { variant: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{variant}</Text>;
  },
}));
jest.mock('@/components/ui/swipeable_row', () => ({ closeAllRows: jest.fn() }));
jest.mock('@/modules/transactions/screens/transactions/components/transactions_hero', () => {
  const heroRenders = { count: 0 };
  return {
    heroRenders,
    TransactionsHero: ({ model }: { model: { mode: string } }) => {
      const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
      heroRenders.count += 1;
      return <Text testID="transactions-hero-mock">{`hero:${model.mode}`}</Text>;
    },
  };
});
jest.mock('@/modules/transactions/screens/transactions/components/search_row', () => ({
  SearchRow: ({ value }: { value: string }) => {
    const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View testID="transaction-search-row">
        <Text>{`search:${value}`}</Text>
      </View>
    );
  },
}));
jest.mock('@/modules/transactions/screens/transactions/components/transaction_row', () => ({
  TransactionRow: () => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>Transaction row</Text>;
  },
}));
jest.mock('@/modules/transactions/screens/transactions/components/date_header', () => ({
  DateHeader: ({ label }: { label: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{label}</Text>;
  },
}));
jest.mock('@/modules/transactions/screens/transactions/components/tx_delete_confirm_sheet', () => ({
  TxDeleteConfirmSheet: () => null,
}));
jest.mock('@/modules/transactions/screens/transactions/filter', () => ({
  FilterSheet: () => null,
}));
jest.mock('@/modules/transactions/screens/transactions/filter/filter.state', () => ({
  useFilterState: { getState: () => ({ visible: false, close: jest.fn() }) },
}));
type TransactionsScreenHook = ReturnType<typeof useTransactions>;
type TransactionsScreenState = TransactionsScreenHook['state'];

const baseTransactionsState: TransactionsScreenState = {
  sections: [],
  hasMore: false,
  listStatus: 'initialLoading',
  showInitialSkeleton: true,
  showFirstLoadError: false,
  loadErrorVariant: 'none',
  paginationError: false,
  refreshing: false,
  emptyVariant: 'none',
  searchQuery: '',
  activeFilter: 'all',
  period: { type: 'month', yearMonth: '2026-08' },
  selectedMonth: '2026-08',
  accountsById: new Map(),
  categoriesById: new Map(),
  activeFilterCount: 0,
  appliedFilterSummary: '',
  totals: null,
  totalsStatus: 'initialLoading',
  hero: {
    mode: 'skeleton',
    title: 'Out this month',
    monthLabel: 'August',
    out: '—',
    in: '—',
    net: '—',
    leftOfIncome: '—',
    railPct: 0,
    railDanger: false,
    railAccessibilityLabel: 'No income this month',
    shareCaption: undefined,
    caption: 'Jul —',
    lastMonthChange: undefined,
  },
  searchDisabled: true,
  listRef: { current: null },
  pendingDeleteId: null,
  deleteBusy: false,
  deleteErrorMessage: undefined,
};

const mockedUseTransactions = jest.mocked(useTransactions);
const { heroRenders } = jest.requireMock<{ heroRenders: { count: number } }>(
  '@/modules/transactions/screens/transactions/components/transactions_hero',
);

function mockUseTransactions(state: Partial<TransactionsScreenState> = {}) {
  const hook = {
    state: { ...baseTransactionsState, ...state },
    setSearchQuery: jest.fn(),
    setActiveFilter: jest.fn(),
    setSelectedMonth: jest.fn(),
    clearSearch: jest.fn(),
    onEndReached: jest.fn(),
    onRefresh: jest.fn(),
    onListScroll: jest.fn(),
    onListScrollEnd: jest.fn(),
    retryList: jest.fn(),
    retryTotals: jest.fn(),
    retryFailedLoads: jest.fn(),
    openFilter: jest.fn(),
    resetFilters: jest.fn(),
    goToDetail: jest.fn(),
    goToEdit: jest.fn(),
    openAddTransaction: jest.fn(),
    requestDelete: jest.fn(),
    confirmDelete: jest.fn(),
    cancelDelete: jest.fn(),
  };
  mockedUseTransactions.mockReturnValue(hook);
  return hook;
}

describe('TransactionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    heroRenders.count = 0;
    mockUseTransactions();
  });

  it('keeps form and delete orchestration out of the screen template', () => {
    const template = readFileSync(
      resolve(process.cwd(), 'src/modules/transactions/screens/transactions/index.tsx'),
      'utf8',
    );

    expect(template).not.toContain('useConfirmAction');
    expect(template).not.toContain('useTransactionFormState');
    expect(template).not.toContain('useTransactionStore');
  });

  it('shows row skeletons instead of the list spinner during first load', async () => {
    const { getByTestId, queryByText } = await render(<TransactionsScreen />);

    expect(getByTestId('transaction-row-skeletons')).toBeTruthy();
    expect(queryByText('spinner')).toBeNull();
  });

  it('keeps scope controls fixed while summary and search scroll with the ledger', async () => {
    const { getByTestId } = await render(<TransactionsScreen />);

    expect(getByTestId('transactions-filter-rail')).toBeTruthy();
    expect(getByTestId('transactions-list-header')).toBeTruthy();
    expect(
      within(getByTestId('transactions-list-header')).getByTestId('transactions-hero-mock'),
    ).toBeTruthy();
    expect(getByTestId('transactions-list')).toHaveProp('ListHeaderComponent');
  });

  it('does not re-render the hero on a search keystroke, only on a new hero model (M25)', async () => {
    const hero = baseTransactionsState.hero;
    mockUseTransactions({ hero });
    const { getByText, rerender } = await render(<TransactionsScreen />);
    const mounted = heroRenders.count;

    expect(mounted).toBeGreaterThan(0);

    mockUseTransactions({ hero, searchQuery: 'c' });
    await rerender(<TransactionsScreen />);

    expect(getByText('search:c')).toBeTruthy();
    expect(heroRenders.count).toBe(mounted);

    mockUseTransactions({ hero: { ...hero, mode: 'figures' }, searchQuery: 'c' });
    await rerender(<TransactionsScreen />);

    expect(getByText('hero:figures')).toBeTruthy();
    expect(heroRenders.count).toBe(mounted + 1);
  });

  it('does not show row skeletons after loaded transactions render', async () => {
    mockUseTransactions({
      emptyVariant: 'none',
      listStatus: 'ready',
      showInitialSkeleton: false,
      sections: [
        {
          key: 'TODAY',
          data: [
            {
              id: 'tx-1',
              type: TransactionType.Income,
              amount: 100,
              currency: Currency.EGP,
              egp_amount: 100,
              to_amount: null,
              minimum_payment_snapshot: null,
              revolving_balance_delta: null,
              account_id: 'acc-1',
              to_account_id: null,
              category_id: null,
              budget_id: null,
              note: null,
              transaction_date: '2026-08-01',
              transaction_time: '2026-08-01T12:00:00.000Z',
              exchange_rate: null,
              commitment_payment_id: null,
              installment_id: null,
              created_at: '2026-08-01T12:00:00.000Z',
              updated_at: '2026-08-01T12:00:00.000Z',
            },
          ],
        },
      ],
    });

    const { getByText, queryByTestId } = await render(<TransactionsScreen />);

    expect(getByText('Transaction row')).toBeTruthy();
    expect(queryByTestId('transaction-row-skeletons')).toBeNull();
  });

  it('tracks list movement separately from its persistence boundaries', async () => {
    const hook = mockUseTransactions();
    const { getByTestId } = await render(<TransactionsScreen />);
    const event = {
      nativeEvent: {
        contentOffset: { x: 0, y: 100 },
        contentSize: { height: 1_000, width: 320 },
        layoutMeasurement: { height: 640, width: 320 },
      },
    };

    await fireEvent.scroll(getByTestId('transactions-list'), event);
    await fireEvent(getByTestId('transactions-list'), 'scrollEndDrag', event);
    await fireEvent(getByTestId('transactions-list'), 'momentumScrollEnd', event);

    // RNTL 14 deep-merges the passed props into a full synthetic event, so match partially.
    const received = expect.objectContaining({
      nativeEvent: expect.objectContaining(event.nativeEvent),
    });

    expect(hook.onListScroll).toHaveBeenCalledWith(received);
    expect(hook.onListScrollEnd).toHaveBeenCalledTimes(2);
    expect(hook.onListScrollEnd).toHaveBeenNthCalledWith(1, received);
    expect(hook.onListScrollEnd).toHaveBeenNthCalledWith(2, received);
    expect(getByTestId('transactions-list')).toHaveProp('scrollEventThrottle', 100);
  });

  it('keeps loaded transactions visible while manually refreshing loaded transactions', async () => {
    mockUseTransactions({
      emptyVariant: 'none',
      listStatus: 'refreshing',
      showInitialSkeleton: false,
      refreshing: true,
      totals: {
        queryKey: 'july',
        current: { incomeEgp: 1000, expenseEgp: 500, netEgp: 500 },
        previous: { incomeEgp: 900, expenseEgp: 400, netEgp: 500 },
        days: [],
        matchCount: 0,
        matchNetEgp: 0,
      },
      totalsStatus: 'refreshing',
      hero: { ...baseTransactionsState.hero, mode: 'figures' },
      searchDisabled: false,
      sections: [
        {
          key: 'TODAY',
          data: [
            {
              id: 'tx-1',
              type: TransactionType.Income,
              amount: 100,
              currency: Currency.EGP,
              egp_amount: 100,
              to_amount: null,
              minimum_payment_snapshot: null,
              revolving_balance_delta: null,
              account_id: 'acc-1',
              to_account_id: null,
              category_id: null,
              budget_id: null,
              note: null,
              transaction_date: '2026-08-01',
              transaction_time: '2026-08-01T12:00:00.000Z',
              exchange_rate: null,
              commitment_payment_id: null,
              installment_id: null,
              created_at: '2026-08-01T12:00:00.000Z',
              updated_at: '2026-08-01T12:00:00.000Z',
            },
          ],
        },
      ],
    });

    const { getByText, queryByTestId } = await render(<TransactionsScreen />);

    expect(getByText('hero:figures')).toBeTruthy();
    expect(getByText('Transaction row')).toBeTruthy();
    expect(queryByTestId('transaction-row-skeletons')).toBeNull();
  });

  it('shows matching row skeletons during a new filter query transition', async () => {
    mockUseTransactions({
      emptyVariant: 'none',
      listStatus: 'initialLoading',
      showInitialSkeleton: true,
      activeFilter: TransactionType.Expense,
      sections: [],
    });

    const { getByTestId, queryByText } = await render(<TransactionsScreen />);

    expect(getByTestId('transaction-row-skeletons')).toBeTruthy();
    expect(queryByText('filtered')).toBeNull();
  });

  it('does not show row skeletons behind a filtered empty state while refreshing', async () => {
    mockUseTransactions({
      emptyVariant: 'noResults',
      listStatus: 'refreshing',
      showInitialSkeleton: false,
      refreshing: true,
      activeFilter: TransactionType.CCPayment,
      sections: [],
    });

    const { getByText, queryByTestId } = await render(<TransactionsScreen />);

    expect(getByText('filtered')).toBeTruthy();
    expect(queryByTestId('transaction-row-skeletons')).toBeNull();
  });
});
