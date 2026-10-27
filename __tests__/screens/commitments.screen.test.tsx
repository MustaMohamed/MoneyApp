import { fireEvent, render, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Dimensions } from 'react-native';

import { CommitmentPaymentStatus } from '@/constants/enums';
import type { CommitmentMonthPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import CommitmentsScreen from '@/modules/commitments/screens/commitments';
import type { CommitmentsSection } from '@/modules/commitments/screens/commitments/commitments.helpers';
import { useCommitments } from '@/modules/commitments/screens/commitments/commitments.hook';
import {
  resolveCommitmentRowCaptionLines,
  resolveCommitmentRowHeight,
} from '@/modules/commitments/screens/commitments/components/commitment_row.helpers';
import { buildCommitmentsHeroModel } from '@/modules/commitments/screens/commitments/components/commitments_hero.helpers';
import { makeTestMonthPayment } from '@/test_helpers/commitment';

jest.mock('@/modules/commitments/screens/commitments/commitments.hook', () => ({
  useCommitments: jest.fn(),
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
    Typography,
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
// The floating arm's toast hold calls `useFocusEffect`, which needs a navigator.
jest.mock('@/components/ui/load_error_alert.hook', () => ({
  useFloatingAlertToastHold: () => ({ frameRef: { current: null }, holdClearance: jest.fn() }),
}));
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
jest.mock('@/modules/commitments/screens/commitments/components/commitments_hero', () => {
  const heroRenders = { count: 0 };
  return {
    heroRenders,
    CommitmentsHero: ({ model }: { model: { mode: string } }) => {
      const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
      heroRenders.count += 1;
      return <Text>{`Hero mode:${model.mode}`}</Text>;
    },
  };
});
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
jest.mock('@/components/ui/day_header', () => ({
  DayHeader: ({ section }: { section: { label: string } }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{section.label}</Text>;
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
  refreshing: false,
  isEmpty: true,
  commitmentsLoaded: true,
  paymentsLoaded: true,
  loading: false,
  loadError: false,
  presentation: 'content',
  floatingAlert: undefined,
  hasLoaded: true,
  today: '2026-05-08',
  hasCommitments: false,
  statusFilter: 'all',
  searchQuery: '',
  activeFilterCount: 0,
  hasListFilters: false,
  categoriesById: new Map(),
  accountsById: new Map(),
  commitmentsById: new Map(),
  tally: undefined,
  liveRate: 50,
  hero: buildCommitmentsHeroModel({
    mode: 'skeleton',
    aggregate: undefined,
    rate: 50,
    yearMonth: '2026-08',
    today: '2026-05-08',
  }),
};

const { heroRenders } = jest.requireMock<{ heroRenders: { count: number } }>(
  '@/modules/commitments/screens/commitments/components/commitments_hero',
);
const mockedUseCommitments = jest.mocked(useCommitments);
const setSearchQueryMock = jest.fn();
const clearSearchMock = jest.fn();
const openFilterMock = jest.fn();
const resetFiltersMock = jest.fn();
const retryAccountLookupMock = jest.fn();
const onRefreshMock = jest.fn();

function makePayment(overrides: Partial<CommitmentMonthPayment> = {}): CommitmentMonthPayment {
  return makeTestMonthPayment({
    id: 'payment-1',
    commitment_id: 'commitment-1',
    due_date: '2026-08-05',
    amount_due: 5000,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  });
}

function dueSection(): CommitmentsSection {
  return {
    key: CommitmentPaymentStatus.Due,
    label: 'Due today',
    tone: 'default',
    figures: { mode: 'figures', net: '5,000 EGP', count: '1' },
    accessibilityLabel: 'Due today, 5,000 EGP, 1 payment',
    data: [makePayment()],
  };
}

function mockUseCommitments(state: Partial<CommitmentsScreenState> = {}) {
  mockedUseCommitments.mockReturnValue({
    state: { ...baseCommitmentsState, ...state },
    navigateMonth: jest.fn(),
    selectMonth: jest.fn(),
    onRefresh: onRefreshMock,
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
    retryAccountLookup: retryAccountLookupMock,
  });
}

describe('CommitmentsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    heroRenders.count = 0;
    mockUseCommitments();
  });

  it('keeps the shared filter rail mounted when the commitments list is empty', async () => {
    const { getByTestId, getByText } = await render(<CommitmentsScreen />);

    expect(getByTestId('commitments-filter-rail')).toBeTruthy();
    expect(getByText('2026-08')).toBeTruthy();
  });

  it('renders the compact search row and advanced filter sheet when commitments exist', async () => {
    mockUseCommitments({
      hasCommitments: true,
      isEmpty: true,
      searchQuery: 'rent',
      activeFilterCount: 2,
    });

    const { getByTestId, getByText } = await render(<CommitmentsScreen />);

    expect(getByTestId('commitment-search-row')).toBeTruthy();
    expect(getByText('search:rent')).toBeTruthy();
    expect(getByText('filters:2')).toBeTruthy();
    expect(getByText('Commitment filter sheet')).toBeTruthy();
  });

  it('passes the skeleton hero model while payments load', async () => {
    mockUseCommitments({
      hasCommitments: true,
      paymentsLoaded: false,
      presentation: 'coldLoading',
      hasLoaded: false,
      sections: [dueSection()],
    });

    const { getByText } = await render(<CommitmentsScreen />);

    expect(getByText('Hero mode:skeleton')).toBeTruthy();
  });

  it('shows row skeletons instead of the list spinner while payments load', async () => {
    mockUseCommitments({
      hasCommitments: true,
      paymentsLoaded: false,
      presentation: 'coldLoading',
      hasLoaded: false,
      sections: [],
    });

    const { getByTestId, queryByText } = await render(<CommitmentsScreen />);

    expect(getByTestId('commitment-row-skeletons')).toBeTruthy();
    expect(queryByText('spinner')).toBeNull();
  });

  it('draws each row skeleton at the loaded row height with tile, name, a due-day bar per caption line, amount and day-indicator bars', async () => {
    mockUseCommitments({
      hasCommitments: true,
      paymentsLoaded: false,
      presentation: 'coldLoading',
      hasLoaded: false,
      sections: [],
    });

    const { getAllByTestId } = await render(<CommitmentsScreen />);

    const { fontScale } = Dimensions.get('window');
    const rows = getAllByTestId('commitment-row-skeleton');
    expect(rows.length).toBeGreaterThan(0);
    // MA-243: jest's font scale is 2, so the due-day bar takes a second line, as the loaded subline does.
    expect(fontScale).toBe(2);
    for (const row of rows) {
      expect(row).toHaveStyle({ height: resolveCommitmentRowHeight(fontScale) });
      expect(within(row).getAllByTestId('skeleton-item')).toHaveLength(
        4 + resolveCommitmentRowCaptionLines(fontScale),
      );
    }
  });

  it('keeps the hero and search row mounted during the first commitments load', async () => {
    mockUseCommitments({
      commitmentsLoaded: false,
      paymentsLoaded: false,
      presentation: 'coldLoading',
      hasLoaded: false,
      hasCommitments: false,
      sections: [],
    });

    const { getByTestId, getByText, queryByText } = await render(<CommitmentsScreen />);

    expect(getByText('Hero mode:skeleton')).toBeTruthy();
    expect(getByTestId('commitment-search-row')).toBeTruthy();
    expect(getByTestId('commitment-row-skeletons')).toBeTruthy();
    expect(queryByText('No commitments')).toBeNull();
  });

  it('keeps loaded commitment rows visible while manually refreshing loaded commitments', async () => {
    mockUseCommitments({
      commitmentsLoaded: true,
      paymentsLoaded: true,
      refreshing: true,
      hasCommitments: true,
      sections: [dueSection()],
      hero: { ...baseCommitmentsState.hero, mode: 'figures' },
    });

    const { getByText, queryByTestId } = await render(<CommitmentsScreen />);

    expect(getByText('Hero mode:figures')).toBeTruthy();
    expect(getByText('Commitment row')).toBeTruthy();
    expect(queryByTestId('commitment-row-skeletons')).toBeNull();
  });

  it('does not show row skeletons behind a filtered empty state while refreshing', async () => {
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

    const { getByText, queryByTestId } = await render(<CommitmentsScreen />);

    expect(getByText('filtered')).toBeTruthy();
    expect(queryByTestId('commitment-row-skeletons')).toBeNull();
  });

  it('wires controlled search changes and open filter actions from the search row', async () => {
    mockUseCommitments({ hasCommitments: true, isEmpty: true });

    const { getByText } = await render(<CommitmentsScreen />);

    await fireEvent.press(getByText('change search'));
    await fireEvent.press(getByText('clear search'));
    await fireEvent.press(getByText('open filters'));

    expect(setSearchQueryMock).toHaveBeenCalledWith('rent');
    expect(setSearchQueryMock).toHaveBeenLastCalledWith('');
    expect(clearSearchMock).not.toHaveBeenCalled();
    expect(openFilterMock).toHaveBeenCalledTimes(1);
  });

  it('does not re-render the hero on a search keystroke, only on a new hero model', async () => {
    const hero = baseCommitmentsState.hero;
    mockUseCommitments({ hasCommitments: true, hero });
    const { getByText, rerender } = await render(<CommitmentsScreen />);

    expect(heroRenders.count).toBe(1);

    mockUseCommitments({ hasCommitments: true, hero, searchQuery: 'rent' });
    await rerender(<CommitmentsScreen />);

    expect(getByText('search:rent')).toBeTruthy();
    expect(heroRenders.count).toBe(1);

    mockUseCommitments({
      hasCommitments: true,
      hero: { ...hero, mode: 'figures' },
      searchQuery: 'rent',
    });
    await rerender(<CommitmentsScreen />);

    expect(getByText('Hero mode:figures')).toBeTruthy();
    expect(heroRenders.count).toBe(2);
  });

  it('shows filtered empty state when search or advanced filters are active', async () => {
    mockUseCommitments({
      hasCommitments: true,
      isEmpty: true,
      statusFilter: 'all',
      hasListFilters: true,
    });

    const { getByText } = await render(<CommitmentsScreen />);

    expect(getByText('filtered')).toBeTruthy();
  });

  it('MA-234: floats the account names alert whose Try again reads the accounts again', async () => {
    mockUseCommitments({
      hasCommitments: true,
      isEmpty: false,
      sections: [dueSection()],
      floatingAlert: 'accounts',
    });

    const { getByTestId, getByText } = await render(<CommitmentsScreen />);

    expect(getByTestId('commitments-account-lookup-error')).toBeTruthy();
    expect(getByText("Couldn't load account names.")).toBeTruthy();
    await fireEvent.press(getByText('Try again'));
    expect(retryAccountLookupMock).toHaveBeenCalledTimes(1);
    expect(onRefreshMock).not.toHaveBeenCalled();
  });
});
