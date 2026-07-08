import { act, renderHook } from '@testing-library/react-native';

import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

// Real `currentYearMonth` is used (reads the system clock); only the stores,
// router, and focus effect are mocked so we can drive focus + time directly.

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));

let capturedFocusCallback: (() => void | (() => void)) | null = null;
const mockInteractionTasks: Array<{ callback: () => void; cancel: jest.Mock }> = [];

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'cat-1' }),
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
jest.mock('@/modules/budget/database/budget_stats', () => ({
  getTrailingIncomeSuggestion: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/database/client', () => ({ getDb: jest.fn().mockResolvedValue({}) }));

const { useCategoryStore } = jest.requireMock('@/modules/categories/store/category.store');
const { useBudgetStore } = jest.requireMock('@/modules/budget/store/budget.store');
const { useBudgetState } = jest.requireMock('@/modules/budget/screens/budget/budget.state');
const { getTrailingIncomeSuggestion } = jest.requireMock('@/modules/budget/database/budget_stats');
const { runAfterInteractions } = jest.requireMock('@/utils/run_after_interactions');

let loadCategoriesMock: jest.Mock;
let loadBudgetMock: jest.Mock;
let selectedMonthState: string;
let copySourceMonthState: string;
let resetSelectedMonthToCurrentMock: jest.Mock;
let setIncomeSuggestionMock: jest.Mock;

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
  loadCategoriesMock = jest.fn();
  loadBudgetMock = jest.fn();
  resetSelectedMonthToCurrentMock = jest.fn(() => {
    const now = new Date();
    selectedMonthState = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    copySourceMonthState = previousYearMonth(selectedMonthState);
  });
  setIncomeSuggestionMock = jest.fn();
  attachMockSelectorStore(useCategoryStore as jest.Mock, () => ({
    categories: [],
    hasLoaded: false,
    loadCategories: loadCategoriesMock,
  }));
  attachMockSelectorStore(useBudgetStore as jest.Mock, () => ({
    rows: [],
    spendByMonth: {},
    loaded: false,
    expectedIncome: null,
    load: loadBudgetMock,
  }));
  attachMockSelectorStore(useBudgetState as jest.Mock, () => ({
    selectedMonth: selectedMonthState,
    copySourceMonth: copySourceMonthState,
    lensTab: 'categories',
    copySheetVisible: false,
    copySelectedCategoryIds: [],
    incomeSuggestion: null,
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
    setCopySelectedCategoryIds: jest.fn(),
    setIncomeSuggestion: setIncomeSuggestionMock,
  }));
}

beforeEach(() => {
  capturedFocusCallback = null;
  mockInteractionTasks.length = 0;
  jest.useFakeTimers();
  getTrailingIncomeSuggestion.mockClear();
  runAfterInteractions.mockClear();
  setupStores();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useBudget — month rollover', () => {
  it('exposes unloaded state until categories and budget data settle', () => {
    const { result } = renderHook(() => useBudget());

    expect(result.current.state.hasLoaded).toBe(false);
  });

  it('refreshes month when the screen regains focus after a month boundary', async () => {
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

    expect(result.current.state.month).toBe('2026-06');
  });

  it('cancels pending focus reload work on cleanup while keeping month rollover synchronous', () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    setupStores();
    const { result, rerender } = renderHook(() => useBudget());
    expect(result.current.state.month).toBe('2026-05');

    loadCategoriesMock.mockClear();
    loadBudgetMock.mockClear();
    getTrailingIncomeSuggestion.mockClear();

    jest.setSystemTime(new Date('2026-06-15T12:00:00'));
    let cleanup: void | (() => void);
    act(() => {
      cleanup = capturedFocusCallback?.();
    });
    rerender(undefined);

    expect(result.current.state.month).toBe('2026-06');
    expect(runAfterInteractions).toHaveBeenCalledTimes(1);
    expect(loadCategoriesMock).not.toHaveBeenCalled();
    expect(loadBudgetMock).not.toHaveBeenCalled();
    expect(getTrailingIncomeSuggestion).not.toHaveBeenCalled();

    act(() => {
      cleanup?.();
      mockInteractionTasks[0]?.callback();
    });

    expect(mockInteractionTasks[0]?.cancel).toHaveBeenCalledTimes(1);
    expect(loadCategoriesMock).not.toHaveBeenCalled();
    expect(loadBudgetMock).not.toHaveBeenCalled();
    expect(getTrailingIncomeSuggestion).not.toHaveBeenCalled();
  });
});

describe('useCategoryDetail — month rollover', () => {
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
});
