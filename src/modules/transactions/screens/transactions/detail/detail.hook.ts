import { router } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { budgetRepository } from '@/modules/budget/repositories/budget.repository';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { commitmentRepository } from '@/modules/commitments/repositories/commitment.repository';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';

import { buildTransactionDetailPresentation, getCommitmentPaymentRoute } from './detail.helpers';
import { useTxDetailState } from './detail.state';
import { useTxDetailStore } from './detail.store';

export type DetailViewState = 'loading' | 'notFound' | 'error' | 'ready';

export function useTransactionDetail(id: string) {
  const { tx, txId, budget } = useTxDetailStore(
    useShallow((state) => ({ tx: state.tx, txId: state.txId, budget: state.budget })),
  );
  const setTx = useTxDetailStore.getState().setTx;
  const clearForId = useTxDetailStore.getState().clearForId;
  const resetData = useTxDetailStore.getState().reset;
  const { activeId, status, revalidating, refreshError, confirmVisible, deleting, reloadKey } =
    useTxDetailState(
      useShallow((s) => ({
        activeId: s.activeId,
        status: s.status,
        revalidating: s.revalidating,
        refreshError: s.refreshError,
        confirmVisible: s.confirmVisible,
        deleting: s.deleting,
        reloadKey: s.reloadKey,
      })),
    );
  const beginLoad = useTxDetailState.getState().beginLoad;
  const resolve = useTxDetailState.getState().resolve;
  const resolveNotFound = useTxDetailState.getState().resolveNotFound;
  const failLoad = useTxDetailState.getState().failLoad;
  const setConfirmVisible = useTxDetailState.getState().setConfirmVisible;
  const setDeleting = useTxDetailState.getState().setDeleting;
  const bumpReload = useTxDetailState.getState().bumpReload;
  const resetUi = useTxDetailState.getState().reset;

  const getById = useTransactionStore.getState().getById;
  const deleteTransaction = useTransactionStore.getState().deleteTransaction;

  const { accounts, accountLookup } = useAccountStore(
    useShallow((s) => ({ accounts: s.accounts, accountLookup: s.accountLookup })),
  );
  const loadAccountLookup = useAccountStore.getState().loadAccountLookup;
  const categories = useCategoryStore.useState.categories();

  useEffect(() => {
    let cancelled = false;
    const detailStore = useTxDetailStore.getState();
    const preserveData = detailStore.txId === id && detailStore.tx !== null;
    if (!preserveData) clearForId(id);
    beginLoad(id, preserveData);
    getById(id)
      .then(async (transaction) => {
        if (cancelled) return;
        if (!transaction) {
          clearForId(id);
          resolveNotFound(id);
          return;
        }
        const accountIds = transaction.to_account_id
          ? [transaction.account_id, transaction.to_account_id]
          : [transaction.account_id];
        const [, resolvedBudget] = await Promise.all([
          loadAccountLookup(accountIds).catch((error) => {
            console.error('[transactionDetail] account lookup failed', error);
          }),
          transaction.budget_id
            ? budgetRepository.getById(transaction.budget_id).catch((error) => {
                console.error('[transactionDetail] budget lookup failed', error);
                return undefined;
              })
            : Promise.resolve(undefined),
        ]);
        // oxlint-disable-next-line typescript/no-unnecessary-condition -- effect cleanup can flip the flag while metadata awaits
        if (cancelled) return;
        setTx(id, transaction, resolvedBudget);
        resolve(id);
      })
      .catch((e) => {
        console.error('[transactionDetail] getById failed', e);
        if (!cancelled) failLoad(id, preserveData);
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
    reloadKey,
    resolve,
    resolveNotFound,
    setTx,
  ]);

  const ownsRoute = txId === id;
  const currentTx = ownsRoute ? tx : null;
  const currentStatus = activeId === id ? status : 'initialLoading';

  useEffect(() => {
    return () => {
      resetData();
      resetUi();
    };
  }, [resetData, resetUi]);

  const accountsById = useMemo(
    () => new Map([...accounts, ...accountLookup].map((account) => [account.id, account])),
    [accountLookup, accounts],
  );
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const viewState: DetailViewState =
    currentStatus === 'notFound'
      ? 'notFound'
      : currentStatus === 'firstLoadError'
        ? 'error'
        : currentStatus === 'ready' && currentTx
          ? 'ready'
          : 'loading';
  const commitmentPaymentId = currentTx?.commitment_payment_id ?? undefined;
  const isCommitmentOwned = commitmentPaymentId !== undefined;

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
    if (!isCommitmentOwned) setConfirmVisible(true);
  }, [isCommitmentOwned, setConfirmVisible]);
  const closeDeleteConfirm = useCallback(() => {
    if (!deleting) setConfirmVisible(false);
  }, [deleting, setConfirmVisible]);

  const confirmDelete = useCallback(async () => {
    if (!currentTx || isCommitmentOwned) return;
    setDeleting(true);
    try {
      await deleteTransaction(currentTx.id);
      router.back();
    } catch (e) {
      console.error('[transactionDetail] delete failed', e);
      Alert.alert(Strings.errDeleteFailed);
    } finally {
      setDeleting(false);
      setConfirmVisible(false);
    }
  }, [currentTx, isCommitmentOwned, deleteTransaction, setDeleting, setConfirmVisible]);

  const openCommitment = useCallback(async () => {
    if (!commitmentPaymentId) return;
    try {
      const payment = await commitmentRepository.getPaymentById(commitmentPaymentId);
      if (!payment) {
        Alert.alert(Strings.commitmentsDetailNotFound);
        return;
      }
      const { loadCommitments, setSelectedMonth } = useCommitmentStore.getState();
      await Promise.all([loadCommitments(), setSelectedMonth(payment.due_date.slice(0, 7))]);
      router.push(getCommitmentPaymentRoute(commitmentPaymentId));
    } catch (error) {
      console.error('[transactionDetail] open commitment failed', error);
      Alert.alert(Strings.commitmentsDetailNotFound);
    }
  }, [commitmentPaymentId]);

  const reload = useCallback(() => bumpReload(), [bumpReload]);

  return {
    state: {
      viewState,
      tx: currentTx,
      derived,
      revalidating: activeId === id && revalidating,
      refreshError: activeId === id && refreshError,
      confirmVisible,
      deleting,
      isCommitmentOwned,
      isEditable: !isCommitmentOwned,
      isDeletable: !isCommitmentOwned,
    },
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    openCommitment,
    reload,
  };
}
