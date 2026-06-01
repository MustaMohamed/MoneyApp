// oxlint-disable typescript/no-unsafe-assignment typescript/no-unsafe-argument typescript/no-unsafe-call typescript/no-unsafe-member-access typescript/no-unsafe-return typescript/no-unsafe-type-assertion -- Jest module mocks are intentionally untyped in this focused hook test.
import { signal } from '@preact/signals-react';
import { act, renderHook } from '@testing-library/react-native';

// Real `currentYearMonth` is used (reads the system clock); only the stores,
// router, and focus effect are mocked so we can drive focus + time directly.

let capturedFocusCallback: (() => void) | null = null;
let mockSearchParams: Record<string, string | undefined> = { id: 'cat-1' };
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  setParams: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockSearchParams,
  useFocusEffect: (cb: () => void) => {
    capturedFocusCallback = cb;
  },
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
import { useCategoryDetail } from '@/modules/budget/screens/budget/category_detail/category_detail.hook';

function setupStores() {
  (useCategoryStore as jest.Mock).mockReturnValue({
    state: {
      categories: signal([]),
      hasLoaded: signal(false),
    },
    loadCategories: jest.fn(),
  });

  (useBudgetStore as jest.Mock).mockReturnValue({
    state: {
      rows: signal([]),
      spendByMonth: signal({}),
      loaded: signal(false),
      expectedIncome: signal(null),
    },
    load: jest.fn(),
  });

  (useBudgetState as jest.Mock).mockReturnValue({
    state: {
      sheetVisible: signal(false),
      mode: signal('add'),
      targetCategoryId: signal(undefined),
      lensTab: signal('categories'),
    },
    openAdd: jest.fn(),
    openEdit: jest.fn(),
    setLensTab: jest.fn(),
    close: jest.fn(),
    reset: jest.fn(),
  });
}

beforeEach(() => {
  capturedFocusCallback = null;
  mockSearchParams = { id: 'cat-1' };
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.back.mockClear();
  mockRouter.setParams.mockClear();
  jest.useFakeTimers();
  setupStores();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useBudget — month rollover', () => {
  it('exposes unloaded state until categories and budget data settle', () => {
    const budgetState = (useBudgetState as jest.Mock)();
    const { result } = renderHook(() => useBudget(budgetState));

    expect(result.current.state.hasLoaded).toBe(false);
  });

  it('refreshes month when the screen regains focus after a month boundary', async () => {
    jest.setSystemTime(new Date('2026-05-15T12:00:00'));
    const budgetState = (useBudgetState as jest.Mock)();
    const { result } = renderHook(() => useBudget(budgetState));
    expect(result.current.state.month).toBe('2026-05');

    // A month boundary passes while the screen stays mounted.
    jest.setSystemTime(new Date('2026-06-15T12:00:00'));
    await act(async () => {
      capturedFocusCallback?.();
      await Promise.resolve();
    });

    expect(result.current.state.month).toBe('2026-06');
  });

  it('opens the edit sheet from editCategoryId and clears the handoff param', () => {
    mockSearchParams = { editCategoryId: 'cat-food' };
    const budgetState = (useBudgetState as jest.Mock)();

    renderHook(() => useBudget(budgetState));

    expect(budgetState.openEdit).toHaveBeenCalledWith('cat-food');
    expect(mockRouter.setParams).toHaveBeenCalledWith({ editCategoryId: '' });
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

  it('replaces the detail route with the budget edit handoff when editing a budget', () => {
    const { result } = renderHook(() => useCategoryDetail());

    act(() => result.current.editBudget());

    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/(app)/(tabs)/budget',
      params: { editCategoryId: 'cat-1' },
    });
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
