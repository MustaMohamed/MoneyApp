import { fireEvent, render, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Dimensions } from 'react-native';

import type { AccountChipModel } from '@/components/ui/account_chips.helpers';
import { LIST_RAIL_ALL_OPTION } from '@/components/ui/list_rail';
import { LIST_RAIL } from '@/components/ui/list_rail.geometry';
import type { SearchTallyModel } from '@/components/ui/search_tally';
import { CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { CommitmentMonthPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import CommitmentsScreen from '@/modules/commitments/screens/commitments';
import type { CommitmentsSection } from '@/modules/commitments/screens/commitments/commitments.helpers';
import { useCommitments } from '@/modules/commitments/screens/commitments/commitments.hook';
import {
  resolveCommitmentRowCaptionLines,
  resolveCommitmentRowHeight,
} from '@/modules/commitments/screens/commitments/components/commitment_row.helpers';
import { buildCommitmentsHeroModel } from '@/modules/commitments/screens/commitments/components/commitments_hero.helpers';
import { STATUS_ICONS, STATUS_LABELS } from '@/modules/commitments/utils/commitment_status';
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
  Screen: ({ children, testID }: { children: ReactNode; testID?: string }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return <View testID={testID}>{children}</View>;
  },
}));
jest.mock('@/components/ui/month_filter', () => {
  const monthFilterProps: { last: object | undefined } = { last: undefined };
  return {
    monthFilterProps,
    MonthFilter: (props: object) => {
      const { View } = jest.requireActual<typeof import('react-native')>('react-native');
      monthFilterProps.last = props;
      return <View testID="commitments-month-filter" />;
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
      return <View testID="commitments-segment-filter" />;
    },
  };
});
jest.mock('@/components/ui/account_chips', () => {
  const accountChipsProps: { last: object | undefined } = { last: undefined };
  return {
    accountChipsProps,
    AccountChips: (props: {
      chips: ReadonlyArray<{ accountId: string | undefined; label: string }>;
      onToggle: (accountId: string | undefined) => void;
      testID: string;
    }) => {
      const { Pressable, Text, View } =
        jest.requireActual<typeof import('react-native')>('react-native');
      accountChipsProps.last = props;
      return (
        <View testID={props.testID}>
          {props.chips.map((chip) => (
            <Pressable
              key={chip.label}
              accessibilityRole="button"
              onPress={() => props.onToggle(chip.accountId)}
            >
              <Text>{`chip:${chip.label}`}</Text>
            </Pressable>
          ))}
        </View>
      );
    },
  };
});
jest.mock('@/components/ui/search_tally', () => {
  const searchTallyProps: { last: object | undefined } = { last: undefined };
  return {
    searchTallyProps,
    SearchTally: (props: { testID: string }) => {
      const { View } = jest.requireActual<typeof import('react-native')>('react-native');
      searchTallyProps.last = props;
      return <View testID={props.testID} />;
    },
  };
});
jest.mock('@/components/ui/empty_state', () => ({
  EmptyState: ({ variant, monthName }: { variant: string; monthName?: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{monthName === undefined ? variant : `${variant}:${monthName}`}</Text>;
  },
}));
// `jest.config.js` leaves uniwind's TypeScript source untransformed.
jest.mock('uniwind', () => ({ withUniwind: <T,>(component: T): T => component }));
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
  listRef: { current: null },
  listKey: undefined,
  sections: [],
  selectedMonth: '2026-08',
  emptyMonthName: 'August',
  refreshing: false,
  isEmpty: true,
  commitmentsLoaded: true,
  paymentsLoaded: true,
  loading: false,
  loadError: false,
  presentation: 'content',
  floatingAlert: undefined,
  today: '2026-05-08',
  emptyVariant: 'noCommitments',
  statusFilter: 'all',
  searchQuery: '',
  activeFilterCount: 0,
  categoriesById: new Map(),
  accountsById: new Map(),
  commitmentsById: new Map(),
  accountChips: [],
  tally: {
    mode: 'empty',
    count: undefined,
    label: '',
    filterSummary: undefined,
    sum: undefined,
    accessibilityLabel: undefined,
  },
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
interface RailHitSlop {
  top: number;
  bottom: number;
}

interface MonthFilterMockProps {
  selectedMonth?: string;
  rowHitSlop?: RailHitSlop;
}

interface SegmentFilterMockProps {
  filters: ReadonlyArray<{ value: string; label: string; icon?: { name: string } }>;
  corners?: string;
  triggerHitSlop?: RailHitSlop;
}

const { monthFilterProps } = jest.requireMock<{
  monthFilterProps: { last: MonthFilterMockProps | undefined };
}>('@/components/ui/month_filter');
const { segmentFilterProps } = jest.requireMock<{
  segmentFilterProps: { last: SegmentFilterMockProps | undefined };
}>('@/components/ui/segment_filter');
const { accountChipsProps } = jest.requireMock<{
  accountChipsProps: { last: { chips: readonly AccountChipModel[] } | undefined };
}>('@/components/ui/account_chips');
const { searchTallyProps } = jest.requireMock<{
  searchTallyProps: { last: { model: SearchTallyModel; testID: string } | undefined };
}>('@/components/ui/search_tally');

const STATUS_TABS = [
  CommitmentPaymentStatus.Overdue,
  CommitmentPaymentStatus.Due,
  CommitmentPaymentStatus.Upcoming,
  CommitmentPaymentStatus.Paid,
  CommitmentPaymentStatus.Skipped,
];

const mockedUseCommitments = jest.mocked(useCommitments);
const toggleAccountChipMock = jest.fn();
const setSearchQueryMock = jest.fn();
const clearSearchMock = jest.fn();
const openFilterMock = jest.fn();
const resetFiltersMock = jest.fn();
const retryAccountLookupMock = jest.fn();
const onRefreshMock = jest.fn();
const retryLoadMock = jest.fn();

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
    retryLoad: retryLoadMock,
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
    toggleAccountChip: toggleAccountChipMock,
  });
}

function chip(accountId: string | undefined, label: string, selected: boolean): AccountChipModel {
  return {
    accountId,
    label,
    accessibilityLabel: label,
    tile: undefined,
    selected,
  };
}

describe('CommitmentsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    heroRenders.count = 0;
    mockUseCommitments();
  });

  it('keeps the month row and the status rail mounted when the commitments list is empty', async () => {
    const { getByTestId } = await render(<CommitmentsScreen />);

    expect(
      within(getByTestId('commitments-rail')).getByTestId('commitments-month-filter'),
    ).toBeTruthy();
    expect(getByTestId('commitments-segment-filter')).toBeTruthy();
    expect(monthFilterProps.last?.selectedMonth).toBe('2026-08');
  });

  it('MA-241: the rail hands the month row and the iconed status tabs the list rail space and hit slops in form corners, a chip toggles its account, and the tally slot draws the hook tally; MA-271: the shared All option leads the labels in order', async () => {
    const chips = [
      chip(undefined, 'All accounts', false),
      chip('account-cib', 'CIB', true),
      chip('account-payoneer', 'Payoneer', false),
    ];
    const tally: SearchTallyModel = {
      mode: 'figures',
      count: '2',
      label: 'payments',
      filterSummary: undefined,
      sum: { text: '1,500', polarity: 'neutral', currencyCode: 'EGP' },
      accessibilityLabel: '2 payments, 1,500 EGP',
    };
    mockUseCommitments({ emptyVariant: 'emptyMonth', accountChips: chips, tally });

    const { getByTestId, getByText } = await render(<CommitmentsScreen />);

    const filters = segmentFilterProps.last?.filters ?? [];
    expect(filters.map(({ value }) => value)).toEqual(['all', ...STATUS_TABS]);
    expect(filters.map(({ label }) => label)).toEqual([
      Strings.filterAll,
      ...STATUS_TABS.map((status) => STATUS_LABELS[status]),
    ]);
    expect(filters[0]).toBe(LIST_RAIL_ALL_OPTION);
    const iconByValue = new Map(filters.map(({ value, icon }) => [value, icon?.name]));
    for (const status of STATUS_TABS) {
      expect(iconByValue.get(status)).toBe(STATUS_ICONS[status]);
    }
    expect(iconByValue.get('all')).toBeDefined();
    expect(segmentFilterProps.last?.corners).toBe('form');
    expect(monthFilterProps.last?.rowHitSlop).toEqual(LIST_RAIL.monthRowHitSlop);
    expect(segmentFilterProps.last?.triggerHitSlop).toEqual(LIST_RAIL.tabsHitSlop);
    expect(getByTestId('commitments-rail')).toHaveStyle({
      paddingTop: LIST_RAIL.space,
      paddingBottom: LIST_RAIL.space,
    });
    expect(getByTestId('commitments-segment-filter').parent).toHaveStyle({
      marginTop: LIST_RAIL.space,
    });

    const header = getByTestId('commitments-list-header');
    expect(within(header).getByTestId('commitments-account-chips')).toBeTruthy();
    expect(accountChipsProps.last?.chips).toBe(chips);
    await fireEvent.press(getByText('chip:Payoneer'));
    expect(toggleAccountChipMock).toHaveBeenLastCalledWith('account-payoneer');
    await fireEvent.press(getByText('chip:All accounts'));
    expect(toggleAccountChipMock).toHaveBeenLastCalledWith(undefined);

    expect(within(header).getByTestId('commitments-search-tally')).toBeTruthy();
    expect(searchTallyProps.last?.model).toBe(tally);
  });

  it('renders the compact search row and advanced filter sheet when commitments exist', async () => {
    mockUseCommitments({
      emptyVariant: 'noResults',
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
      emptyVariant: 'none',
      paymentsLoaded: false,
      presentation: 'coldLoading',
      sections: [dueSection()],
    });

    const { getByText } = await render(<CommitmentsScreen />);

    expect(getByText('Hero mode:skeleton')).toBeTruthy();
  });

  it('shows row skeletons instead of the list spinner while payments load', async () => {
    mockUseCommitments({
      emptyVariant: 'none',
      paymentsLoaded: false,
      presentation: 'coldLoading',
      sections: [],
    });

    const { getByTestId, queryByText } = await render(<CommitmentsScreen />);

    expect(getByTestId('commitment-row-skeletons')).toBeTruthy();
    expect(queryByText('spinner')).toBeNull();
  });

  it('draws two day cards of three row skeletons, each row at the loaded row height with tile, name, a due-day bar per caption line, amount and day-indicator bars', async () => {
    mockUseCommitments({
      emptyVariant: 'none',
      paymentsLoaded: false,
      presentation: 'coldLoading',
      sections: [],
    });

    const { getAllByTestId } = await render(<CommitmentsScreen />);

    const { fontScale } = Dimensions.get('window');
    const rows = getAllByTestId('commitment-row-skeleton');
    expect(rows).toHaveLength(6);
    expect(getAllByTestId('day-card-skeleton-header')).toHaveLength(2);
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
      emptyVariant: 'none',
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
      emptyVariant: 'none',
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
      emptyVariant: 'noResults',
      isEmpty: true,
      statusFilter: CommitmentPaymentStatus.Paid,
      sections: [],
    });

    const { getByText, queryByTestId } = await render(<CommitmentsScreen />);

    expect(getByText('filtered')).toBeTruthy();
    expect(queryByTestId('commitment-row-skeletons')).toBeNull();
  });

  it('wires controlled search changes and open filter actions from the search row', async () => {
    mockUseCommitments({ emptyVariant: 'emptyMonth', isEmpty: true });

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
    mockUseCommitments({ emptyVariant: 'emptyMonth', hero });
    const { getByText, rerender } = await render(<CommitmentsScreen />);

    expect(heroRenders.count).toBe(1);

    mockUseCommitments({ emptyVariant: 'noResults', hero, searchQuery: 'rent' });
    await rerender(<CommitmentsScreen />);

    expect(getByText('search:rent')).toBeTruthy();
    expect(heroRenders.count).toBe(1);

    mockUseCommitments({
      emptyVariant: 'noResults',
      hero: { ...hero, mode: 'figures' },
      searchQuery: 'rent',
    });
    await rerender(<CommitmentsScreen />);

    expect(getByText('Hero mode:figures')).toBeTruthy();
    expect(heroRenders.count).toBe(2);
  });

  it('shows filtered empty state when search or advanced filters are active', async () => {
    mockUseCommitments({
      emptyVariant: 'noResults',
      isEmpty: true,
      statusFilter: 'all',
    });

    const { getByText } = await render(<CommitmentsScreen />);

    expect(getByText('filtered')).toBeTruthy();
  });

  it('MA-214: draws the no-commitments state when the hook reads noCommitments', async () => {
    mockUseCommitments({ emptyVariant: 'noCommitments' });

    const { getByText, queryByText } = await render(<CommitmentsScreen />);

    expect(getByText('No commitments')).toBeTruthy();
    expect(queryByText('filtered')).toBeNull();
  });

  it('MA-214: draws the empty month under the name the hook gives it', async () => {
    mockUseCommitments({ emptyVariant: 'emptyMonth', emptyMonthName: 'December' });

    const { getByText, queryByText } = await render(<CommitmentsScreen />);

    expect(getByText('commitmentsMonth:December')).toBeTruthy();
    expect(queryByText('No commitments')).toBeNull();
  });

  it('MA-214: a first-load failure draws the error state whose Try again runs retryLoad', async () => {
    mockUseCommitments({
      presentation: 'coldError',
      emptyVariant: 'none',
      loadError: true,
    });

    const { getByTestId, getByText, queryByTestId, queryByText } = await render(
      <CommitmentsScreen />,
    );

    expect(getByTestId('commitments-load-error')).toBeTruthy();
    expect(getByText(Strings.commitmentsLoadError)).toBeTruthy();
    expect(getByText(Strings.commitmentsLoadErrorDescription)).toBeTruthy();
    expect(queryByTestId('commitment-row-skeletons')).toBeNull();
    expect(queryByText(Strings.commitmentsRefreshError)).toBeNull();
    await fireEvent.press(getByText(Strings.commitmentsLoadRetry));
    expect(retryLoadMock).toHaveBeenCalledTimes(1);
    expect(onRefreshMock).not.toHaveBeenCalled();
  });

  it('MA-214: a refresh failure floats the alert over the rows and its Try again runs retryLoad', async () => {
    mockUseCommitments({
      presentation: 'contentWithError',
      emptyVariant: 'none',
      loadError: true,
      isEmpty: false,
      sections: [dueSection()],
      floatingAlert: 'list',
    });

    const { getByText, queryByText } = await render(<CommitmentsScreen />);

    expect(getByText(Strings.commitmentsRefreshError)).toBeTruthy();
    expect(getByText('Commitment row')).toBeTruthy();
    expect(queryByText(Strings.commitmentsLoadErrorDescription)).toBeNull();
    await fireEvent.press(getByText(Strings.commitmentsLoadRetry));
    expect(retryLoadMock).toHaveBeenCalledTimes(1);
    expect(onRefreshMock).not.toHaveBeenCalled();
  });

  it('MA-234: floats the account names alert whose Try again reads the accounts again', async () => {
    mockUseCommitments({
      emptyVariant: 'none',
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
