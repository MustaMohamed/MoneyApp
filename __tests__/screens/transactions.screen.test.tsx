import { fireEvent, render, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Currency, TransactionType } from '@/constants/enums';
import { Radius } from '@/constants/theme';
import { TRANSACTION_TYPE_ICONS } from '@/constants/transaction_type_icons';
import TransactionsScreen from '@/modules/transactions/screens/transactions';
import { DAY_CARD_INNER_RADIUS } from '@/modules/transactions/screens/transactions/components/day_card_row.helpers';
import { TRANSACTIONS_RAIL } from '@/modules/transactions/screens/transactions/components/transactions_rail.geometry';
import { useTransactions } from '@/modules/transactions/screens/transactions/transactions.hook';
import { makeTestTransaction } from '@/test_helpers/transaction';

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
    Skeleton: () => <View testID="skeleton" />,
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
jest.mock('@/components/ui/month_filter', () => {
  const monthFilterProps: { last: object | undefined } = { last: undefined };
  return {
    monthFilterProps,
    MonthFilter: (props: object) => {
      const { View } = jest.requireActual<typeof import('react-native')>('react-native');
      monthFilterProps.last = props;
      return <View testID="transactions-month-filter" />;
    },
  };
});
jest.mock('@/components/ui/segment_filter', () => {
  const segmentFilterProps: { last: object | undefined } = { last: undefined };
  return {
    segmentFilterProps,
    SegmentFilter: (props: object) => {
      const { View } = jest.requireActual<typeof import('react-native')>('react-native');
      segmentFilterProps.last = props;
      return <View testID="transactions-segment-filter" />;
    },
  };
});
jest.mock('@/components/ui/empty_state', () => {
  const emptyStateProps: { last: { variant: string } | undefined } = { last: undefined };
  return {
    emptyStateProps,
    EmptyState: (props: { variant: string }) => {
      const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
      emptyStateProps.last = props;
      return <Text>{props.variant}</Text>;
    },
  };
});
jest.mock('@/components/ui/error_state', () => ({
  ErrorState: ({ title, testID }: { title: string; testID?: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text testID={testID}>{title}</Text>;
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
jest.mock('@/modules/transactions/screens/transactions/components/account_chips', () => ({
  AccountChips: () => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return <View testID="transactions-account-chips" />;
  },
}));
jest.mock('@/modules/transactions/screens/transactions/components/transaction_row', () => {
  const rowSeparators = new Map<string, boolean | undefined>();
  const rowSwipeCorners = new Map<string, unknown>();
  return {
    rowSeparators,
    rowSwipeCorners,
    TransactionRow: ({
      tx,
      showSeparator,
      swipeContainerStyle,
    }: {
      tx: { id: string };
      showSeparator?: boolean;
      swipeContainerStyle?: unknown;
    }) => {
      const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
      rowSeparators.set(tx.id, showSeparator);
      rowSwipeCorners.set(tx.id, swipeContainerStyle);
      return <Text testID={`transaction-row-${tx.id}`}>Transaction row</Text>;
    },
  };
});
jest.mock('@/modules/transactions/screens/transactions/components/day_header', () => ({
  DayHeader: ({ section }: { section: { label: string } }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{section.label}</Text>;
  },
}));
jest.mock('@/modules/transactions/screens/transactions/components/tx_delete_confirm_sheet', () => ({
  TxDeleteConfirmSheet: () => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return <View testID="tx-delete-confirm-sheet" />;
  },
}));
jest.mock('@/modules/transactions/screens/transactions/components/tx_delete_dialog', () => {
  const txDeleteDialogProps: { last: object | undefined } = { last: undefined };
  return {
    txDeleteDialogProps,
    TxDeleteDialog: (props: object) => {
      txDeleteDialogProps.last = props;
      return null;
    },
  };
});
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
  accountChips: [],
  totals: null,
  totalsStatus: 'initialLoading',
  hero: {
    mode: 'skeleton',
    title: 'Out this month',
    monthLabel: 'August',
    currencyCode: 'EGP',
    out: '—',
    outAccessibilityLabel: '— EGP',
    in: '—',
    inPolarity: 'neutral',
    net: '—',
    netPolarity: 'neutral',
    leftOfIncome: '—',
    railPct: 0,
    railDanger: false,
    railAccessibilityLabel: 'No income this month',
    shareCaption: undefined,
    caption: 'Jul —',
    lastMonthChange: undefined,
  },
  tally: {
    mode: 'empty',
    count: undefined,
    label: '',
    filterSummary: undefined,
    sum: undefined,
    accessibilityLabel: undefined,
  },
  searchDisabled: true,
  listRef: { current: null },
  pendingDeleteId: null,
  deleteBusy: false,
  deleteErrorMessage: undefined,
  deleteBody: '',
  emptyMonthName: '',
  showsBackToThisMonth: false,
};

interface EmptyStateMockProps {
  variant: string;
  monthName?: string;
  showsBackLink?: boolean;
  onAction?: () => void;
}

interface TxDeleteDialogMockProps {
  isOpen: boolean;
  body: string;
  busy: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

interface RailHitSlop {
  top: number;
  bottom: number;
}

interface MonthFilterMockProps {
  rowHitSlop?: RailHitSlop;
  onSelectedMonthChange?: (month: string) => void;
}

interface SegmentFilterMockProps {
  filters: ReadonlyArray<{ value: string; icon?: object }>;
  corners?: string;
  triggerHitSlop?: RailHitSlop;
  onSelectedFilterChange?: (filter: string) => void;
}

const TYPE_FILTERS = [
  TransactionType.Income,
  TransactionType.Expense,
  TransactionType.Transfer,
  TransactionType.CCPayment,
];

const mockedUseTransactions = jest.mocked(useTransactions);
const { monthFilterProps } = jest.requireMock<{
  monthFilterProps: { last: MonthFilterMockProps | undefined };
}>('@/components/ui/month_filter');
const { segmentFilterProps } = jest.requireMock<{
  segmentFilterProps: { last: SegmentFilterMockProps | undefined };
}>('@/components/ui/segment_filter');
const { emptyStateProps } = jest.requireMock<{
  emptyStateProps: { last: EmptyStateMockProps | undefined };
}>('@/components/ui/empty_state');
const { txDeleteDialogProps } = jest.requireMock<{
  txDeleteDialogProps: { last: TxDeleteDialogMockProps | undefined };
}>('@/modules/transactions/screens/transactions/components/tx_delete_dialog');
const { heroRenders } = jest.requireMock<{ heroRenders: { count: number } }>(
  '@/modules/transactions/screens/transactions/components/transactions_hero',
);
const { rowSeparators, rowSwipeCorners } = jest.requireMock<{
  rowSeparators: Map<string, boolean | undefined>;
  rowSwipeCorners: Map<string, StyleProp<ViewStyle>>;
}>('@/modules/transactions/screens/transactions/components/transaction_row');

type DaySection = TransactionsScreenState['sections'][number];
type HostNode = Parameters<typeof within>[0];

function makeDaySection(key: string, ids: string[]): DaySection {
  return {
    key,
    label: key,
    figures: { mode: 'figures', net: '+100 EGP', count: String(ids.length) },
    accessibilityLabel: key,
    data: ids.map((id) => makeTestTransaction({ id, transaction_date: key })),
  };
}

function flatStyle(node: { props: { style?: StyleProp<ViewStyle> } }): ViewStyle {
  return StyleSheet.flatten(node.props.style);
}

function readSlice(slice: HostNode) {
  const style = flatStyle(slice);
  const row = within(slice).getByTestId(/^transaction-row-/);
  const id = String(row.props.testID).replace('transaction-row-', '');
  return {
    id,
    top: style.borderTopLeftRadius === Radius.lg && style.borderTopRightRadius === Radius.lg,
    bottom:
      style.borderBottomLeftRadius === Radius.lg && style.borderBottomRightRadius === Radius.lg,
    noSeparator: rowSeparators.get(id) === false,
  };
}

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
    toggleAccountChip: jest.fn(),
    backToThisMonth: jest.fn(),
  };
  mockedUseTransactions.mockReturnValue(hook);
  return hook;
}

describe('TransactionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    heroRenders.count = 0;
    rowSeparators.clear();
    rowSwipeCorners.clear();
    emptyStateProps.last = undefined;
    txDeleteDialogProps.last = undefined;
    monthFilterProps.last = undefined;
    segmentFilterProps.last = undefined;
    mockUseTransactions();
  });

  it('shows row skeletons instead of the list spinner during first load', async () => {
    const { getByTestId, getAllByTestId, queryByText } = await render(<TransactionsScreen />);

    expect(getByTestId('transaction-row-skeletons')).toBeTruthy();
    expect(getAllByTestId('transaction-day-skeleton-header')).toHaveLength(2);
    expect(getAllByTestId('transaction-row-skeleton')).toHaveLength(6);
    expect(queryByText('spinner')).toBeNull();
  });

  it('keeps scope controls fixed while summary and search scroll with the ledger', async () => {
    const { getByTestId } = await render(<TransactionsScreen />);

    const rail = getByTestId('transactions-rail');
    const header = getByTestId('transactions-list-header');
    expect(within(rail).getByTestId('transactions-month-filter')).toBeTruthy();
    expect(within(rail).getByTestId('transactions-segment-filter')).toBeTruthy();
    expect(within(header).queryByTestId('transactions-month-filter')).toBeNull();
    expect(within(header).queryByTestId('transactions-segment-filter')).toBeNull();
    expect(within(header).getByTestId('transactions-hero-mock')).toBeTruthy();
    expect(getByTestId('transactions-list')).toHaveProp('ListHeaderComponent');
  });

  it('MA-109: the rail hands the month row and the iconed type tabs its space, hit slops and the hook handlers during the first load, in form corners', async () => {
    const hook = mockUseTransactions();
    const { getByTestId } = await render(<TransactionsScreen />);

    const filters = segmentFilterProps.last?.filters ?? [];
    expect(filters.map(({ value }) => value)).toEqual(['all', ...TYPE_FILTERS]);
    const iconByValue = new Map(filters.map(({ value, icon }) => [value, icon]));
    for (const type of TYPE_FILTERS) {
      expect(iconByValue.get(type)).toBe(TRANSACTION_TYPE_ICONS[type]);
    }
    expect(segmentFilterProps.last?.corners).toBe('form');
    expect(monthFilterProps.last?.rowHitSlop).toEqual(TRANSACTIONS_RAIL.monthRowHitSlop);
    expect(segmentFilterProps.last?.triggerHitSlop).toEqual(TRANSACTIONS_RAIL.tabsHitSlop);
    expect(getByTestId('transactions-rail')).toHaveStyle({
      paddingTop: TRANSACTIONS_RAIL.space,
      paddingBottom: TRANSACTIONS_RAIL.space,
    });
    expect(getByTestId('transactions-segment-filter').parent).toHaveStyle({
      marginTop: TRANSACTIONS_RAIL.space,
    });
    expect(monthFilterProps.last?.onSelectedMonthChange).toBe(hook.setSelectedMonth);
    expect(segmentFilterProps.last?.onSelectedFilterChange).toBe(hook.setActiveFilter);
  });

  it('MA-107: the tally slot passes an empty spoken label when its model carries none', async () => {
    const { getByTestId } = await render(<TransactionsScreen />);

    const slot = getByTestId('transactions-search-tally');
    expect(slot).toHaveProp('accessibilityLabel', '');
    expect(slot).toHaveProp('accessible', false);
  });

  it('MA-107: the tally slot under a skeleton model passes an empty spoken label and holds its bar', async () => {
    mockUseTransactions({ tally: { ...baseTransactionsState.tally, mode: 'skeleton' } });
    const { getByTestId } = await render(<TransactionsScreen />);

    const slot = getByTestId('transactions-search-tally');
    expect(slot).toHaveProp('accessibilityLabel', '');
    expect(slot).toHaveProp('accessible', false);
    expect(within(slot).getByTestId('skeleton')).toBeTruthy();
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

  it('rounds the swipe actions into the card corner on a first and a last row only', async () => {
    mockUseTransactions({
      emptyVariant: 'none',
      listStatus: 'ready',
      showInitialSkeleton: false,
      sections: [
        makeDaySection('2026-08-02', ['a1', 'a2', 'a3']),
        makeDaySection('2026-08-01', ['b1']),
      ],
    });
    await render(<TransactionsScreen />);

    const corners = (id: string) => StyleSheet.flatten(rowSwipeCorners.get(id));
    expect(corners('a1')).toStrictEqual({ borderTopRightRadius: DAY_CARD_INNER_RADIUS });
    expect(corners('a2')).toStrictEqual({});
    expect(corners('a3')).toStrictEqual({ borderBottomRightRadius: DAY_CARD_INNER_RADIUS });
    expect(corners('b1')).toStrictEqual({
      borderTopRightRadius: DAY_CARD_INNER_RADIUS,
      borderBottomRightRadius: DAY_CARD_INNER_RADIUS,
    });
  });

  it('draws each day as one card of row slices, closing on the rows left after a delete and growing on load more', async () => {
    const loaded = {
      emptyVariant: 'none',
      listStatus: 'ready',
      showInitialSkeleton: false,
    } as const;
    mockUseTransactions({
      ...loaded,
      sections: [
        makeDaySection('2026-08-02', ['a1', 'a2', 'a3']),
        makeDaySection('2026-08-01', ['b1']),
      ],
    });
    const { getAllByTestId, rerender } = await render(<TransactionsScreen />);

    expect(getAllByTestId('day-card-row').map(readSlice)).toEqual([
      { id: 'a1', top: true, bottom: false, noSeparator: false },
      { id: 'a2', top: false, bottom: false, noSeparator: false },
      { id: 'a3', top: false, bottom: true, noSeparator: true },
      { id: 'b1', top: true, bottom: true, noSeparator: true },
    ]);

    mockUseTransactions({
      ...loaded,
      sections: [makeDaySection('2026-08-02', ['a1', 'a2']), makeDaySection('2026-08-01', ['b1'])],
    });
    await rerender(<TransactionsScreen />);

    expect(getAllByTestId('day-card-row').map(readSlice)).toEqual([
      { id: 'a1', top: true, bottom: false, noSeparator: false },
      { id: 'a2', top: false, bottom: true, noSeparator: true },
      { id: 'b1', top: true, bottom: true, noSeparator: true },
    ]);

    mockUseTransactions({ ...loaded, sections: [makeDaySection('2026-08-02', ['a1', 'a2'])] });
    await rerender(<TransactionsScreen />);

    expect(getAllByTestId('day-card-row').map(readSlice)).toEqual([
      { id: 'a1', top: true, bottom: false, noSeparator: false },
      { id: 'a2', top: false, bottom: true, noSeparator: true },
    ]);

    mockUseTransactions({
      ...loaded,
      sections: [
        makeDaySection('2026-08-02', ['a1', 'a2', 'a4']),
        makeDaySection('2026-07-31', ['c1', 'c2']),
      ],
    });
    await rerender(<TransactionsScreen />);

    expect(getAllByTestId('day-card-row').map(readSlice)).toEqual([
      { id: 'a1', top: true, bottom: false, noSeparator: false },
      { id: 'a2', top: false, bottom: false, noSeparator: false },
      { id: 'a4', top: false, bottom: true, noSeparator: true },
      { id: 'c1', top: true, bottom: false, noSeparator: false },
      { id: 'c2', top: false, bottom: true, noSeparator: true },
    ]);
  });

  it('does not show row skeletons after loaded transactions render', async () => {
    mockUseTransactions({
      emptyVariant: 'none',
      listStatus: 'ready',
      showInitialSkeleton: false,
      sections: [
        {
          key: '2026-08-01',
          label: 'Today',
          figures: { mode: 'figures', net: '+100 EGP', count: '1' },
          accessibilityLabel: 'Today, plus 100 EGP, 1 transaction',
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
          key: '2026-08-01',
          label: 'Today',
          figures: { mode: 'figures', net: '+100 EGP', count: '1' },
          accessibilityLabel: 'Today, plus 100 EGP, 1 transaction',
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

  it('MA-093: an empty month mounts the month block, and its link goes back to this month', async () => {
    const hook = mockUseTransactions({
      emptyVariant: 'emptyMonth',
      emptyMonthName: 'July',
      showsBackToThisMonth: true,
      listStatus: 'empty',
      showInitialSkeleton: false,
    });

    const { getByText } = await render(<TransactionsScreen />);

    expect(getByText('transactionsMonth')).toBeTruthy();
    expect(emptyStateProps.last).toMatchObject({
      variant: 'transactionsMonth',
      monthName: 'July',
      showsBackLink: true,
    });
    emptyStateProps.last?.onAction?.();
    expect(hook.backToThisMonth).toHaveBeenCalledTimes(1);
    expect(hook.resetFilters).not.toHaveBeenCalled();
    expect(hook.openAddTransaction).not.toHaveBeenCalled();
  });

  it('MA-093: a pending delete opens the dialog with its body, busy flag and failure line, never the confirm sheet', async () => {
    const body = '100 EGP returns to CIB Current. This cannot be undone.';
    const failure = 'Old Card is archived. Restore it to change this transaction.';
    const hook = mockUseTransactions({
      pendingDeleteId: 'tx-1',
      deleteBody: body,
      deleteBusy: true,
      deleteErrorMessage: failure,
    });

    const { queryByTestId } = await render(<TransactionsScreen />);

    expect(txDeleteDialogProps.last).toMatchObject({
      isOpen: true,
      body,
      busy: true,
      errorMessage: failure,
    });
    expect(queryByTestId('tx-delete-confirm-sheet')).toBeNull();
    txDeleteDialogProps.last?.onCancel();
    expect(hook.cancelDelete).toHaveBeenCalledTimes(1);
    txDeleteDialogProps.last?.onConfirm();
    expect(hook.confirmDelete).toHaveBeenCalledTimes(1);
  });
});
