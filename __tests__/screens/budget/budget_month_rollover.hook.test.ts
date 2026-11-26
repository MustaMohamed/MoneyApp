import { act, renderHook } from '@testing-library/react-native';

import { BudgetGroup, CategoryType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { BUDGET_GROUP_OPTIONS } from '@/modules/budget/screens/budget/components/set_budget_sheet.helpers';
import type { Category } from '@/modules/categories/entities/category.entity';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { formatAmount, formatDisplayAmountParts } from '@/utils/format_amount';
import { wholePercent } from '@/utils/money';

// `currentYearMonth` is left unmocked, so `jest.setSystemTime` drives the month.

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

const mockDayListeners = new Set<(today: string) => void>();
jest.mock('@/utils/local_day_ticker', () => ({
  subscribeToLocalDay: jest.fn((listener: (today: string) => void) => {
    mockDayListeners.add(listener);
    return () => mockDayListeners.delete(listener);
  }),
}));

function emitLocalDay(today: string) {
  for (const listener of [...mockDayListeners]) listener(today);
}

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
let mockRouterBack: jest.Mock;
let categoriesState: Category[];
let categoriesLoadedState: boolean;
let categoriesLoadErrorState: boolean;
let budgetRowsState: Budget[];
let spendByMonthState: Record<string, Record<string, number>>;
let spendByBudgetIdState: Record<string, number>;
let budgetLoadedState: boolean;
let budgetLoadedMonthState: string | undefined;
let budgetLoadErrorState: boolean;
let expectedIncomeState: number | null;
let budgetGroupByCategoryIdState: Record<string, BudgetGroup>;

import { useBudget } from '@/modules/budget/screens/budget/budget.hook';
import { useCategoryDetail } from '@/modules/budget/screens/budget/category_detail/category_detail.hook';
import { useSetBudgetSheetState } from '@/modules/budget/screens/budget/components/set_budget_sheet.state';

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
  categoriesLoadErrorState = false;
  budgetRowsState = [];
  spendByMonthState = {};
  spendByBudgetIdState = {};
  budgetLoadedState = true;
  budgetLoadedMonthState = '2026-05';
  budgetLoadErrorState = false;
  expectedIncomeState = null;
  budgetGroupByCategoryIdState = {};
  loadCategoriesMock = jest.fn().mockResolvedValue(undefined);
  loadBudgetMock = jest.fn().mockResolvedValue(undefined);
  mockRouterBack = jest.fn();
  resetSelectedMonthToCurrentMock = jest.fn(() => {
    const now = new Date();
    selectedMonthState = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    copySourceMonthState = previousYearMonth(selectedMonthState);
  });
  attachMockSelectorStore(useCategoryStore as jest.Mock, () => ({
    categories: categoriesState,
    hasLoaded: categoriesLoadedState,
    loadError: categoriesLoadErrorState,
    loadCategories: loadCategoriesMock,
  }));
  attachMockSelectorStore(useBudgetStore as jest.Mock, () => ({
    rows: budgetRowsState,
    spendByMonth: spendByMonthState,
    spendByBudgetId: spendByBudgetIdState,
    spendingPlans: [],
    spendingPlanSpendById: {},
    loaded: budgetLoadedState,
    loadedMonth: budgetLoadedMonthState,
    loadError: budgetLoadErrorState,
    expectedIncome: expectedIncomeState,
    incomeSuggestion: null,
    budgetGroupByCategoryId: budgetGroupByCategoryIdState,
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
    openEdit: jest.fn(),
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
  mockDayListeners.clear();
  mockInteractionTasks.length = 0;
  jest.useFakeTimers();
  runAfterInteractions.mockClear();
  setupStores();
  useSetBudgetSheetState.getState().reset();
  mockRouteMonth = undefined;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useBudget — month rollover', () => {
  it('exposes unloaded state until categories and budget data settle', async () => {
    categoriesLoadedState = false;
    budgetLoadedState = false;
    budgetLoadedMonthState = undefined;
    const { result } = await renderHook(() => useBudget());

    expect(result.current.state.hasLoaded).toBe(false);
  });

  it('preserves the selected month when the screen regains focus', async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    setupStores();
    const { result, rerender } = await renderHook(() => useBudget());
    expect(result.current.state.month).toBe('2026-05');

    jest.setSystemTime(new Date('2026-06-15T12:00:00'));
    await act(async () => {
      capturedFocusCallback?.();
      await Promise.resolve();
    });
    await rerender(undefined);

    expect(result.current.state.month).toBe('2026-05');
    expect(resetSelectedMonthToCurrentMock).not.toHaveBeenCalled();
  });

  it('cancels pending focus reload work without changing the selected month', async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    setupStores();
    const { result, rerender } = await renderHook(() => useBudget());
    expect(result.current.state.month).toBe('2026-05');

    loadCategoriesMock.mockClear();
    loadBudgetMock.mockClear();
    jest.setSystemTime(new Date('2026-06-15T12:00:00'));
    let cleanup: void | (() => void);
    await act(() => {
      cleanup = capturedFocusCallback?.();
    });
    await rerender(undefined);

    expect(result.current.state.month).toBe('2026-05');
    expect(runAfterInteractions).toHaveBeenCalledTimes(1);
    expect(loadCategoriesMock).not.toHaveBeenCalled();
    expect(loadBudgetMock).not.toHaveBeenCalled();

    await act(() => {
      cleanup?.();
      mockInteractionTasks[0]?.callback();
    });

    expect(mockInteractionTasks[0]?.cancel).toHaveBeenCalledTimes(1);
    expect(loadCategoriesMock).not.toHaveBeenCalled();
    expect(loadBudgetMock).not.toHaveBeenCalled();
  });

  it('loads the focused selected month and refreshes through the same store key', async () => {
    const { result } = await renderHook(() => useBudget());

    await act(() => {
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

  it('loads categories on focus only when no successful category data exists', async () => {
    categoriesLoadedState = false;
    await renderHook(() => useBudget());

    await act(() => {
      capturedFocusCallback?.();
      mockInteractionTasks[0]?.callback();
    });

    expect(loadCategoriesMock).toHaveBeenCalledTimes(1);
  });

  it('does not schedule a second focused budget request when categories become warm', async () => {
    categoriesLoadedState = false;
    const { rerender } = await renderHook(() => useBudget());
    const initialFocusCallback = capturedFocusCallback;

    await act(() => {
      capturedFocusCallback?.();
      mockInteractionTasks[0]?.callback();
    });
    expect(loadBudgetMock).toHaveBeenCalledTimes(1);

    categoriesLoadedState = true;
    await rerender(undefined);

    expect(capturedFocusCallback).toBe(initialFocusCallback);
    expect(mockInteractionTasks).toHaveLength(1);
    expect(loadBudgetMock).toHaveBeenCalledTimes(1);
  });
});

describe('useCategoryDetail — month rollover', () => {
  it('does not expose stale detail values while the requested month is loading', async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    mockRouteMonth = '2026-06';
    categoriesState = [category('cat-1')];
    budgetRowsState = [budget('budget-may', 'Monthly Food')];
    budgetLoadedMonthState = '2026-05';

    const { result } = await renderHook(() => useCategoryDetail());

    expect(result.current.state.viewState).toBe('loading');
    expect(result.current.state.hero).toBeUndefined();
    expect(result.current.state.history.monthsTotal).toBe(0);
  });

  it('reports a failed requested-month load so the screen can offer retry', async () => {
    mockRouteMonth = '2026-06';
    budgetLoadedMonthState = '2026-05';
    budgetLoadErrorState = true;

    const { result } = await renderHook(() => useCategoryDetail());

    expect(result.current.state.viewState).toBe('firstLoadError');
  });

  it('reads notFound when the loaded month has no category for the route id', async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    categoriesState = [category('cat-2')];

    const { result } = await renderHook(() => useCategoryDetail());

    expect(result.current.state.viewState).toBe('notFound');
  });

  it('keeps the loaded category on screen when the budget refresh fails', async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    categoriesState = [category('cat-1')];
    budgetLoadErrorState = true;

    const { result } = await renderHook(() => useCategoryDetail());

    expect(result.current.state.viewState).toBe('refreshErrorWithData');
  });

  it('reloads categories and the month on retry when the category refresh failed', async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    categoriesState = [category('cat-1')];
    categoriesLoadErrorState = true;

    const { result } = await renderHook(() => useCategoryDetail());

    expect(result.current.state.viewState).toBe('refreshErrorWithData');
    await act(() => {
      result.current.retry();
    });

    expect(loadCategoriesMock).toHaveBeenCalledTimes(1);
    expect(loadBudgetMock).toHaveBeenCalledWith('2026-05');
  });

  it('reloads only the month on retry when only the budget refresh failed', async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    categoriesState = [category('cat-1')];
    budgetLoadErrorState = true;

    const { result } = await renderHook(() => useCategoryDetail());

    expect(result.current.state.viewState).toBe('refreshErrorWithData');
    await act(() => {
      result.current.retry();
    });

    expect(loadBudgetMock).toHaveBeenCalledWith('2026-05');
    expect(loadCategoriesMock).not.toHaveBeenCalled();
  });

  it('reloads categories on focus when the loaded category list failed its refresh', async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    categoriesLoadedState = true;
    categoriesLoadErrorState = true;
    await renderHook(() => useCategoryDetail());

    await act(() => {
      capturedFocusCallback?.();
    });

    expect(loadCategoriesMock).toHaveBeenCalledTimes(1);
    expect(loadBudgetMock).toHaveBeenCalledWith('2026-05');
  });

  it('does not query categories again when category detail opens warm', async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    categoriesLoadedState = true;
    await renderHook(() => useCategoryDetail());

    await act(() => {
      capturedFocusCallback?.();
    });

    expect(loadCategoriesMock).not.toHaveBeenCalled();
    expect(loadBudgetMock).toHaveBeenCalledWith('2026-05');
  });

  it.each([
    ['2026-04', 'completed'],
    ['2026-05', 'provisional'],
    ['2026-06', 'planned'],
  ] as const)('classifies selected %s details as %s', async (selectedMonth, lifecycle) => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    mockRouteMonth = selectedMonth;
    budgetLoadedMonthState = selectedMonth;
    categoriesState = [category('cat-1')];
    budgetRowsState = [
      { ...budget('budget-selected', 'Monthly Food'), effective_from: selectedMonth },
    ];

    const { result } = await renderHook(() => useCategoryDetail());

    expect(
      result.current.state.history.results.find((r) => r.yearMonth === selectedMonth)?.lifecycle,
    ).toBe(lifecycle);
  });

  it('draws the selected month with no budget as its own bar and the no-budget hero', async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    mockRouteMonth = '2026-05';
    categoriesState = [category('cat-1')];
    budgetRowsState = [
      { ...budget('budget-mar', 'Monthly Food'), effective_from: '2026-03' },
      { ...budget('budget-apr', 'Monthly Food'), effective_from: '2026-04' },
    ];
    spendByMonthState = { 'cat-1': { '2026-05': 250 } };

    const { result } = await renderHook(() => useCategoryDetail());

    expect(result.current.state.hero).toBeDefined();
    expect(result.current.state.hero?.amountValue).toBe(Strings.budgetCategoryDetailHeroNoBudget);
    const bars = result.current.state.history.results;
    expect(bars.map((r) => r.yearMonth)).toEqual(['2026-03', '2026-04', '2026-05']);
    expect(bars[2].limit).toBeUndefined();
    expect(bars[2].spent).toBe(250);
  });

  it('keeps the future months up to a selected future month as planned bars out of the figures', async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    mockRouteMonth = '2026-07';
    budgetLoadedMonthState = '2026-07';
    categoriesState = [category('cat-1')];
    budgetRowsState = ['2026-04', '2026-05', '2026-06', '2026-07'].map((ym) => ({
      ...budget(`budget-${ym}`, 'Monthly Food'),
      effective_from: ym,
    }));

    const { result } = await renderHook(() => useCategoryDetail());

    const { history } = result.current.state;
    expect(history.results.map((r) => [r.yearMonth, r.lifecycle])).toEqual([
      ['2026-04', 'completed'],
      ['2026-05', 'provisional'],
      ['2026-06', 'planned'],
      ['2026-07', 'planned'],
    ]);
    expect(history.monthsTotal).toBe(1);
  });
});

describe('useCategoryDetail — hero', () => {
  const groupLabel = (group: BudgetGroup) =>
    BUDGET_GROUP_OPTIONS.find((option) => option.value === group)?.label;

  function loadedMay() {
    categoriesState = [category('cat-1')];
    budgetRowsState = [budget('budget-may', 'Monthly Food')];
  }

  it('gives no hero while the requested month is loading, and one once it loads', async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    mockRouteMonth = '2026-06';
    loadedMay();
    budgetLoadedMonthState = '2026-05';

    const { result, rerender } = await renderHook(() => useCategoryDetail());

    expect(result.current.state.viewState).toBe('loading');
    expect(result.current.state.hero).toBeUndefined();

    budgetLoadedMonthState = '2026-06';
    await rerender(undefined);

    expect(result.current.state.viewState).toBe('ready');
    expect(result.current.state.hero).toBeDefined();
  });

  it.each([
    ['2026-04', (): string => Strings.budgetHeroLeftUnspent, false],
    ['2026-05', (): string => Strings.budgetHeroLeftThisMonth, true],
    ['2026-06', (): string => Strings.budgetHeroLeftToSpend, false],
  ] as const)(
    'labels selected %s by its place against today',
    async (selectedMonth, overline, ticks) => {
      jest.setSystemTime(new Date('2026-05-15T12:00:00'));
      mockRouteMonth = selectedMonth;
      budgetLoadedMonthState = selectedMonth;
      categoriesState = [category('cat-1')];
      budgetRowsState = [
        { ...budget('budget-selected', 'Monthly Food'), effective_from: selectedMonth },
      ];

      const { result } = await renderHook(() => useCategoryDetail());

      const hero = result.current.state.hero;
      expect(hero).toBeDefined();
      expect(hero?.overline).toBe(overline());
      if (ticks) expect(hero?.bar?.tickShare).toBe(15 / 31);
      else expect(hero?.bar?.tickShare).toBeUndefined();
    },
  );

  it('recomputes days left and the tick when the local day changes while open', async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    loadedMay();

    const { result } = await renderHook(() => useCategoryDetail());
    const openCaption = result.current.state.hero?.caption;
    if (typeof openCaption !== 'string') throw new Error('expected a plain caption');
    expect(openCaption.endsWith(Strings.budgetCategoriesDaysLeft(16))).toBe(true);

    jest.setSystemTime(new Date('2026-05-16T00:00:01'));
    await act(async () => {
      emitLocalDay('2026-05-16');
    });

    const hero = result.current.state.hero;
    const nextCaption = hero?.caption;
    if (typeof nextCaption !== 'string') throw new Error('expected a plain caption');
    expect(nextCaption.endsWith(Strings.budgetCategoriesDaysLeft(15))).toBe(true);
    expect(hero?.bar?.tickShare).toBe(16 / 31);
  });

  it('hands focus a new callback that loads the new month when the day crosses the month end', async () => {
    jest.setSystemTime(new Date('2026-05-31T12:00:00'));
    loadedMay();

    const { result } = await renderHook(() => useCategoryDetail());
    const beforeCallback = capturedFocusCallback;

    jest.setSystemTime(new Date('2026-06-01T00:00:01'));
    await act(async () => {
      emitLocalDay('2026-06-01');
    });

    expect(result.current.state.month).toBe('2026-06');
    expect(capturedFocusCallback).not.toBe(beforeCallback);
    loadBudgetMock.mockClear();
    await act(async () => {
      capturedFocusCallback?.();
      await Promise.resolve();
    });
    expect(loadBudgetMock).toHaveBeenCalledWith('2026-06');
  });

  it("sums the month's budgets for the limit against the month's whole spending", async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    categoriesState = [category('cat-1')];
    budgetRowsState = [
      { ...budget('budget-clothes', 'Clothes'), limit_amount: 2000 },
      { ...budget('budget-home', 'Home'), limit_amount: 1000 },
    ];
    spendByMonthState = { 'cat-1': { '2026-05': 1150 } };

    const { result } = await renderHook(() => useCategoryDetail());

    const hero = result.current.state.hero;
    expect(hero?.amountValue).toBe(formatDisplayAmountParts(1850, Currency.EGP).text);
    expect(hero?.caption).toContain(formatAmount(3000));
  });

  it("reads the month's own group first", async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    loadedMay();
    budgetGroupByCategoryIdState = { 'cat-1': BudgetGroup.Need };

    const { result } = await renderHook(() => useCategoryDetail());

    expect(result.current.state.hero?.badgeLabel).toBe(groupLabel(BudgetGroup.Need));
  });

  it("falls back to the category's default group when the month has no income", async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    loadedMay();
    categoriesState = [{ ...category('cat-1'), budget_group: BudgetGroup.Want }];

    const { result } = await renderHook(() => useCategoryDetail());

    expect(result.current.state.hero?.badgeLabel).toBe(groupLabel(BudgetGroup.Want));
  });

  it('reads Not grouped when the month has income but no group for the category', async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    loadedMay();
    categoriesState = [{ ...category('cat-1'), budget_group: BudgetGroup.Want }];
    expectedIncomeState = 5000;

    const { result } = await renderHook(() => useCategoryDetail());

    expect(result.current.state.hero?.badgeLabel).toBe(Strings.budget5030NotGroupedTitle);
  });

  function homeThenClothes(yearMonth: string) {
    categoriesState = [category('cat-1')];
    budgetRowsState = [
      { ...budget('b-2', 'Home'), effective_from: yearMonth },
      { ...budget('b-1', 'Clothes'), effective_from: yearMonth },
    ];
    spendByMonthState = { 'cat-1': { [yearMonth]: 900 } };
    spendByBudgetIdState = { 'b-1': 900 };
  }

  it("hands the screen the month's budgets in store order with the Watch tag in the current month", async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    homeThenClothes('2026-05');

    const { result } = await renderHook(() => useCategoryDetail());

    const card = result.current.state.budgetsCard;
    expect(card?.rows.map((r) => r.id)).toEqual(['b-2', 'b-1']);
    const clothes = card?.rows.find((r) => r.id === 'b-1');
    expect(clothes?.usedLabel).toBe(`${wholePercent(900, 1000)}%`);
    expect(clothes?.tag?.label).toBe(Strings.budgetCategoriesStatusWatch);
  });

  it('gives a watch-level row no tag in a completed month', async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    mockRouteMonth = '2026-04';
    budgetLoadedMonthState = '2026-04';
    homeThenClothes('2026-04');

    const { result } = await renderHook(() => useCategoryDetail());

    const clothes = result.current.state.budgetsCard?.rows.find((r) => r.id === 'b-1');
    expect(clothes).toBeDefined();
    expect(clothes?.usedLabel).toBe(`${wholePercent(900, 1000)}%`);
    expect(clothes?.tag).toBeUndefined();
  });

  it('gives no card while the requested month is loading, and one once it loads', async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    mockRouteMonth = '2026-06';
    homeThenClothes('2026-06');
    budgetLoadedMonthState = '2026-05';

    const { result, rerender } = await renderHook(() => useCategoryDetail());

    expect(result.current.state.viewState).toBe('loading');
    expect(result.current.state.budgetsCard).toBeUndefined();

    budgetLoadedMonthState = '2026-06';
    await rerender(undefined);

    expect(result.current.state.budgetsCard?.count).toBe(2);
  });
});
