import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useToast } from '@/components/ui/toast';
import { Strings } from '@/constants/strings';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { stackedTransactionDetailRoute } from '@/modules/navigation/domain/stacked_route';
import { useTransactionFormState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state';
import { useTransactionsScreenStore } from '@/modules/transactions/screens/transactions/transactions.store';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { resolveAccountName } from '@/utils/account_name';
import { runAfterInteractions } from '@/utils/run_after_interactions';
import { currentYearMonth } from '@/utils/year_month';

import { AccountNameTakenError } from '../../../repositories/account.errors';
import type { AccountActivityLoadInput } from '../../../repositories/account_activity.repository';
import type { ArchivedAccountDetailLoadInput } from '../../../repositories/archived_account_detail.repository';
import { useAccountStore } from '../../../store/account.store';
import { useAccountActivityStore } from './account_activity.store';
import { resolveViewState } from './account_detail.helpers';
import { useAccountDetailState } from './account_detail.state';
import { useArchivedAccountDetailStore } from './archived_account_detail.store';
import { buildActivityRowPresentation } from './components/account_activity.helpers';
import { buildMonthFacts } from './components/account_facts.helpers';
import { useReplacementAccountSheetState } from './components/replacement_account_sheet.state';

const TRANSACTIONS_TAB = '/(app)/(tabs)/transactions' as const;
const ACCOUNTS_LIST = '/accounts' as const;

const editAccountRoute = (accountId: string): `/accounts/${string}/edit` =>
  `/accounts/${accountId}/edit`;

export function useAccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const accounts = useAccountStore((s) => s.accounts);
  const archiveAccount = useAccountStore.getState().archiveAccount;
  const unarchiveAccount = useAccountStore.getState().unarchiveAccount;
  const deleteAccount = useAccountStore.getState().deleteAccount;
  const adjustBalance = useAccountStore.getState().adjustBalance;
  const confirmBalanceReviewed = useAccountStore.getState().confirmBalanceReviewed;
  const {
    isAdjustVisible,
    isArchiveVisible,
    isAdjusting,
    isArchiving,
    isConfirmingBalanceReview,
    balanceReviewError,
    archiveError,
    isUnarchiving,
    unarchiveError,
    isDeleteVisible,
    isDeleting,
    deleteError,
  } = useAccountDetailState(
    useShallow((s) => ({
      isAdjustVisible: s.isAdjustVisible,
      isArchiveVisible: s.isArchiveVisible,
      isAdjusting: s.isAdjusting,
      isArchiving: s.isArchiving,
      isConfirmingBalanceReview: s.isConfirmingBalanceReview,
      balanceReviewError: s.balanceReviewError,
      archiveError: s.archiveError,
      isUnarchiving: s.isUnarchiving,
      unarchiveError: s.unarchiveError,
      isDeleteVisible: s.isDeleteVisible,
      isDeleting: s.isDeleting,
      deleteError: s.deleteError,
    })),
  );
  const setAdjustVisible = useAccountDetailState.getState().setAdjustVisible;
  const setArchiveVisible = useAccountDetailState.getState().setArchiveVisible;
  const setAdjusting = useAccountDetailState.getState().setAdjusting;
  const setArchiving = useAccountDetailState.getState().setArchiving;
  const setConfirmingBalanceReview = useAccountDetailState.getState().setConfirmingBalanceReview;
  const setBalanceReviewError = useAccountDetailState.getState().setBalanceReviewError;
  const setArchiveError = useAccountDetailState.getState().setArchiveError;
  const setUnarchiving = useAccountDetailState.getState().setUnarchiving;
  const setUnarchiveError = useAccountDetailState.getState().setUnarchiveError;
  const setDeleteVisible = useAccountDetailState.getState().setDeleteVisible;
  const setDeleting = useAccountDetailState.getState().setDeleting;
  const setDeleteError = useAccountDetailState.getState().setDeleteError;
  const reset = useAccountDetailState.getState().reset;
  const openReplacementSheet = useReplacementAccountSheetState.getState().open;
  const { activityStatus, activitySnapshot } = useAccountActivityStore(
    useShallow((s) => ({ activityStatus: s.status, activitySnapshot: s.snapshot })),
  );
  const { slotStatus, slotSnapshot } = useArchivedAccountDetailStore(
    useShallow((s) => ({ slotStatus: s.status, slotSnapshot: s.snapshot })),
  );
  const categories = useCategoryStore((s) => s.categories);

  useEffect(
    () => () => {
      reset();
      useReplacementAccountSheetState.getState().reset();
      // Bumps the generation too, so a result racing an archive is dropped (M14).
      useAccountActivityStore.getState().reset();
      useArchivedAccountDetailStore.getState().reset();
    },
    [reset],
  );

  const account = accounts.find((a) => a.id === id);
  const replacementOptions = accounts;
  const hasReplacementAccount = replacementOptions.length > 0;

  const archived = useMemo(
    () =>
      !account && slotSnapshot?.accountId === id && slotSnapshot.account
        ? {
            account: slotSnapshot.account,
            transactionCount: slotSnapshot.transactionCount,
            activeCommitmentCount: slotSnapshot.activeCommitments.length,
            activeCommitments: slotSnapshot.activeCommitments,
          }
        : undefined,
    [account, id, slotSnapshot],
  );

  const viewState = resolveViewState({
    isActive: account !== undefined,
    isArchived: archived !== undefined,
    slotStatus,
    slotHoldsId: slotSnapshot?.accountId === id,
  });

  const activityInput = useCallback(
    (): AccountActivityLoadInput => ({
      accountId: id,
      mutationVersion: useTransactionStore.getState().mutationVersion,
      now: new Date(),
    }),
    [id],
  );

  const archivedInput = useCallback(
    (): ArchivedAccountDetailLoadInput => ({
      accountId: id,
      mutationVersion: useTransactionStore.getState().mutationVersion,
    }),
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      const task = runAfterInteractions(
        () => {
          // An id outside the active list reads by id into the slot, never the activity or the shared lookup (L27, M14).
          if (!useAccountStore.getState().accounts.some((a) => a.id === id)) {
            return useArchivedAccountDetailStore.getState().ensure(archivedInput());
          }
          return useAccountActivityStore.getState().ensure(activityInput());
        },
        // The stores own the error status the screen renders; this only leaves a trace.
        { onError: (error) => console.error('[accountDetail] focus load failed:', error) },
      );
      return () => task.cancel();
    }, [activityInput, archivedInput, id]),
  );

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const activityRows = useMemo(() => {
    if (activitySnapshot?.accountId !== id) return [];
    const loadedAt = new Date(activitySnapshot.loadedAt);
    return activitySnapshot.rows.map((tx) => {
      const category = tx.category_id ? categoriesById.get(tx.category_id) : undefined;
      return {
        id: tx.id,
        presentation: buildActivityRowPresentation(
          {
            tx,
            account: accountsById.get(tx.account_id),
            toAccount: tx.to_account_id ? accountsById.get(tx.to_account_id) : undefined,
            category,
          },
          loadedAt,
          id,
        ),
      };
    });
  }, [accountsById, activitySnapshot, categoriesById, id]);

  const monthFacts = useMemo(
    () =>
      account
        ? buildMonthFacts(
            account,
            activitySnapshot?.accountId === id ? activitySnapshot.stats : undefined,
          )
        : [],
    [account, activitySnapshot, id],
  );

  // Nothing on the active detail reads `loadError`, so a landed write over a failed reload pops to the list that does.
  const popIfReloadFailed = () => {
    if (useAccountStore.getState().loadError) router.dismissTo(ACCOUNTS_LIST);
  };

  const handleAdjustBalance = async (newBalance: number) => {
    if (!id) return;
    setAdjusting(true);
    try {
      await adjustBalance(id, newBalance);
    } finally {
      setAdjusting(false);
    }
    // After the write on purpose: a rejection keeps the sheet open with the typed value intact.
    setAdjustVisible(false);
    popIfReloadFailed();
  };

  const handleArchive = async () => {
    if (!id) return;
    setArchiveError(undefined);
    setArchiving(true);
    try {
      await archiveAccount(id);
    } catch (error) {
      console.error('[accountDetail] archiveAccount failed:', error);
      setArchiveError(Strings.accountDetailArchiveError);
      return;
    } finally {
      setArchiving(false);
    }
    // Outside the try: only the write decides the failure line, never the close or the pop.
    setArchiveVisible(false);
    router.back();
  };

  // Reopening must not show the last failure, so the close path clears it.
  const closeArchive = () => {
    setArchiveVisible(false);
    setArchiveError(undefined);
  };

  const handleUnarchive = async () => {
    if (!archived || useAccountDetailState.getState().isUnarchiving) return;
    const name = resolveAccountName(archived.account);
    setUnarchiveError(undefined);
    setUnarchiving(true);
    try {
      await unarchiveAccount(id);
    } catch (error) {
      console.error('[accountDetail] unarchiveAccount failed:', error);
      setUnarchiveError(
        error instanceof AccountNameTakenError
          ? Strings.accountsArchivedNameTaken
          : Strings.accountsArchivedRestoreError,
      );
      return;
    } finally {
      setUnarchiving(false);
    }
    // A failed reload leaves both lists stale, so pop over the slot's row instead of a blank loading frame.
    if (useAccountStore.getState().loadError) {
      toast.show({ label: Strings.accountsArchivedRestored(name), variant: 'success' });
      router.dismissTo(ACCOUNTS_LIST);
      return;
    }
    // Once restored the slot must not hold the pre-restore row at `ready`, or a later Archive paints it.
    useArchivedAccountDetailStore.getState().reset();
    // The focus effect does not re-run on a store change; the store owns the error status the card renders.
    void useAccountActivityStore.getState().ensure(activityInput());
    toast.show({ label: Strings.accountsArchivedRestored(name), variant: 'success' });
  };

  const handleDelete = async () => {
    if (!archived || useAccountDetailState.getState().isDeleting) return;
    // Commitments an active account can take over go through the sheet instead of losing their account.
    if (archived.activeCommitments.length > 0 && hasReplacementAccount) {
      setDeleteVisible(false);
      setDeleteError(undefined);
      openReplacementSheet(replacementOptions[0].id);
      return;
    }
    // Read before the write, which scrubs the name.
    const name = resolveAccountName(archived.account);
    setDeleteError(undefined);
    setDeleting(true);
    try {
      await deleteAccount(id);
    } catch (error) {
      console.error('[accountDetail] deleteAccount failed:', error);
      setDeleteError(Strings.accountDetailDeleteError);
      return;
    } finally {
      setDeleting(false);
    }
    // Outside the try, and the pop before the toast so it lands on the screen the detail came from.
    setDeleteVisible(false);
    router.back();
    toast.show({ label: Strings.accountDetailDeleted(name), variant: 'success' });
  };

  const closeDelete = () => {
    setDeleteVisible(false);
    setDeleteError(undefined);
  };

  const handleConfirmBalanceReviewed = async () => {
    const detailState = useAccountDetailState.getState();
    if (!id || detailState.isConfirmingBalanceReview) return;
    detailState.setBalanceReviewError(undefined);
    detailState.setConfirmingBalanceReview(true);
    try {
      await confirmBalanceReviewed(id);
    } catch (error) {
      console.error('[accountDetail] confirmBalanceReviewed failed:', error);
      setBalanceReviewError(Strings.accountBalanceReviewError);
      return;
    } finally {
      setConfirmingBalanceReview(false);
    }
    popIfReloadFailed();
  };

  const onBack = () => router.back();

  const goToEdit = () => router.push(editAccountRoute(id));

  // Nothing to catch: a failed retry publishes `initialError`, which the card renders and logs.
  const retryActivity = () => {
    void useAccountActivityStore.getState().retry(activityInput());
  };

  // Nothing to catch: a failed retry publishes `initialError`, which the screen renders and the store logs.
  const retryArchivedRead = () => {
    void useArchivedAccountDetailStore.getState().retry(archivedInput());
  };

  const goToTransaction = (transactionId: string) => {
    router.push(stackedTransactionDetailRoute(transactionId));
  };

  // The second `dismissTo` pops the landed tab's own Stack, where the href only diverges once the first has run.
  const jumpToTransactionsTab = () => {
    router.dismissTo(TRANSACTIONS_TAB);
    router.dismissTo(TRANSACTIONS_TAB);
  };

  const goToAllTransactions = () => {
    useTransactionsScreenStore.getState().seedAccountFilter(id, currentYearMonth());
    jumpToTransactionsTab();
  };

  // Two frames past the pop: a `Sheet` that first renders already-open never animates in.
  const addTransactionForAccount = () => {
    jumpToTransactionsTab();
    runAfterInteractions(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          useTransactionFormState.getState().openAdd({ accountId: id });
        });
      });
    });
  };

  return {
    state: {
      account,
      viewState,
      archived,
      isAdjustVisible,
      isArchiveVisible,
      isAdjusting,
      isArchiving,
      isConfirmingBalanceReview,
      balanceReviewError,
      archiveError,
      isUnarchiving,
      unarchiveError,
      isDeleteVisible,
      isDeleting,
      deleteError,
      replacementOptions,
      hasReplacementAccount,
      activity: { status: activityStatus, rows: activityRows, monthFacts },
    },
    setAdjustVisible,
    handleAdjustBalance,
    setArchiveVisible,
    closeArchive,
    handleArchive,
    handleUnarchive,
    setDeleteVisible,
    closeDelete,
    handleDelete,
    handleConfirmBalanceReviewed,
    onBack,
    goToEdit,
    retryActivity,
    retryArchivedRead,
    goToTransaction,
    goToAllTransactions,
    addTransactionForAccount,
  };
}
