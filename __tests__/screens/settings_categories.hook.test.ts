import { renderHook } from '@testing-library/react-native';

import { CategoryType } from '@/constants/enums';
import { useCategories } from '@/modules/categories/screens/settings/categories/categories.hook';
import { type CategoryStore, useCategoryStore } from '@/modules/categories/store/category.store';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));

const mockedUseCategoryStore = useCategoryStore as jest.MockedFunction<typeof useCategoryStore>;

function setup(overrides: Partial<CategoryStore> = {}) {
  const store = {
    categories: [],
    hasLoaded: false,
    addCategory: jest.fn().mockResolvedValue(undefined),
    updateCategory: jest.fn().mockResolvedValue(undefined),
    deleteCategory: jest.fn().mockResolvedValue(undefined),
    reassignAndDelete: jest.fn().mockResolvedValue(undefined),
    getCategoryTransactionCount: jest.fn().mockResolvedValue(0),
    ...overrides,
  } as unknown as CategoryStore;

  mockedUseCategoryStore.mockReturnValue(store);
  return store;
}

describe('useCategories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('renders without throwing', () => {
    expect(() => renderHook(() => useCategories())).not.toThrow();
  });

  it('customCategories defaults to empty array', () => {
    const { result } = renderHook(() => useCategories());

    expect(result.current.state.customCategories).toEqual([]);
  });

  it('exposes whether category data has loaded', () => {
    const { result } = renderHook(() => useCategories());

    expect(result.current.state.hasLoaded).toBe(false);
  });

  it('starts on the expense tab', () => {
    const { result } = renderHook(() => useCategories());

    expect(result.current.state.activeTab.value).toBe(CategoryType.Expense);
  });
});
