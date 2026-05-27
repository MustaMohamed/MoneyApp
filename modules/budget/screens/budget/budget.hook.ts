import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { CategoryType } from '@/constants/enums';
import { getDb } from '@/database/client';
import { getTrailingIncomeSuggestion } from '@/modules/budget/database/budget_stats';
import { currentYearMonth } from '@/modules/budget/repositories/budget.repository';
import {
  type CategoryBudgetVM,
  computeCategoryRow,
  computeOverall,
  resolveLimitForMonth,
} from '@/modules/budget/screens/budget/budget.helpers';
import { useBudgetState } from '@/modules/budget/screens/budget/budget.state';
import {
  computeBuckets,
  type BucketsVM,
} from '@/modules/budget/screens/budget/budget_buckets.helpers';
import { useBudgetStore } from '@/modules/budget/store/budget.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';

export interface CategoryBudgetRowVM extends CategoryBudgetVM {
  name: string;
  icon: string;
  color: string;
}

export function useBudget() {
  const router = useRouter();
  const [month, setMonth] = useState(currentYearMonth);
  const [suggestion, setSuggestion] = useState<number | null>(null);

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
  const openAdd = useBudgetState.getState().openAdd;
  const openEdit = useBudgetState.getState().openEdit;
  const lensTab = useBudgetState.useState.lensTab();
  const setLensTab = useBudgetState.getState().setLensTab;

  useFocusEffect(
    useCallback(() => {
      setMonth(currentYearMonth()); // refresh in case the month rolled over while mounted
      void loadCategories();
      void load();
      void (async () => {
        try {
          const db = await getDb();
          const s = await getTrailingIncomeSuggestion(db, currentYearMonth());
          setSuggestion(s);
        } catch {
          setSuggestion(null);
        }
      })();
    }, [loadCategories, load]),
  );

  const rows: CategoryBudgetRowVM[] = useMemo(() => {
    const out: CategoryBudgetRowVM[] = [];
    for (const c of categories) {
      if (c.type !== CategoryType.Expense) continue;
      const limit = resolveLimitForMonth(budgetRows, c.id, month);
      if (limit === null) continue; // unbudgeted → not shown
      const spent = spendByMonth[c.id]?.[month] ?? 0;
      out.push({
        ...computeCategoryRow(c.id, limit, spent),
        name: c.name,
        icon: c.icon,
        color: c.color,
      });
    }
    return out;
  }, [budgetRows, categories, month, spendByMonth]);

  const overall = useMemo(() => computeOverall(rows), [rows]);

  const buckets: BucketsVM = useMemo(
    () => computeBuckets(expectedIncome ?? 0, categories, budgetRows, spendByMonth, month),
    [budgetRows, categories, expectedIncome, month, spendByMonth],
  );

  // expense categories that do NOT yet have an active budget — for the add picker
  const budgetableCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.type === CategoryType.Expense && resolveLimitForMonth(budgetRows, c.id, month) === null,
      ),
    [budgetRows, categories, month],
  );

  const daysLeft = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const today = new Date();
    const isCurrent = currentYearMonth(today) === month;
    return isCurrent ? Math.max(0, lastDay - today.getDate()) : 0;
  }, [month]);

  const goToCategory = (categoryId: string) => {
    router.push(`/(app)/(tabs)/budget/${categoryId}`);
  };

  return {
    state: {
      rows,
      overall,
      month,
      daysLeft,
      hasBudgets: rows.length > 0,
      budgetableCategories,
      buckets,
      suggestion,
      lensTab,
      hasLoaded: Boolean(categoriesLoaded && budgetLoaded),
    },
    openAdd,
    openEdit,
    setLensTab,
    goToCategory,
  };
}
