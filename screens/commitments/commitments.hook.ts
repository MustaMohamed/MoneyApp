import { router, useFocusEffect } from 'expo-router';
import { useMemo, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import { useCategoryStore } from '@/store/category.store';
import { useCommitmentStore } from '@/store/commitment.store';

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
  const {
    state: screenState,
    setRefreshing,
    setStatusFilter,
  } = useCommitmentsScreenState(
    useShallow((s) => ({
      state: s.state,
      setRefreshing: s.setRefreshing,
      setStatusFilter: s.setStatusFilter,
    })),
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
    const filter = screenState.statusFilter;
    const allPayments =
      filter === 'all'
        ? commitmentState.payments
        : commitmentState.payments.filter((p) => p.status === filter);
    const result: CommitmentsSection[] = [];
    const overdue = allPayments.filter((p) => p.status === CommitmentPaymentStatus.Overdue);
    const dueToday = allPayments.filter((p) => p.status === CommitmentPaymentStatus.Due);
    const upcoming = allPayments.filter((p) => p.status === CommitmentPaymentStatus.Upcoming);
    const paid = allPayments.filter((p) => p.status === CommitmentPaymentStatus.Paid);
    const skipped = allPayments.filter((p) => p.status === CommitmentPaymentStatus.Skipped);
    if (overdue.length > 0) result.push({ title: Strings.commitmentsOverdue, data: overdue });
    if (dueToday.length > 0) result.push({ title: Strings.commitmentsDueToday, data: dueToday });
    if (upcoming.length > 0) result.push({ title: Strings.commitmentsUpcoming, data: upcoming });
    if (paid.length > 0) result.push({ title: Strings.commitmentsPaid, data: paid });
    if (skipped.length > 0) result.push({ title: Strings.commitmentsSkipped, data: skipped });
    return result;
  }, [commitmentState.payments, screenState.statusFilter]);

  const counts = useMemo(() => {
    let paid = 0;
    let overdue = 0;
    let due = 0;
    let upcoming = 0;
    let skipped = 0;
    for (const p of commitmentState.payments) {
      switch (p.status) {
        case CommitmentPaymentStatus.Paid:
          paid++;
          break;
        case CommitmentPaymentStatus.Overdue:
          overdue++;
          break;
        case CommitmentPaymentStatus.Due:
          due++;
          break;
        case CommitmentPaymentStatus.Upcoming:
          upcoming++;
          break;
        case CommitmentPaymentStatus.Skipped:
          skipped++;
          break;
      }
    }
    return {
      paid,
      overdue,
      due,
      upcoming,
      skipped,
      total: paid + overdue + due + upcoming, // excludes skipped
    };
  }, [commitmentState.payments]);
  const isEmpty = useMemo(() => commitmentState.payments.length === 0, [commitmentState.payments]);

  // Group totals by currency. For paid: actual paid amount; for variable+unpaid with no
  // estimate: skipped (excluded). Skipped payments excluded entirely.
  const totalsByCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    for (const p of commitmentState.payments) {
      if (p.status === CommitmentPaymentStatus.Skipped) continue;
      const isPaid = p.status === CommitmentPaymentStatus.Paid;
      const value = isPaid ? (p.amount_paid ?? p.amount_due) : p.amount_due;
      if (value == null) continue;
      totals.set(p.currency, (totals.get(p.currency) ?? 0) + value);
    }
    return totals;
  }, [commitmentState.payments]);

  const selectedMonthRef = useRef(commitmentState.selectedMonth);
  selectedMonthRef.current = commitmentState.selectedMonth;

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
      void setSelectedMonth(newYearMonth);
    },
    [commitmentState.selectedMonth, setSelectedMonth],
  );

  useFocusEffect(
    useCallback(() => {
      void loadCommitments();
      void loadPaymentsForMonth(selectedMonthRef.current);
    }, [loadCommitments, loadPaymentsForMonth]),
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
      counts,
      totalsByCurrency,
      refreshing: screenState.refreshing,
      isEmpty,
      // hasCommitments is month-independent (all commitments, any month). isEmpty is
      // per-selected-month. The list shows the full welcome empty state only when there
      // are no commitments at all; an empty *month* keeps the nav/filters mounted.
      hasCommitments: commitmentState.commitments.length > 0,
      statusFilter: screenState.statusFilter,
      categoriesById,
      commitmentsById,
    },
    navigateMonth,
    onRefresh,
    goToDetail,
    goToAdd,
    setStatusFilter,
  };
}
