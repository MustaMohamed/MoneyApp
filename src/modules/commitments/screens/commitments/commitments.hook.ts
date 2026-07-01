import { router, useFocusEffect } from 'expo-router';
import { useMemo, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { runAfterInteractions } from '@/utils/run_after_interactions';
import { shiftYearMonth } from '@/utils/year_month';

import type { Commitment } from '../../entities/commitment.entity';
import type { CommitmentPayment } from '../../entities/commitment_payment.entity';
import { useCommitmentStore } from '../../store/commitment.store';
import { useCommitmentsScreenState } from './commitments.state';

export type CommitmentsSection = {
  title: string;
  data: CommitmentPayment[];
};

export function useCommitments() {
  const { commitments, payments, selectedMonth, commitmentsLoaded, paymentsLoaded } =
    useCommitmentStore(
      useShallow((s) => ({
        commitments: s.commitments,
        payments: s.payments,
        selectedMonth: s.selectedMonth,
        commitmentsLoaded: s.commitmentsLoaded,
        paymentsLoaded: s.paymentsLoaded,
      })),
    );
  const setSelectedMonth = useCommitmentStore.getState().setSelectedMonth;
  const loadPaymentsForMonth = useCommitmentStore.getState().loadPaymentsForMonth;
  const loadCommitments = useCommitmentStore.getState().loadCommitments;
  const generatePayments = useCommitmentStore.getState().generatePayments;
  const skipPayment = useCommitmentStore.getState().skipPayment;
  const deactivateCommitment = useCommitmentStore.getState().deactivateCommitment;

  const categories = useCategoryStore.useState.categories();
  const { refreshing, statusFilter } = useCommitmentsScreenState(
    useShallow((s) => ({
      refreshing: s.refreshing,
      statusFilter: s.statusFilter,
    })),
  );
  const setRefreshing = useCommitmentsScreenState.getState().setRefreshing;
  const setStatusFilter = useCommitmentsScreenState.getState().setStatusFilter;

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const commitmentsById = useMemo(
    () => new Map(commitments.map((c: Commitment) => [c.id, c])),
    [commitments],
  );

  const sections: CommitmentsSection[] = useMemo(() => {
    const filter = statusFilter;
    const allPayments = filter === 'all' ? payments : payments.filter((p) => p.status === filter);
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
  }, [payments, statusFilter]);

  const counts = useMemo(() => {
    let paid = 0;
    let overdue = 0;
    let due = 0;
    let upcoming = 0;
    let skipped = 0;
    for (const p of payments) {
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
  }, [payments]);
  const isEmpty = useMemo(() => payments.length === 0, [payments]);

  // Group totals by currency. For paid: actual paid amount; for variable+unpaid with no
  // estimate: skipped (excluded). Skipped payments excluded entirely.
  const totalsByCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    for (const p of payments) {
      if (p.status === CommitmentPaymentStatus.Skipped) continue;
      const isPaid = p.status === CommitmentPaymentStatus.Paid;
      const value = isPaid ? (p.amount_paid ?? p.amount_due) : p.amount_due;
      if (value == null) continue;
      totals.set(p.currency, (totals.get(p.currency) ?? 0) + value);
    }
    return totals;
  }, [payments]);

  const selectedMonthRef = useRef(selectedMonth);
  selectedMonthRef.current = selectedMonth;

  const navigateMonth = useCallback(
    (direction: 'prev' | 'next') => {
      void setSelectedMonth(shiftYearMonth(selectedMonth, direction === 'next' ? 1 : -1));
    },
    [selectedMonth, setSelectedMonth],
  );

  const selectMonth = useCallback(
    (yearMonth: string) => {
      void setSelectedMonth(yearMonth);
    },
    [setSelectedMonth],
  );

  useFocusEffect(
    useCallback(() => {
      const task = runAfterInteractions(() => {
        void loadCommitments();
        void loadPaymentsForMonth(selectedMonthRef.current);
      });
      return () => task.cancel();
    }, [loadCommitments, loadPaymentsForMonth]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCommitments();
      await generatePayments();
      await loadPaymentsForMonth(selectedMonth);
    } finally {
      setRefreshing(false);
    }
  }, [setRefreshing, loadCommitments, generatePayments, loadPaymentsForMonth, selectedMonth]);

  const goToDetail = useCallback((paymentId: string) => {
    router.push(`/commitments/${paymentId}` as Parameters<typeof router.push>[0]);
  }, []);

  const goToAdd = useCallback(() => {
    router.push('/commitments/add' as Parameters<typeof router.push>[0]);
  }, []);

  const goToEdit = useCallback((commitmentId: string | undefined) => {
    if (!commitmentId) {
      console.warn('[goToEdit] commitment id is undefined — skipping navigation');
      return;
    }
    router.push(`/commitments/${commitmentId}/edit` as Parameters<typeof router.push>[0]);
  }, []);

  return {
    state: {
      sections,
      selectedMonth,
      counts,
      totalsByCurrency,
      refreshing,
      isEmpty,
      commitmentsLoaded,
      paymentsLoaded,
      // hasCommitments is month-independent (all commitments, any month). isEmpty is
      // per-selected-month. The list shows the full welcome empty state only when there
      // are no commitments at all; an empty *month* keeps the nav/filters mounted.
      hasCommitments: commitments.length > 0,
      statusFilter,
      categoriesById,
      commitmentsById,
    },
    navigateMonth,
    selectMonth,
    onRefresh,
    goToDetail,
    goToAdd,
    goToEdit,
    skipPayment,
    deactivateCommitment,
    setStatusFilter,
  };
}
