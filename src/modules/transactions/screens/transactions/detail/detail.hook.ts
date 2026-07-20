import { router } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { commitmentRepository } from '@/modules/commitments/repositories/commitment.repository';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { formatTime12h } from '@/utils/format_time_12h';
import { formatTransactionTitle } from '@/utils/format_transaction_title';

import type { BadgeTone } from './components/detail_row';
import { getAccountTypeIcon, getCommitmentPaymentRoute } from './detail.helpers';
import { useTxDetailState } from './detail.state';
import { useTxDetailStore } from './detail.store';

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type DetailViewState = 'loading' | 'notFound' | 'error' | 'ready';

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: Strings.typeBank,
  smart_wallet: Strings.typeSmartWallet,
  physical_wallet: Strings.typePhysicalWallet,
  physical_savings: Strings.typePhysicalSavings,
  credit_card: Strings.typeCreditCard,
};

const TYPE_BADGE: Record<TransactionType, string> = {
  [TransactionType.Expense]: Strings.typeBadgeExpense,
  [TransactionType.Income]: Strings.typeBadgeIncome,
  [TransactionType.Transfer]: Strings.typeBadgeTransfer,
  [TransactionType.CCPayment]: Strings.typeBadgeCcPayment,
};

/**
 * Maps each transaction type to its §7 four-type colour tone. Drives the
 * category row's badge tint (Expense=red, Income=green, Transfer=blue,
 * CCPayment=purple) so the detail screen tells the same colour story as
 * the list rows and the Add Transaction form.
 */
const TYPE_BADGE_TONE: Record<TransactionType, BadgeTone> = {
  [TransactionType.Expense]: 'danger',
  [TransactionType.Income]: 'success',
  [TransactionType.Transfer]: 'info',
  [TransactionType.CCPayment]: 'accent-cc',
};

function formatLongDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

function signedAmount(tx: Transaction): string {
  const num = numberFmt.format(tx.egp_amount);
  if (tx.type === TransactionType.Expense) return `−${num} EGP`;
  if (tx.type === TransactionType.Income) return `+${num} EGP`;
  return `${num} EGP`;
}

export function useTransactionDetail(id: string) {
  const { tx, txId } = useTxDetailStore(
    useShallow((state) => ({ tx: state.tx, txId: state.txId })),
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
      .then((transaction) => {
        if (cancelled) return;
        if (!transaction) {
          clearForId(id);
          resolveNotFound(id);
          return;
        }
        setTx(id, transaction);
        resolve(id);
      })
      .catch((e) => {
        console.error('[transactionDetail] getById failed', e);
        if (!cancelled) failLoad(id, preserveData);
      });
    return () => {
      cancelled = true;
    };
  }, [beginLoad, clearForId, failLoad, getById, id, reloadKey, resolve, resolveNotFound, setTx]);

  const ownsRoute = txId === id;
  const currentTx = ownsRoute ? tx : null;
  const currentStatus = activeId === id ? status : 'initialLoading';

  useEffect(() => {
    const ids = currentTx
      ? currentTx.to_account_id
        ? [currentTx.account_id, currentTx.to_account_id]
        : [currentTx.account_id]
      : [];
    void loadAccountLookup(ids).catch(() => {});
  }, [currentTx, loadAccountLookup]);

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
    const { title } = formatTransactionTitle({
      tx: currentTx,
      account,
      toAccount,
      category,
    });

    const time = formatTime12h(currentTx.transaction_time);
    const dateLong = formatLongDate(currentTx.transaction_date);

    return {
      title,
      amountText: signedAmount(currentTx),
      dateTimeText: `${dateLong} · ${time}`,
      categoryLabel:
        category?.name ??
        (currentTx.type === TransactionType.Transfer || currentTx.type === TransactionType.CCPayment
          ? TYPE_BADGE[currentTx.type]
          : Strings.uncategorized),
      categoryBadge: TYPE_BADGE[currentTx.type],
      categoryBadgeTone: TYPE_BADGE_TONE[currentTx.type],
      accountLabel: toAccount
        ? `${account?.name ?? Strings.unknownAccount} → ${toAccount.name}`
        : (account?.name ?? Strings.unknownAccount),
      accountTypeLabel: account ? ACCOUNT_TYPE_LABELS[account.type] : undefined,
      accountIcon: getAccountTypeIcon(account?.type),
      originalAmountText:
        currentTx.currency === Currency.USD
          ? `${numberFmt.format(currentTx.amount)} USD`
          : undefined,
      exchangeRateText:
        currentTx.exchange_rate !== null
          ? `1 USD = ${numberFmt.format(currentTx.exchange_rate)} EGP`
          : undefined,
      // oxlint-disable-next-line typescript/prefer-nullish-coalescing -- || is intentional: empty string falls back to the 'No note' label
      noteText: currentTx.note?.trim() || Strings.detailNoteEmpty,
      category,
      isTransferLike:
        currentTx.type === TransactionType.Transfer || currentTx.type === TransactionType.CCPayment,
      transferFlow:
        (currentTx.type === TransactionType.Transfer ||
          currentTx.type === TransactionType.CCPayment) &&
        account &&
        toAccount
          ? {
              fromAccount: account,
              toAccount,
              fromAmount: currentTx.amount,
              fromCurrency: currentTx.currency,
              toAmount: currentTx.to_amount ?? currentTx.egp_amount,
              toCurrency: toAccount.currency,
            }
          : null,
    };
  }, [accountsById, categoriesById, currentTx]);

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
