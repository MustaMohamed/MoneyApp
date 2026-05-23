import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { getCategoryTransactionCount } from '@/database/categories';
import { getDb } from '@/database/client';
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
    setLinkedCount,
  } = useCategoriesScreenStore(
    useShallow((s) => ({
      state: s.state,
      setEditingCategory: s.setEditingCategory,
      setCategoryToDelete: s.setCategoryToDelete,
      setLinkedCount: s.setLinkedCount,
    })),
  );

  const {
    state: catScreenUiState,
    setActiveTab,
    setShowAddSheet,
    setShowDeleteConfirm,
    setShowReassignSheet,
    setIsDeleting,
  } = useCategoriesScreenState(
    useShallow((s) => ({
      state: s.state,
      setActiveTab: s.setActiveTab,
      setShowAddSheet: s.setShowAddSheet,
      setShowDeleteConfirm: s.setShowDeleteConfirm,
      setShowReassignSheet: s.setShowReassignSheet,
      setIsDeleting: s.setIsDeleting,
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
    setLinkedCount(0);
  }

  const handleSave = async (data: NewCategoryInput | UpdateCategoryInput) => {
    if (catScreenDataState.editingCategory) {
      await updateCategory(catScreenDataState.editingCategory.id, data as UpdateCategoryInput);
    } else {
      // addCategory throws 'already exists' on name+type collision — caller catches
      // and surfaces as categoriesErrNameDuplicate form error (TC-06)
      await addCategory(data as NewCategoryInput);
    }
    closeSheet();
  };

  /**
   * Replaces the M2a stub `hasTransactions = false`.
   *
   * Flow:
   *  1. Set isDeleting = true (disables delete affordance on CategoryRow)
   *  2. Query real transaction count from DB
   *  3. Store the count in linkedCount (used as subtitle in ReassignCategorySheet)
   *  4. Branch: count === 0 → DeleteConfirmationDialog
   *             count  > 0 → ReassignCategorySheet
   *  5. Set isDeleting = false in `finally` (TC-09 partial-failure safety)
   *
   * Note: PROTECTED_CATEGORY_IDS guard is enforced in CategoryRow — this
   * handler will never be called for protected IDs.
   */
  const handleDeletePress = async (category: Category) => {
    setIsDeleting(true);
    try {
      const db = await getDb();
      const count = await getCategoryTransactionCount(db, category.id);
      setLinkedCount(count);
      if (count > 0) {
        openReassignSheet(category);
      } else {
        openDeleteConfirm(category);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!catScreenDataState.categoryToDelete) return;
    await deleteCategory(catScreenDataState.categoryToDelete.id);
    closeDeleteFlow();
  };

  /**
   * Called from ReassignCategorySheet on confirm.
   * repository.reassignAndDelete() is atomic (withTransactionAsync) and will
   * throw if the DB transaction rolls back (TC-09). That throw propagates to
   * the caller (ReassignCategorySheet) which is responsible for surfacing the
   * error to the user.
   */
  const handleReassignConfirm = async (toId: string) => {
    if (!catScreenDataState.categoryToDelete) return;
    await reassignAndDelete(catScreenDataState.categoryToDelete.id, toId);
    closeDeleteFlow();
  };

  /**
   * Options for the reassign picker — all categories of the same type except:
   * - the category being deleted (would be a no-op and is being removed)
   *
   * Protected categories (cat_other_expense, cat_other_income) ARE valid
   * reassignment targets and are intentionally included here per Layla §2.2.
   * The picker always has at least one option because the protected "Other"
   * category can never be deleted.
   */
  const reassignOptions = catState.categories.filter(
    (c) =>
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- categoryToDelete can be null despite narrowing context
      c.type === catScreenDataState.categoryToDelete?.type &&
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- categoryToDelete can be null despite narrowing context
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
      linkedCount: catScreenDataState.linkedCount,
      isDeleting: catScreenUiState.isDeleting,
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
