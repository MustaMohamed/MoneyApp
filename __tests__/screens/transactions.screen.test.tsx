import { fireEvent, render } from '@testing-library/react-native';
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
  const HeroText = {
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
    Text: HeroText,
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
jest.mock('@/utils/use_confirm_action.hook', () => ({
  useConfirmAction: () => ({
    pendingPayload: null,
    busy: false,
    request: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
  }),
}));
jest.mock('@/modules/transactions/store/transaction.store', () => ({
  useTransactionStore: { getState: () => ({ deleteTransaction: jest.fn() }) },
}));
jest.mock('@/modules/transactions/screens/transactions/components/totals_strip', () => ({
  TotalsStrip: ({ isLoading }: { isLoading?: boolean }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{`Totals loading:${String(isLoading)}`}</Text>;
  },
}));
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
jest.mock('@/modules/transactions/screens/transactions/transaction_form', () => ({
  AddTransactionSheet: () => null,
  EditTransactionSheet: () => null,
}));
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/add_transaction.state',
  () => {
    return {
      useAddTransactionState: Object.assign(
        jest.fn((selector: (state: { visible: boolean; pendingOpen: boolean }) => unknown) =>
          selector({ visible: false, pendingOpen: false }),
        ),
        {
          getState: () => ({ visible: false, open: jest.fn(), requestClose: jest.fn() }),
        },
      ),
    };
  },
);
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/add_transaction.store',
  () => ({
    useAddTransactionStore: { getState: () => ({ reset: jest.fn() }) },
  }),
);
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state',
  () => ({
    useEditTransactionState: {
      useState: { visible: () => false },
      getState: () => ({ visible: false, requestClose: jest.fn() }),
    },
  }),
);
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.store',
  () => ({
    useEditTransactionStore: {
      useState: { editingTx: () => null },
      getState: () => ({ reset: jest.fn() }),
    },
  }),
);

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
  previousLabel: 'July 2026',
  listRef: { current: null },
};

const mockedUseTransactions = jest.mocked(useTransactions);

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
  };
  mockedUseTransactions.mockReturnValue(hook);
  return hook;
}

describe('TransactionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactions();
  });

  it('shows row skeletons instead of the list spinner during first load', () => {
    const { getByTestId, queryByText } = render(<TransactionsScreen />);

    expect(getByTestId('transaction-row-skeletons')).toBeTruthy();
    expect(queryByText('spinner')).toBeNull();
  });

  it('does not show row skeletons after loaded transactions render', () => {
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

    const { getByText, queryByTestId } = render(<TransactionsScreen />);

    expect(getByText('Transaction row')).toBeTruthy();
    expect(queryByTestId('transaction-row-skeletons')).toBeNull();
  });

  it('tracks list movement separately from its persistence boundaries', () => {
    const hook = mockUseTransactions();
    const { getByTestId } = render(<TransactionsScreen />);
    const event = {
      nativeEvent: {
        contentOffset: { x: 0, y: 100 },
        contentSize: { height: 1_000, width: 320 },
        layoutMeasurement: { height: 640, width: 320 },
      },
    };

    fireEvent.scroll(getByTestId('transactions-list'), event);
    fireEvent(getByTestId('transactions-list'), 'scrollEndDrag', event);
    fireEvent(getByTestId('transactions-list'), 'momentumScrollEnd', event);

    expect(hook.onListScroll).toHaveBeenCalledWith(event);
    expect(hook.onListScrollEnd).toHaveBeenCalledTimes(2);
    expect(hook.onListScrollEnd).toHaveBeenNthCalledWith(1, event);
    expect(hook.onListScrollEnd).toHaveBeenNthCalledWith(2, event);
    expect(getByTestId('transactions-list')).toHaveProp('scrollEventThrottle', 100);
  });

  it('keeps loaded transactions visible while manually refreshing loaded transactions', () => {
    mockUseTransactions({
      emptyVariant: 'none',
      listStatus: 'refreshing',
      showInitialSkeleton: false,
      refreshing: true,
      totals: {
        current: { incomeEgp: 1000, expenseEgp: 500, netEgp: 500 },
        previous: { incomeEgp: 900, expenseEgp: 400, netEgp: 500 },
      },
      totalsStatus: 'refreshing',
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

    const { getByText, queryByTestId } = render(<TransactionsScreen />);

    expect(getByText('Totals loading:false')).toBeTruthy();
    expect(getByText('Transaction row')).toBeTruthy();
    expect(queryByTestId('transaction-row-skeletons')).toBeNull();
  });

  it('shows matching row skeletons during a new filter query transition', () => {
    mockUseTransactions({
      emptyVariant: 'none',
      listStatus: 'initialLoading',
      showInitialSkeleton: true,
      activeFilter: TransactionType.Expense,
      sections: [],
    });

    const { getByTestId, queryByText } = render(<TransactionsScreen />);

    expect(getByTestId('transaction-row-skeletons')).toBeTruthy();
    expect(queryByText('filtered')).toBeNull();
  });

  it('does not show row skeletons behind a filtered empty state while refreshing', () => {
    mockUseTransactions({
      emptyVariant: 'noResults',
      listStatus: 'refreshing',
      showInitialSkeleton: false,
      refreshing: true,
      activeFilter: TransactionType.CCPayment,
      sections: [],
    });

    const { getByText, queryByTestId } = render(<TransactionsScreen />);

    expect(getByText('filtered')).toBeTruthy();
    expect(queryByTestId('transaction-row-skeletons')).toBeNull();
  });
});
