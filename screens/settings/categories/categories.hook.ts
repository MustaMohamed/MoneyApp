import { useRouter } from 'expo-router';

import type { Category, NewCategoryInput, UpdateCategoryInput } from '@/store/category.store';
import { useCategoryStore } from '@/store/category.store';
import { useCategoriesScreenState } from './categories.state';
import { useCategoriesScreenStore } from './categories.store';

export function useCategories() {
  const router = useRouter();
  const { categories, addCategory, updateCategory, deleteCategory, reassignAndDelete } =
    useCategoryStore();

  const editingCategory = useCategoriesScreenStore((s) => s.state.editingCategory);
  const categoryToDelete = useCategoriesScreenStore((s) => s.state.categoryToDelete);
  const setEditingCategory = useCategoriesScreenStore((s) => s.setEditingCategory);
  const setCategoryToDelete = useCategoriesScreenStore((s) => s.setCategoryToDelete);

  const activeTab = useCategoriesScreenState((s) => s.state.activeTab);
  const setActiveTab = useCategoriesScreenState((s) => s.setActiveTab);
  const showAddSheet = useCategoriesScreenState((s) => s.state.showAddSheet);
  const setShowAddSheet = useCategoriesScreenState((s) => s.setShowAddSheet);
  const showDeleteConfirm = useCategoriesScreenState((s) => s.state.showDeleteConfirm);
  const setShowDeleteConfirm = useCategoriesScreenState((s) => s.setShowDeleteConfirm);
  const showReassignSheet = useCategoriesScreenState((s) => s.state.showReassignSheet);
  const setShowReassignSheet = useCategoriesScreenState((s) => s.setShowReassignSheet);

  const displayedCategories = categories.filter((c) => c.type === activeTab);
  const defaultCategories = displayedCategories.filter((c) => c.is_default === 1);
  const customCategories = displayedCategories.filter((c) => c.is_default === 0);
  const customCount = categories.filter((c) => c.is_default === 0).length;
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
    if (editingCategory) {
      await updateCategory(editingCategory.id, data as UpdateCategoryInput);
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
    if (!categoryToDelete) return;
    await deleteCategory(categoryToDelete.id);
    closeDeleteFlow();
  };

  const handleReassignConfirm = async (toId: string) => {
    if (!categoryToDelete) return;
    await reassignAndDelete(categoryToDelete.id, toId);
    closeDeleteFlow();
  };

  const reassignOptions = categories.filter(
    (c) => c.type === categoryToDelete?.type && c.id !== categoryToDelete?.id,
  );

  return {
    state: {
      defaultCategories,
      customCategories,
      isAtLimit,
      activeTab,
      showAddSheet,
      editingCategory,
      categoryToDelete,
      showDeleteConfirm,
      showReassignSheet,
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
