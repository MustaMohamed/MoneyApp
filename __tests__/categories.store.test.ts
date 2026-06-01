import { act, renderHook } from '@testing-library/react-native';

import { CategoryType } from '@/constants/enums';
import { useCategoriesScreenStore } from '@/modules/categories/screens/settings/categories/categories.store';
import type { Category } from '@/modules/categories/store/category.store';

const fakeCategory: Category = {
  id: 'cat-1',
  name: 'Food',
  type: CategoryType.Expense,
  icon: 'food-fork-drink',
  color: '#C9973A',
  is_default: 0,
  sort_order: 0,
  budget_group: null,
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-01T00:00:00.000Z',
};

describe('useCategoriesScreenStore', () => {
  it('starts with no editing or deleting target', () => {
    const { result } = renderHook(() => useCategoriesScreenStore());
    const { state } = result.current;
    expect(state.editingCategory.value).toBeNull();
    expect(state.categoryToDelete.value).toBeNull();
  });

  it('setEditingCategory stores the value', () => {
    const { result } = renderHook(() => useCategoriesScreenStore());
    act(() => result.current.setEditingCategory(fakeCategory));
    expect(result.current.state.editingCategory.value).toBe(fakeCategory);
  });

  it('setCategoryToDelete stores the value', () => {
    const { result } = renderHook(() => useCategoriesScreenStore());
    act(() => result.current.setCategoryToDelete(fakeCategory));
    expect(result.current.state.categoryToDelete.value).toBe(fakeCategory);
  });

  it('setLinkedCount stores the value', () => {
    const { result } = renderHook(() => useCategoriesScreenStore());
    act(() => result.current.setLinkedCount(47));
    expect(result.current.state.linkedCount.value).toBe(47);
  });

  it('reset clears fields', () => {
    const { result } = renderHook(() => useCategoriesScreenStore());
    act(() => {
      result.current.setEditingCategory(fakeCategory);
      result.current.setCategoryToDelete(fakeCategory);
      result.current.setLinkedCount(12);
    });

    act(() => result.current.reset());

    const { state } = result.current;
    expect(state.editingCategory.value).toBeNull();
    expect(state.categoryToDelete.value).toBeNull();
    expect(state.linkedCount.value).toBe(0);
  });
});
