import { router, useFocusEffect, useNavigation, usePathname } from 'expo-router';
import { useCallback, useEffect, useId, useMemo } from 'react';
import { Alert } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { useAccountActivityStore } from '@/modules/accounts/screens/accounts/detail/account_activity.store';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import {
  findMissingAccountIds,
  getTransactionAccountIds,
  mergeAccountsById,
} from '@/modules/accounts/store/account_lookup.helpers';
import { budgetRepository } from '@/modules/budget/repositories/budget.repository';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { commitmentRepository } from '@/modules/commitments/repositories/commitment.repository';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { stackedPrefixOf } from '@/modules/navigation/domain/stacked_route';
import { useTransactionFormState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { runAfterInteractions } from '@/utils/run_after_interactions';

import { useTransactionDelete } from '../transaction_delete.hook';
import {
  buildTransactionDetailPresentation,
  type DetailActions,
  getCommitmentPaymentRoute,
  resolveDetailActionSet,
  resolveDetailActions,
  resolveDetailViewState,
} from './detail.helpers';
import { INITIAL_UI_ENTRY, useTxDetailState } from './detail.state';
import { INITIAL_DATA_ENTRY, useTxDetailStore } from './detail.store';

const ACCOUNT_DETAIL_ROUTE = 'accounts/[id]/index';

interface NavigatorState {
  index: number;
  routes: readonly { name: string; params?: object }[];
}

/** The account detail this detail pops back to, read from its navigator before the pop. */
function accountIdBelow(state: NavigatorState | undefined): string | undefined {
  if (state === undefined || state.index < 1) return undefined;
  const below = state.routes.at(state.index - 1);
  if (below?.name !== ACCOUNT_DETAIL_ROUTE) return undefined;
  const params: unknown = below.params;
  if (typeof params !== 'object' || params === null || !('id' in params)) return undefined;
  return typeof params.id === 'string' ? params.id : undefined;
}

/** Reloads that account's activity card after the pop; never rejects, so the toast cannot hang. */
function reloadAccountActivityAfterDelete(accountId: string): Promise<void> {
  return new Promise((resolve) => {
    runAfterInteractions(async () => {
      try {
        // The account detail's own focus load joins this request by key, so the card reloads once.
        await useAccountActivityStore.getState().ensure({
          accountId,
          mutationVersion: useTransactionStore.getState().mutationVersion,
          now: new Date(),
        });
      } catch (error) {
        console.error('[transactionDetail] activity reload after delete failed', error);
      } finally {
        resolve();
      }
    });
  });
}

export function useTransactionDetail(id: string) {
  const owner = useId();
  const stackedPrefix = stackedPrefixOf(usePathname());
  const { tx, txId, budget } = useTxDetailStore(
    useShallow((state) => state.entries[owner] ?? INITIAL_DATA_ENTRY),
  );
  const setTx = useTxDetailStore.getState().setTx;
  const setBudget = useTxDetailStore.getState().setBudget;
  const clearForId = useTxDetailStore.getState().clearForId;
  const releaseData = useTxDetailStore.getState().release;
  const { activeId, status, revalidating, refreshError, reloadKey } = useTxDetailState(
    useShallow((s) => s.entries[owner] ?? INITIAL_UI_ENTRY),
  );
  const beginLoad = useTxDetailState.getState().beginLoad;
  const resolve = useTxDetailState.getState().resolve;
  const resolveNotFound = useTxDetailState.getState().resolveNotFound;
  const failLoad = useTxDetailState.getState().failLoad;
  const bumpReload = useTxDetailState.getState().bumpReload;
  const releaseUi = useTxDetailState.getState().release;

  const getById = useTransactionStore.getState().getById;

  const { accounts, archivedAccounts, accountLookupById, accountLookupError } = useAccountStore(
    useShallow((s) => ({
      accounts: s.accounts,
      archivedAccounts: s.archivedAccounts,
      accountLookupById: s.accountLookupById,
      accountLookupError: s.accountLookupError,
    })),
  );
  const loadAccountLookup = useAccountStore.getState().loadAccountLookup;
  const categories = useCategoryStore.useState.categories();
  const loadingTransactionHint = useMemo(
    () => useTransactionStore.getState().transactions.find((transaction) => transaction.id === id),
    [id],
  );

  useEffect(() => {
    let cancelled = false;
    const entry = useTxDetailStore.getState().entries[owner] ?? INITIAL_DATA_ENTRY;
    const preserveData = entry.txId === id && entry.tx !== null;
    if (!preserveData) clearForId(owner, id);
    beginLoad(owner, id, preserveData);
    // Stamped before the read, so a write that lands mid-read leaves this snapshot stale.
    const loadedAtVersion = useTransactionStore.getState().mutationVersion;
    getById(id)
      .then((transaction) => {
        if (cancelled) return;
        if (!transaction) {
          clearForId(owner, id);
          resolveNotFound(owner, id);
          return;
        }
        setTx(owner, id, transaction, loadedAtVersion);
        resolve(owner, id);

        const accountIds = getTransactionAccountIds(transaction);
        try {
          void Promise.resolve(loadAccountLookup(accountIds)).catch((error) => {
            console.error('[transactionDetail] account lookup failed', error);
          });
        } catch (error) {
          console.error('[transactionDetail] account lookup failed', error);
        }

        if (transaction.budget_id) {
          const budgetId = transaction.budget_id;
          try {
            void Promise.resolve(budgetRepository.getById(budgetId))
              .then((resolvedBudget) => {
                if (!cancelled) setBudget(owner, id, budgetId, resolvedBudget);
              })
              .catch((error) => {
                console.error('[transactionDetail] budget lookup failed', error);
              });
          } catch (error) {
            console.error('[transactionDetail] budget lookup failed', error);
          }
        }
      })
      .catch((e) => {
        console.error('[transactionDetail] getById failed', e);
        if (!cancelled) failLoad(owner, id, preserveData);
      });
    return () => {
      cancelled = true;
    };
  }, [
    beginLoad,
    clearForId,
    failLoad,
    getById,
    id,
    loadAccountLookup,
    owner,
    reloadKey,
    resolve,
    resolveNotFound,
    setBudget,
    setTx,
  ]);

  const ownsRoute = txId === id;
  const currentTx = ownsRoute ? tx : null;
  const currentStatus = activeId === id ? status : 'initialLoading';

  // A copy re-queries on return only when it holds no claim on the route, or a write landed since its snapshot.
  useFocusEffect(
    useCallback(() => {
      const entry = useTxDetailStore.getState().entries[owner] ?? INITIAL_DATA_ENTRY;
      if (entry.txId !== id) {
        bumpReload(owner);
        return;
      }
      if (entry.tx === null) return;
      if (entry.loadedAtVersion !== useTransactionStore.getState().mutationVersion) {
        bumpReload(owner);
      }
    }, [bumpReload, id, owner]),
  );

  useEffect(() => {
    return () => {
      releaseData(owner);
      releaseUi(owner);
    };
  }, [owner, releaseData, releaseUi]);

  const accountsById = useMemo(
    () => mergeAccountsById(accounts, archivedAccounts, accountLookupById),
    [accountLookupById, accounts, archivedAccounts],
  );
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const navigation = useNavigation();
  const popAfterDelete = useCallback(async () => {
    const accountId = accountIdBelow(navigation.getState());
    router.back();
    if (accountId !== undefined) await reloadAccountActivityAfterDelete(accountId);
  }, [navigation]);
  const {
    state: deleteState,
    request: requestDelete,
    cancel: closeDeleteConfirm,
    confirm: confirmDelete,
  } = useTransactionDelete(owner, accountsById, popAfterDelete);

  const currentRevalidating = activeId === id && revalidating;
  const hasUnresolvedAccount =
    currentTx !== null &&
    findMissingAccountIds(getTransactionAccountIds(currentTx), accountsById).length > 0;
  const currentRefreshError =
    (activeId === id && refreshError) || (accountLookupError && hasUnresolvedAccount);
  const viewState = resolveDetailViewState(
    currentStatus,
    currentTx !== null,
    currentRevalidating,
    currentRefreshError,
  );
  const commitmentPaymentId = currentTx?.commitment_payment_id ?? undefined;
  const actions: DetailActions = currentTx
    ? resolveDetailActions(currentTx, accountsById)
    : { actionSet: 'editDelete' };
  const loadingActionSet = loadingTransactionHint
    ? resolveDetailActionSet(loadingTransactionHint, accountsById)
    : 'editDelete';
  const isMutable = actions.actionSet === 'editDelete';

  const derived = useMemo(() => {
    if (!currentTx) return null;
    const account = accountsById.get(currentTx.account_id);
    const toAccount = currentTx.to_account_id
      ? accountsById.get(currentTx.to_account_id)
      : undefined;
    const category = currentTx.category_id ? categoriesById.get(currentTx.category_id) : undefined;
    return buildTransactionDetailPresentation({
      tx: currentTx,
      account,
      toAccount,
      category,
      budget,
    });
  }, [accountsById, budget, categoriesById, currentTx]);

  const openDeleteConfirm = useCallback(() => {
    if (currentTx !== null && isMutable) requestDelete(currentTx);
  }, [currentTx, isMutable, requestDelete]);

  const openCommitment = useCallback(async () => {
    if (!commitmentPaymentId) return;
    try {
      const payment = await commitmentRepository.getPaymentById(commitmentPaymentId);
      if (!payment) {
        Alert.alert(Strings.commitmentsDetailNotFound);
        return;
      }
      const commitmentState = useCommitmentStore.getState();
      await commitmentState.setSelectedMonth(payment.due_date.slice(0, 7));
      // The route's own id, not currentTx.id: POP_TO overwrites the target's params with this value.
      router.push(getCommitmentPaymentRoute(commitmentPaymentId, stackedPrefix, id));
    } catch (error) {
      console.error('[transactionDetail] open commitment failed', error);
      Alert.alert(Strings.commitmentsDetailNotFound);
    }
  }, [commitmentPaymentId, stackedPrefix, id]);

  const reload = useCallback(() => bumpReload(owner), [bumpReload, owner]);
  const goBack = useCallback(() => router.back(), []);
  const openAccount = useCallback((accountId: string) => {
    router.push(`/accounts/${accountId}`);
  }, []);
  const openEdit = useCallback(() => {
    if (!currentTx || !isMutable) return;
    useTransactionFormState.getState().openEdit(currentTx, reload);
  }, [currentTx, isMutable, reload]);

  return {
    state: {
      viewState,
      loadingTransactionHint,
      tx: currentTx,
      derived,
      revalidating: currentRevalidating,
      refreshError: currentRefreshError,
      confirmVisible: deleteState.openTransactionId !== undefined,
      deleteBody: deleteState.body,
      deleteBusy: deleteState.busy,
      deleteErrorMessage: deleteState.errorMessage,
      actions,
      loadingActionSet,
      isEditable: isMutable,
      isDeletable: isMutable,
    },
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    openCommitment,
    goBack,
    openAccount,
    openEdit,
    reload,
  };
}
