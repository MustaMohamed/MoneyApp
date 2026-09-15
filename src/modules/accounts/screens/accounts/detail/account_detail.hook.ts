import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { BackHandler } from 'react-native';
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
import { useZodForm } from '@/utils/use_zod_form.hook';
import { currentYearMonth } from '@/utils/year_month';

import { DEFAULT_ACCOUNT_COLOR } from '../../../constants/account_palette';
import { AccountNameTakenError } from '../../../repositories/account.errors';
import type { AccountActivityLoadInput } from '../../../repositories/account_activity.repository';
import type { ArchivedAccountDetailLoadInput } from '../../../repositories/archived_account_detail.repository';
import { useAccountStore } from '../../../store/account.store';
import { createEditAccountSchema } from '../../../utils/edit_account.schema';
import { useAccountActivityStore } from './account_activity.store';
import { resolveViewState } from './account_detail.helpers';
import { useAccountDetailState } from './account_detail.state';
import { useArchivedAccountDetailStore } from './archived_account_detail.store';
import { buildActivityRowPresentation } from './components/account_activity.helpers';
import { buildMonthFacts } from './components/account_facts.helpers';
import { resolveMovedToast } from './components/replacement_account_sheet.helpers';

const TRANSACTIONS_TAB = '/(app)/(tabs)/transactions' as const;
const ACCOUNTS_LIST = '/accounts' as const;

export function useAccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { toast } = useToast();

  const accounts = useAccountStore((s) => s.accounts);
  const updateAccount = useAccountStore.getState().updateAccount;
  const archiveAccount = useAccountStore.getState().archiveAccount;
  const unarchiveAccount = useAccountStore.getState().unarchiveAccount;
  const deleteAccount = useAccountStore.getState().deleteAccount;
  const deleteAccountMovingCommitments = useAccountStore.getState().deleteAccountMovingCommitments;
  const adjustBalance = useAccountStore.getState().adjustBalance;
  const confirmBalanceReviewed = useAccountStore.getState().confirmBalanceReviewed;
  const {
    isEditing,
    isAdjustVisible,
    isArchiveVisible,
    isSaving,
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
    isReplacementVisible,
    replacementAccountId,
    isMovingAndDeleting,
    moveAndDeleteError,
  } = useAccountDetailState(
    useShallow((s) => ({
      isEditing: s.isEditing,
      isAdjustVisible: s.isAdjustVisible,
      isArchiveVisible: s.isArchiveVisible,
      isSaving: s.isSaving,
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
      isReplacementVisible: s.isReplacementVisible,
      replacementAccountId: s.replacementAccountId,
      isMovingAndDeleting: s.isMovingAndDeleting,
      moveAndDeleteError: s.moveAndDeleteError,
    })),
  );
  const setEditing = useAccountDetailState.getState().setEditing;
  const setAdjustVisible = useAccountDetailState.getState().setAdjustVisible;
  const setArchiveVisible = useAccountDetailState.getState().setArchiveVisible;
  const setSaving = useAccountDetailState.getState().setSaving;
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
  const setReplacementVisible = useAccountDetailState.getState().setReplacementVisible;
  const setReplacementAccountId = useAccountDetailState.getState().setReplacementAccountId;
  const setMovingAndDeleting = useAccountDetailState.getState().setMovingAndDeleting;
  const setMoveAndDeleteError = useAccountDetailState.getState().setMoveAndDeleteError;
  const reset = useAccountDetailState.getState().reset;
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
      // Bumps the generation too, so a result racing an archive is dropped (M14).
      useAccountActivityStore.getState().reset();
      useArchivedAccountDetailStore.getState().reset();
    },
    [reset],
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      const currentState = useAccountDetailState.getState();
      if (!currentState.isEditing) return;
      e.preventDefault();
      currentState.setEditing(false);
    });
    return unsubscribe;
  }, [navigation]);

  // HeroUI closes the idle sheet on hardware back; only the busy window must keep the press from the screen.
  useEffect(() => {
    if (!isMovingAndDeleting) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [isMovingAndDeleting]);

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
        category,
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

  const editSchema = useMemo(() => createEditAccountSchema(accounts, id), [accounts, id]);

  const form = useZodForm(editSchema, {
    defaultValues: {
      name: account?.name ?? '',
      color: account?.color ?? DEFAULT_ACCOUNT_COLOR,
    },
  });

  useEffect(() => {
    if (account) {
      form.reset({ name: account.name, color: account.color ?? DEFAULT_ACCOUNT_COLOR });
    }
  }, [account, form]);

  // Nothing on the active detail reads `loadError`, so a landed write over a failed reload pops to the list that does.
  const popIfReloadFailed = () => {
    if (useAccountStore.getState().loadError) router.dismissTo(ACCOUNTS_LIST);
  };

  const handleSave = form.handleSubmit(async (data) => {
    if (!id) return;
    setSaving(true);
    try {
      await updateAccount(id, { name: data.name.trim(), color: data.color });
    } finally {
      setSaving(false);
    }
    // Before the pop: `beforeRemove` cancels a removal while editing.
    setEditing(false);
    popIfReloadFailed();
  });

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
      setMoveAndDeleteError(undefined);
      setReplacementAccountId(replacementOptions[0].id);
      setReplacementVisible(true);
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

  const selectReplacement = (replacementId: string) => {
    if (useAccountDetailState.getState().isMovingAndDeleting) return;
    setReplacementAccountId(replacementId);
  };

  const closeReplacement = () => {
    if (useAccountDetailState.getState().isMovingAndDeleting) return;
    setReplacementVisible(false);
    setMoveAndDeleteError(undefined);
  };

  const handleMoveAndDelete = async () => {
    const detailState = useAccountDetailState.getState();
    if (!archived || detailState.isMovingAndDeleting) return;
    const replacement = replacementOptions.find((a) => a.id === detailState.replacementAccountId);
    if (!replacement) return;
    // Read before the write, which scrubs the name and reloads both lists.
    const name = resolveAccountName(archived.account);
    const replacementName = resolveAccountName(replacement);
    const commitments = archived.activeCommitments;
    setMoveAndDeleteError(undefined);
    setMovingAndDeleting(true);
    try {
      await deleteAccountMovingCommitments(id, replacement.id);
    } catch (error) {
      console.error('[accountDetail] deleteAccountMovingCommitments failed:', error);
      setMoveAndDeleteError(Strings.accountDetailDeleteError);
      return;
    } finally {
      setMovingAndDeleting(false);
    }
    // Outside the try, and the pop before the toast so it lands on the screen the detail came from.
    setReplacementVisible(false);
    router.back();
    toast.show({
      label: resolveMovedToast({ accountName: name, commitments, replacementName }),
      variant: 'success',
    });
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

  const onBack = () => {
    if (isEditing) {
      setEditing(false);
    } else {
      router.back();
    }
  };

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
      isEditing,
      isAdjustVisible,
      isArchiveVisible,
      isSaving,
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
      isReplacementVisible,
      replacementAccountId,
      isMovingAndDeleting,
      moveAndDeleteError,
      replacementOptions,
      hasReplacementAccount,
      activity: { status: activityStatus, rows: activityRows, monthFacts },
    },
    form,
    setEditing,
    handleSave,
    setAdjustVisible,
    handleAdjustBalance,
    setArchiveVisible,
    closeArchive,
    handleArchive,
    handleUnarchive,
    setDeleteVisible,
    closeDelete,
    handleDelete,
    selectReplacement,
    closeReplacement,
    handleMoveAndDelete,
    handleConfirmBalanceReviewed,
    onBack,
    retryActivity,
    retryArchivedRead,
    goToTransaction,
    goToAllTransactions,
    addTransactionForAccount,
  };
}
