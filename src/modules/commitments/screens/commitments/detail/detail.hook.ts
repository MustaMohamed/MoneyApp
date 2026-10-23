import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { useCallback, useEffect, useId, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { DurationType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { buildRecurrenceLabel } from '@/modules/commitments/utils/recurrence_label';
import {
  STACKED_PREFIX,
  TABBED_ORIGIN,
  stackedPrefixOf,
  stackedTransactionDetailRoute,
} from '@/modules/navigation/domain/stacked_route';
import { formatLongDate, toLocalDateString } from '@/utils/format_date';

import type { Commitment } from '../../../entities/commitment.entity';
import { commitmentRepository } from '../../../repositories/commitment.repository';
import { useCommitmentStore } from '../../../store/commitment.store';
import {
  type CommitmentEditLanding,
  useCommitmentFormHostState,
} from '../../../store/commitment_form_host.state';
import { usePaySheetState } from './components/pay_sheet.state';
import {
  overlayStorePayments,
  resolveCommitmentDetailCycle,
  resolveCommitmentDetailViewState,
} from './detail.helpers';
import { INITIAL_UI_ENTRY, useCommitmentDetailState } from './detail.state';
import { INITIAL_DATA_ENTRY, useCommitmentDetailStore } from './detail.store';

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

function leaveStackedSubtree(
  originTxId: string | undefined,
  originTxCopy: string | undefined,
): void {
  // `(tabs)` is index 0 of the `(app)` Stack, so popping to the top lands on the tabbed transaction.
  if (originTxCopy === TABBED_ORIGIN) router.dismissAll();
  // POP_TO selects by route name, so it steps over any duplicate payment a double-tap appended.
  else if (originTxId) router.dismissTo(stackedTransactionDetailRoute(originTxId));
  else router.back();
}

export function useCommitmentDetail() {
  const owner = useId();
  const {
    id: commitmentId,
    cycle,
    originTxId,
    originTxCopy,
  } = useLocalSearchParams<{
    id: string;
    cycle?: string;
    originTxId?: string;
    originTxCopy?: string;
  }>();
  const stackedPrefix = stackedPrefixOf(usePathname());

  const payments = useCommitmentStore((s) => s.payments);
  const storeSkipPayment = useCommitmentStore.getState().skipPayment;
  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore.useState.categories();

  const { activeId, status, refreshError, reloadKey, skipConfirmVisible, skipBusy, skipError } =
    useCommitmentDetailState(useShallow((s) => s.entries[owner] ?? INITIAL_UI_ENTRY));
  const beginLoad = useCommitmentDetailState.getState().beginLoad;
  const resolve = useCommitmentDetailState.getState().resolve;
  const failLoad = useCommitmentDetailState.getState().failLoad;
  const bumpReload = useCommitmentDetailState.getState().bumpReload;
  const setSkipConfirmVisible = useCommitmentDetailState.getState().setSkipConfirmVisible;
  const setSkipBusy = useCommitmentDetailState.getState().setSkipBusy;
  const setSkipError = useCommitmentDetailState.getState().setSkipError;
  const releaseUi = useCommitmentDetailState.getState().release;

  const entry = useCommitmentDetailStore(useShallow((s) => s.entries[owner] ?? INITIAL_DATA_ENTRY));
  const setDetail = useCommitmentDetailStore.getState().setDetail;
  const releaseData = useCommitmentDetailStore.getState().release;
  const releasePaySheet = usePaySheetState.getState().release;

  // `payments` is the refresh trigger: every store publish re-reads the detail in place.
  useEffect(() => {
    if (!commitmentId) return;
    let cancelled = false;
    const held = useCommitmentDetailStore.getState().entries[owner] ?? INITIAL_DATA_ENTRY;
    const preserveData = held.commitmentId === commitmentId && held.commitment !== undefined;
    const previousDueDate = preserveData
      ? held.allPayments.find((p) => p.id === held.cycleId)?.due_date
      : undefined;
    const loadedOn = toLocalDateString(new Date());
    beginLoad(owner, commitmentId, preserveData);
    Promise.all([
      commitmentRepository.getById(commitmentId),
      commitmentRepository.getPaymentsByCommitment(commitmentId),
    ])
      .then(([found, rows]) => {
        if (cancelled) return;
        setDetail(owner, commitmentId, {
          commitment: found,
          payments: rows,
          cycleId: resolveCommitmentDetailCycle(rows, cycle, previousDueDate)?.id,
          loadedOn,
        });
        resolve(owner, commitmentId);
      })
      .catch((err) => {
        console.error('[commitmentDetail] detail read failed', err);
        if (!cancelled) failLoad(owner, commitmentId, preserveData);
      });
    return () => {
      cancelled = true;
    };
  }, [commitmentId, cycle, payments, reloadKey, owner, beginLoad, resolve, failLoad, setDetail]);

  useEffect(() => {
    return () => {
      releaseData(owner);
      releaseUi(owner);
      releasePaySheet(owner);
    };
  }, [owner, releaseData, releaseUi, releasePaySheet]);

  const holdsRoute = entry.commitmentId === commitmentId;
  const commitment = holdsRoute ? entry.commitment : undefined;
  const rows = holdsRoute ? entry.allPayments : INITIAL_DATA_ENTRY.allPayments;
  const cycleId = holdsRoute ? entry.cycleId : undefined;
  const today = holdsRoute ? entry.loadedOn : undefined;
  const historyRows = useMemo(() => overlayStorePayments(rows, payments), [rows, payments]);
  const payment = useMemo(
    () => (cycleId === undefined ? undefined : historyRows.find((p) => p.id === cycleId)),
    [historyRows, cycleId],
  );

  const viewState = resolveCommitmentDetailViewState({
    hasCommitment: commitment !== undefined,
    ownsStatus: activeId === commitmentId,
    status,
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

  const recurrenceLabel = useMemo(
    () => (commitment ? buildRecurrenceLabel(commitment) : ''),
    [commitment],
  );

  const durationLabel = useMemo(
    () => (commitment ? buildDurationLabel(commitment) : ''),
    [commitment],
  );

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
    const landing: CommitmentEditLanding =
      stackedPrefix === STACKED_PREFIX
        ? { onDeactivated: () => leaveStackedSubtree(originTxId, originTxCopy) }
        : {
            onSaved: () => router.dismissTo('/commitments'),
            onDeactivated: () => router.dismissTo('/commitments'),
          };
    useCommitmentFormHostState.getState().openEdit(commitment.id, landing);
  }, [commitment, stackedPrefix, originTxId, originTxCopy]);

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
      today,
      recurrenceLabel,
      durationLabel,
      skipConfirmVisible,
      skipBusy,
      skipError,
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
