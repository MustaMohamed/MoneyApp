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

function budget(categoryId: string, limit: number, effectiveFrom: string): Budget {
  return {
    id: `${categoryId}-${effectiveFrom}`,
    category_id: categoryId,
    limit_amount: limit,
    effective_from: effectiveFrom,
    created_at: NOW,
    updated_at: NOW,
  };
}

const categories = [category('food', 'Food'), category('car', 'Car')];
const budgetRows = [
  budget('car', 900, '2026-05'),
  budget('food', 3000, '2026-06'),
  budget('car', 1200, '2026-06'),
  budget('food', 3500, '2026-07'),
];

let loadBudgetMock: jest.Mock;
let setSelectedMonthMock: jest.Mock;
let setCopySourceMonthMock: jest.Mock;
let setCopySelectedCategoryIdsMock: jest.Mock;
let openCopyMock: jest.Mock;
let closeCopyMock: jest.Mock;
let copyLimitsToMonthMock: jest.Mock;
let removeBudgetMock: jest.Mock;

function setupStores() {
  loadBudgetMock = jest.fn().mockResolvedValue(undefined);
  copyLimitsToMonthMock = jest.fn().mockResolvedValue(undefined);
  removeBudgetMock = jest.fn().mockResolvedValue(undefined);
  setSelectedMonthMock = jest.fn();
  setCopySourceMonthMock = jest.fn();
  setCopySelectedCategoryIdsMock = jest.fn();
  openCopyMock = jest.fn();
  closeCopyMock = jest.fn();

  attachMockSelectorStore(useCategoryStore as jest.Mock, () => ({
    categories,
    hasLoaded: true,
    loadCategories: jest.fn(),
  }));
  attachMockSelectorStore(useBudgetStore as jest.Mock, () => ({
    rows: budgetRows,
    spendByMonth: {},
    loaded: true,
    expectedIncome: null,
    load: loadBudgetMock,
    copyLimitsToMonth: copyLimitsToMonthMock,
    removeBudget: removeBudgetMock,
  }));
  attachMockSelectorStore(useBudgetState as jest.Mock, () => ({
    selectedMonth: '2026-07',
    copySourceMonth: '2026-06',
    lensTab: 'categories',
    copySheetVisible: false,
    copySelectedCategoryIds: ['food'],
    incomeSuggestion: null,
    openAdd: jest.fn(),
    openEdit: jest.fn(),
    setLensTab: jest.fn(),
    setSelectedMonth: setSelectedMonthMock,
    setCopySourceMonth: setCopySourceMonthMock,
    resetSelectedMonthToCurrent: jest.fn(),
    openCopy: openCopyMock,
    closeCopy: closeCopyMock,
    setCopySelectedCategoryIds: setCopySelectedCategoryIdsMock,
    setIncomeSuggestion: jest.fn(),
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

  it('opens copy sheet with all copyable source-month categories selected', () => {
    const { result } = renderHook(() => useBudget());

    act(() => result.current.openCopy());

    expect(openCopyMock).toHaveBeenCalledWith(['food', 'car']);
  });

  it('copies selected source-month budgets into the selected month', async () => {
    const { result } = renderHook(() => useBudget());

    await act(async () => {
      await result.current.copySelectedBudgets(['food']);
    });

    expect(copyLimitsToMonthMock).toHaveBeenCalledWith('2026-06', '2026-07', ['food']);
    expect(closeCopyMock).toHaveBeenCalledTimes(1);
  });

  it('changes the source month and selects all copyable rows for that source', () => {
    const { result } = renderHook(() => useBudget());

    act(() => result.current.goToPreviousCopySourceMonth());

    expect(setCopySourceMonthMock).toHaveBeenCalledWith('2026-05');
    expect(setCopySelectedCategoryIdsMock).toHaveBeenCalledWith(['car']);
  });

  it('removes a budget from the selected month', async () => {
    const { result } = renderHook(() => useBudget());

    await act(async () => {
      await result.current.removeBudgetForMonth({ id: 'food', name: 'Food' });
    });

    expect(removeBudgetMock).toHaveBeenCalledWith('food', '2026-07');
  });
});
