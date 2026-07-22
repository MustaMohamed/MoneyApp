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
import { useTransactionFormState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';

import {
  buildTransactionDetailPresentation,
  getCommitmentPaymentRoute,
  resolveDetailViewState,
} from './detail.helpers';
import { useTxDetailState } from './detail.state';
import { useTxDetailStore } from './detail.store';

export function useTransactionDetail(id: string) {
  const { tx, txId, budget } = useTxDetailStore(
    useShallow((state) => ({ tx: state.tx, txId: state.txId, budget: state.budget })),
  );
  const setTx = useTxDetailStore.getState().setTx;
  const setBudget = useTxDetailStore.getState().setBudget;
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
  const loadingTransactionHint = useMemo(
    () => useTransactionStore.getState().transactions.find((transaction) => transaction.id === id),
    [id],
  );

  useEffect(() => {
    let cancelled = false;
    const detailStore = useTxDetailStore.getState();
    const preserveData = detailStore.txId === id && detailStore.tx !== null;
    if (!preserveData) clearForId(id);
    beginLoad(id, preserveData);
    getById(id)
      .then((transaction) => {
        if (cancelled) return;
        if (!transaction) {
          clearForId(id);
          resolveNotFound(id);
          return;
        }
        setTx(id, transaction);
        resolve(id);

        const accountIds = transaction.to_account_id
          ? [transaction.account_id, transaction.to_account_id]
          : [transaction.account_id];
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
                if (!cancelled) setBudget(id, budgetId, resolvedBudget);
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
    setBudget,
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

  const currentRevalidating = activeId === id && revalidating;
  const currentRefreshError = activeId === id && refreshError;
  const viewState = resolveDetailViewState(
    currentStatus,
    currentTx !== null,
    currentRevalidating,
    currentRefreshError,
  );
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
      const commitmentState = useCommitmentStore.getState();
      await Promise.all([
        commitmentState.loadCommitments(),
        commitmentState.setSelectedMonth(payment.due_date.slice(0, 7)),
      ]);
      router.push(getCommitmentPaymentRoute(commitmentPaymentId));
    } catch (error) {
      console.error('[transactionDetail] open commitment failed', error);
      Alert.alert(Strings.commitmentsDetailNotFound);
    }
  }, [commitmentPaymentId]);

  const reload = useCallback(() => bumpReload(), [bumpReload]);
  const goBack = useCallback(() => router.back(), []);
  const openAccount = useCallback((accountId: string) => {
    router.push(`/accounts/${accountId}`);
  }, []);
  const openEdit = useCallback(() => {
    if (!currentTx || isCommitmentOwned) return;
    useTransactionFormState.getState().openEdit(currentTx, reload);
  }, [currentTx, isCommitmentOwned, reload]);

  return {
    state: {
      viewState,
      loadingTransactionHint,
      tx: currentTx,
      derived,
      revalidating: currentRevalidating,
      refreshError: currentRefreshError,
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
    goBack,
    openAccount,
    openEdit,
    reload,
  };
}
