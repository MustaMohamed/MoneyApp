import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { CategoryType } from '@/constants/enums';
import BudgetScreen from '@/modules/budget/screens/budget';
import { useBudget } from '@/modules/budget/screens/budget/budget.hook';

jest.mock('@/modules/budget/screens/budget/budget.hook', () => ({
  useBudget: jest.fn(),
}));
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@/modules/budget/screens/budget/budget.state', () => ({
  useBudgetState: { useState: { targetBudgetId: jest.fn(() => undefined) } },
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
  SegmentedTabs: ({
    segments,
    value,
  }: {
    segments: Array<{ label: string; value: string }>;
    value: string;
  }) => {
    const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View testID="budget-tabs">
        <Text>{`tab:${value}`}</Text>
        {segments.map((segment) => (
          <Text key={segment.value}>{`segment:${segment.label}`}</Text>
        ))}
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
  useConfirmAction: (action: unknown) => ({
    pendingPayload: null,
    busy: false,
    request: mockRequestDelete,
    confirm: jest.fn(),
    cancel: jest.fn(),
    action,
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
    onPlan,
    copyDisabled,
    addCategoryDisabled,
    planDisabled,
  }: {
    onCopy: () => void;
    onAddCategory: () => void;
    onPlan: () => void;
    copyDisabled: boolean;
    addCategoryDisabled: boolean;
    planDisabled: boolean;
  }) => {
    const { Pressable, Text, View } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View testID="budget-tool-rail">
        <Text>{`copy-disabled:${String(copyDisabled)}`}</Text>
        <Text>{`category-disabled:${String(addCategoryDisabled)}`}</Text>
        <Text>{`plan-disabled:${String(planDisabled)}`}</Text>
        <Pressable accessibilityLabel="copy budget" onPress={onCopy}>
          <Text>copy</Text>
        </Pressable>
        <Pressable accessibilityLabel="add budget category" onPress={onAddCategory}>
          <Text>category</Text>
        </Pressable>
        <Pressable accessibilityLabel="plan budget" onPress={onPlan}>
          <Text>plan</Text>
        </Pressable>
      </View>
    );
  },
}));
jest.mock('@/modules/budget/screens/budget/components/category_budget_row', () => ({
  CategoryBudgetRow: ({
    row,
    onEdit,
    onDelete,
  }: {
    row: {
      name: string;
      budgetCount?: number;
      budgets?: Array<{ id: string; name: string; amount: number }>;
    };
    onEdit: (id: string) => void;
    onDelete: (payload: { id: string; name: string }) => void;
  }) => {
    const { Pressable, Text, View } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View>
        <Text>{`category:${row.name}:${row.budgetCount ?? 0}`}</Text>
        {row.budgets?.map((budget) => (
          <View key={budget.id}>
            <Text>{`budget:${budget.name}:${budget.amount}`}</Text>
            <Pressable accessibilityLabel={`edit ${budget.name}`} onPress={() => onEdit(budget.id)}>
              <Text>edit</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`delete ${budget.name}`}
              onPress={() => onDelete({ id: budget.id, name: budget.name })}
            >
              <Text>delete</Text>
            </Pressable>
          </View>
        ))}
      </View>
    );
  },
}));
jest.mock('@/modules/budget/screens/budget/components/budget_copy_sheet', () => ({
  BudgetCopySheet: ({
    isOpen,
    sourceMonth,
    onSourceMonthChange,
  }: {
    isOpen: boolean;
    sourceMonth: string;
    onSourceMonthChange: (month: string) => void;
  }) => {
    const { Pressable, Text, View } =
      jest.requireActual<typeof import('react-native')>('react-native');
    if (!isOpen) return null;
    return (
      <View testID="budget-copy-sheet">
        <Text>{`copy-source:${sourceMonth}`}</Text>
        <Pressable
          accessibilityLabel="change copy source"
          onPress={() => onSourceMonthChange('2026-05')}
        >
          <Text>change copy source</Text>
        </Pressable>
      </View>
    );
  },
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

const mockRequestDelete = jest.fn();

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
  copySelectedBudgetIds: [],
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
    toggleCopyBudgetId: jest.fn(),
    selectAllCopyBudgets: jest.fn(),
    clearCopySelection: jest.fn(),
    setCopySourceMonth: jest.fn(),
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
          id: 'budget-food-copy',
          categoryId: 'food',
          categoryName: 'Food',
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
          budgetCount: 1,
          budgets: [{ id: 'budget-food', name: 'Food', amount: 3000 }],
        },
      ],
    });

    const { getByText, queryByTestId } = render(<BudgetScreen />);

    expect(queryByTestId('budget-screen-skeleton')).toBeNull();
    expect(getByText('summary-card')).toBeTruthy();
    expect(getByText('copy-disabled:false')).toBeTruthy();
    expect(getByText('category-disabled:false')).toBeTruthy();
    expect(getByText('plan-disabled:false')).toBeTruthy();
    expect(getByText('segment:Categories')).toBeTruthy();
    expect(getByText('segment:Plans')).toBeTruthy();
    expect(getByText('segment:50/30/20')).toBeTruthy();
    expect(getByText('category:Food:1')).toBeTruthy();
    expect(getByText('budget:Food:3000')).toBeTruthy();
  });

  it('renders multiple named budgets inside one category and keeps add budget enabled', () => {
    mockUseBudget({
      hasLoaded: true,
      hasBudgets: true,
      budgetableCategories: [
        {
          id: 'food',
          name: 'Food',
          type: CategoryType.Expense,
          icon: 'food',
          color: '#caa445',
          is_default: 0,
          sort_order: 0,
          budget_group: null,
          created_at: '',
          updated_at: '',
        },
      ],
      rows: [
        {
          categoryId: 'food',
          name: 'Food',
          icon: 'food',
          color: '#caa445',
          limit: 6500,
          spent: 1200,
          available: 5300,
          pct: 1200 / 6500,
          status: 'under',
          budgetCount: 2,
          budgets: [
            { id: 'budget-monthly-food', name: 'Monthly Food', amount: 5000 },
            { id: 'budget-trip-food', name: 'Alexandria Trip Food', amount: 1500 },
          ],
        },
      ],
    });

    const { getByText } = render(<BudgetScreen />);

    expect(getByText('category:Food:2')).toBeTruthy();
    expect(getByText('budget:Monthly Food:5000')).toBeTruthy();
    expect(getByText('budget:Alexandria Trip Food:1500')).toBeTruthy();
    expect(getByText('category-disabled:false')).toBeTruthy();
  });

  it('routes tool rail actions through the budget hook', () => {
    const openCopy = jest.fn();
    const openAdd = jest.fn();
    const setLensTab = jest.fn();
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
            id: 'budget-food-copy',
            categoryId: 'food',
            categoryName: 'Food',
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
      setLensTab,
      setSelectedMonth: jest.fn(),
      openCopy,
      closeCopy: jest.fn(),
      toggleCopyBudgetId: jest.fn(),
      selectAllCopyBudgets: jest.fn(),
      clearCopySelection: jest.fn(),
      setCopySourceMonth: jest.fn(),
      copySelectedBudgets: jest.fn(),
      removeBudgetForMonth: jest.fn(),
      goToCategory: jest.fn(),
    });

    const { getByLabelText } = render(<BudgetScreen />);

    fireEvent.press(getByLabelText('copy budget'));
    fireEvent.press(getByLabelText('add budget category'));
    fireEvent.press(getByLabelText('plan budget'));

    expect(openCopy).toHaveBeenCalledTimes(1);
    expect(openAdd).toHaveBeenCalledTimes(1);
    expect(setLensTab).toHaveBeenCalledWith('plans');
  });

  it('renders the temporary budget placeholder from the plans tab', () => {
    mockUseBudget({
      hasLoaded: true,
      lensTab: 'plans',
    });

    const { getByText, queryByText } = render(<BudgetScreen />);

    expect(getByText('tab:plans')).toBeTruthy();
    expect(getByText('Temporary budgets')).toBeTruthy();
    expect(queryByText('summary-card')).toBeNull();
  });

  it('keeps copy enabled when the default source month has no rows', () => {
    mockUseBudget({
      hasLoaded: true,
      month: '2026-09',
      copySourceMonth: '2026-08',
      copyRows: [],
    });

    const { getByText } = render(<BudgetScreen />);

    expect(getByText('copy-disabled:false')).toBeTruthy();
  });

  it('passes source month changes from the copy sheet to the budget hook', () => {
    const setCopySourceMonth = jest.fn();
    mockedUseBudget.mockReturnValue({
      state: {
        ...baseState,
        hasLoaded: true,
        copySheetVisible: true,
      },
      openAdd: jest.fn(),
      openEdit: jest.fn(),
      setLensTab: jest.fn(),
      setSelectedMonth: jest.fn(),
      openCopy: jest.fn(),
      closeCopy: jest.fn(),
      toggleCopyBudgetId: jest.fn(),
      selectAllCopyBudgets: jest.fn(),
      clearCopySelection: jest.fn(),
      setCopySourceMonth,
      copySelectedBudgets: jest.fn(),
      removeBudgetForMonth: jest.fn(),
      goToCategory: jest.fn(),
    });

    const { getByLabelText, getByText } = render(<BudgetScreen />);

    expect(getByText('copy-source:2026-06')).toBeTruthy();
    fireEvent.press(getByLabelText('change copy source'));

    expect(setCopySourceMonth).toHaveBeenCalledWith('2026-05');
  });

  it('routes child budget edit and delete actions by budget id', () => {
    const openEdit = jest.fn();
    mockUseBudget({
      hasLoaded: true,
      hasBudgets: true,
      rows: [
        {
          categoryId: 'food',
          name: 'Food',
          icon: 'food',
          color: '#caa445',
          limit: 6500,
          spent: 1200,
          available: 5300,
          pct: 1200 / 6500,
          status: 'under',
          budgetCount: 2,
          budgets: [
            { id: 'budget-monthly-food', name: 'Monthly Food', amount: 5000 },
            { id: 'budget-trip-food', name: 'Alexandria Trip Food', amount: 1500 },
          ],
        },
      ],
    });
    mockedUseBudget.mockReturnValue({
      ...mockedUseBudget(),
      openEdit,
    });

    const { getByLabelText } = render(<BudgetScreen />);

    fireEvent.press(getByLabelText('edit Alexandria Trip Food'));
    fireEvent.press(getByLabelText('delete Alexandria Trip Food'));

    expect(openEdit).toHaveBeenCalledWith('budget-trip-food');
    expect(mockRequestDelete).toHaveBeenCalledWith({
      id: 'budget-trip-food',
      name: 'Alexandria Trip Food',
    });
  });
});
