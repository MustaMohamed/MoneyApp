import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { CommitmentPaymentStatus, Currency } from '@/constants/enums';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import CommitmentsScreen from '@/modules/commitments/screens/commitments';
import { useCommitments } from '@/modules/commitments/screens/commitments/commitments.hook';

jest.mock('@/modules/commitments/screens/commitments/commitments.hook', () => ({
  useCommitments: jest.fn(),
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
    Alert: Object.assign(
      ({ children }: { children?: ReactNode }) => <View accessibilityRole="alert">{children}</View>,
      {
        Indicator: () => null,
        Content: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
        Title: ({ children }: { children?: ReactNode }) => <Text>{children}</Text>,
      },
    ),
    Separator: () => <View testID="separator" />,
    Spinner: () => <Text>spinner</Text>,
    Surface: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
    Text: HeroText,
    SkeletonGroup: Object.assign(SkeletonGroupRoot, { Item: SkeletonGroupItem }),
    PressableFeedback: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});
jest.mock('@/components/ui/button', () => ({
  Button: ({ label, onPress }: { label: string; onPress?: () => void }) => {
    const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <Pressable accessibilityRole="button" onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    );
  },
}));
jest.mock('@/components/ui/screen', () => ({
  Screen: ({ children }: { children: ReactNode }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return <View>{children}</View>;
  },
}));
jest.mock('@/components/ui/filter_rail', () => ({
  FilterRail: ({ selectedMonth }: { selectedMonth: string }) => {
    const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View testID="commitments-filter-rail">
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
jest.mock('@/modules/commitments/screens/commitments/components/empty_state', () => ({
  CommitmentsEmptyState: () => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>No commitments</Text>;
  },
}));
jest.mock('@/modules/commitments/screens/commitments/components/summary_header', () => ({
  SummaryHeader: ({ isLoading }: { isLoading?: boolean }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{`Summary loading:${String(isLoading)}`}</Text>;
  },
}));
jest.mock('@/modules/commitments/screens/commitments/components/search_row', () => ({
  CommitmentSearchRow: ({
    value,
    activeFilterCount,
    onChange,
    onOpenFilter,
  }: {
    value: string;
    activeFilterCount: number;
    onChange: (value: string) => void;
    onOpenFilter: () => void;
  }) => {
    const { Pressable, Text, View } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View testID="commitment-search-row">
        <Text>{`search:${value}`}</Text>
        <Text>{`filters:${activeFilterCount}`}</Text>
        <Pressable accessibilityRole="button" onPress={() => onChange('rent')}>
          <Text>change search</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => onChange('')}>
          <Text>clear search</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onOpenFilter}>
          <Text>open filters</Text>
        </Pressable>
      </View>
    );
  },
}));
jest.mock('@/modules/commitments/screens/commitments/components/commitment_row', () => ({
  CommitmentRow: () => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>Commitment row</Text>;
  },
}));
jest.mock(
  '@/modules/commitments/screens/commitments/components/commitment_delete_confirm_sheet',
  () => ({
    CommitmentDeleteConfirmSheet: () => null,
  }),
);
jest.mock('@/modules/commitments/screens/commitments/detail/components/skip_confirm_sheet', () => ({
  SkipConfirmSheet: () => null,
}));
jest.mock('@/modules/commitments/screens/commitments/filter', () => ({
  CommitmentFilterSheet: () => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>Commitment filter sheet</Text>;
  },
}));

type CommitmentsScreenHook = ReturnType<typeof useCommitments>;
type CommitmentsScreenState = CommitmentsScreenHook['state'];

const baseCommitmentsState: CommitmentsScreenState = {
  sections: [],
  selectedMonth: '2026-08',
  counts: { paid: 0, overdue: 0, due: 0, upcoming: 0, skipped: 0, total: 0 },
  totalsByCurrency: new Map<string, number>(),
  refreshing: false,
  isEmpty: true,
  commitmentsLoaded: true,
  paymentsLoaded: true,
  loading: false,
  loadError: false,
  presentation: 'content',
  hasLoaded: true,
  hasCommitments: false,
  statusFilter: 'all',
  searchQuery: '',
  activeFilterCount: 0,
  hasListFilters: false,
  categoriesById: new Map(),
  accountsById: new Map(),
  commitmentsById: new Map(),
};

const mockedUseCommitments = jest.mocked(useCommitments);
const setSearchQueryMock = jest.fn();
const clearSearchMock = jest.fn();
const openFilterMock = jest.fn();
const resetFiltersMock = jest.fn();

function makePayment(overrides: Partial<CommitmentPayment> = {}): CommitmentPayment {
  return {
    id: 'payment-1',
    commitment_id: 'commitment-1',
    due_date: '2026-08-05',
    paid_date: null,
    skipped_date: null,
    amount_due: 5000,
    amount_paid: null,
    currency: Currency.EGP,
    exchange_rate_snapshot: null,
    account_id: null,
    transaction_id: null,
    status: CommitmentPaymentStatus.Due,
    notes: null,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function mockUseCommitments(state: Partial<CommitmentsScreenState> = {}) {
  mockedUseCommitments.mockReturnValue({
    state: { ...baseCommitmentsState, ...state },
    navigateMonth: jest.fn(),
    selectMonth: jest.fn(),
    onRefresh: jest.fn(),
    goToDetail: jest.fn(),
    goToAdd: jest.fn(),
    goToEdit: jest.fn(),
    skipPayment: jest.fn(),
    deactivateCommitment: jest.fn(),
    setStatusFilter: jest.fn(),
    setSearchQuery: setSearchQueryMock,
    clearSearch: clearSearchMock,
    openFilter: openFilterMock,
    resetFilters: resetFiltersMock,
  });
}

describe('CommitmentsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCommitments();
  });

  it('keeps the shared filter rail mounted when the commitments list is empty', () => {
    const { getByTestId, getByText } = render(<CommitmentsScreen />);

    expect(getByTestId('commitments-filter-rail')).toBeTruthy();
    expect(getByText('2026-08')).toBeTruthy();
  });

  it('renders the compact search row and advanced filter sheet when commitments exist', () => {
    mockUseCommitments({
      hasCommitments: true,
      isEmpty: true,
      searchQuery: 'rent',
      activeFilterCount: 2,
    });

    const { getByTestId, getByText } = render(<CommitmentsScreen />);

    expect(getByTestId('commitment-search-row')).toBeTruthy();
    expect(getByText('search:rent')).toBeTruthy();
    expect(getByText('filters:2')).toBeTruthy();
    expect(getByText('Commitment filter sheet')).toBeTruthy();
  });

  it('passes payments loading state to the summary header', () => {
    mockUseCommitments({
      hasCommitments: true,
      paymentsLoaded: false,
      presentation: 'coldLoading',
      hasLoaded: false,
      sections: [{ title: 'Due', data: [makePayment()] }],
    });

    const { getByText } = render(<CommitmentsScreen />);

    expect(getByText('Summary loading:true')).toBeTruthy();
  });

  it('shows row skeletons instead of the list spinner while payments load', () => {
    mockUseCommitments({
      hasCommitments: true,
      paymentsLoaded: false,
      presentation: 'coldLoading',
      hasLoaded: false,
      sections: [],
    });

    const { getByTestId, queryByText } = render(<CommitmentsScreen />);

    expect(getByTestId('commitment-row-skeletons')).toBeTruthy();
    expect(queryByText('spinner')).toBeNull();
  });

  it('keeps the summary and search row mounted during the first commitments load', () => {
    mockUseCommitments({
      commitmentsLoaded: false,
      paymentsLoaded: false,
      presentation: 'coldLoading',
      hasLoaded: false,
      hasCommitments: false,
      sections: [],
    });

    const { getByTestId, getByText, queryByText } = render(<CommitmentsScreen />);

    expect(getByText('Summary loading:true')).toBeTruthy();
    expect(getByTestId('commitment-search-row')).toBeTruthy();
    expect(getByTestId('commitment-row-skeletons')).toBeTruthy();
    expect(queryByText('No commitments')).toBeNull();
  });

  it('keeps loaded commitment rows visible while manually refreshing loaded commitments', () => {
    mockUseCommitments({
      commitmentsLoaded: true,
      paymentsLoaded: true,
      refreshing: true,
      hasCommitments: true,
      sections: [{ title: 'Due', data: [makePayment()] }],
    });

    const { getByText, queryByTestId } = render(<CommitmentsScreen />);

    expect(getByText('Summary loading:false')).toBeTruthy();
    expect(getByText('Commitment row')).toBeTruthy();
    expect(queryByTestId('commitment-row-skeletons')).toBeNull();
  });

  it('does not show row skeletons behind a filtered empty state while refreshing', () => {
    mockUseCommitments({
      commitmentsLoaded: true,
      paymentsLoaded: true,
      refreshing: true,
      hasCommitments: true,
      isEmpty: true,
      hasListFilters: true,
      statusFilter: CommitmentPaymentStatus.Paid,
      sections: [],
    });

    const { getByText, queryByTestId } = render(<CommitmentsScreen />);

    expect(getByText('filtered')).toBeTruthy();
    expect(queryByTestId('commitment-row-skeletons')).toBeNull();
  });

  it('wires controlled search changes and open filter actions from the search row', () => {
    mockUseCommitments({ hasCommitments: true, isEmpty: true });

    const { getByText } = render(<CommitmentsScreen />);

    fireEvent.press(getByText('change search'));
    fireEvent.press(getByText('clear search'));
    fireEvent.press(getByText('open filters'));

    expect(setSearchQueryMock).toHaveBeenCalledWith('rent');
    expect(setSearchQueryMock).toHaveBeenLastCalledWith('');
    expect(clearSearchMock).not.toHaveBeenCalled();
    expect(openFilterMock).toHaveBeenCalledTimes(1);
  });

  it('shows filtered empty state when search or advanced filters are active', () => {
    mockUseCommitments({
      hasCommitments: true,
      isEmpty: true,
      statusFilter: 'all',
      hasListFilters: true,
    });

    const { getByText } = render(<CommitmentsScreen />);

    expect(getByText('filtered')).toBeTruthy();
  });
});
