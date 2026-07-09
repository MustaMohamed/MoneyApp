import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { CategoryType } from '@/constants/enums';
import { getDb } from '@/database/client';
import { getTrailingIncomeSuggestion } from '@/modules/budget/database/budget_stats';
import { currentYearMonth } from '@/modules/budget/repositories/budget.repository';
import {
  type CategoryBudgetVM,
  buildBudgetCopyRows,
  computeCategoryRow,
  computeOverall,
  getBudgetsForCategoryMonth,
} from '@/modules/budget/screens/budget/budget.helpers';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import {
  computeBuckets,
  type BucketsVM,
} from '@/modules/budget/screens/budget/budget_buckets.helpers';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { runAfterInteractions } from '@/utils/run_after_interactions';

export interface CategoryBudgetRowVM extends CategoryBudgetVM {
  name: string;
  icon: string;
  color: string;
  budgetCount: number;
  budgets: CategoryBudgetItemVM[];
}

export interface CategoryBudgetItemVM {
  id: string;
  name: string;
  amount: number;
}

export interface BudgetEditTargetVM extends CategoryBudgetItemVM {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  limit: number;
}

export function useBudget() {
  const router = useRouter();

  const { categories, categoriesLoaded } = useCategoryStore(
    useShallow((s) => ({
      categories: s.categories,
      categoriesLoaded: s.hasLoaded,
    })),
  );
  const loadCategories = useCategoryStore.getState().loadCategories;
  const { budgetRows, spendByMonth, budgetLoaded, expectedIncome } = useBudgetStore(
    useShallow((s) => ({
      budgetRows: s.rows,
      spendByMonth: s.spendByMonth,
      budgetLoaded: s.loaded,
      expectedIncome: s.expectedIncome,
    })),
  );
  const load = useBudgetStore.getState().load;
  const copyBudgetsToMonth = useBudgetStore.getState().copyBudgetsToMonth;
  const removeBudget = useBudgetStore.getState().removeBudget;
  const openAdd = useBudgetState.getState().openAdd;
  const openEdit = useBudgetState.getState().openEdit;
  const {
    selectedMonth,
    copySourceMonth,
    lensTab,
    copySheetVisible,
    copySelectedCategoryIds,
    incomeSuggestion,
  } = useBudgetState(
    useShallow((s) => ({
      selectedMonth: s.selectedMonth,
      copySourceMonth: s.copySourceMonth,
      lensTab: s.lensTab,
      copySheetVisible: s.copySheetVisible,
      copySelectedCategoryIds: s.copySelectedCategoryIds,
      incomeSuggestion: s.incomeSuggestion,
    })),
  );
  const setLensTab = useBudgetState.getState().setLensTab;
  const setSelectedMonthState = useBudgetState.getState().setSelectedMonth;
  const setCopySourceMonthState = useBudgetState.getState().setCopySourceMonth;
  const resetSelectedMonthToCurrent = useBudgetState.getState().resetSelectedMonthToCurrent;
  const openCopyState = useBudgetState.getState().openCopy;
  const closeCopy = useBudgetState.getState().closeCopy;
  const setCopySelectedCategoryIds = useBudgetState.getState().setCopySelectedCategoryIds;
  const toggleCopyCategoryId = useBudgetState.getState().toggleCopyCategoryId;
  const clearCopySelection = useBudgetState.getState().clearCopySelection;
  const setIncomeSuggestion = useBudgetState.getState().setIncomeSuggestion;

  const loadIncomeSuggestion = useCallback(
    async (month: string) => {
      try {
        const db = await getDb();
        const s = await getTrailingIncomeSuggestion(db, month);
        setIncomeSuggestion(s);
      } catch {
        setIncomeSuggestion(null);
      }
    },
    [setIncomeSuggestion],
  );

  useFocusEffect(
    useCallback(() => {
      const month = currentYearMonth(); // refresh in case the month rolled over while mounted
      resetSelectedMonthToCurrent();
      const task = runAfterInteractions(() => {
        void loadCategories();
        void load(month);
        void loadIncomeSuggestion(month);
      });
      return () => task.cancel();
    }, [loadCategories, load, loadIncomeSuggestion, resetSelectedMonthToCurrent]),
  );

  const rows: CategoryBudgetRowVM[] = useMemo(() => {
    const out: CategoryBudgetRowVM[] = [];
    for (const c of categories) {
      if (c.type !== CategoryType.Expense) continue;
      const categoryBudgets = getBudgetsForCategoryMonth(budgetRows, c.id, selectedMonth);
      if (categoryBudgets.length === 0) continue; // unbudgeted → not shown
      const limit = categoryBudgets.reduce((total, budget) => total + budget.limit_amount, 0);
      const spent = spendByMonth[c.id]?.[selectedMonth] ?? 0;
      out.push({
        ...computeCategoryRow(c.id, limit, spent),
        name: c.name,
        icon: c.icon,
        color: c.color,
        budgetCount: categoryBudgets.length,
        budgets: categoryBudgets.map((budget) => ({
          id: budget.id,
          name: budget.name,
          amount: budget.limit_amount,
        })),
      });
    }
    return out;
  }, [budgetRows, categories, selectedMonth, spendByMonth]);

  const overall = useMemo(() => computeOverall(rows), [rows]);

  const buckets: BucketsVM = useMemo(
    () => computeBuckets(expectedIncome ?? 0, categories, budgetRows, spendByMonth, selectedMonth),
    [budgetRows, categories, expectedIncome, selectedMonth, spendByMonth],
  );

  // Expense categories remain selectable even when they already have a budget,
  // because phase 1 allows multiple named budgets per category/month.
  const budgetableCategories = useMemo(
    () => categories.filter((c) => c.type === CategoryType.Expense),
    [categories],
  );

  const copyRows = useMemo(
    () =>
      buildBudgetCopyRows({
        rows: budgetRows,
        categories,
        sourceMonth: copySourceMonth,
        targetMonth: selectedMonth,
      }),
    [budgetRows, categories, copySourceMonth, selectedMonth],
  );

  const daysLeft = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const today = new Date();
    const isCurrent = currentYearMonth(today) === selectedMonth;
    return isCurrent ? Math.max(0, lastDay - today.getDate()) : 0;
  }, [selectedMonth]);

  const goToCategory = (categoryId: string) => {
    router.push(`/(app)/(tabs)/budget/${categoryId}`);
  };

  const setSelectedMonth = useCallback(
    (month: string) => {
      setSelectedMonthState(month);
      void load(month);
      void loadIncomeSuggestion(month);
    },
    [load, loadIncomeSuggestion, setSelectedMonthState],
  );

  const openCopy = useCallback(() => {
    openCopyState(copyRows.map((row) => row.id));
  }, [copyRows, openCopyState]);

  const setCopySourceMonth = useCallback(
    (month: string) => {
      setCopySourceMonthState(month);
      const rowsForSource = buildBudgetCopyRows({
        rows: budgetRows,
        categories,
        sourceMonth: month,
        targetMonth: selectedMonth,
      });
      setCopySelectedCategoryIds(rowsForSource.map((row) => row.id));
    },
    [budgetRows, categories, selectedMonth, setCopySelectedCategoryIds, setCopySourceMonthState],
  );

  const copySelectedBudgets = useCallback(
    async (budgetIds = copySelectedCategoryIds) => {
      await copyBudgetsToMonth(copySourceMonth, selectedMonth, budgetIds);
      closeCopy();
    },
    [closeCopy, copyBudgetsToMonth, copySelectedCategoryIds, copySourceMonth, selectedMonth],
  );

  const selectAllCopyCategories = useCallback(() => {
    setCopySelectedCategoryIds(copyRows.map((row) => row.id));
  }, [copyRows, setCopySelectedCategoryIds]);

  const removeBudgetForMonth = useCallback(
    async ({ id }: { id: string; name: string }) => {
      await removeBudget(id, selectedMonth);
    },
    [removeBudget, selectedMonth],
  );

  return {
    state: {
      rows,
      overall,
      month: selectedMonth,
      daysLeft,
      hasBudgets: rows.length > 0,
      budgetableCategories,
      buckets,
      suggestion: incomeSuggestion,
      lensTab,
      copySourceMonth,
      copyRows,
      copySheetVisible,
      copySelectedCategoryIds,
      hasLoaded: Boolean(categoriesLoaded && budgetLoaded),
    },
    openAdd,
    openEdit,
    setLensTab,
    setSelectedMonth,
    openCopy,
    closeCopy,
    toggleCopyCategoryId,
    selectAllCopyCategories,
    clearCopySelection,
    setCopySourceMonth,
    copySelectedBudgets,
    removeBudgetForMonth,
    goToCategory,
  };
}
