import { create } from 'zustand';

import type { Category } from '@/modules/categories/store/category.store';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface CategoriesScreenStoreShape {
  editingCategory: Category | null;
  categoryToDelete: Category | null;
  linkedCount: number;
}

type CategoriesScreenStore = CategoriesScreenStoreShape & {
  setEditingCategory: (c: Category | null) => void;
  setCategoryToDelete: (c: Category | null) => void;
  setLinkedCount: (count: number) => void;
  reset: () => void;
};

const INITIAL_STATE: CategoriesScreenStoreShape = {
  editingCategory: null,
  categoryToDelete: null,
  linkedCount: 0,
};

export const useCategoriesScreenStore = createMoneyAppSelectors(
  create<CategoriesScreenStore>((set) => ({
    ...INITIAL_STATE,
    setEditingCategory: (c) => set((s) => ({ ...s, editingCategory: c })),
    setCategoryToDelete: (c) => set((s) => ({ ...s, categoryToDelete: c })),
    setLinkedCount: (count) => set((s) => ({ ...s, linkedCount: count })),
    reset: () => set(INITIAL_STATE),
  })),
);
