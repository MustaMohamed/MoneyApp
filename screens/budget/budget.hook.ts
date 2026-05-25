import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { CategoryType } from '@/constants/enums';
import { currentYearMonth } from '@/repositories/budget.repository';
import {
  type CategoryBudgetVM,
  computeCategoryRow,
  computeOverall,
  resolveLimitForMonth,
} from '@/screens/budget/budget.helpers';
import { useBudgetState } from '@/screens/budget/budget.state';
import { useBudgetStore } from '@/store/budget.store';
import { useCategoryStore } from '@/store/category.store';

export interface CategoryBudgetRowVM extends CategoryBudgetVM {
  name: string;
  icon: string;
  color: string;
}

export function useBudget() {
  const router = useRouter();
  const [month, setMonth] = useState(currentYearMonth);

  const { categories, loadCategories } = useCategoryStore(
    useShallow((s) => ({ categories: s.state.categories, loadCategories: s.loadCategories })),
  );
  const { budgetState, load } = useBudgetStore(
    useShallow((s) => ({ budgetState: s.state, load: s.load })),
  );
  const { openAdd, openEdit } = useBudgetState(
    useShallow((s) => ({ openAdd: s.openAdd, openEdit: s.openEdit })),
  );

  useFocusEffect(
    useCallback(() => {
      setMonth(currentYearMonth()); // refresh in case the month rolled over while mounted
      void loadCategories();
      void load();
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
    state: { rows, overall, month, daysLeft, hasBudgets: rows.length > 0, budgetableCategories },
    openAdd,
    openEdit,
    goToCategory,
  };
}
