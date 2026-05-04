import { create } from 'zustand';

import type { Category } from '@/store/category.store';

interface CategoriesScreenStoreShape {
  editingCategory: Category | null;
  categoryToDelete: Category | null;
}

interface CategoriesScreenStore {
  state: CategoriesScreenStoreShape;
  setEditingCategory: (c: Category | null) => void;
  setCategoryToDelete: (c: Category | null) => void;
  reset: () => void;
}

const INITIAL_STATE: CategoriesScreenStoreShape = {
  editingCategory: null,
  categoryToDelete: null,
};

export const useCategoriesScreenStore = create<CategoriesScreenStore>((set) => ({
  state: INITIAL_STATE,
  setEditingCategory: (c) => set((s) => ({ state: { ...s.state, editingCategory: c } })),
  setCategoryToDelete: (c) => set((s) => ({ state: { ...s.state, categoryToDelete: c } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
