import { router } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';

import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useTransactionStore } from '@/store/transaction.store';
import type { Transaction } from '@/database/entities/transaction.entity';
import { formatTime12h } from '@/utils/format_time_12h';
import { formatTransactionTitle } from '@/utils/format_transaction_title';

import { useTxDetailState } from './detail.state';
import { useTxDetailStore } from './detail.store';

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type DetailViewState = 'loading' | 'notFound' | 'ready';

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
  const tx = useTxDetailStore((s) => s.state.tx);
  const setTx = useTxDetailStore((s) => s.setTx);
  const resetData = useTxDetailStore((s) => s.reset);

  const confirmVisible = useTxDetailState((s) => s.state.confirmVisible);
  const setConfirmVisible = useTxDetailState((s) => s.setConfirmVisible);
  const deleting = useTxDetailState((s) => s.state.deleting);
  const setDeleting = useTxDetailState((s) => s.setDeleting);
  const reloadKey = useTxDetailState((s) => s.state.reloadKey);
  const bumpReload = useTxDetailState((s) => s.bumpReload);
  const resetUi = useTxDetailState((s) => s.reset);

  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);
  const getById = useTransactionStore((s) => s.getById);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);

  useEffect(() => {
    let cancelled = false;
    setTx(undefined);
    getById(id)
      .then((t) => {
        if (!cancelled) setTx(t);
      })
      .catch((e) => {
        console.error('[transactionDetail] getById failed', e);
        if (!cancelled) setTx(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id, getById, reloadKey, setTx]);

  useEffect(() => {
    return () => {
      resetData();
      resetUi();
    };
  }, [resetData, resetUi]);

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const viewState: DetailViewState =
    tx === undefined ? 'loading' : tx === null ? 'notFound' : 'ready';

  const derived = useMemo(() => {
    if (!tx) return null;
    const account = accountsById.get(tx.account_id);
    const toAccount = tx.to_account_id ? accountsById.get(tx.to_account_id) : undefined;
    const category = tx.category_id ? categoriesById.get(tx.category_id) : undefined;
    const { title } = formatTransactionTitle({ tx, account, toAccount, category });

    const time = formatTime12h(tx.transaction_time);
    const dateLong = formatLongDate(tx.transaction_date);

    return {
      title,
      amountText: signedAmount(tx),
      dateTimeText: `${dateLong} · ${time}`,
      categoryLabel:
        category?.name ??
        (tx.type === TransactionType.Transfer || tx.type === TransactionType.CCPayment
          ? TYPE_BADGE[tx.type]
          : Strings.uncategorized),
      categoryBadge: TYPE_BADGE[tx.type],
      accountLabel: toAccount
        ? `${account?.name ?? Strings.unknownAccount} → ${toAccount.name}`
        : (account?.name ?? Strings.unknownAccount),
      accountTypeLabel: account ? ACCOUNT_TYPE_LABELS[account.type] : undefined,
      originalAmountText:
        tx.currency === Currency.USD ? `${numberFmt.format(tx.amount)} USD` : undefined,
      exchangeRateText:
        tx.exchange_rate !== null ? `1 USD = ${numberFmt.format(tx.exchange_rate)} EGP` : undefined,
      noteText: tx.note?.trim() || Strings.detailNoteEmpty,
      category,
    };
  }, [tx, accountsById, categoriesById]);

  const openDeleteConfirm = useCallback(() => setConfirmVisible(true), [setConfirmVisible]);
  const closeDeleteConfirm = useCallback(() => {
    if (!deleting) setConfirmVisible(false);
  }, [deleting, setConfirmVisible]);

  const confirmDelete = useCallback(async () => {
    if (!tx) return;
    setDeleting(true);
    try {
      await deleteTransaction(tx.id);
      router.back();
    } catch (e) {
      console.error('[transactionDetail] delete failed', e);
      Alert.alert(Strings.errDeleteFailed);
    } finally {
      setDeleting(false);
      setConfirmVisible(false);
    }
  }, [tx, deleteTransaction, setDeleting, setConfirmVisible]);

  const reload = useCallback(() => bumpReload(), [bumpReload]);

  return {
    state: {
      viewState,
      tx,
      derived,
      confirmVisible,
      deleting,
    },
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    reload,
  };
}
