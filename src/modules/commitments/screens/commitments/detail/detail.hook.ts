import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { useCallback, useEffect, useId, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { CommitmentPaymentStatus, DurationType, RecurrencePeriod } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { commitmentEditRoute, stackedPrefixOf } from '@/modules/navigation/domain/stacked_route';
import { formatLongDate } from '@/utils/format_date';

import type { Commitment } from '../../../entities/commitment.entity';
import type { CommitmentPayment } from '../../../entities/commitment_payment.entity';
import { commitmentRepository } from '../../../repositories/commitment.repository';
import { useCommitmentStore } from '../../../store/commitment.store';
import { usePaySheetState } from './components/pay_sheet.state';
import { INITIAL_UI_ENTRY, useCommitmentDetailState, type DetailViewState } from './detail.state';
import { INITIAL_DATA_ENTRY, useCommitmentDetailStore } from './detail.store';

const PERIOD_LABEL: Record<RecurrencePeriod, string> = {
  [RecurrencePeriod.Days]: Strings.commitmentsRecurrencePeriodDay,
  [RecurrencePeriod.Weeks]: Strings.commitmentsRecurrencePeriodWeek,
  [RecurrencePeriod.Months]: Strings.commitmentsRecurrencePeriodMonth,
  [RecurrencePeriod.Years]: Strings.commitmentsRecurrencePeriodYear,
};

function buildRecurrenceLabel(commitment: Commitment): string {
  const { recurrence_every, recurrence_period } = commitment;
  return Strings.commitmentsRecurrenceEveryN(recurrence_every, PERIOD_LABEL[recurrence_period]);
}

function buildDurationLabel(commitment: Commitment): string {
  switch (commitment.duration_type) {
    case DurationType.Forever:
      return Strings.commitmentsDurationForever;
    case DurationType.AfterCount:
      return commitment.end_after_count != null
        ? Strings.commitmentsDurationAfterCountOf(commitment.end_after_count)
        : Strings.commitmentsDurationAfterCount;
    case DurationType.UntilDate:
      return commitment.end_date != null
        ? Strings.commitmentsDurationUntilDateOf(formatLongDate(commitment.end_date))
        : Strings.commitmentsDurationUntilDate;
  }
}

const STATUS_PRIORITY: CommitmentPaymentStatus[] = [
  CommitmentPaymentStatus.Overdue,
  CommitmentPaymentStatus.Due,
  CommitmentPaymentStatus.Upcoming,
];

function findCurrentPayment(payments: CommitmentPayment[]): CommitmentPayment | undefined {
  for (const status of STATUS_PRIORITY) {
    const found = payments.find((p) => p.status === status);
    if (found) return found;
  }
  return undefined;
}

export function useCommitmentDetail() {
  const owner = useId();
  const { id: paymentId, originTxId } = useLocalSearchParams<{
    id: string;
    originTxId?: string;
  }>();
  const stackedPrefix = stackedPrefixOf(usePathname());

  const { payments, commitments } = useCommitmentStore(
    useShallow((s) => ({
      payments: s.payments,
      commitments: s.commitments,
    })),
  );
  const storeSkipPayment = useCommitmentStore.getState().skipPayment;
  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore.useState.categories();

  const { viewState: screenViewState, skipConfirmVisible } = useCommitmentDetailState(
    useShallow((s) => s.entries[owner] ?? INITIAL_UI_ENTRY),
  );
  const setViewState = useCommitmentDetailState.getState().setViewState;
  const setSkipConfirmVisible = useCommitmentDetailState.getState().setSkipConfirmVisible;
  const releaseUi = useCommitmentDetailState.getState().release;

  const { allPayments } = useCommitmentDetailStore(
    useShallow((s) => s.entries[owner] ?? INITIAL_DATA_ENTRY),
  );
  const setAllPayments = useCommitmentDetailStore.getState().setAllPayments;
  const releaseData = useCommitmentDetailStore.getState().release;

  const payment = useMemo(() => payments.find((p) => p.id === paymentId), [payments, paymentId]);

  const commitment = useMemo(
    () => (payment ? commitments.find((c) => c.id === payment.commitment_id) : undefined),
    [payment, commitments],
  );

  const viewState: DetailViewState = useMemo(() => {
    if (screenViewState === 'loading') return 'loading';
    if (!commitment) return 'notFound';
    return 'ready';
  }, [screenViewState, commitment]);

  useEffect(() => {
    if (!commitment) {
      setViewState(owner, 'notFound');
      return;
    }
    let cancelled = false;
    setViewState(owner, 'loading');
    commitmentRepository
      .getPaymentsByCommitment(commitment.id)
      .then((payments) => {
        if (!cancelled) {
          setAllPayments(owner, payments);
          setViewState(owner, 'ready');
        }
      })
      .catch((err) => {
        console.error('[commitmentDetail] getPaymentsByCommitment failed', err);
        if (!cancelled) setViewState(owner, 'ready');
      });
    return () => {
      cancelled = true;
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [commitment?.id, payments, owner, setAllPayments, setViewState]); // object dep re-fetches spuriously

  useEffect(() => {
    return () => {
      releaseData(owner);
      releaseUi(owner);
    };
  }, [owner, releaseData, releaseUi]);

  const category = useMemo(
    () => (commitment ? categories.find((c) => c.id === commitment.category_id) : undefined),
    [commitment, categories],
  );

  const account = useMemo(
    () =>
      commitment?.account_id ? accounts.find((a) => a.id === commitment.account_id) : undefined,
    [commitment, accounts],
  );

  const currentPayment = useMemo(() => findCurrentPayment(allPayments), [allPayments]);

  const recurrenceLabel = useMemo(
    () => (commitment ? buildRecurrenceLabel(commitment) : ''),
    [commitment],
  );

  const durationLabel = useMemo(
    () => (commitment ? buildDurationLabel(commitment) : ''),
    [commitment],
  );

  const openPaySheet = useCallback(() => {
    usePaySheetState.getState().setVisible(true);
  }, []);

  const skipPayment = useCallback(async () => {
    if (!payment) return;
    try {
      await storeSkipPayment(payment.id);
      setSkipConfirmVisible(owner, false);
    } catch (err) {
      console.error('[commitmentDetail] skipPayment failed', err);
    }
  }, [payment, storeSkipPayment, owner, setSkipConfirmVisible]);

  const confirmSkip = useCallback(() => {
    setSkipConfirmVisible(owner, true);
  }, [owner, setSkipConfirmVisible]);

  const cancelSkip = useCallback(() => {
    setSkipConfirmVisible(owner, false);
  }, [owner, setSkipConfirmVisible]);

  const goToEdit = useCallback(() => {
    if (!commitment) return;
    router.push(commitmentEditRoute(commitment.id, stackedPrefix, originTxId));
  }, [commitment, stackedPrefix, originTxId]);

  const goBack = useCallback(() => {
    router.back();
  }, []);

  return {
    state: {
      viewState,
      payment,
      commitment,
      allPayments,
      category,
      account,
      currentPayment,
      recurrenceLabel,
      durationLabel,
      skipConfirmVisible,
    },
    openPaySheet,
    skipPayment,
    confirmSkip,
    cancelSkip,
    goToEdit,
    goBack,
  };
}
