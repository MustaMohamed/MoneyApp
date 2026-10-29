import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { useCallback, useEffect, useId, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { DetailFact } from '@/components/ui/detail_fact_row.helpers';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { lookupLeavesUnresolved } from '@/modules/accounts/store/account_lookup.helpers';
import { useAccountsById } from '@/modules/accounts/store/use_accounts_by_id.hook';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import {
  STACKED_PREFIX,
  TABBED_ORIGIN,
  stackedPrefixOf,
  stackedTransactionDetailRoute,
} from '@/modules/navigation/domain/stacked_route';
import { toLocalDateString } from '@/utils/format_date';

import { countSettledPayments, resolveCommitmentLifecycle } from '../../../domain/payment_state';
import { commitmentRepository } from '../../../repositories/commitment.repository';
import { useCommitmentStore } from '../../../store/commitment.store';
import {
  type CommitmentEditLanding,
  useCommitmentFormHostState,
} from '../../../store/commitment_form_host.state';
import { usePaySheetState } from './components/pay_sheet.state';
import {
  buildCommitmentCycleCard,
  buildCommitmentDetailFacts,
  buildCommitmentDetailHero,
  type CommitmentDetailFactKind,
  commitmentDetailShowsBody,
  commitmentDetailShowsCycleCard,
  commitmentDetailShowsEdit,
  overlayStorePayments,
  resolveCommitmentDetailCycle,
  resolveCommitmentDetailSkeletonCards,
  resolveCommitmentDetailViewState,
  resolveOpenedUnpaidDueDate,
} from './detail.helpers';
import { INITIAL_UI_ENTRY, useCommitmentDetailState } from './detail.state';
import { INITIAL_DATA_ENTRY, useCommitmentDetailStore } from './detail.store';

const NO_FACTS: readonly DetailFact<CommitmentDetailFactKind>[] = Object.freeze([]);

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
    cycle: cycleParam,
    originTxId,
    originTxCopy,
  } = useLocalSearchParams<{
    id: string;
    cycle?: string | string[];
    originTxId?: string;
    originTxCopy?: string;
  }>();
  // expo-router hands a repeated query param over as an array.
  const cycle = Array.isArray(cycleParam) ? cycleParam[0] : cycleParam;
  const stackedPrefix = stackedPrefixOf(usePathname());

  const payments = useCommitmentStore((s) => s.payments);
  const storeSkipPayment = useCommitmentStore.getState().skipPayment;
  const categories = useCategoryStore.useState.categories();
  const accountRead = useAccountsById();
  const { accountsById } = accountRead;
  const loadAccountLookup = useAccountStore.getState().loadAccountLookup;
  const { rate, hasLoaded: rateLoaded } = useCurrencyStore(
    useShallow((s) => ({ rate: s.rate, hasLoaded: s.hasLoaded })),
  );
  const liveRate = rateLoaded ? rate : undefined;
  const loadingCommitmentHint = useCommitmentStore((s) =>
    s.commitments.find((c) => c.id === commitmentId),
  );
  const loadingCycleHint = cycle === undefined ? undefined : payments.find((p) => p.id === cycle);

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
  const paySheetToday = usePaySheetState((s) => s.entries[owner]?.openedOn);

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
        const cycleRow = resolveCommitmentDetailCycle(rows, cycle, previousDueDate);
        setDetail(owner, commitmentId, {
          commitment: found,
          allPayments: rows,
          cycleId: cycleRow?.id,
          openedUnpaidDueDate: resolveOpenedUnpaidDueDate({
            cycle: cycleRow,
            heldDueDate: previousDueDate,
            heldOpenedUnpaidDueDate: preserveData ? held.openedUnpaidDueDate : undefined,
          }),
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
  const openedUnpaidDueDate = holdsRoute ? entry.openedUnpaidDueDate : undefined;
  const historyRows = useMemo(() => overlayStorePayments(rows, payments), [rows, payments]);
  const payment = useMemo(
    () => (cycleId === undefined ? undefined : historyRows.find((p) => p.id === cycleId)),
    [historyRows, cycleId],
  );
  const settledCount = useMemo(() => countSettledPayments(historyRows), [historyRows]);
  const lifecycle =
    commitment && today !== undefined
      ? resolveCommitmentLifecycle(commitment, settledCount, today)
      : undefined;
  const skeletonCards = useMemo(
    () =>
      resolveCommitmentDetailSkeletonCards({
        commitment: loadingCommitmentHint,
        storePayments: payments,
        cycleId: cycle,
        today: toLocalDateString(new Date()),
      }),
    [loadingCommitmentHint, payments, cycle],
  );

  const accountId = commitment?.account_id ?? undefined;
  const accountIds = useMemo(() => (accountId === undefined ? [] : [accountId]), [accountId]);
  const viewState = resolveCommitmentDetailViewState({
    hasCommitment: commitment !== undefined,
    ownsStatus: activeId === commitmentId,
    status,
    refreshError: refreshError || lookupLeavesUnresolved(accountRead, accountIds),
  });
  const showsBody = commitmentDetailShowsBody(viewState);
  const showsEdit = commitmentDetailShowsEdit(viewState, lifecycle);

  const category = useMemo(
    () => (commitment ? categories.find((c) => c.id === commitment.category_id) : undefined),
    [commitment, categories],
  );

  useEffect(() => {
    if (accountId === undefined) return;
    const logLookupFailure = (error: unknown) => {
      console.error('[commitmentDetail] account lookup failed', error);
    };
    try {
      void Promise.resolve(loadAccountLookup([accountId])).catch(logLookupFailure);
    } catch (error) {
      logLookupFailure(error);
    }
  }, [accountId, loadAccountLookup, reloadKey]);

  const facts = useMemo(
    () =>
      commitment
        ? buildCommitmentDetailFacts({ commitment, payment, category, accountsById, liveRate })
        : NO_FACTS,
    [commitment, payment, category, accountsById, liveRate],
  );

  const hero = useMemo(
    () =>
      commitment && today !== undefined && lifecycle !== undefined
        ? buildCommitmentDetailHero({ commitment, payment, category, today, lifecycle })
        : undefined,
    [commitment, payment, category, today, lifecycle],
  );

  const cycleCard = useMemo(
    () =>
      payment &&
      commitment &&
      today !== undefined &&
      lifecycle !== undefined &&
      commitmentDetailShowsCycleCard({ lifecycle, payment, openedUnpaidDueDate })
        ? buildCommitmentCycleCard({ payment, commitment, today })
        : undefined,
    [payment, commitment, today, lifecycle, openedUnpaidDueDate],
  );

  const openPaySheet = useCallback(() => {
    // The pay sheet dates by the day it opens, not the day the detail last read.
    usePaySheetState.getState().open(owner, toLocalDateString(new Date()));
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

  const transactionId =
    cycleCard?.action.kind === 'viewTransaction' ? cycleCard.action.transactionId : undefined;
  const viewTransaction = useCallback(() => {
    if (transactionId === undefined) return;
    router.push(stackedTransactionDetailRoute(transactionId));
  }, [transactionId]);

  return {
    state: {
      owner,
      viewState,
      payment,
      commitment,
      allPayments: historyRows,
      category,
      today,
      paySheetToday,
      hero,
      cycleCard,
      showsBody,
      showsEdit,
      facts,
      loadingCommitmentHint,
      skeletonCards,
      loadingCycleHint,
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
    viewTransaction,
  };
}
