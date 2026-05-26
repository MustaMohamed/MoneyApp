import { CategoryType } from '@/constants/enums';
import { useCategoriesScreenStore } from '@/screens/settings/categories/categories.store';
import type { Category } from '@/store/category.store';

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

beforeEach(() => useCategoriesScreenStore.getState().reset());

describe('useCategoriesScreenStore', () => {
  it('starts with no editing or deleting target', () => {
    const s = useCategoriesScreenStore.getState().state;
    expect(s.editingCategory).toBeNull();
    expect(s.categoryToDelete).toBeNull();
  });

  it('setEditingCategory stores the value', () => {
    useCategoriesScreenStore.getState().setEditingCategory(fakeCategory);
    expect(useCategoriesScreenStore.getState().state.editingCategory).toBe(fakeCategory);
  });

  it('setCategoryToDelete stores the value', () => {
    useCategoriesScreenStore.getState().setCategoryToDelete(fakeCategory);
    expect(useCategoriesScreenStore.getState().state.categoryToDelete).toBe(fakeCategory);
  });

  it('reset clears both', () => {
    useCategoriesScreenStore.getState().setEditingCategory(fakeCategory);
    useCategoriesScreenStore.getState().setCategoryToDelete(fakeCategory);
    useCategoriesScreenStore.getState().reset();
    const s = useCategoriesScreenStore.getState().state;
    expect(s.editingCategory).toBeNull();
    expect(s.categoryToDelete).toBeNull();
  });
});
