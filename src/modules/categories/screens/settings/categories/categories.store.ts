import { batch, type ReadonlySignal, useSignal } from '@preact/signals-react';
import { useCallback } from 'react';

import type { Category } from '@/modules/categories/store/category.store';

type CategoriesScreenSignalStore = {
  editingCategory: ReadonlySignal<Category | null>;
  categoryToDelete: ReadonlySignal<Category | null>;
  linkedCount: ReadonlySignal<number>;
};

type CategoriesScreenStoreActions = {
  setEditingCategory: (c: Category | null) => void;
  setCategoryToDelete: (c: Category | null) => void;
  setLinkedCount: (count: number) => void;
  reset: () => void;
};

export function useCategoriesScreenStore(): {
  state: CategoriesScreenSignalStore;
} & CategoriesScreenStoreActions {
  const editingCategory = useSignal<Category | null>(null);
  const categoryToDelete = useSignal<Category | null>(null);
  const linkedCount = useSignal(0);

  const setEditingCategory = useCallback(
    (c: Category | null) => {
      editingCategory.value = c;
    },
    [editingCategory],
  );
  const setCategoryToDelete = useCallback(
    (c: Category | null) => {
      categoryToDelete.value = c;
    },
    [categoryToDelete],
  );
  const setLinkedCount = useCallback(
    (count: number) => {
      linkedCount.value = count;
    },
    [linkedCount],
  );
  const reset = useCallback(() => {
    batch(() => {
      editingCategory.value = null;
      categoryToDelete.value = null;
      linkedCount.value = 0;
    });
  }, [categoryToDelete, editingCategory, linkedCount]);

  return {
    state: { editingCategory, categoryToDelete, linkedCount },
    setEditingCategory,
    setCategoryToDelete,
    setLinkedCount,
    reset,
  };
}
