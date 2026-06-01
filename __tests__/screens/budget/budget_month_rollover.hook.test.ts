import { signal } from '@preact/signals-react';
import { act, renderHook } from '@testing-library/react-native';

import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

// Real `currentYearMonth` is used (reads the system clock); only the stores,
// router, and focus effect are mocked so we can drive focus + time directly.

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));

let capturedFocusCallback: (() => void) | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'cat-1' }),
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
  attachMockSelectorStore(useBudgetStore as jest.Mock, () => ({
    rows: [],
    spendByMonth: {},
    loaded: false,
    expectedIncome: null,
    load: jest.fn(),
  }));
  attachMockSelectorStore(useBudgetState as jest.Mock, () => ({
    lensTab: 'categories',
    openAdd: jest.fn(),
    openEdit: jest.fn(),
    setLensTab: jest.fn(),
  }));
}

beforeEach(() => {
  capturedFocusCallback = null;
  jest.useFakeTimers();
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
    const { result } = renderHook(() => useBudget());
    expect(result.current.state.month).toBe('2026-05');

    // A month boundary passes while the screen stays mounted.
    jest.setSystemTime(new Date('2026-06-15T12:00:00'));
    await act(async () => {
      capturedFocusCallback?.();
      await Promise.resolve();
    });

    expect(result.current.state.month).toBe('2026-06');
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
