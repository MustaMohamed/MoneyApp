import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { currentYearMonth, lastMonths } from '@/repositories/budget.repository';
import {
  type MonthResultVM,
  computeCategoryHistory,
  computeStatus,
  resolveLimitForMonth,
} from '@/screens/budget/budget.helpers';
import { useBudgetState } from '@/screens/budget/budget.state';
import { useBudgetStore } from '@/store/budget.store';
import { useCategoryStore } from '@/store/category.store';

const HISTORY_MONTHS = 12;

export function useCategoryDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [month, setMonth] = useState(currentYearMonth);

  const { categories, loadCategories } = useCategoryStore(
    useShallow((s) => ({ categories: s.state.categories, loadCategories: s.loadCategories })),
  );
  const { budgetState, load } = useBudgetStore(
    useShallow((s) => ({ budgetState: s.state, load: s.load })),
  );
  const { openEdit } = useBudgetState(useShallow((s) => ({ openEdit: s.openEdit })));

  useFocusEffect(
    useCallback(() => {
      setMonth(currentYearMonth()); // refresh in case the month rolled over while mounted
      void loadCategories();
      void load();
    }, [loadCategories, load]),
  );

  const category = useMemo(() => categories.find((c) => c.id === id), [categories, id]);

  const results: MonthResultVM[] = useMemo(() => {
    if (!id) return [];
    const months = lastMonths(month, HISTORY_MONTHS);
    const out: MonthResultVM[] = [];
    for (const ym of months) {
      const limit = resolveLimitForMonth(budgetState.rows, id, ym);
      if (limit === null) continue; // only months the budget was active
      const spent = budgetState.spendByMonth[id]?.[ym] ?? 0;
      out.push({
        yearMonth: ym,
        limit,
        spent,
        delta: limit - spent,
        status: computeStatus(spent, limit),
        isProvisional: ym === month,
      });
    }
    return out;
  }, [id, month, budgetState.rows, budgetState.spendByMonth]);

  const history = useMemo(() => computeCategoryHistory(results), [results]);
  const liveMonth = useMemo(() => results.find((r) => r.yearMonth === month), [results, month]);

  const daysLeft = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const today = new Date();
    return Math.max(0, lastDay - today.getDate());
  }, [month]);

  return {
    state: {
      name: category?.name ?? '',
      icon: category?.icon ?? 'tag',
      color: category?.color ?? '#888',
      liveMonth,
      history,
      daysLeft,
      month,
    },
    goBack: () => router.back(),
    editBudget: () => {
      if (!id) return;
      router.back();
      openEdit(id);
    },
  };
}
