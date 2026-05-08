import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import {
  AmountType,
  CommitmentPaymentStatus,
  DurationType,
  RecurrencePeriod,
} from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCommitmentStore } from '@/store/commitment.store';
import type { Commitment } from '@/database/entities/commitment.entity';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';
import { commitmentRepository } from '@/repositories/commitment.repository';
import { formatLongDate } from '@/utils/format_date';

import { useCommitmentDetailState } from './detail.state';

export type DetailViewState = 'loading' | 'notFound' | 'ready';

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
  const { id: paymentId } = useLocalSearchParams<{ id: string }>();

  const { state: commitmentState, skipPayment: storeSkipPayment } = useCommitmentStore(
    useShallow((s) => ({ state: s.state, skipPayment: s.skipPayment })),
  );
  const { state: accountState } = useAccountStore(useShallow((s) => ({ state: s.state })));
  const { state: categoryState } = useCategoryStore(useShallow((s) => ({ state: s.state })));

  const {
    state: uiState,
    setSkipConfirmVisible,
    setPaySheetVisible,
    reset: resetUi,
  } = useCommitmentDetailState(
    useShallow((s) => ({
      state: s.state,
      setSkipConfirmVisible: s.setSkipConfirmVisible,
      setPaySheetVisible: s.setPaySheetVisible,
      reset: s.reset,
    })),
  );

  const {
    state: screenState,
    setAllPayments,
    setViewState,
  } = useCommitmentDetailScreenData(
    useShallow((s) => ({
      state: s.state,
      setAllPayments: s.setAllPayments,
      setViewState: s.setViewState,
    })),
  );

  // Find payment from store's monthly payments
  const payment = useMemo(
    () => commitmentState.payments.find((p) => p.id === paymentId),
    [commitmentState.payments, paymentId],
  );

  // Find commitment from store
  const commitment = useMemo(
    () =>
      payment ? commitmentState.commitments.find((c) => c.id === payment.commitment_id) : undefined,
    [payment, commitmentState.commitments],
  );

  // Derive viewState
  const viewState: DetailViewState = useMemo(() => {
    if (screenState.viewState === 'loading') return 'loading';
    if (!commitment) return 'notFound';
    return 'ready';
  }, [screenState.viewState, commitment]);

  // Load all payments for this commitment from repo
  useEffect(() => {
    if (!commitment) {
      setViewState('notFound');
      return;
    }
    let cancelled = false;
    setViewState('loading');
    commitmentRepository
      .getPaymentsByCommitment(commitment.id)
      .then((payments) => {
        if (!cancelled) {
          setAllPayments(payments);
          setViewState('ready');
        }
      })
      .catch((err) => {
        console.error('[commitmentDetail] getPaymentsByCommitment failed', err);
        if (!cancelled) setViewState('ready');
      });
    return () => {
      cancelled = true;
    };
  }, [commitment?.id, setAllPayments, setViewState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetUi();
      useCommitmentDetailScreenData.getState().reset();
    };
  }, [resetUi]);

  const category = useMemo(
    () =>
      commitment
        ? categoryState.categories.find((c) => c.id === commitment.category_id)
        : undefined,
    [commitment, categoryState.categories],
  );

  const account = useMemo(
    () =>
      commitment?.account_id
        ? accountState.accounts.find((a) => a.id === commitment.account_id)
        : undefined,
    [commitment, accountState.accounts],
  );

  const currentPayment = useMemo(
    () => findCurrentPayment(screenState.allPayments),
    [screenState.allPayments],
  );

  const recurrenceLabel = useMemo(
    () => (commitment ? buildRecurrenceLabel(commitment) : ''),
    [commitment],
  );

  const durationLabel = useMemo(
    () => (commitment ? buildDurationLabel(commitment) : ''),
    [commitment],
  );

  const openPaySheet = useCallback(() => {
    setPaySheetVisible(true);
  }, [setPaySheetVisible]);

  const skipPayment = useCallback(async () => {
    if (!currentPayment) return;
    try {
      await storeSkipPayment(currentPayment.id);
      // Reload allPayments after skip
      if (commitment) {
        const updated = await commitmentRepository.getPaymentsByCommitment(commitment.id);
        setAllPayments(updated);
      }
    } catch (err) {
      console.error('[commitmentDetail] skipPayment failed', err);
    } finally {
      setSkipConfirmVisible(false);
    }
  }, [currentPayment, storeSkipPayment, commitment, setAllPayments, setSkipConfirmVisible]);

  const confirmSkip = useCallback(() => {
    setSkipConfirmVisible(true);
  }, [setSkipConfirmVisible]);

  const cancelSkip = useCallback(() => {
    setSkipConfirmVisible(false);
  }, [setSkipConfirmVisible]);

  const goToEdit = useCallback(() => {
    if (!commitment) return;
    router.push(`/commitments/${commitment.id}/edit` as Parameters<typeof router.push>[0]);
  }, [commitment]);

  const goBack = useCallback(() => {
    router.back();
  }, []);

  return {
    state: {
      viewState,
      payment,
      commitment,
      allPayments: screenState.allPayments,
      category,
      account,
      currentPayment,
      recurrenceLabel,
      durationLabel,
      skipConfirmVisible: uiState.skipConfirmVisible,
      paySheetVisible: uiState.paySheetVisible,
    },
    openPaySheet,
    skipPayment,
    confirmSkip,
    cancelSkip,
    goToEdit,
    goBack,
  };
}

// --- Internal screen-level data store (avoids useState) ---

interface DetailScreenDataShape {
  allPayments: CommitmentPayment[];
  viewState: DetailViewState;
}

interface CommitmentDetailScreenDataStore {
  state: DetailScreenDataShape;
  setAllPayments: (payments: CommitmentPayment[]) => void;
  setViewState: (vs: DetailViewState) => void;
  reset: () => void;
}

const INITIAL_SCREEN_DATA: DetailScreenDataShape = {
  allPayments: [],
  viewState: 'loading',
};

const useCommitmentDetailScreenData = create<CommitmentDetailScreenDataStore>((set) => ({
  state: INITIAL_SCREEN_DATA,
  setAllPayments: (payments) => set((s) => ({ state: { ...s.state, allPayments: payments } })),
  setViewState: (vs) => set((s) => ({ state: { ...s.state, viewState: vs } })),
  reset: () => set({ state: INITIAL_SCREEN_DATA }),
}));
