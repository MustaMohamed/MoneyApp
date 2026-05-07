import { useMemo, useCallback } from 'react';
import { router } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { useCommitmentStore } from '@/store/commitment.store';
import { useCategoryStore } from '@/store/category.store';
import { AmountType, CommitmentPaymentStatus } from '@/constants/enums';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import type { Commitment } from '@/database/entities/commitment.entity';

import { useCommitmentsScreenState } from './commitments.state';

export type CommitmentsSection = {
  title: string;
  data: CommitmentPayment[];
};

export function useCommitments() {
  const {
    state: commitmentState,
    setSelectedMonth,
    loadPaymentsForMonth,
    loadCommitments,
    generatePayments,
  } = useCommitmentStore(
    useShallow((s) => ({
      state: s.state,
      setSelectedMonth: s.setSelectedMonth,
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

  const sections: CommitmentsSection[] = useMemo(() => {
    const allPayments = commitmentState.payments;
    const overduePayments = allPayments.filter((p) => p.status === CommitmentPaymentStatus.Overdue);
    const dueThisMonthPayments = allPayments.filter(
      (p) => p.status !== CommitmentPaymentStatus.Overdue,
    );
    const result: CommitmentsSection[] = [];
    if (overduePayments.length > 0) result.push({ title: 'Overdue', data: overduePayments });
    if (dueThisMonthPayments.length > 0)
      result.push({ title: 'Due This Month', data: dueThisMonthPayments });
    return result;
  }, [commitmentState.payments]);

  const paidCount = useMemo(
    () => commitmentState.payments.filter((p) => p.status === CommitmentPaymentStatus.Paid).length,
    [commitmentState.payments],
  );
  const totalCount = commitmentState.payments.length;
  const isEmpty = commitmentState.commitments.length === 0;

  const totalCommitted = useMemo(() => {
    return commitmentState.payments.reduce((sum: number, p: CommitmentPayment) => {
      if (p.status === CommitmentPaymentStatus.Skipped) return sum;
      const commitment = commitmentsById.get(p.commitment_id);
      if (!commitment || commitment.amount_type !== AmountType.Fixed) return sum;
      if (p.amount_due == null) return sum;
      return sum + p.amount_due;
    }, 0);
  }, [commitmentState.payments, commitmentsById]);

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

  const goToDetail = useCallback((paymentId: string) => {
    router.push(`/commitments/${paymentId}` as Parameters<typeof router.push>[0]);
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
