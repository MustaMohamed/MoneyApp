import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import type { Category, NewCategoryInput, UpdateCategoryInput } from '@/store/category.store';
import { useCategoryStore } from '@/store/category.store';
import { useCategoriesScreenState } from './categories.state';
import { useCategoriesScreenStore } from './categories.store';

export function useCategories() {
  const router = useRouter();
  const {
    state: catState,
    addCategory,
    updateCategory,
    deleteCategory,
    reassignAndDelete,
  } = useCategoryStore(
    useShallow((s) => ({
      state: s.state,
      addCategory: s.addCategory,
      updateCategory: s.updateCategory,
      deleteCategory: s.deleteCategory,
      reassignAndDelete: s.reassignAndDelete,
    })),
  );

  const {
    state: catScreenDataState,
    setEditingCategory,
    setCategoryToDelete,
  } = useCategoriesScreenStore(
    useShallow((s) => ({
      state: s.state,
      setEditingCategory: s.setEditingCategory,
      setCategoryToDelete: s.setCategoryToDelete,
    })),
  );

  const {
    state: catScreenUiState,
    setActiveTab,
    setShowAddSheet,
    setShowDeleteConfirm,
    setShowReassignSheet,
  } = useCategoriesScreenState(
    useShallow((s) => ({
      state: s.state,
      setActiveTab: s.setActiveTab,
      setShowAddSheet: s.setShowAddSheet,
      setShowDeleteConfirm: s.setShowDeleteConfirm,
      setShowReassignSheet: s.setShowReassignSheet,
    })),
  );

  const displayedCategories = catState.categories.filter(
    (c) => c.type === catScreenUiState.activeTab,
  );
  const defaultCategories = displayedCategories.filter((c) => c.is_default === 1);
  const customCategories = displayedCategories.filter((c) => c.is_default === 0);
  const customCount = catState.categories.filter((c) => c.is_default === 0).length;
  const isAtLimit = customCount >= 30;

  function openAddSheet() {
    setEditingCategory(null);
    setShowAddSheet(true);
  }

  function openEditSheet(category: Category) {
    setEditingCategory(category);
    setShowAddSheet(true);
  }

  function closeSheet() {
    setShowAddSheet(false);
    setEditingCategory(null);
  }

  function openDeleteConfirm(category: Category) {
    setCategoryToDelete(category);
    setShowDeleteConfirm(true);
  }

  function openReassignSheet(category: Category) {
    setCategoryToDelete(category);
    setShowReassignSheet(true);
  }

  function closeDeleteFlow() {
    setCategoryToDelete(null);
    setShowDeleteConfirm(false);
    setShowReassignSheet(false);
  }

  const handleSave = async (data: NewCategoryInput | UpdateCategoryInput) => {
    if (catScreenDataState.editingCategory) {
      await updateCategory(catScreenDataState.editingCategory.id, data as UpdateCategoryInput);
    } else {
      await addCategory(data as NewCategoryInput);
    }
    closeSheet();
  };

  const handleDeletePress = (category: Category) => {
    const hasTransactions = false; // always false in M2a — transactions don't exist yet
    if (hasTransactions) {
      openReassignSheet(category);
    } else {
      openDeleteConfirm(category);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!catScreenDataState.categoryToDelete) return;
    await deleteCategory(catScreenDataState.categoryToDelete.id);
    closeDeleteFlow();
  };

  const handleReassignConfirm = async (toId: string) => {
    if (!catScreenDataState.categoryToDelete) return;
    await reassignAndDelete(catScreenDataState.categoryToDelete.id, toId);
    closeDeleteFlow();
  };

  const reassignOptions = catState.categories.filter(
    (c) =>
      c.type === catScreenDataState.categoryToDelete?.type &&
      c.id !== catScreenDataState.categoryToDelete?.id,
  );

  return {
    state: {
      defaultCategories,
      customCategories,
      isAtLimit,
      activeTab: catScreenUiState.activeTab,
      showAddSheet: catScreenUiState.showAddSheet,
      editingCategory: catScreenDataState.editingCategory,
      categoryToDelete: catScreenDataState.categoryToDelete,
      showDeleteConfirm: catScreenUiState.showDeleteConfirm,
      showReassignSheet: catScreenUiState.showReassignSheet,
      reassignOptions,
    },
    setActiveTab,
    openAddSheet,
    openEditSheet,
    closeSheet,
    handleSave,
    handleDeletePress,
    handleDeleteConfirm,
    handleReassignConfirm,
    closeDeleteFlow,
    goBack: () => router.back(),
  };
}
