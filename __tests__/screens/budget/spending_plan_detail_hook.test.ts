import { act, renderHook, waitFor } from '@testing-library/react-native';

import { CategoryType } from '@/constants/enums';
import type { SpendingPlanWithCategories } from '@/modules/budget/entities/budget.entity';
import { useSpendingPlanDetail } from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.hook';
import { useSpendingPlanDetailState } from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.state';
import { useSpendingPlanDetailStore } from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

const mockRouterBack = jest.fn();
const mockOpenEditPlan = jest.fn();
const mockGetDetails = jest.fn();
const mockFocusEffect = jest.fn();

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => mockFocusEffect(effect),
  useLocalSearchParams: () => ({ id: 'plan_trip', month: '2026-07' }),
  useRouter: () => ({ back: mockRouterBack }),
}));
jest.mock('@/utils/run_after_interactions', () => ({
  runAfterInteractions: (task: () => void) => {
    task();
    return { cancel: jest.fn() };
  },
}));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/budget/repositories/budget.repository', () => ({
  budgetRepository: { getSpendingPlanDetails: (...args: unknown[]) => mockGetDetails(...args) },
}));
jest.mock('@/modules/budget/screens/budget/budget.state', () => ({ useBudgetState: jest.fn() }));

const { useCategoryStore } = jest.requireMock('@/modules/categories/store/category.store') as {
  useCategoryStore: jest.Mock;
};
const { useBudgetState } = jest.requireMock('@/modules/budget/screens/budget/budget.state') as {
  useBudgetState: jest.Mock;
};

const plan: SpendingPlanWithCategories = {
  id: 'plan_trip',
  name: 'Alex weekend',
  start_date: '2026-08-01',
  end_date: '2026-08-04',
  total_amount: 8000,
  created_at: '',
  updated_at: '',
  categories: [{ plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: 3000 }],
};

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 6, 19, 12));
  attachMockSelectorStore(useCategoryStore, () => ({
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
    loadCategories: jest.fn().mockResolvedValue(undefined),
  }));
  attachMockSelectorStore(useBudgetState, () => ({ openEditPlan: mockOpenEditPlan }));
  mockGetDetails.mockResolvedValue({ plan, spend: { cat_food: 1200 } });
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
  useSpendingPlanDetailState.getState().reset();
  useSpendingPlanDetailStore.getState().reset();
});

describe('useSpendingPlanDetail', () => {
  it('loads by id even when an edit moved the plan outside the route month', async () => {
    const { result } = renderHook(() => useSpendingPlanDetail());
    await act(async () => {
      mockFocusEffect.mock.calls[0][0]();
    });

    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(mockGetDetails).toHaveBeenCalledWith('plan_trip');
    expect(result.current.state.plan?.name).toBe('Alex weekend');
  });

  it('exposes an error state and retries a failed load', async () => {
    mockGetDetails
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValueOnce({ plan, spend: { cat_food: 1200 } });
    const { result } = renderHook(() => useSpendingPlanDetail());
    await act(async () => {
      mockFocusEffect.mock.calls[0][0]();
    });

    await waitFor(() => expect(result.current.state.viewState).toBe('error'));
    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.state.viewState).toBe('ready'));
    expect(mockGetDetails).toHaveBeenCalledTimes(2);
  });
});
