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
  previousYearMonth,
  resolveLimitForMonth,
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
  const copyLimitsToMonth = useBudgetStore.getState().copyLimitsToMonth;
  const removeBudget = useBudgetStore.getState().removeBudget;
  const openAdd = useBudgetState.getState().openAdd;
  const openEdit = useBudgetState.getState().openEdit;
  const { selectedMonth, lensTab, copySheetVisible, copySelectedCategoryIds, incomeSuggestion } =
    useBudgetState(
      useShallow((s) => ({
        selectedMonth: s.selectedMonth,
        lensTab: s.lensTab,
        copySheetVisible: s.copySheetVisible,
        copySelectedCategoryIds: s.copySelectedCategoryIds,
        incomeSuggestion: s.incomeSuggestion,
      })),
    );
  const setLensTab = useBudgetState.getState().setLensTab;
  const setSelectedMonthState = useBudgetState.getState().setSelectedMonth;
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
      const limit = resolveLimitForMonth(budgetRows, c.id, selectedMonth);
      if (limit === null) continue; // unbudgeted → not shown
      const spent = spendByMonth[c.id]?.[selectedMonth] ?? 0;
      out.push({
        ...computeCategoryRow(c.id, limit, spent),
        name: c.name,
        icon: c.icon,
        color: c.color,
      });
    }
    return out;
  }, [budgetRows, categories, selectedMonth, spendByMonth]);

  const overall = useMemo(() => computeOverall(rows), [rows]);

  const buckets: BucketsVM = useMemo(
    () => computeBuckets(expectedIncome ?? 0, categories, budgetRows, spendByMonth, selectedMonth),
    [budgetRows, categories, expectedIncome, selectedMonth, spendByMonth],
  );

  // expense categories that do NOT yet have an active budget — for the add picker
  const budgetableCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.type === CategoryType.Expense &&
          resolveLimitForMonth(budgetRows, c.id, selectedMonth) === null,
      ),
    [budgetRows, categories, selectedMonth],
  );

  const copySourceMonth = useMemo(() => previousYearMonth(selectedMonth), [selectedMonth]);

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
    openCopyState(copyRows.map((row) => row.categoryId));
  }, [copyRows, openCopyState]);

  const copySelectedBudgets = useCallback(
    async (categoryIds = copySelectedCategoryIds) => {
      await copyLimitsToMonth(copySourceMonth, selectedMonth, categoryIds);
      closeCopy();
    },
    [closeCopy, copyLimitsToMonth, copySelectedCategoryIds, copySourceMonth, selectedMonth],
  );

  const selectAllCopyCategories = useCallback(() => {
    setCopySelectedCategoryIds(copyRows.map((row) => row.categoryId));
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
    copySelectedBudgets,
    removeBudgetForMonth,
    goToCategory,
  };
}
