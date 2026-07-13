import { renderHook } from '@testing-library/react-native';

import { CategoryType } from '@/constants/enums';
import type { SpendingPlanWithCategories } from '@/modules/budget/database/spending_plans';
import { useSpendingPlanDetail } from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.hook';
import { useSpendingPlanDetailState } from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.state';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

const mockRouterBack = jest.fn();
const mockOpenEditPlan = jest.fn();

jest.mock('zustand/react/shallow', () => ({ useShallow: (selector: unknown) => selector }));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({ id: 'plan_trip', month: '2026-07' }),
  useRouter: () => ({ back: mockRouterBack }),
}));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/budget/store/budget.store', () => ({ useBudgetStore: jest.fn() }));
jest.mock('@/modules/budget/screens/budget/budget.state', () => ({ useBudgetState: jest.fn() }));

const { useCategoryStore } = jest.requireMock('@/modules/categories/store/category.store');
const { useBudgetStore } = jest.requireMock('@/modules/budget/store/budget.store');
const { useBudgetState } = jest.requireMock('@/modules/budget/screens/budget/budget.state');

const plan: SpendingPlanWithCategories = {
  id: 'plan_trip',
  name: 'Alex weekend',
  start_date: '2026-07-18',
  end_date: '2026-07-21',
  total_amount: 8000,
  created_at: '',
  updated_at: '',
  categories: [{ plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: 3000 }],
};

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 6, 19, 12));
  attachMockSelectorStore(useCategoryStore as jest.Mock, () => ({
    categories: [
      {
        id: 'cat_food',
        name: 'Food',
        type: CategoryType.Expense,
        icon: 'food',
        color: '#D4A44C',
        is_default: 0,
        sort_order: 0,
        budget_group: null,
        created_at: '',
        updated_at: '',
      },
    ],
    hasLoaded: true,
    loadCategories: jest.fn(),
  }));
  attachMockSelectorStore(useBudgetStore as jest.Mock, () => ({
    spendingPlans: [plan],
    spendingPlanSpendById: { plan_trip: { cat_food: 1200 } },
    loaded: true,
    load: jest.fn(),
  }));
  attachMockSelectorStore(useBudgetState as jest.Mock, () => ({ openEditPlan: mockOpenEditPlan }));
  useSpendingPlanDetailState.getState().finishLoad();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
  useSpendingPlanDetailState.getState().reset();
});

describe('useSpendingPlanDetail', () => {
  it('derives a routed plan and delegates edit/back actions', () => {
    const { result } = renderHook(() => useSpendingPlanDetail());

    expect(result.current.state.viewState).toBe('ready');
    expect(result.current.state.plan?.name).toBe('Alex weekend');

    result.current.editPlan();
    result.current.goBack();

    expect(mockOpenEditPlan).toHaveBeenCalledWith('plan_trip');
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });
});
