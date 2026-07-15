import { act, renderHook } from '@testing-library/react-native';

import { CategoryType } from '@/constants/enums';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
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

function budget(
  id: string,
  categoryId: string,
  name: string,
  limit: number,
  effectiveFrom: string,
): Budget {
  return {
    id,
    category_id: categoryId,
    name,
    limit_amount: limit,
    effective_from: effectiveFrom,
    created_at: NOW,
    updated_at: NOW,
  };
}

const categories = [category('food', 'Food'), category('car', 'Car')];
const budgetRows = [
  budget('budget-car-may', 'car', 'Fuel', 900, '2026-05'),
  budget('budget-food-jun', 'food', 'Monthly Food', 3000, '2026-06'),
  budget('budget-car-jun', 'car', 'Fuel', 1200, '2026-06'),
  budget('budget-food-jul', 'food', 'Monthly Food', 3500, '2026-07'),
  budget('budget-trip-food-jul', 'food', 'Alexandria Trip Food', 1500, '2026-07'),
];

let loadBudgetMock: jest.Mock;
let loadCategoriesMock: jest.Mock;
let setSelectedMonthMock: jest.Mock;
let setRefreshingMock: jest.Mock;
let setCopySourceMonthMock: jest.Mock;
let setCopySelectedBudgetIdsMock: jest.Mock;
let openCopyMock: jest.Mock;
let closeCopyMock: jest.Mock;
let copyBudgetsToMonthMock: jest.Mock;
let removeBudgetMock: jest.Mock;

function setupStores() {
  loadBudgetMock = jest.fn().mockResolvedValue(undefined);
  loadCategoriesMock = jest.fn().mockResolvedValue(undefined);
  copyBudgetsToMonthMock = jest.fn().mockResolvedValue(undefined);
  removeBudgetMock = jest.fn().mockResolvedValue(undefined);
  setSelectedMonthMock = jest.fn();
  setRefreshingMock = jest.fn();
  setCopySourceMonthMock = jest.fn();
  setCopySelectedBudgetIdsMock = jest.fn();
  openCopyMock = jest.fn();
  closeCopyMock = jest.fn();

  attachMockSelectorStore(useCategoryStore as jest.Mock, () => ({
    categories,
    hasLoaded: true,
    loadCategories: loadCategoriesMock,
  }));
  attachMockSelectorStore(useBudgetStore as jest.Mock, () => ({
    rows: budgetRows,
    spendByMonth: { food: { '2026-07': 1200 } },
    spendByBudgetId: { 'budget-food-jul': 900, 'budget-trip-food-jul': 300 },
    spendingPlans: [],
    spendingPlanSpendById: {},
    loaded: true,
    expectedIncome: null,
    load: loadBudgetMock,
    copyBudgetsToMonth: copyBudgetsToMonthMock,
    removeBudget: removeBudgetMock,
    setSpendingPlan: jest.fn(),
    removeSpendingPlan: jest.fn(),
  }));
  attachMockSelectorStore(useBudgetState as jest.Mock, () => ({
    selectedMonth: '2026-07',
    copySourceMonth: '2026-06',
    lensTab: 'categories',
    copySheetVisible: false,
    copySelectedBudgetIds: ['budget-food-jun'],
    incomeSuggestion: null,
    refreshing: false,
    expandedCategoryId: undefined,
    openAdd: jest.fn(),
    openEdit: jest.fn(),
    setLensTab: jest.fn(),
    setSelectedMonth: setSelectedMonthMock,
    setRefreshing: setRefreshingMock,
    setCopySourceMonth: setCopySourceMonthMock,
    resetSelectedMonthToCurrent: jest.fn(),
    openCopy: openCopyMock,
    closeCopy: closeCopyMock,
    setCopySelectedBudgetIds: setCopySelectedBudgetIdsMock,
    setIncomeSuggestion: jest.fn(),
    setExpandedCategoryId: jest.fn(),
  }));
}

beforeEach(() => {
  setupStores();
});

describe('useBudget month actions', () => {
  it('selects a month through Budget state and reloads that month', () => {
    const { result } = renderHook(() => useBudget());

    act(() => result.current.setSelectedMonth('2026-06'));

    expect(setSelectedMonthMock).toHaveBeenCalledWith('2026-06');
    expect(loadBudgetMock).toHaveBeenCalledWith('2026-06');
  });

  it('refreshes categories and budget data for the selected month', async () => {
    const { result } = renderHook(() => useBudget());

    await act(async () => {
      await result.current.refresh();
    });

    expect(setRefreshingMock).toHaveBeenNthCalledWith(1, true);
    expect(loadCategoriesMock).toHaveBeenCalledTimes(1);
    expect(loadBudgetMock).toHaveBeenCalledWith('2026-07');
    expect(setRefreshingMock).toHaveBeenLastCalledWith(false);
  });

  it('groups multiple named budgets under one category and counts category spend once', () => {
    const { result } = renderHook(() => useBudget());

    expect(result.current.state.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          categoryId: 'food',
          planned: 5000,
          spent: 1200,
          budgets: expect.arrayContaining([
            expect.objectContaining({
              id: 'budget-food-jul',
              name: 'Monthly Food',
              planned: 3500,
              spent: 900,
            }),
            expect.objectContaining({
              id: 'budget-trip-food-jul',
              name: 'Alexandria Trip Food',
              planned: 1500,
              spent: 300,
            }),
          ]),
        }),
      ]),
    );
    expect(result.current.state.budgetableCategories.map((category) => category.id)).toEqual([
      'food',
      'car',
    ]);
  });

  it('opens copy sheet with all copyable source-month categories selected', () => {
    const { result } = renderHook(() => useBudget());

    act(() => result.current.openCopy());

    expect(openCopyMock).toHaveBeenCalledWith(['budget-food-jun', 'budget-car-jun']);
  });

  it('copies selected source-month budgets into the selected month', async () => {
    const { result } = renderHook(() => useBudget());

    await act(async () => {
      await result.current.copySelectedBudgets(['budget-food-jun']);
    });

    expect(copyBudgetsToMonthMock).toHaveBeenCalledWith('2026-06', '2026-07', ['budget-food-jun']);
    expect(closeCopyMock).toHaveBeenCalledTimes(1);
  });

  it('changes the source month from the picker and selects all copyable rows for that source', () => {
    const { result } = renderHook(() => useBudget());

    act(() => result.current.setCopySourceMonth('2026-05'));

    expect(setCopySourceMonthMock).toHaveBeenCalledWith('2026-05');
    expect(setCopySelectedBudgetIdsMock).toHaveBeenCalledWith(['budget-car-may']);
  });

  it('removes a budget from the selected month', async () => {
    const { result } = renderHook(() => useBudget());

    await act(async () => {
      await result.current.removeBudgetForMonth({ id: 'budget-food-jul', name: 'Monthly Food' });
    });

    expect(removeBudgetMock).toHaveBeenCalledWith('budget-food-jul', '2026-07');
  });
});
