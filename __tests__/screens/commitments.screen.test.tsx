import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import CommitmentsScreen from '@/modules/commitments/screens/commitments';
import { useCommitments } from '@/modules/commitments/screens/commitments/commitments.hook';

jest.mock('@/modules/commitments/screens/commitments/commitments.hook', () => ({
  useCommitments: jest.fn(),
}));
jest.mock('@/components/ui/screen', () => ({
  Screen: ({ children }: { children: ReactNode }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return <View>{children}</View>;
  },
}));
jest.mock('@/components/ui/month_filter', () => ({
  MonthFilter: ({ yearMonth }: { yearMonth: string }) => {
    const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View testID="commitments-month-filter">
        <Text>{yearMonth}</Text>
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
  SummaryHeader: () => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>Summary</Text>;
  },
}));
jest.mock('@/modules/commitments/screens/commitments/components/status_filter_chips', () => ({
  StatusFilterChips: () => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>Status filters</Text>;
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
  hasCommitments: false,
  statusFilter: 'all',
  categoriesById: new Map(),
  commitmentsById: new Map(),
};

const mockedUseCommitments = jest.mocked(useCommitments);

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
  });
}

describe('CommitmentsScreen', () => {
  beforeEach(() => {
    mockUseCommitments();
  });

  it('keeps the shared month filter mounted when the commitments list is empty', () => {
    const { getByTestId, getByText } = render(<CommitmentsScreen />);

    expect(getByTestId('commitments-month-filter')).toBeTruthy();
    expect(getByText('2026-08')).toBeTruthy();
  });
});
