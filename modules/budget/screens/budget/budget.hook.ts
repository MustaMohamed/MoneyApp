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

  const { categories, loadCategories } = useCategoryStore(
    useShallow((s) => ({ categories: s.state.categories, loadCategories: s.loadCategories })),
  );
  const { budgetState, load } = useBudgetStore(
    useShallow((s) => ({ budgetState: s.state, load: s.load })),
  );
  const { openAdd, openEdit, lensTab, setLensTab } = useBudgetState(
    useShallow((s) => ({
      openAdd: s.openAdd,
      openEdit: s.openEdit,
      lensTab: s.state.lensTab,
      setLensTab: s.setLensTab,
    })),
  );

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
      const limit = resolveLimitForMonth(budgetState.rows, c.id, month);
      if (limit === null) continue; // unbudgeted → not shown
      const spent = budgetState.spendByMonth[c.id]?.[month] ?? 0;
      out.push({
        ...computeCategoryRow(c.id, limit, spent),
        name: c.name,
        icon: c.icon,
        color: c.color,
      });
    }
    return out;
  }, [categories, budgetState.rows, budgetState.spendByMonth, month]);

  const overall = useMemo(() => computeOverall(rows), [rows]);

  const buckets: BucketsVM = useMemo(
    () =>
      computeBuckets(
        budgetState.expectedIncome ?? 0,
        categories,
        budgetState.rows,
        budgetState.spendByMonth,
        month,
      ),
    [categories, budgetState.rows, budgetState.spendByMonth, budgetState.expectedIncome, month],
  );

  // expense categories that do NOT yet have an active budget — for the add picker
  const budgetableCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.type === CategoryType.Expense &&
          resolveLimitForMonth(budgetState.rows, c.id, month) === null,
      ),
    [categories, budgetState.rows, month],
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
    },
    openAdd,
    openEdit,
    setLensTab,
    goToCategory,
  };
}
