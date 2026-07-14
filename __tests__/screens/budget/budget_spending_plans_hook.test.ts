import { renderHook } from '@testing-library/react-native';

import { CategoryType } from '@/constants/enums';
import { Colors } from '@/constants/theme';
import type { SpendingPlanWithCategories } from '@/modules/budget/entities/budget.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

const mockRouterPush = jest.fn();

jest.mock('zustand/react/shallow', () => ({ useShallow: (selector: unknown) => selector }));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockRouterPush, back: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/budget/store/budget.store', () => ({ useBudgetStore: jest.fn() }));
jest.mock('@/modules/budget/screens/budget/budget.state', () => ({ useBudgetState: jest.fn() }));
jest.mock('@/modules/budget/database/budget_stats', () => ({
  getTrailingIncomeSuggestion: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/database/client', () => ({ getDb: jest.fn().mockResolvedValue({}) }));

const { useCategoryStore } = jest.requireMock('@/modules/categories/store/category.store');
const { useBudgetStore } = jest.requireMock('@/modules/budget/store/budget.store');
const { useBudgetState } = jest.requireMock('@/modules/budget/screens/budget/budget.state');

import { useBudget } from '@/modules/budget/screens/budget/budget.hook';

const NOW = '2026-07-01T00:00:00.000Z';

function category(id: string, name: string): Category {
  return {
    id,
    name,
    type: CategoryType.Expense,
    icon: 'tag',
    color: '#caa445',
    is_default: 0,
    sort_order: 0,
    budget_group: null,
    created_at: NOW,
    updated_at: NOW,
  };
}

const spendingPlans: SpendingPlanWithCategories[] = [
  {
    id: 'plan_trip',
    name: 'Alexandria weekend',
    start_date: '2026-07-18',
    end_date: '2026-07-21',
    total_amount: 8000,
    created_at: NOW,
    updated_at: NOW,
    categories: [{ plan_id: 'plan_trip', category_id: 'food', allocated_amount: 3000 }],
  },
];

function setupStores() {
  attachMockSelectorStore(useCategoryStore as jest.Mock, () => ({
    categories: [category('food', 'Food')],
    hasLoaded: true,
    loadCategories: jest.fn(),
  }));
  attachMockSelectorStore(useBudgetStore as jest.Mock, () => ({
    rows: [],
    spendByMonth: {},
    spendingPlans,
    spendingPlanSpendById: { plan_trip: { food: 1200 } },
    loaded: true,
    expectedIncome: null,
    load: jest.fn().mockResolvedValue(undefined),
    copyBudgetsToMonth: jest.fn().mockResolvedValue(undefined),
    removeBudget: jest.fn().mockResolvedValue(undefined),
    removeSpendingPlan: jest.fn().mockResolvedValue(undefined),
    setSpendingPlan: jest.fn().mockResolvedValue(undefined),
  }));
  attachMockSelectorStore(useBudgetState as jest.Mock, () => ({
    selectedMonth: '2026-07',
    copySourceMonth: '2026-06',
    lensTab: 'plans',
    copySheetVisible: false,
    copySelectedBudgetIds: [],
    incomeSuggestion: null,
    openAdd: jest.fn(),
    openEdit: jest.fn(),
    openAddPlan: jest.fn(),
    openEditPlan: jest.fn(),
    setLensTab: jest.fn(),
    setSelectedMonth: jest.fn(),
    setCopySourceMonth: jest.fn(),
    resetSelectedMonthToCurrent: jest.fn(),
    openCopy: jest.fn(),
    closeCopy: jest.fn(),
    setCopySelectedBudgetIds: jest.fn(),
    toggleCopyBudgetId: jest.fn(),
    clearCopySelection: jest.fn(),
    setIncomeSuggestion: jest.fn(),
  }));
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 6, 13, 12));
  setupStores();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useBudget spending plans', () => {
  it('derives spending plan rows and summary for the selected month', () => {
    const { result } = renderHook(() => useBudget());

    const planRow = result.current.state.spendingPlanRows[0];
    expect(planRow).toEqual(
      expect.objectContaining({
        id: 'plan_trip',
        name: 'Alexandria weekend',
        totalAmount: 8000,
        spent: 1200,
        left: 6800,
        timing: expect.objectContaining({ lifecycle: 'upcoming', daysValue: 5 }),
        status: 'upcoming',
      }),
    );
    expect(planRow.card.statusLabel).toBe('Upcoming');
    expect(planRow.card.dateLabel).toBe('Jul 18 - Jul 21 · starts in 5 days');
    expect(planRow.card.balanceAmountLabel).toBe('6,800');
    expect(planRow.card.balanceMetaLabel).toBe('EGP left');
    expect(planRow.card.spentLabel).toBe('1,200 / 8,000 spent');
    expect(planRow.card.percentageLabel).toBe('15% used');
    expect(planRow.card.openDetailsAccessibilityLabel).toBe('Open Alexandria weekend details');
    expect(planRow.card.balanceAccessibilityLabel).toBe('6,800 EGP left');
    expect(result.current.state.spendingPlansSummary).toEqual({
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
      barColor: Colors.dark.gold,
      barStatus: 'under',
      activeCount: 0,
      upcomingCount: 1,
      onTrackCount: 0,
      watchCount: 0,
      overCount: 0,
      needsAttentionCount: 0,
      statusItems: [
        {
          key: 'onTrack',
          icon: 'check-circle-outline',
          color: Colors.dark.positive,
          label: '0 on track',
        },
        {
          key: 'watch',
          icon: 'alert-circle-outline',
          color: Colors.dark.warning,
          label: '0 watch',
        },
        {
          key: 'over',
          icon: 'alert-octagon-outline',
          color: Colors.dark.negative,
          label: '0 over',
        },
        {
          key: 'upcoming',
          icon: 'clock-outline',
          color: Colors.shared.transferBlue,
          label: '1 upcoming',
        },
      ],
    });
    expect(result.current.state.hasSpendingPlans).toBe(true);
  });

  it('routes plan cards to the full-screen plan details screen', () => {
    const { result } = renderHook(() => useBudget());

    result.current.openPlanDetails('plan_trip');

    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/(app)/(tabs)/budget/plans/[id]',
      params: { id: 'plan_trip', month: '2026-07' },
    });
  });
});
