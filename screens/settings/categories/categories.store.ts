import { create } from 'zustand';

import type { Category } from '@/store/category.store';

interface CategoriesScreenState {
  activeTab: 'expense' | 'income';
  showAddSheet: boolean;
  editingCategory: Category | null;
  categoryToDelete: Category | null;
  showDeleteConfirm: boolean;
  showReassignSheet: boolean;
  setActiveTab: (tab: 'expense' | 'income') => void;
  openAddSheet: () => void;
  openEditSheet: (category: Category) => void;
  closeSheet: () => void;
  openDeleteConfirm: (category: Category) => void;
  openReassignSheet: (category: Category) => void;
  closeDeleteFlow: () => void;
  reset: () => void;
}

export const useCategoriesScreenStore = create<CategoriesScreenState>((set) => ({
  activeTab: 'expense',
  showAddSheet: false,
  editingCategory: null,
  categoryToDelete: null,
  showDeleteConfirm: false,
  showReassignSheet: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  openAddSheet: () => set({ showAddSheet: true, editingCategory: null }),
  openEditSheet: (category) => set({ showAddSheet: true, editingCategory: category }),
  closeSheet: () => set({ showAddSheet: false, editingCategory: null }),
  openDeleteConfirm: (category) => set({ categoryToDelete: category, showDeleteConfirm: true }),
  openReassignSheet: (category) => set({ categoryToDelete: category, showReassignSheet: true }),
  closeDeleteFlow: () =>
    set({ categoryToDelete: null, showDeleteConfirm: false, showReassignSheet: false }),

  reset: () =>
    set({
      activeTab: 'expense',
      showAddSheet: false,
      editingCategory: null,
      categoryToDelete: null,
      showDeleteConfirm: false,
      showReassignSheet: false,
    }),
}));
