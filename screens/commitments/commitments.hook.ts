import { useMemo, useCallback } from 'react';
import { router } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { useCommitmentStore } from '@/store/commitment.store';
import { useCategoryStore } from '@/store/category.store';
import { CommitmentPaymentStatus } from '@/constants/enums';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import type { Commitment } from '@/database/entities/commitment.entity';

import { useCommitmentsScreenState } from './commitments.state';

export type CommitmentsSection = {
  title: string;
  data: CommitmentPayment[];
  status: CommitmentPaymentStatus;
};

export function useCommitments() {
  const {
    state: commitmentState,
    setSelectedMonth,
    getOverdue,
    getDueToday,
    getUpcoming,
    getPaid,
    getSkipped,
    loadPaymentsForMonth,
    loadCommitments,
    generatePayments,
  } = useCommitmentStore(
    useShallow((s) => ({
      state: s.state,
      setSelectedMonth: s.setSelectedMonth,
      getOverdue: s.getOverdue,
      getDueToday: s.getDueToday,
      getUpcoming: s.getUpcoming,
      getPaid: s.getPaid,
      getSkipped: s.getSkipped,
      loadPaymentsForMonth: s.loadPaymentsForMonth,
      loadCommitments: s.loadCommitments,
      generatePayments: s.generatePayments,
    })),
  );

  const { state: categoryState } = useCategoryStore(useShallow((s) => ({ state: s.state })));
  const { state: screenState, setRefreshing } = useCommitmentsScreenState(
    useShallow((s) => ({ state: s.state, setRefreshing: s.setRefreshing })),
  );

  const categoriesById = useMemo(
    () => new Map(categoryState.categories.map((c) => [c.id, c])),
    [categoryState.categories],
  );

  const commitmentsById = useMemo(
    () => new Map(commitmentState.commitments.map((c: Commitment) => [c.id, c])),
    [commitmentState.commitments],
  );

  const overdue = getOverdue();
  const dueToday = getDueToday();
  const upcoming = getUpcoming();
  const paid = getPaid();
  const skipped = getSkipped();

  const sections: CommitmentsSection[] = useMemo(() => {
    const result: CommitmentsSection[] = [];
    if (overdue.length > 0)
      result.push({ title: 'Overdue', data: overdue, status: CommitmentPaymentStatus.Overdue });
    if (dueToday.length > 0)
      result.push({ title: 'Due Today', data: dueToday, status: CommitmentPaymentStatus.Due });
    if (upcoming.length > 0)
      result.push({ title: 'Upcoming', data: upcoming, status: CommitmentPaymentStatus.Upcoming });
    if (paid.length > 0)
      result.push({ title: 'Paid', data: paid, status: CommitmentPaymentStatus.Paid });
    if (skipped.length > 0)
      result.push({ title: 'Skipped', data: skipped, status: CommitmentPaymentStatus.Skipped });
    return result;
  }, [overdue, dueToday, upcoming, paid, skipped]);

  const paidCount = paid.length;
  const totalCount =
    overdue.length + dueToday.length + upcoming.length + paid.length + skipped.length;
  const isEmpty = commitmentState.commitments.length === 0;

  const totalCommitted = useMemo(() => {
    return commitmentState.commitments.reduce((sum: number, c: Commitment) => {
      return sum + (c.is_active ? (c.amount ?? 0) : 0);
    }, 0);
  }, [commitmentState.commitments]);

  const navigateMonth = useCallback(
    (direction: 'prev' | 'next') => {
      const [year, month] = commitmentState.selectedMonth.split('-').map(Number);
      let newYear = year;
      let newMonth = month + (direction === 'next' ? 1 : -1);
      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      }
      if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }
      const newYearMonth = `${newYear}-${String(newMonth).padStart(2, '0')}`;
      setSelectedMonth(newYearMonth);
    },
    [commitmentState.selectedMonth, setSelectedMonth],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCommitments();
      await generatePayments();
      await loadPaymentsForMonth(commitmentState.selectedMonth);
    } finally {
      setRefreshing(false);
    }
  }, [
    setRefreshing,
    loadCommitments,
    generatePayments,
    loadPaymentsForMonth,
    commitmentState.selectedMonth,
  ]);

  const goToDetail = useCallback((_paymentId: string, commitmentId: string) => {
    router.push(`/commitments/${commitmentId}` as Parameters<typeof router.push>[0]);
  }, []);

  const goToAdd = useCallback(() => {
    router.push('/commitments/add' as Parameters<typeof router.push>[0]);
  }, []);

  return {
    state: {
      sections,
      selectedMonth: commitmentState.selectedMonth,
      paidCount,
      totalCount,
      totalCommitted,
      refreshing: screenState.refreshing,
      isEmpty,
      categoriesById,
      commitmentsById,
    },
    navigateMonth,
    onRefresh,
    goToDetail,
    goToAdd,
  };
}
