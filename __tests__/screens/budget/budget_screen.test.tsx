import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

import { BudgetGroup, CategoryType } from '@/constants/enums';
import { Colors } from '@/constants/theme';
import BudgetScreen from '@/modules/budget/screens/budget';
import { useBudget } from '@/modules/budget/screens/budget/budget.hook';
import type {
  CategoryBudgetRowVM,
  NamedBudgetVM,
} from '@/modules/budget/screens/budget/budget_categories.types';

interface RefreshControlTestProps {
  refreshing: boolean;
  onRefresh: () => void;
}

let latestRefreshControl: ReactElement<RefreshControlTestProps> | undefined;
let mockPendingConfirmPayload: { id: string; name: string } | null = null;

jest.mock('@/modules/budget/screens/budget/budget.hook', () => ({
  useBudget: jest.fn(),
}));
jest.mock('@/components/ui/button', () => ({
  Button: ({ label, onPress }: { label: string; onPress: () => void }) => {
    const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        <Text>{label}</Text>
      </Pressable>
    );
  },
}));
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@/modules/budget/screens/budget/budget.state', () => ({
  useBudgetState: {
    useState: {
      targetBudgetId: jest.fn(() => undefined),
      targetPlanId: jest.fn(() => undefined),
    },
  },
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
  ScreenScroll: ({
    children,
    refreshControl,
  }: {
    children?: ReactNode;
    refreshControl?: ReactElement<RefreshControlTestProps>;
  }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    latestRefreshControl = refreshControl;
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
  useConfirmAction: (action: (payload: { id: string; name: string }) => Promise<void>) => ({
    pendingPayload: mockPendingConfirmPayload,
    busy: false,
    request: (payload: { id: string; name: string }) => {
      mockPendingConfirmPayload = payload;
      mockRequestDelete(payload);
    },
    confirm: jest.fn(() =>
      mockPendingConfirmPayload === null ? undefined : action(mockPendingConfirmPayload),
    ),
    cancel: jest.fn(() => {
      mockPendingConfirmPayload = null;
    }),
    action,
  }),
}));
jest.mock('@/modules/budget/screens/budget/components/budget_screen_skeleton', () => ({
  BudgetScreenSkeleton: ({ variant = 'categories' }: { variant?: string }) => {
    const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View testID="budget-screen-skeleton">
        <Text>{`skeleton:${variant}`}</Text>
      </View>
    );
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
    variant = 'categories',
    onCopy,
    onAddCategory,
    onPlan,
    copyDisabled,
    addCategoryDisabled,
    planDisabled,
  }: {
    variant?: 'categories' | 'plans';
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
        <Text>{`rail:${variant}`}</Text>
        {variant === 'categories' ? (
          <>
            <Text>{`copy-disabled:${String(copyDisabled)}`}</Text>
            <Text>{`category-disabled:${String(addCategoryDisabled)}`}</Text>
            <Pressable accessibilityLabel="copy budget" onPress={onCopy}>
              <Text>copy</Text>
            </Pressable>
            <Pressable accessibilityLabel="add budget category" onPress={onAddCategory}>
              <Text>category</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text>{`plan-disabled:${String(planDisabled)}`}</Text>
            <Pressable accessibilityLabel="plan budget" onPress={onPlan}>
              <Text>plan</Text>
            </Pressable>
          </>
        )}
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
      budgets?: Array<{ id: string; name: string; planned: number }>;
    };
    onEdit: (id: string) => void;
    onDelete: (payload: { id: string; name: string }) => void;
  }) => {
    const { Pressable, Text, View } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View>
        <Text>{`category:${row.name}:${row.budgets?.length ?? 0}`}</Text>
        {row.budgets?.map((budget) => (
          <View key={budget.id}>
            <Text>{`budget:${budget.name}:${budget.planned}`}</Text>
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
jest.mock('@/modules/budget/screens/budget/spending_plan_sheet', () => ({
  SpendingPlanSheet: ({ editingPlan }: { editingPlan?: { id: string } }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{`plan-sheet:${editingPlan?.id ?? 'new'}`}</Text>;
  },
}));
jest.mock('@/modules/budget/screens/budget/components/spending_plans_lens', () => ({
  SpendingPlansLens: ({
    rows,
    summary,
    summaryFooter,
    onOpenDetails,
    onCreate,
    onDelete,
  }: {
    rows: Array<{ id: string; name?: string }>;
    summary: { monthLabel: string };
    summaryFooter?: ReactNode;
    onOpenDetails: (id: string) => void;
    onCreate: () => void;
    onDelete: (plan: { id: string; name: string }) => void;
  }) => {
    const { Pressable, Text, View } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View testID="spending-plans-lens">
        {summaryFooter}
        <Text>{`plans-lens:${rows.length}`}</Text>
        <Text>{`plans-month:${summary.monthLabel}`}</Text>
        <Pressable accessibilityLabel="create spending plan" onPress={onCreate}>
          <Text>create spending plan</Text>
        </Pressable>
        {rows.map((row) => (
          <View key={row.id}>
            <Pressable
              accessibilityLabel={`open plan ${row.id}`}
              onPress={() => onOpenDetails(row.id)}
            >
              <Text>{`open plan ${row.id}`}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`delete plan ${row.id}`}
              onPress={() => onDelete({ id: row.id, name: row.name ?? row.id })}
            >
              <Text>{`delete plan ${row.id}`}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    );
  },
}));
jest.mock('@/modules/budget/screens/budget/components/budget_delete_confirm_sheet', () => ({
  BudgetDeleteConfirmSheet: () => null,
}));
jest.mock('@/modules/budget/screens/budget/components/spending_plan_delete_confirm_sheet', () => ({
  SpendingPlanDeleteConfirmSheet: ({
    isOpen,
    planName,
    onConfirm,
    onCancel,
  }: {
    isOpen: boolean;
    planName: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) => {
    const { Pressable, Text, View } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return isOpen ? (
      <View>
        <Text>{`plan-delete:${planName}`}</Text>
        <Pressable accessibilityLabel="confirm plan delete" onPress={onConfirm}>
          <Text>confirm plan delete</Text>
        </Pressable>
        <Pressable accessibilityLabel="cancel plan delete" onPress={onCancel}>
          <Text>cancel plan delete</Text>
        </Pressable>
      </View>
    ) : null;
  },
}));
jest.mock('@/modules/budget/screens/budget/components/fifty_thirty_twenty', () => ({
  FiftyThirtyTwentyLens: ({
    selectedMonth,
    expandedGroup,
    onExpandedGroupChange,
    onEditIncome,
    onManageGroup,
  }: {
    selectedMonth: string;
    expandedGroup: BudgetGroup | undefined;
    onExpandedGroupChange: (group: BudgetGroup | undefined) => void;
    onEditIncome: () => void;
    onManageGroup: (group: BudgetGroup) => void;
  }) => {
    const { BudgetGroup: MockBudgetGroup } =
      jest.requireActual<typeof import('@/constants/enums')>('@/constants/enums');
    const { Pressable, Text, View } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View testID="rule-lens">
        <Text>{`rule-month:${selectedMonth}`}</Text>
        <Text>{`rule-expanded:${expandedGroup ?? 'none'}`}</Text>
        <Pressable accessibilityLabel="edit rule income" onPress={onEditIncome} />
        <Pressable
          accessibilityLabel="expand needs"
          onPress={() => onExpandedGroupChange(MockBudgetGroup.Need)}
        />
        <Pressable
          accessibilityLabel="manage needs"
          onPress={() => onManageGroup(MockBudgetGroup.Need)}
        />
      </View>
    );
  },
}));
jest.mock('@/modules/budget/screens/budget/components/income_sheet', () => ({
  IncomeSheet: () => null,
}));

type BudgetHook = ReturnType<typeof useBudget>;
type BudgetScreenState = BudgetHook['state'];

const mockRequestDelete = jest.fn();

const baseState: BudgetScreenState = {
  rows: [],
  categoriesSummary: {
    hasPlan: false,
    emptyLabel: 'No budget set',
    planned: 0,
    spent: 0,
    left: 0,
    usedPct: undefined,
    unassignedIncome: undefined,
    unbudgetedSpend: 0,
    eyebrowLabel: '0 category budgets in July 2026',
    categoryCountLabel: '0 category budgets',
    balanceAmountLabel: '0',
    balanceMetaLabel: 'EGP left',
    balanceColor: Colors.dark.positive,
    barColor: Colors.dark.budgetUnder,
    spentPlannedLabel: '0 spent of 0',
    usedLabel: undefined,
    plannedLabel: '0',
    unassignedIncomeLabel: 'Set income',
    unbudgetedSpendLabel: '0',
    lifecycleLabel: '12 days left',
    onTrackCount: 0,
    watchCount: 0,
    overCount: 0,
    statusItems: [],
  },
  overall: { budgeted: 0, spent: 0, left: 0, pct: 0 },
  spendingPlanRows: [],
  editingRow: undefined,
  editingPlan: undefined,
  spendingPlansSummary: {
    planned: 0,
    spent: 0,
    left: 0,
    pct: 0,
    planCount: 0,
    monthLabel: 'July 2026',
    eyebrowLabel: '0 plans in July 2026',
    usedPercentage: 0,
    progressPercentage: 0,
    itemizedAmount: 0,
    itemizedPct: 0,
    itemizedPercentage: 0,
    balanceAmount: 0,
    balanceStatus: 'left',
    balanceColor: Colors.dark.positive,
    barColor: Colors.dark.budgetUnder,
    barStatus: 'under',
    activeCount: 0,
    upcomingCount: 0,
    onTrackCount: 0,
    watchCount: 0,
    overCount: 0,
    needsAttentionCount: 0,
    statusItems: [],
  },
  month: '2026-07',
  daysLeft: 12,
  hasBudgets: false,
  hasSpendingPlans: false,
  budgetableCategories: [],
  ruleLens: {
    summary: {
      income: undefined,
      hasIncome: false,
      groupedPlanned: 0,
      notGroupedPlanned: 0,
      totalPlanned: 0,
      leftToPlan: undefined,
      plannedRatio: undefined,
      progressRatio: undefined,
      lifecycle: 'current',
      daysLeft: 12,
      presentation: {
        eyebrowLabel: '50/30/20 plan · July',
        lifecycleLabel: '12 days left',
        primaryLabel: 'Set monthly planning income',
        balanceLabel: '0',
        balanceMetaLabel: 'EGP left to plan',
        balanceColor: Colors.dark.positive,
        emptyLabel: 'Set monthly planning income',
        contextLabel: 'Income is needed to calculate rule targets',
        contextSpentLabel: 'Income is needed to calculate rule targets',
        contextConnectorLabel: '',
        contextPlannedLabel: '',
        progressLabel: 'Not ready',
        progressValue: 0,
        barStatus: 'under',
        barColor: Colors.dark.positive,
        incomeMetricValue: 'Set income',
        plannedMetricValue: '0',
        notGroupedMetricValue: '0',
        statusItems: [],
      },
    },
    buckets: [],
    notGrouped: undefined,
  },
  suggestion: null,
  lensTab: 'categories',
  copySourceMonth: '2026-06',
  copyRows: [],
  copySheetVisible: false,
  copySelectedBudgetIds: [],
  hasLoaded: false,
  refreshing: false,
  loadError: false,
  expandedCategoryId: undefined,
  expandedBudgetGroup: undefined,
};

const mockedUseBudget = useBudget as jest.Mock;

function namedBudget(id: string, name: string, planned: number): NamedBudgetVM {
  return {
    id,
    name,
    planned,
    spent: 0,
    left: planned,
    usedPct: 0,
    categorySharePct: 1,
    usedLabel: '0%',
    shareLabel: '100% of category',
    spentPlannedLabel: `0 / ${planned} spent`,
    balanceAmountLabel: String(planned),
    balanceMetaLabel: 'EGP left',
    ringColor: Colors.dark.positive,
    accessibilityLabel: name,
    menuAccessibilityLabel: `Actions for ${name}`,
  };
}

function categoryRow(
  categoryId: string,
  name: string,
  planned: number,
  spent: number,
  budgets: NamedBudgetVM[],
): CategoryBudgetRowVM {
  return {
    categoryId,
    name,
    icon: 'food',
    color: '#caa445',
    planned,
    spent,
    left: planned - spent,
    usedPct: planned > 0 ? spent / planned : 0,
    status: 'on-track',
    statusLabel: 'On track',
    statusChipColor: 'default',
    spentPlannedUsedLabel: `${spent} / ${planned} spent`,
    balanceAmountLabel: String(planned - spent),
    balanceMetaLabel: 'EGP left',
    ringColor: Colors.dark.positive,
    unassignedSpend: spent,
    unassignedSpendLabel: `${spent} EGP`,
    budgets,
    accessibilityLabel: name,
  };
}

function mockUseBudget(state: Partial<BudgetScreenState> = {}) {
  const value: BudgetHook = {
    state: { ...baseState, ...state },
    openAdd: jest.fn(),
    openEdit: jest.fn(),
    openAddPlan: jest.fn(),
    openEditPlan: jest.fn(),
    openPlanTool: jest.fn(),
    openPlanDetails: jest.fn(),
    openIncomeSheet: jest.fn(),
    openMonthlyIncome: jest.fn(),
    setLensTab: jest.fn(),
    setExpandedCategoryId: jest.fn(),
    setExpandedBudgetGroup: jest.fn(),
    manageRuleGroup: jest.fn(),
    setSelectedMonth: jest.fn(),
    openCopy: jest.fn(),
    closeCopy: jest.fn(),
    toggleCopyBudgetId: jest.fn(),
    selectAllCopyBudgets: jest.fn(),
    clearCopySelection: jest.fn(),
    setCopySourceMonth: jest.fn(),
    copySelectedBudgets: jest.fn(),
    removeBudgetForMonth: jest.fn(),
    removeSpendingPlanForMonth: jest.fn(),
    setSpendingPlan: jest.fn(),
    removeSpendingPlan: jest.fn(),
    refresh: jest.fn(),
    goToCategory: jest.fn(),
  };
  mockedUseBudget.mockReturnValue(value);
  return value;
}

describe('BudgetScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestRefreshControl = undefined;
    mockPendingConfirmPayload = null;
    mockUseBudget();
  });

  it('shows the monthly skeleton footprint until budget data is ready', () => {
    const { getByTestId, getByText, queryByText } = render(<BudgetScreen />);

    expect(getByTestId('budget-screen-skeleton')).toBeTruthy();
    expect(getByText('skeleton:categories')).toBeTruthy();
    expect(queryByText('summary-card')).toBeNull();
  });

  it('uses the plans skeleton footprint while the plans tab is loading', () => {
    mockUseBudget({ lensTab: 'plans' });

    const { getByText } = render(<BudgetScreen />);

    expect(getByText('skeleton:plans')).toBeTruthy();
  });

  it('wires month, expansion, income, and manage actions to the rule lens', () => {
    const budget = mockUseBudget({
      hasLoaded: true,
      lensTab: 'fiftythirty',
      expandedBudgetGroup: BudgetGroup.Want,
    });

    render(<BudgetScreen />);

    expect(screen.getByText('rule-month:2026-07')).toBeTruthy();
    expect(screen.getByText('rule-expanded:want')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('edit rule income'));
    fireEvent.press(screen.getByLabelText('expand needs'));
    fireEvent.press(screen.getByLabelText('manage needs'));
    expect(budget.openIncomeSheet).toHaveBeenCalledTimes(1);
    expect(budget.setExpandedBudgetGroup).toHaveBeenCalledWith(BudgetGroup.Need);
    expect(budget.manageRuleGroup).toHaveBeenCalledWith(BudgetGroup.Need);
  });

  it('shows a retry action when the initial load fails', () => {
    const hook = mockUseBudget({ loadError: true });

    const { getByText, queryByTestId } = render(<BudgetScreen />);

    expect(queryByTestId('budget-screen-skeleton')).toBeNull();
    expect(getByText('Could not load your budget.')).toBeTruthy();
    fireEvent.press(getByText('Try again'));
    expect(hook.refresh).toHaveBeenCalledTimes(1);
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
      rows: [categoryRow('food', 'Food', 3000, 500, [namedBudget('budget-food', 'Food', 3000)])],
    });

    const { getByText, queryByLabelText, queryByTestId } = render(<BudgetScreen />);

    expect(queryByTestId('budget-screen-skeleton')).toBeNull();
    expect(getByText('summary-card')).toBeTruthy();
    expect(getByText('copy-disabled:false')).toBeTruthy();
    expect(getByText('category-disabled:false')).toBeTruthy();
    expect(queryByLabelText('plan budget')).toBeNull();
    expect(getByText('segment:Categories')).toBeTruthy();
    expect(getByText('segment:Plans')).toBeTruthy();
    expect(getByText('segment:50/30/20')).toBeTruthy();
    expect(getByText('category:Food:1')).toBeTruthy();
    expect(getByText('budget:Food:3000')).toBeTruthy();
  });

  it('wires pull-to-refresh to the budget hook', () => {
    const refresh = jest.fn();
    mockUseBudget({ hasLoaded: true, refreshing: true });
    mockedUseBudget.mockReturnValue({
      ...mockedUseBudget(),
      refresh,
    });

    render(<BudgetScreen />);

    expect(screen.getByTestId('budget-screen-skeleton')).toBeTruthy();
    expect(latestRefreshControl).toBeTruthy();
    expect(latestRefreshControl?.props.refreshing).toBe(true);
    latestRefreshControl?.props.onRefresh();
    expect(refresh).toHaveBeenCalledTimes(1);
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
        categoryRow('food', 'Food', 6500, 1200, [
          namedBudget('budget-monthly-food', 'Monthly Food', 5000),
          namedBudget('budget-trip-food', 'Alexandria Trip Food', 1500),
        ]),
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
      setLensTab: jest.fn(),
      setSelectedMonth: jest.fn(),
      openCopy,
      closeCopy: jest.fn(),
      toggleCopyBudgetId: jest.fn(),
      selectAllCopyBudgets: jest.fn(),
      clearCopySelection: jest.fn(),
      setCopySourceMonth: jest.fn(),
      copySelectedBudgets: jest.fn(),
      removeBudgetForMonth: jest.fn(),
      removeSpendingPlanForMonth: jest.fn(),
      openAddPlan: jest.fn(),
      openEditPlan: jest.fn(),
      openPlanTool: jest.fn(),
      openPlanDetails: jest.fn(),
      setSpendingPlan: jest.fn(),
      removeSpendingPlan: jest.fn(),
      refresh: jest.fn(),
      goToCategory: jest.fn(),
    });

    const { getByLabelText, queryByLabelText } = render(<BudgetScreen />);

    fireEvent.press(getByLabelText('copy budget'));
    fireEvent.press(getByLabelText('add budget category'));

    expect(openCopy).toHaveBeenCalledTimes(1);
    expect(openAdd).toHaveBeenCalledTimes(1);
    expect(queryByLabelText('plan budget')).toBeNull();
  });

  it('renders spending plans from the plans tab', () => {
    mockUseBudget({
      hasLoaded: true,
      lensTab: 'plans',
      hasSpendingPlans: true,
      spendingPlanRows: [{ id: 'plan_trip', name: 'Alexandria weekend' } as never],
      spendingPlansSummary: {
        planned: 8000,
        spent: 1200,
        left: 6800,
        pct: 0.15,
        planCount: 1,
        monthLabel: 'July 2026',
        eyebrowLabel: '1 plan in July 2026',
        usedPercentage: 15,
        progressPercentage: 15,
        itemizedAmount: 3000,
        itemizedPct: 0.375,
        itemizedPercentage: 38,
        balanceAmount: 6800,
        balanceStatus: 'left',
        balanceColor: Colors.dark.positive,
        barColor: Colors.dark.budgetUnder,
        barStatus: 'under',
        activeCount: 1,
        upcomingCount: 0,
        onTrackCount: 0,
        watchCount: 1,
        overCount: 0,
        needsAttentionCount: 1,
        statusItems: [],
      },
    });

    const { getByText, queryByLabelText, queryByText, queryByTestId } = render(<BudgetScreen />);

    expect(getByText('tab:plans')).toBeTruthy();
    expect(getByText('rail:plans')).toBeTruthy();
    expect(getByText('plans-lens:1')).toBeTruthy();
    expect(getByText('plans-month:July 2026')).toBeTruthy();
    expect(getByText('plan-disabled:false')).toBeTruthy();
    expect(queryByLabelText('copy budget')).toBeNull();
    expect(queryByLabelText('add budget category')).toBeNull();
    expect(queryByTestId('budget-screen-skeleton')).toBeNull();
    expect(queryByText('summary-card')).toBeNull();
    expect(queryByText('Temporary budgets')).toBeNull();
  });

  it('runs the plan tool action from the plans tab rail', () => {
    const openPlanTool = jest.fn();
    mockedUseBudget.mockReturnValue({
      state: {
        ...baseState,
        hasLoaded: true,
        lensTab: 'plans',
      },
      openAdd: jest.fn(),
      openEdit: jest.fn(),
      openAddPlan: jest.fn(),
      openEditPlan: jest.fn(),
      openPlanTool,
      openPlanDetails: jest.fn(),
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
      removeSpendingPlanForMonth: jest.fn(),
      setSpendingPlan: jest.fn(),
      removeSpendingPlan: jest.fn(),
      refresh: jest.fn(),
      goToCategory: jest.fn(),
    });

    const { getByLabelText } = render(<BudgetScreen />);

    fireEvent.press(getByLabelText('plan budget'));

    expect(openPlanTool).toHaveBeenCalledTimes(1);
  });

  it('opens plan details from the plans list', () => {
    const openPlanDetails = jest.fn();
    mockedUseBudget.mockReturnValue({
      state: {
        ...baseState,
        hasLoaded: true,
        lensTab: 'plans',
        spendingPlanRows: [{ id: 'plan_trip', name: 'Alexandria weekend' } as never],
      },
      openAdd: jest.fn(),
      openEdit: jest.fn(),
      openAddPlan: jest.fn(),
      openEditPlan: jest.fn(),
      openPlanTool: jest.fn(),
      openPlanDetails,
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
      removeSpendingPlanForMonth: jest.fn(),
      setSpendingPlan: jest.fn(),
      removeSpendingPlan: jest.fn(),
      refresh: jest.fn(),
      goToCategory: jest.fn(),
    });

    const { getByLabelText } = render(<BudgetScreen />);

    fireEvent.press(getByLabelText('open plan plan_trip'));

    expect(openPlanDetails).toHaveBeenCalledWith('plan_trip');
  });

  it('confirms before removing a spending plan', async () => {
    const removeSpendingPlanForMonth = jest.fn().mockResolvedValue(undefined);
    mockedUseBudget.mockReturnValue({
      state: {
        ...baseState,
        hasLoaded: true,
        lensTab: 'plans',
        spendingPlanRows: [{ id: 'plan_trip', name: 'Alexandria weekend' } as never],
      },
      openAdd: jest.fn(),
      openEdit: jest.fn(),
      openAddPlan: jest.fn(),
      openEditPlan: jest.fn(),
      openPlanTool: jest.fn(),
      openPlanDetails: jest.fn(),
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
      removeSpendingPlanForMonth,
      setSpendingPlan: jest.fn(),
      removeSpendingPlan: jest.fn(),
      refresh: jest.fn(),
      goToCategory: jest.fn(),
    });

    const { findByText, getByLabelText, rerender } = render(<BudgetScreen />);

    fireEvent.press(getByLabelText('delete plan plan_trip'));

    expect(removeSpendingPlanForMonth).not.toHaveBeenCalled();
    rerender(<BudgetScreen />);
    expect(await findByText('plan-delete:Alexandria weekend')).toBeTruthy();

    fireEvent.press(getByLabelText('confirm plan delete'));

    await waitFor(() =>
      expect(removeSpendingPlanForMonth).toHaveBeenCalledWith({
        id: 'plan_trip',
        name: 'Alexandria weekend',
      }),
    );
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
      openAddPlan: jest.fn(),
      openEditPlan: jest.fn(),
      openPlanTool: jest.fn(),
      openPlanDetails: jest.fn(),
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
      removeSpendingPlanForMonth: jest.fn(),
      setSpendingPlan: jest.fn(),
      removeSpendingPlan: jest.fn(),
      refresh: jest.fn(),
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
        categoryRow('food', 'Food', 6500, 1200, [
          namedBudget('budget-monthly-food', 'Monthly Food', 5000),
          namedBudget('budget-trip-food', 'Alexandria Trip Food', 1500),
        ]),
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
