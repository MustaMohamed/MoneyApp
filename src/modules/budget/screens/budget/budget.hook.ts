import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { CategoryType } from '@/constants/enums';
import { getDb } from '@/database/client';
import { getTrailingIncomeSuggestion } from '@/modules/budget/database/budget_stats';
import { currentYearMonth } from '@/modules/budget/repositories/budget.repository';
import {
  buildBudgetCategoriesSummary,
  buildBudgetCopyRows,
  buildCategoryBudgetRows,
} from '@/modules/budget/screens/budget/budget.helpers';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import {
  computeBuckets,
  type BucketsVM,
} from '@/modules/budget/screens/budget/budget_buckets.helpers';
import type { NamedBudgetVM } from '@/modules/budget/screens/budget/budget_categories.types';
import { useIncomeSheetState } from '@/modules/budget/screens/budget/components/income_sheet.state';
import { buildSpendingPlanRows } from '@/modules/budget/screens/budget/spending_plans.helpers';
import { computeSpendingPlansSummary } from '@/modules/budget/screens/budget/spending_plans_summary.helpers';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { toLocalDateString } from '@/utils/format_date';
import { runAfterInteractions } from '@/utils/run_after_interactions';

export interface BudgetEditTargetVM extends NamedBudgetVM {
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
  const {
    budgetRows,
    spendByMonth,
    spendByBudgetId,
    spendingPlans,
    spendingPlanSpendById,
    budgetLoaded,
    loadedMonth,
    expectedIncome,
    loadError,
  } = useBudgetStore(
    useShallow((s) => ({
      budgetRows: s.rows,
      spendByMonth: s.spendByMonth,
      spendByBudgetId: s.spendByBudgetId,
      spendingPlans: s.spendingPlans,
      spendingPlanSpendById: s.spendingPlanSpendById,
      budgetLoaded: s.loaded,
      loadedMonth: s.loadedMonth,
      expectedIncome: s.expectedIncome,
      loadError: s.loadError,
    })),
  );
  const load = useBudgetStore.getState().load;
  const copyBudgetsToMonth = useBudgetStore.getState().copyBudgetsToMonth;
  const removeBudget = useBudgetStore.getState().removeBudget;
  const setSpendingPlan = useBudgetStore.getState().setSpendingPlan;
  const removeSpendingPlan = useBudgetStore.getState().removeSpendingPlan;
  const openAdd = useBudgetState.getState().openAdd;
  const openEdit = useBudgetState.getState().openEdit;
  const openAddPlan = useBudgetState.getState().openAddPlan;
  const openEditPlan = useBudgetState.getState().openEditPlan;
  const {
    selectedMonth,
    copySourceMonth,
    lensTab,
    copySheetVisible,
    copySelectedBudgetIds,
    incomeSuggestion,
    refreshing,
    targetBudgetId,
    targetPlanId,
    expandedCategoryId,
  } = useBudgetState(
    useShallow((s) => ({
      selectedMonth: s.selectedMonth,
      copySourceMonth: s.copySourceMonth,
      lensTab: s.lensTab,
      copySheetVisible: s.copySheetVisible,
      copySelectedBudgetIds: s.copySelectedBudgetIds,
      incomeSuggestion: s.incomeSuggestion,
      refreshing: s.refreshing,
      targetBudgetId: s.targetBudgetId,
      targetPlanId: s.targetPlanId,
      expandedCategoryId: s.expandedCategoryId,
    })),
  );
  const setLensTab = useBudgetState.getState().setLensTab;
  const setSelectedMonthState = useBudgetState.getState().setSelectedMonth;
  const setCopySourceMonthState = useBudgetState.getState().setCopySourceMonth;
  const openCopyState = useBudgetState.getState().openCopy;
  const closeCopy = useBudgetState.getState().closeCopy;
  const setCopySelectedBudgetIds = useBudgetState.getState().setCopySelectedBudgetIds;
  const toggleCopyBudgetId = useBudgetState.getState().toggleCopyBudgetId;
  const clearCopySelection = useBudgetState.getState().clearCopySelection;
  const setIncomeSuggestion = useBudgetState.getState().setIncomeSuggestion;
  const setRefreshing = useBudgetState.getState().setRefreshing;
  const setExpandedCategoryId = useBudgetState.getState().setExpandedCategoryId;
  const openIncomeSheetState = useIncomeSheetState.getState().open;

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
      const task = runAfterInteractions(() => {
        void loadCategories();
        void load(selectedMonth);
        void loadIncomeSuggestion(selectedMonth);
      });
      return () => task.cancel();
    }, [loadCategories, load, loadIncomeSuggestion, selectedMonth]),
  );

  const today = toLocalDateString(new Date());

  const categoryLedger = useMemo(
    () =>
      buildCategoryBudgetRows({
        categories,
        budgets: budgetRows,
        spendByMonth,
        spendByBudgetId,
        yearMonth: selectedMonth,
      }),
    [budgetRows, categories, selectedMonth, spendByBudgetId, spendByMonth],
  );
  const rows = categoryLedger.rows;

  const categoriesSummary = useMemo(
    () =>
      buildBudgetCategoriesSummary({
        rows,
        expectedIncome,
        unbudgetedSpend: categoryLedger.unbudgetedSpend,
        selectedMonth,
        today,
      }),
    [categoryLedger.unbudgetedSpend, expectedIncome, rows, selectedMonth, today],
  );

  const overall = useMemo(
    () => ({
      budgeted: categoriesSummary.planned,
      spent: categoriesSummary.spent,
      left: categoriesSummary.left,
      pct: categoriesSummary.usedPct ?? 0,
    }),
    [categoriesSummary],
  );

  const spendingPlanRows = useMemo(
    () =>
      buildSpendingPlanRows({
        plans: spendingPlans,
        categories,
        spendByPlanId: spendingPlanSpendById,
        selectedMonth,
        today,
      }),
    [categories, selectedMonth, spendingPlanSpendById, spendingPlans, today],
  );

  const spendingPlansSummary = useMemo(
    () => computeSpendingPlansSummary(spendingPlanRows, selectedMonth),
    [selectedMonth, spendingPlanRows],
  );

  const editingRow = useMemo(
    () =>
      rows
        .flatMap((row) =>
          row.budgets.map((budget) => ({
            ...budget,
            limit: budget.planned,
            categoryId: row.categoryId,
            categoryName: row.name,
            icon: row.icon,
            color: row.color,
          })),
        )
        .find((budget) => budget.id === targetBudgetId),
    [rows, targetBudgetId],
  );

  const editingPlan = useMemo(
    () => spendingPlanRows.find((row) => row.id === targetPlanId),
    [spendingPlanRows, targetPlanId],
  );

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
    router.push({
      pathname: '/(app)/(tabs)/budget/[id]',
      params: { id: categoryId, month: selectedMonth },
    });
  };

  const setSelectedMonth = useCallback(
    (month: string) => {
      setSelectedMonthState(month);
      void load(month);
      void loadIncomeSuggestion(month);
    },
    [load, loadIncomeSuggestion, setSelectedMonthState],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadCategories(),
        load(selectedMonth),
        loadIncomeSuggestion(selectedMonth),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [load, loadCategories, loadIncomeSuggestion, selectedMonth, setRefreshing]);

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
      setCopySelectedBudgetIds(rowsForSource.map((row) => row.id));
    },
    [budgetRows, categories, selectedMonth, setCopySelectedBudgetIds, setCopySourceMonthState],
  );

  const copySelectedBudgets = useCallback(
    async (budgetIds = copySelectedBudgetIds) => {
      await copyBudgetsToMonth(copySourceMonth, selectedMonth, budgetIds);
      closeCopy();
    },
    [closeCopy, copyBudgetsToMonth, copySelectedBudgetIds, copySourceMonth, selectedMonth],
  );

  const selectAllCopyBudgets = useCallback(() => {
    setCopySelectedBudgetIds(copyRows.map((row) => row.id));
  }, [copyRows, setCopySelectedBudgetIds]);

  const removeBudgetForMonth = useCallback(
    async ({ id }: { id: string; name: string }) => {
      await removeBudget(id, selectedMonth);
    },
    [removeBudget, selectedMonth],
  );

  const removeSpendingPlanForMonth = useCallback(
    async ({ id }: { id: string; name: string }) => {
      await removeSpendingPlan(id, selectedMonth);
    },
    [removeSpendingPlan, selectedMonth],
  );

  const openPlanTool = useCallback(() => {
    if (lensTab === 'plans') {
      openAddPlan();
      return;
    }
    setLensTab('plans');
  }, [lensTab, openAddPlan, setLensTab]);

  const openPlanDetails = useCallback(
    (planId: string) => {
      router.push({
        pathname: '/(app)/(tabs)/budget/plans/[id]',
        params: { id: planId, month: selectedMonth },
      });
    },
    [router, selectedMonth],
  );

  const openIncomeSheet = useCallback(() => {
    openIncomeSheetState(incomeSuggestion, expectedIncome);
  }, [expectedIncome, incomeSuggestion, openIncomeSheetState]);

  return {
    state: {
      rows,
      categoriesSummary,
      editingRow,
      overall,
      spendingPlanRows,
      editingPlan,
      spendingPlansSummary,
      month: selectedMonth,
      daysLeft,
      hasBudgets: rows.length > 0,
      hasSpendingPlans: spendingPlanRows.length > 0,
      budgetableCategories,
      buckets,
      suggestion: incomeSuggestion,
      lensTab,
      copySourceMonth,
      copyRows,
      copySheetVisible,
      copySelectedBudgetIds,
      refreshing,
      loadError,
      expandedCategoryId,
      hasLoaded: Boolean(
        categoriesLoaded &&
        budgetLoaded &&
        (loadedMonth === undefined || loadedMonth === selectedMonth),
      ),
    },
    openAdd,
    openEdit,
    openAddPlan,
    openEditPlan,
    openPlanTool,
    openPlanDetails,
    openIncomeSheet,
    setLensTab,
    setExpandedCategoryId,
    setSelectedMonth,
    openCopy,
    closeCopy,
    toggleCopyBudgetId,
    selectAllCopyBudgets,
    clearCopySelection,
    setCopySourceMonth,
    copySelectedBudgets,
    removeBudgetForMonth,
    removeSpendingPlanForMonth,
    setSpendingPlan,
    removeSpendingPlan,
    refresh,
    goToCategory,
  };
}
