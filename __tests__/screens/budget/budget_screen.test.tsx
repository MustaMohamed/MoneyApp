import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { CategoryType } from '@/constants/enums';
import BudgetScreen from '@/modules/budget/screens/budget';
import { useBudget } from '@/modules/budget/screens/budget/budget.hook';

jest.mock('@/modules/budget/screens/budget/budget.hook', () => ({
  useBudget: jest.fn(),
}));
jest.mock('@/modules/budget/screens/budget/budget.state', () => ({
  useBudgetState: { useState: { targetCategoryId: jest.fn(() => undefined) } },
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}));
jest.mock('heroui-native', () => {
  const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
  function HeroText({ children }: { children?: ReactNode }) {
    return <Text>{children}</Text>;
  }
  HeroText.Heading = ({ children }: { children?: ReactNode }) => <Text>{children}</Text>;
  return {
    Separator: () => <View testID="separator" />,
    Surface: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
    Text: HeroText,
  };
});
jest.mock('@/components/ui/screen', () => ({
  Screen: ({ children }: { children?: ReactNode }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return <View>{children}</View>;
  },
  ScreenScroll: ({ children }: { children?: ReactNode }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return <View>{children}</View>;
  },
}));
jest.mock('@/components/ui/month_filter', () => ({
  MonthFilter: ({ selectedMonth }: { selectedMonth: string }) => {
    const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View testID="budget-month-filter">
        <Text>{selectedMonth}</Text>
      </View>
    );
  },
}));
jest.mock('@/components/ui/tabs', () => ({
  SegmentedTabs: ({ value }: { value: string }) => {
    const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View testID="budget-tabs">
        <Text>{`tab:${value}`}</Text>
      </View>
    );
  },
}));
jest.mock('@/components/ui/empty_state', () => ({
  EmptyState: ({ variant }: { variant: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{`empty:${variant}`}</Text>;
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
jest.mock('@/modules/budget/screens/budget/components/budget_screen_skeleton', () => ({
  BudgetScreenSkeleton: () => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return <View testID="budget-screen-skeleton" />;
  },
}));
jest.mock('@/modules/budget/screens/budget/components/summary_card', () => ({
  SummaryCard: () => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>summary-card</Text>;
  },
}));
jest.mock('@/modules/budget/screens/budget/components/budget_tool_rail', () => ({
  BudgetToolRail: ({
    onCopy,
    onAddCategory,
    copyDisabled,
    addCategoryDisabled,
  }: {
    onCopy: () => void;
    onAddCategory: () => void;
    copyDisabled: boolean;
    addCategoryDisabled: boolean;
  }) => {
    const { Pressable, Text, View } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View testID="budget-tool-rail">
        <Text>{`copy-disabled:${String(copyDisabled)}`}</Text>
        <Text>{`category-disabled:${String(addCategoryDisabled)}`}</Text>
        <Pressable accessibilityLabel="copy budget" onPress={onCopy}>
          <Text>copy</Text>
        </Pressable>
        <Pressable accessibilityLabel="add budget category" onPress={onAddCategory}>
          <Text>category</Text>
        </Pressable>
      </View>
    );
  },
}));
jest.mock('@/modules/budget/screens/budget/components/category_budget_row', () => ({
  CategoryBudgetRow: ({ row }: { row: { name: string } }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{`row:${row.name}`}</Text>;
  },
}));
jest.mock('@/modules/budget/screens/budget/components/budget_copy_sheet', () => ({
  BudgetCopySheet: () => null,
}));
jest.mock('@/modules/budget/screens/budget/components/set_budget_sheet', () => ({
  SetBudgetSheet: () => null,
}));
jest.mock('@/modules/budget/screens/budget/components/budget_delete_confirm_sheet', () => ({
  BudgetDeleteConfirmSheet: () => null,
}));
jest.mock('@/modules/budget/screens/budget/components/fifty_thirty_twenty_lens', () => ({
  FiftyThirtyTwentyLens: () => null,
}));

type BudgetHook = ReturnType<typeof useBudget>;
type BudgetScreenState = BudgetHook['state'];

const baseState: BudgetScreenState = {
  rows: [],
  overall: { budgeted: 0, spent: 0, left: 0, pct: 0 },
  month: '2026-07',
  daysLeft: 12,
  hasBudgets: false,
  budgetableCategories: [],
  buckets: { income: 0, hasIncome: false, buckets: [], ungrouped: 0, unallocated: 0 },
  suggestion: null,
  lensTab: 'categories',
  copySourceMonth: '2026-06',
  copyRows: [],
  copySheetVisible: false,
  copySelectedCategoryIds: [],
  hasLoaded: false,
};

const mockedUseBudget = jest.mocked(useBudget);

function mockUseBudget(state: Partial<BudgetScreenState> = {}) {
  mockedUseBudget.mockReturnValue({
    state: { ...baseState, ...state },
    openAdd: jest.fn(),
    openEdit: jest.fn(),
    setLensTab: jest.fn(),
    setSelectedMonth: jest.fn(),
    openCopy: jest.fn(),
    closeCopy: jest.fn(),
    toggleCopyCategoryId: jest.fn(),
    selectAllCopyCategories: jest.fn(),
    clearCopySelection: jest.fn(),
    copySelectedBudgets: jest.fn(),
    removeBudgetForMonth: jest.fn(),
    goToCategory: jest.fn(),
  });
}

describe('BudgetScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBudget();
  });

  it('shows the monthly skeleton footprint until budget data is ready', () => {
    const { getByTestId, queryByText } = render(<BudgetScreen />);

    expect(getByTestId('budget-screen-skeleton')).toBeTruthy();
    expect(queryByText('summary-card')).toBeNull();
  });

  it('renders the compact monthly workspace after data loads', () => {
    mockUseBudget({
      hasLoaded: true,
      hasBudgets: true,
      budgetableCategories: [
        {
          id: 'car',
          name: 'Car',
          type: CategoryType.Expense,
          icon: 'car',
          color: '#caa445',
          is_default: 0,
          sort_order: 0,
          budget_group: null,
          created_at: '',
          updated_at: '',
        },
      ],
      copyRows: [
        {
          categoryId: 'food',
          name: 'Food',
          icon: 'food',
          color: '#caa445',
          amount: 3000,
          status: 'new',
        },
      ],
      rows: [
        {
          categoryId: 'food',
          name: 'Food',
          icon: 'food',
          color: '#caa445',
          limit: 3000,
          spent: 500,
          available: 2500,
          pct: 0.16,
          status: 'under',
        },
      ],
    });

    const { getByText, queryByTestId } = render(<BudgetScreen />);

    expect(queryByTestId('budget-screen-skeleton')).toBeNull();
    expect(getByText('summary-card')).toBeTruthy();
    expect(getByText('copy-disabled:false')).toBeTruthy();
    expect(getByText('category-disabled:false')).toBeTruthy();
    expect(getByText('row:Food')).toBeTruthy();
  });

  it('routes tool rail actions through the budget hook', () => {
    const openCopy = jest.fn();
    const openAdd = jest.fn();
    mockedUseBudget.mockReturnValue({
      state: {
        ...baseState,
        hasLoaded: true,
        budgetableCategories: [
          {
            id: 'car',
            name: 'Car',
            type: CategoryType.Expense,
            icon: 'car',
            color: '#caa445',
            is_default: 0,
            sort_order: 0,
            budget_group: null,
            created_at: '',
            updated_at: '',
          },
        ],
        copyRows: [
          {
            categoryId: 'food',
            name: 'Food',
            icon: 'food',
            color: '#caa445',
            amount: 3000,
            status: 'new',
          },
        ],
      },
      openAdd,
      openEdit: jest.fn(),
      setLensTab: jest.fn(),
      setSelectedMonth: jest.fn(),
      openCopy,
      closeCopy: jest.fn(),
      toggleCopyCategoryId: jest.fn(),
      selectAllCopyCategories: jest.fn(),
      clearCopySelection: jest.fn(),
      copySelectedBudgets: jest.fn(),
      removeBudgetForMonth: jest.fn(),
      goToCategory: jest.fn(),
    });

    const { getByLabelText } = render(<BudgetScreen />);

    fireEvent.press(getByLabelText('copy budget'));
    fireEvent.press(getByLabelText('add budget category'));

    expect(openCopy).toHaveBeenCalledTimes(1);
    expect(openAdd).toHaveBeenCalledTimes(1);
  });
});
