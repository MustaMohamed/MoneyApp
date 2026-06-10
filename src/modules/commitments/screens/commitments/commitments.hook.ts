import { useSignals } from '@preact/signals-react/runtime';
import { router, useFocusEffect } from 'expo-router';
import { useMemo, useCallback, useRef } from 'react';

import { CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { runAfterInteractions } from '@/utils/run_after_interactions';

import type { Commitment } from '../../entities/commitment.entity';
import type { CommitmentPayment } from '../../entities/commitment_payment.entity';
import { useCommitmentStore } from '../../store/commitment.store';
import { useCommitmentsScreenState } from './commitments.state';

export type CommitmentsSection = {
  title: string;
  data: CommitmentPayment[];
};

export function useCommitments() {
  useSignals();
  const commitmentStore = useCommitmentStore();
  const commitments = commitmentStore.commitments;
  const payments = commitmentStore.payments;
  const selectedMonth = commitmentStore.selectedMonth;
  const commitmentsLoaded = commitmentStore.commitmentsLoaded;
  const paymentsLoaded = commitmentStore.paymentsLoaded;
  const {
    setSelectedMonth,
    loadPaymentsForMonth,
    loadCommitments,
    generatePayments,
    skipPayment,
    deactivateCommitment,
  } = commitmentStore;

  const categoryStore = useCategoryStore();
  const categories = categoryStore.categories;
  const screenState = useCommitmentsScreenState();
  const refreshing = screenState.state.refreshing.value;
  const statusFilter = screenState.state.statusFilter.value;
  const { setRefreshing, setStatusFilter } = screenState;

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
      const [year, month] = selectedMonth.split('-').map(Number);
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
    [selectedMonth, setSelectedMonth],
  );

  useFocusEffect(
    useCallback(() => {
      const reload = runAfterInteractions(() => {
        void loadCommitments();
        void loadPaymentsForMonth(selectedMonthRef.current);
      });
      return reload.cancel;
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
    onRefresh,
    goToDetail,
    goToAdd,
    goToEdit,
    skipPayment,
    deactivateCommitment,
    setStatusFilter,
  };
}
