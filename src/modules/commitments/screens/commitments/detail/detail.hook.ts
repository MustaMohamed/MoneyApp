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
import type { DetailLoadErrorFloatingOffset } from './components/detail_load_error';
import { usePaySheetState } from './components/pay_sheet.state';
import { overlayStorePayments, resolveCommitmentDetailViewState } from './detail.helpers';
import { INITIAL_UI_ENTRY, useCommitmentDetailState } from './detail.state';
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

  const { status, refreshError, reloadKey, skipConfirmVisible, skipBusy, skipError } =
    useCommitmentDetailState(useShallow((s) => s.entries[owner] ?? INITIAL_UI_ENTRY));
  const beginLoad = useCommitmentDetailState.getState().beginLoad;
  const resolve = useCommitmentDetailState.getState().resolve;
  const failLoad = useCommitmentDetailState.getState().failLoad;
  const bumpReload = useCommitmentDetailState.getState().bumpReload;
  const setSkipConfirmVisible = useCommitmentDetailState.getState().setSkipConfirmVisible;
  const setSkipBusy = useCommitmentDetailState.getState().setSkipBusy;
  const setSkipError = useCommitmentDetailState.getState().setSkipError;
  const releaseUi = useCommitmentDetailState.getState().release;

  const { commitmentId: rowsCommitmentId, allPayments } = useCommitmentDetailStore(
    useShallow((s) => s.entries[owner] ?? INITIAL_DATA_ENTRY),
  );
  const setAllPayments = useCommitmentDetailStore.getState().setAllPayments;
  const releaseData = useCommitmentDetailStore.getState().release;
  const releasePaySheet = usePaySheetState.getState().release;

  const payment = useMemo(() => payments.find((p) => p.id === paymentId), [payments, paymentId]);

  const commitment = useMemo(
    () => (payment ? commitments.find((c) => c.id === payment.commitment_id) : undefined),
    [payment, commitments],
  );
  const commitmentId = commitment?.id;

  // `payments` is the refresh trigger: every store publish re-queries the history in place.
  useEffect(() => {
    if (!commitmentId) return;
    let cancelled = false;
    const entry = useCommitmentDetailStore.getState().entries[owner] ?? INITIAL_DATA_ENTRY;
    const preserveData = entry.commitmentId === commitmentId && entry.allPayments.length > 0;
    beginLoad(owner, preserveData);
    commitmentRepository
      .getPaymentsByCommitment(commitmentId)
      .then((rows) => {
        if (cancelled) return;
        setAllPayments(owner, commitmentId, rows);
        resolve(owner);
      })
      .catch((err) => {
        console.error('[commitmentDetail] getPaymentsByCommitment failed', err);
        if (!cancelled) failLoad(owner, preserveData);
      });
    return () => {
      cancelled = true;
    };
  }, [commitmentId, payments, reloadKey, owner, beginLoad, resolve, failLoad, setAllPayments]);

  useEffect(() => {
    return () => {
      releaseData(owner);
      releaseUi(owner);
      releasePaySheet(owner);
    };
  }, [owner, releaseData, releaseUi, releasePaySheet]);

  const rows = rowsCommitmentId === commitmentId ? allPayments : INITIAL_DATA_ENTRY.allPayments;
  const historyRows = useMemo(() => overlayStorePayments(rows, payments), [rows, payments]);

  const viewState = resolveCommitmentDetailViewState({
    hasCommitment: commitment !== undefined,
    status,
    hasRows: rows.length > 0,
    refreshError,
  });

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

  const floatingOffset: DetailLoadErrorFloatingOffset = stackedPrefix ? 'edge' : 'tabBar';

  const openPaySheet = useCallback(() => {
    usePaySheetState.getState().open(owner);
  }, [owner]);

  const skipPayment = useCallback(async () => {
    if (!payment) return;
    setSkipError(owner, false);
    setSkipBusy(owner, true);
    try {
      await storeSkipPayment(payment.id);
      setSkipConfirmVisible(owner, false);
    } catch (err) {
      console.error('[commitmentDetail] skipPayment failed', err);
      setSkipError(owner, true);
    } finally {
      setSkipBusy(owner, false);
    }
  }, [payment, storeSkipPayment, owner, setSkipConfirmVisible, setSkipBusy, setSkipError]);

  const confirmSkip = useCallback(() => {
    setSkipError(owner, false);
    setSkipConfirmVisible(owner, true);
  }, [owner, setSkipConfirmVisible, setSkipError]);

  const cancelSkip = useCallback(() => {
    setSkipConfirmVisible(owner, false);
  }, [owner, setSkipConfirmVisible]);

  const reload = useCallback(() => bumpReload(owner), [bumpReload, owner]);

  const goToEdit = useCallback(() => {
    if (!commitment) return;
    router.push(commitmentEditRoute(commitment.id, stackedPrefix, originTxId));
  }, [commitment, stackedPrefix, originTxId]);

  const goBack = useCallback(() => {
    router.back();
  }, []);

  return {
    state: {
      owner,
      viewState,
      payment,
      commitment,
      allPayments: historyRows,
      category,
      account,
      currentPayment,
      recurrenceLabel,
      durationLabel,
      refreshError,
      skipConfirmVisible,
      skipBusy,
      skipError,
      floatingOffset,
    },
    openPaySheet,
    skipPayment,
    confirmSkip,
    cancelSkip,
    reload,
    goToEdit,
    goBack,
  };
}
