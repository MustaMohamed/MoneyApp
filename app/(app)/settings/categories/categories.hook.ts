import { useRouter } from 'expo-router';

import type { Category, NewCategoryInput, UpdateCategoryInput } from '@/store/category.store';
import { useCategoryStore } from '@/store/category.store';
import { useCategoriesScreenStore } from './categories.store';

export function useCategories() {
  const router = useRouter();
  const { categories, addCategory, updateCategory, deleteCategory, reassignAndDelete } =
    useCategoryStore();
  const {
    activeTab,
    showAddSheet,
    editingCategory,
    categoryToDelete,
    showDeleteConfirm,
    showReassignSheet,
    setActiveTab,
    openAddSheet,
    openEditSheet,
    closeSheet,
    openDeleteConfirm,
    openReassignSheet,
    closeDeleteFlow,
  } = useCategoriesScreenStore();

  const displayedCategories = categories.filter((c) => c.type === activeTab);
  const defaultCategories = displayedCategories.filter((c) => c.is_default === 1);
  const customCategories = displayedCategories.filter((c) => c.is_default === 0);
  const customCount = categories.filter((c) => c.is_default === 0).length;
  const isAtLimit = customCount >= 30;

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
    activeTab,
    defaultCategories,
    customCategories,
    isAtLimit,
    showAddSheet,
    editingCategory,
    categoryToDelete,
    showDeleteConfirm,
    showReassignSheet,
    reassignOptions,
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
