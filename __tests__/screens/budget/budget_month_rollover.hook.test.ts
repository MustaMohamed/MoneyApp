import { act, renderHook } from '@testing-library/react-native';

import { CategoryType } from '@/constants/enums';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

// Real `currentYearMonth` is used (reads the system clock); only the stores,
// router, and focus effect are mocked so we can drive focus + time directly.

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));

let capturedFocusCallback: (() => void | (() => void)) | null = null;
let mockRouteMonth: string | undefined;
const mockInteractionTasks: Array<{ callback: () => void; cancel: jest.Mock }> = [];

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockRouterBack }),
  useLocalSearchParams: () => ({ id: 'cat-1', month: mockRouteMonth }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    capturedFocusCallback = cb;
  },
}));

jest.mock('@/utils/run_after_interactions', () => ({
  runAfterInteractions: jest.fn((callback: () => void) => {
    let cancelled = false;
    const cancel = jest.fn(() => {
      cancelled = true;
    });
    const task = {
      callback: () => {
        if (!cancelled) callback();
      },
      cancel,
    };
    mockInteractionTasks.push(task);
    return { cancel: task.cancel };
  }),
}));

jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/budget/store/budget.store', () => ({ useBudgetStore: jest.fn() }));
jest.mock('@/modules/budget/screens/budget/budget.state', () => ({ useBudgetState: jest.fn() }));

const { useCategoryStore } = jest.requireMock('@/modules/categories/store/category.store');
const { useBudgetStore } = jest.requireMock('@/modules/budget/store/budget.store');
const { useBudgetState } = jest.requireMock('@/modules/budget/screens/budget/budget.state');
const { runAfterInteractions } = jest.requireMock('@/utils/run_after_interactions');

let loadCategoriesMock: jest.Mock;
let loadBudgetMock: jest.Mock;
let selectedMonthState: string;
let copySourceMonthState: string;
let resetSelectedMonthToCurrentMock: jest.Mock;
let openEditMock: jest.Mock;
let mockRouterBack: jest.Mock;
let categoriesState: Category[];
let categoriesLoadedState: boolean;
let budgetRowsState: Budget[];
let spendByMonthState: Record<string, Record<string, number>>;
let budgetLoadedState: boolean;
let budgetLoadedMonthState: string | undefined;
let budgetLoadErrorState: boolean;

import { useBudget } from '@/modules/budget/screens/budget/budget.hook';
import { useCategoryDetail } from '@/modules/budget/screens/budget/category_detail/category_detail.hook';

function previousYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;
  return `${previousYear}-${String(previousMonth).padStart(2, '0')}`;
}

function setupStores() {
  selectedMonthState = '2026-05';
  copySourceMonthState = '2026-04';
  categoriesState = [];
  categoriesLoadedState = true;
  budgetRowsState = [];
  spendByMonthState = {};
  budgetLoadedState = true;
  budgetLoadedMonthState = '2026-05';
  budgetLoadErrorState = false;
  loadCategoriesMock = jest.fn().mockResolvedValue(undefined);
  loadBudgetMock = jest.fn();
  openEditMock = jest.fn();
  mockRouterBack = jest.fn();
  resetSelectedMonthToCurrentMock = jest.fn(() => {
    const now = new Date();
    selectedMonthState = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    copySourceMonthState = previousYearMonth(selectedMonthState);
  });
  attachMockSelectorStore(useCategoryStore as jest.Mock, () => ({
    categories: categoriesState,
    hasLoaded: categoriesLoadedState,
    loadCategories: loadCategoriesMock,
  }));
  attachMockSelectorStore(useBudgetStore as jest.Mock, () => ({
    rows: budgetRowsState,
    spendByMonth: spendByMonthState,
    spendByBudgetId: {},
    spendingPlans: [],
    spendingPlanSpendById: {},
    loaded: budgetLoadedState,
    loadedMonth: budgetLoadedMonthState,
    loadError: budgetLoadErrorState,
    expectedIncome: null,
    incomeSuggestion: null,
    budgetGroupByCategoryId: {},
    copyPreviewRows: [],
    copyPreviewSourceMonth: undefined,
    copyPreviewTargetMonth: undefined,
    copyPreviewLoaded: false,
    copyPreviewLoading: false,
    copyPreviewError: false,
    load: loadBudgetMock,
    loadCopyPreview: jest.fn(),
    copyBudgetsToMonth: jest.fn(),
    removeBudget: jest.fn(),
    setSpendingPlan: jest.fn(),
    removeSpendingPlan: jest.fn(),
  }));
  attachMockSelectorStore(useBudgetState as jest.Mock, () => ({
    selectedMonth: selectedMonthState,
    copySourceMonth: copySourceMonthState,
    lensTab: 'categories',
    copySheetVisible: false,
    copySelectedBudgetIds: [],
    copyBusy: false,
    copyError: false,
    refreshing: false,
    expandedCategoryId: undefined,
    expandedBudgetGroup: undefined,
    openAdd: jest.fn(),
    openEdit: openEditMock,
    setLensTab: jest.fn(),
    setSelectedMonth: jest.fn((month: string) => {
      selectedMonthState = month;
      copySourceMonthState = previousYearMonth(month);
    }),
    setCopySourceMonth: jest.fn((month: string) => {
      copySourceMonthState = month;
    }),
    resetSelectedMonthToCurrent: resetSelectedMonthToCurrentMock,
    openCopy: jest.fn(),
    closeCopy: jest.fn(),
    setCopySelectedBudgetIds: jest.fn(),
    toggleCopyBudgetId: jest.fn(),
    clearCopySelection: jest.fn(),
    setCopyBusy: jest.fn(),
    setCopyError: jest.fn(),
    setRefreshing: jest.fn(),
    setExpandedCategoryId: jest.fn(),
    setExpandedBudgetGroup: jest.fn(),
  }));
}

const NOW = '2026-05-01T00:00:00.000Z';

function category(id: string): Category {
  return {
    id,
    name: 'Food',
    type: CategoryType.Expense,
    icon: 'food',
    color: '#caa445',
    is_default: 0,
    sort_order: 0,
    budget_group: null,
    created_at: NOW,
    updated_at: NOW,
  };
}

function budget(id: string, name: string): Budget {
  return {
    id,
    category_id: 'cat-1',
    name,
    limit_amount: 1000,
    effective_from: '2026-05',
    created_at: NOW,
    updated_at: NOW,
  };
}

beforeEach(() => {
  capturedFocusCallback = null;
  mockInteractionTasks.length = 0;
  jest.useFakeTimers();
  runAfterInteractions.mockClear();
  setupStores();
  mockRouteMonth = undefined;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useBudget — month rollover', () => {
  it('exposes unloaded state until categories and budget data settle', () => {
    categoriesLoadedState = false;
    budgetLoadedState = false;
    budgetLoadedMonthState = undefined;
    const { result } = renderHook(() => useBudget());

    expect(result.current.state.hasLoaded).toBe(false);
  });

  it('preserves the selected month when the screen regains focus', async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    setupStores();
    const { result, rerender } = renderHook(() => useBudget());
    expect(result.current.state.month).toBe('2026-05');

    // A month boundary passes while the screen stays mounted.
    jest.setSystemTime(new Date('2026-06-15T12:00:00'));
    await act(async () => {
      capturedFocusCallback?.();
      await Promise.resolve();
    });
    rerender(undefined);

    expect(result.current.state.month).toBe('2026-05');
    expect(resetSelectedMonthToCurrentMock).not.toHaveBeenCalled();
  });

  it('cancels pending focus reload work without changing the selected month', () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    setupStores();
    const { result, rerender } = renderHook(() => useBudget());
    expect(result.current.state.month).toBe('2026-05');

    loadCategoriesMock.mockClear();
    loadBudgetMock.mockClear();
    jest.setSystemTime(new Date('2026-06-15T12:00:00'));
    let cleanup: void | (() => void);
    act(() => {
      cleanup = capturedFocusCallback?.();
    });
    rerender(undefined);

    expect(result.current.state.month).toBe('2026-05');
    expect(runAfterInteractions).toHaveBeenCalledTimes(1);
    expect(loadCategoriesMock).not.toHaveBeenCalled();
    expect(loadBudgetMock).not.toHaveBeenCalled();

    act(() => {
      cleanup?.();
      mockInteractionTasks[0]?.callback();
    });

    expect(mockInteractionTasks[0]?.cancel).toHaveBeenCalledTimes(1);
    expect(loadCategoriesMock).not.toHaveBeenCalled();
    expect(loadBudgetMock).not.toHaveBeenCalled();
  });

  it('loads the focused selected month and refreshes through the same store key', async () => {
    const { result } = renderHook(() => useBudget());

    act(() => {
      capturedFocusCallback?.();
      mockInteractionTasks[0]?.callback();
    });
    await act(async () => {
      await result.current.refresh();
    });

    expect(loadBudgetMock).toHaveBeenNthCalledWith(1, '2026-05');
    expect(loadBudgetMock).toHaveBeenNthCalledWith(2, '2026-05');
    expect(loadCategoriesMock).not.toHaveBeenCalled();
  });

  it('loads categories on focus only when no successful category data exists', () => {
    categoriesLoadedState = false;
    renderHook(() => useBudget());

    act(() => {
      capturedFocusCallback?.();
      mockInteractionTasks[0]?.callback();
    });

    expect(loadCategoriesMock).toHaveBeenCalledTimes(1);
  });
});

describe('useCategoryDetail — month rollover', () => {
  it('does not expose stale detail values while the requested month is loading', () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    mockRouteMonth = '2026-06';
    categoriesState = [category('cat-1')];
    budgetRowsState = [budget('budget-may', 'Monthly Food')];
    budgetLoadedMonthState = '2026-05';

    const { result } = renderHook(() => useCategoryDetail());

    expect(result.current.state.hasLoaded).toBe(false);
    expect(result.current.state.liveMonth).toBeUndefined();
    expect(result.current.state.history.monthsTotal).toBe(0);
  });

  it('reports a failed requested-month load so the screen can offer retry', () => {
    mockRouteMonth = '2026-06';
    budgetLoadedMonthState = '2026-05';
    budgetLoadErrorState = true;

    const { result } = renderHook(() => useCategoryDetail());

    expect(result.current.state.hasLoaded).toBe(false);
    expect(result.current.state.loadError).toBe(true);
  });

  it.each([
    ['2026-04', 'completed'],
    ['2026-05', 'provisional'],
    ['2026-06', 'planned'],
  ] as const)('classifies selected %s details as %s', (selectedMonth, lifecycle) => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    mockRouteMonth = selectedMonth;
    budgetLoadedMonthState = selectedMonth;
    categoriesState = [category('cat-1')];
    budgetRowsState = [
      { ...budget('budget-selected', 'Monthly Food'), effective_from: selectedMonth },
    ];

    const { result } = renderHook(() => useCategoryDetail());

    expect(result.current.state.liveMonth?.lifecycle).toBe(lifecycle);
    expect(result.current.state.daysLeft).toBe(lifecycle === 'provisional' ? 16 : undefined);
  });

  it('refreshes month when the screen regains focus after a month boundary', async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    const { result } = renderHook(() => useCategoryDetail());
    expect(result.current.state.month).toBe('2026-05');

    jest.setSystemTime(new Date('2026-06-15T12:00:00'));
    await act(async () => {
      capturedFocusCallback?.();
      await Promise.resolve();
    });

    expect(result.current.state.month).toBe('2026-06');
  });

  it('opens edit with the only live-month named budget id', () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    categoriesState = [category('cat-1')];
    budgetRowsState = [budget('budget-food-main', 'Monthly Food')];

    const { result } = renderHook(() => useCategoryDetail());

    expect(result.current.state.canEditLiveBudget).toBe(true);
    act(() => result.current.editBudget());

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
    expect(openEditMock).toHaveBeenCalledWith('budget-food-main');
  });

  it('does not open aggregate edit when the live month has multiple named budgets', () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    categoriesState = [category('cat-1')];
    budgetRowsState = [
      budget('budget-food-main', 'Monthly Food'),
      budget('budget-food-trip', 'Trip Food'),
    ];

    const { result } = renderHook(() => useCategoryDetail());

    expect(result.current.state.canEditLiveBudget).toBe(false);
    act(() => result.current.editBudget());

    expect(mockRouterBack).not.toHaveBeenCalled();
    expect(openEditMock).not.toHaveBeenCalled();
  });
});
