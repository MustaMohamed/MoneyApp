import { act, renderHook } from '@testing-library/react-native';

import { BudgetGroup, CategoryType } from '@/constants/enums';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { useIncomeSheetState } from '@/modules/budget/screens/budget/components/income_sheet.state';
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

const { useCategoryStore } = jest.requireMock('@/modules/categories/store/category.store');
const { useBudgetStore } = jest.requireMock('@/modules/budget/store/budget.store');
const { useBudgetState } = jest.requireMock('@/modules/budget/screens/budget/budget.state');

import { useBudget } from '@/modules/budget/screens/budget/budget.hook';

const NOW = '2026-07-01T00:00:00.000Z';

function category(id: string, name: string, budgetGroup: BudgetGroup): Category {
  return {
    id,
    name,
    type: CategoryType.Expense,
    icon: 'tag',
    color: '#caa445',
    is_default: 0,
    sort_order: 0,
    budget_group: budgetGroup,
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

const categories = [
  category('food', 'Food', BudgetGroup.Need),
  category('car', 'Car', BudgetGroup.Want),
];
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
let clearCopySelectionMock: jest.Mock;
let openCopyMock: jest.Mock;
let closeCopyMock: jest.Mock;
let loadCopyPreviewMock: jest.Mock;
let copyBudgetsToMonthMock: jest.Mock;
let removeBudgetMock: jest.Mock;
let setLensTabMock: jest.Mock;
let setExpandedCategoryIdMock: jest.Mock;
let setExpandedBudgetGroupMock: jest.Mock;
let openAddWithContextMock: jest.Mock;
let setCopyBusyMock: jest.Mock;
let setCopyErrorMock: jest.Mock;

function setupStores(
  selectedMonth = '2026-07',
  expectedIncome: number | null = 10000,
  groupMap: Record<string, BudgetGroup> = {
    food: BudgetGroup.Need,
    car: BudgetGroup.Want,
  },
  targetBudgetId?: string,
  options: {
    categoriesLoaded?: boolean;
    loadedMonth?: string;
    copySheetVisible?: boolean;
    copyBusy?: boolean;
    copyError?: boolean;
    copyPreviewLoaded?: boolean;
    copyPreviewError?: boolean;
    incomeSuggestion?: number | null;
  } = {},
) {
  loadBudgetMock = jest.fn().mockResolvedValue(undefined);
  loadCategoriesMock = jest.fn().mockResolvedValue(undefined);
  copyBudgetsToMonthMock = jest.fn().mockResolvedValue(undefined);
  removeBudgetMock = jest.fn().mockResolvedValue(undefined);
  setSelectedMonthMock = jest.fn();
  setRefreshingMock = jest.fn();
  setCopySourceMonthMock = jest.fn();
  setCopySelectedBudgetIdsMock = jest.fn();
  clearCopySelectionMock = jest.fn();
  openCopyMock = jest.fn();
  closeCopyMock = jest.fn();
  loadCopyPreviewMock = jest.fn().mockResolvedValue(undefined);
  setLensTabMock = jest.fn();
  setExpandedCategoryIdMock = jest.fn();
  setExpandedBudgetGroupMock = jest.fn();
  openAddWithContextMock = jest.fn();
  setCopyBusyMock = jest.fn();
  setCopyErrorMock = jest.fn();

  attachMockSelectorStore(useCategoryStore as jest.Mock, () => ({
    categories,
    hasLoaded: options.categoriesLoaded ?? true,
    loadCategories: loadCategoriesMock,
  }));
  attachMockSelectorStore(useBudgetStore as jest.Mock, () => ({
    rows: budgetRows,
    spendByMonth: { food: { '2026-07': 1200 } },
    spendByBudgetId: { 'budget-food-jul': 900, 'budget-trip-food-jul': 300 },
    spendingPlans: [],
    spendingPlanSpendById: {},
    loaded: true,
    loadedMonth: options.loadedMonth ?? selectedMonth,
    expectedIncome,
    incomeSuggestion: options.incomeSuggestion ?? null,
    budgetGroupByCategoryId: groupMap,
    copyPreviewRows: budgetRows,
    copyPreviewSourceMonth: '2026-06',
    copyPreviewTargetMonth: selectedMonth,
    copyPreviewLoaded: options.copyPreviewLoaded ?? true,
    copyPreviewLoading: false,
    copyPreviewError: options.copyPreviewError ?? false,
    load: loadBudgetMock,
    loadCopyPreview: loadCopyPreviewMock,
    copyBudgetsToMonth: copyBudgetsToMonthMock,
    removeBudget: removeBudgetMock,
    setSpendingPlan: jest.fn(),
    removeSpendingPlan: jest.fn(),
  }));
  attachMockSelectorStore(useBudgetState as jest.Mock, () => ({
    selectedMonth,
    copySourceMonth: '2026-06',
    lensTab: 'categories',
    copySheetVisible: options.copySheetVisible ?? false,
    copySelectedBudgetIds: ['budget-food-jun'],
    copyBusy: options.copyBusy ?? false,
    copyError: options.copyError ?? false,
    targetBudgetId,
    refreshing: false,
    expandedCategoryId: undefined,
    expandedBudgetGroup: BudgetGroup.Need,
    openAdd: jest.fn(),
    openAddWithContext: openAddWithContextMock,
    openEdit: jest.fn(),
    setLensTab: setLensTabMock,
    setSelectedMonth: setSelectedMonthMock,
    setRefreshing: setRefreshingMock,
    setCopySourceMonth: setCopySourceMonthMock,
    resetSelectedMonthToCurrent: jest.fn(),
    openCopy: openCopyMock,
    closeCopy: closeCopyMock,
    setCopySelectedBudgetIds: setCopySelectedBudgetIdsMock,
    clearCopySelection: clearCopySelectionMock,
    setCopyBusy: setCopyBusyMock,
    setCopyError: setCopyErrorMock,
    setExpandedCategoryId: setExpandedCategoryIdMock,
    setExpandedBudgetGroup: setExpandedBudgetGroupMock,
  }));
}

beforeEach(() => {
  useIncomeSheetState.getState().reset();
  setupStores();
});

describe('useBudget month actions', () => {
  it('composes the monthly rule lens from the selected month profile', async () => {
    const { result } = await renderHook(() => useBudget());

    expect(result.current.state.ruleLens.summary).toMatchObject({
      income: 10000,
      hasIncome: true,
      totalPlanned: 5000,
    });
    expect(result.current.state.ruleLens.buckets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ group: BudgetGroup.Need, planned: 5000 }),
        expect.objectContaining({ group: BudgetGroup.Want, planned: 0 }),
      ]),
    );
    expect(result.current.state.expandedBudgetGroup).toBe(BudgetGroup.Need);
  });

  it('switches to Categories and expands the first category in the managed rule group', async () => {
    const { result } = await renderHook(() => useBudget());

    await act(() => result.current.manageRuleGroup(BudgetGroup.Need));

    expect(setLensTabMock).toHaveBeenCalledWith('categories');
    expect(setExpandedCategoryIdMock).toHaveBeenCalledWith('food');
    expect(openAddWithContextMock).not.toHaveBeenCalled();
  });

  it('targets a zero-activity category already assigned to the managed group', async () => {
    const { result } = await renderHook(() => useBudget());

    await act(() => result.current.manageRuleGroup(BudgetGroup.Want));

    expect(setLensTabMock).toHaveBeenCalledWith('categories');
    expect(setExpandedCategoryIdMock).toHaveBeenCalledWith(undefined);
    expect(openAddWithContextMock).toHaveBeenCalledWith('car', BudgetGroup.Want);
  });

  it('uses the category default when editing before monthly group snapshots exist', async () => {
    setupStores('2026-07', null, {}, 'budget-food-jul');

    const { result } = await renderHook(() => useBudget());

    expect(result.current.state.editingRow?.categoryGroup).toBe(BudgetGroup.Need);
  });

  it('preserves controlled rule expansion while refreshing', async () => {
    const { result } = await renderHook(() => useBudget());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.state.expandedBudgetGroup).toBe(BudgetGroup.Need);
    expect(setExpandedBudgetGroupMock).not.toHaveBeenCalled();
  });

  it('opens income editing with the explicitly selected past month', async () => {
    setupStores('2000-05');
    const { result } = await renderHook(() => useBudget());

    await act(() => result.current.openIncomeSheet());

    expect(useIncomeSheetState.getState()).toMatchObject({
      isOpen: true,
      yearMonth: '2000-05',
      monthLabel: 'May 2000',
    });
  });

  it('changes UI selection and explicitly loads the selected month', async () => {
    const { result } = await renderHook(() => useBudget());

    await act(() => result.current.setSelectedMonth('2026-06'));

    expect(setSelectedMonthMock).toHaveBeenCalledWith('2026-06');
    expect(loadBudgetMock).toHaveBeenCalledWith('2026-06');
  });

  it('refreshes the selected month without reloading successful category data', async () => {
    const { result } = await renderHook(() => useBudget());

    await act(async () => {
      await result.current.refresh();
    });

    expect(setRefreshingMock).toHaveBeenNthCalledWith(1, true);
    expect(loadCategoriesMock).not.toHaveBeenCalled();
    expect(loadBudgetMock).toHaveBeenCalledWith('2026-07');
    expect(setRefreshingMock).toHaveBeenLastCalledWith(false);
  });

  it('reloads categories during refresh only when no successful category data exists', async () => {
    setupStores('2026-07', 10000, undefined, undefined, { categoriesLoaded: false });
    const { result } = await renderHook(() => useBudget());

    await act(async () => {
      await result.current.refresh();
    });

    expect(loadCategoriesMock).toHaveBeenCalledTimes(1);
  });

  it('uses income suggestion and formulas only from a matching month snapshot', async () => {
    setupStores('2026-07', 10000, undefined, undefined, {
      loadedMonth: '2026-06',
      incomeSuggestion: 22000,
    });

    const { result } = await renderHook(() => useBudget());

    expect(result.current.state.rows).toEqual([]);
    expect(result.current.state.ruleLens.summary.hasIncome).toBe(false);
    expect(result.current.state.suggestion).toBeNull();
    expect(result.current.state.presentation).toBe('coldLoading');
  });

  it('groups multiple named budgets under one category and counts category spend once', async () => {
    const { result } = await renderHook(() => useBudget());

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

  it('opens copy with cleared selection and requests the targeted preview', async () => {
    const { result } = await renderHook(() => useBudget());

    await act(() => result.current.openCopy());

    expect(clearCopySelectionMock).toHaveBeenCalledTimes(1);
    expect(openCopyMock).toHaveBeenCalledWith();
    expect(loadCopyPreviewMock).toHaveBeenCalledWith('2026-06', '2026-07');
  });

  it('copies selected source-month budgets into the selected month', async () => {
    const { result } = await renderHook(() => useBudget());

    await act(async () => {
      await result.current.copySelectedBudgets(['budget-food-jun']);
    });

    expect(copyBudgetsToMonthMock).toHaveBeenCalledWith('2026-06', '2026-07', ['budget-food-jun']);
    expect(closeCopyMock).toHaveBeenCalledTimes(1);
  });

  it('changes source month by clearing selection and requesting only the new preview', async () => {
    const { result } = await renderHook(() => useBudget());

    await act(() => result.current.setCopySourceMonth('2026-05'));

    expect(setCopySourceMonthMock).toHaveBeenCalledWith('2026-05');
    expect(clearCopySelectionMock).toHaveBeenCalledTimes(1);
    expect(loadCopyPreviewMock).toHaveBeenCalledWith('2026-05', '2026-07');
  });

  it('retries only the current copy preview', async () => {
    setupStores('2026-07', 10000, undefined, undefined, {
      copySheetVisible: true,
      copyPreviewError: true,
    });
    const { result } = await renderHook(() => useBudget());

    await act(() => result.current.retryCopyPreview());

    expect(loadCopyPreviewMock).toHaveBeenCalledWith('2026-06', '2026-07');
    expect(loadBudgetMock).not.toHaveBeenCalled();
    expect(loadCategoriesMock).not.toHaveBeenCalled();
  });

  it('ignores Apply while copy persistence is busy', async () => {
    setupStores('2026-07', 10000, undefined, undefined, {
      copySheetVisible: true,
      copyBusy: true,
    });
    const { result } = await renderHook(() => useBudget());

    await act(async () => {
      await result.current.copySelectedBudgets(['budget-food-jun']);
    });

    expect(copyBudgetsToMonthMock).not.toHaveBeenCalled();
    expect(closeCopyMock).not.toHaveBeenCalled();
  });

  it('keeps copy state open and reports an operational error when persistence fails', async () => {
    setupStores('2026-07', 10000, undefined, undefined, { copySheetVisible: true });
    copyBudgetsToMonthMock.mockRejectedValueOnce(new Error('copy failed'));
    const { result } = await renderHook(() => useBudget());

    await act(async () => {
      await result.current.copySelectedBudgets(['budget-food-jun']);
    });

    expect(setCopyBusyMock).toHaveBeenNthCalledWith(1, true);
    expect(setCopyErrorMock).toHaveBeenNthCalledWith(1, false);
    expect(setCopyErrorMock).toHaveBeenLastCalledWith(true);
    expect(setCopyBusyMock).toHaveBeenLastCalledWith(false);
    expect(closeCopyMock).not.toHaveBeenCalled();
  });

  it('closes once after committed copy even when its snapshot reload records a read failure', async () => {
    copyBudgetsToMonthMock.mockResolvedValueOnce(undefined);
    const { result } = await renderHook(() => useBudget());

    await act(async () => {
      await result.current.copySelectedBudgets(['budget-food-jun']);
    });

    expect(copyBudgetsToMonthMock).toHaveBeenCalledTimes(1);
    expect(closeCopyMock).toHaveBeenCalledTimes(1);
  });

  it('removes a budget from the selected month', async () => {
    const { result } = await renderHook(() => useBudget());

    await act(async () => {
      await result.current.removeBudgetForMonth({ id: 'budget-food-jul', name: 'Monthly Food' });
    });

    expect(removeBudgetMock).toHaveBeenCalledWith('budget-food-jul', '2026-07');
  });
});
