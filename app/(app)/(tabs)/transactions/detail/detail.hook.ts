import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useTransactionStore } from '@/store/transaction.store';
import type { Transaction } from '@/database/entities/transaction.entity';
import { formatTime12h } from '@/utils/format_time_12h';
import { formatTransactionTitle } from '@/utils/format_transaction_title';

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type DetailState = 'loading' | 'notFound' | 'ready';

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
  const [tx, setTx] = useState<Transaction | null | undefined>(undefined);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);
  const getById = useTransactionStore((s) => s.getById);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);

  useEffect(() => {
    let cancelled = false;
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
  }, [id, getById, reloadKey]);

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const state: DetailState = tx === undefined ? 'loading' : tx === null ? 'notFound' : 'ready';

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
      categoryLabel: category?.name ?? Strings.uncategorized,
      categoryBadge: TYPE_BADGE[tx.type],
      accountLabel: toAccount
        ? `${account?.name ?? Strings.unknownAccount} → ${toAccount.name}`
        : (account?.name ?? Strings.unknownAccount),
      accountTypeLabel: account ? ACCOUNT_TYPE_LABELS[account.type] : undefined,
      exchangeRateText:
        tx.exchange_rate !== null ? `1 USD = ${numberFmt.format(tx.exchange_rate)} EGP` : undefined,
      noteText: tx.note?.trim() || Strings.detailNoteEmpty,
      category,
    };
  }, [tx, accountsById, categoriesById]);

  const openDeleteConfirm = useCallback(() => setConfirmVisible(true), []);
  const closeDeleteConfirm = useCallback(() => {
    if (!deleting) setConfirmVisible(false);
  }, [deleting]);

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
  }, [tx, deleteTransaction]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return {
    state,
    tx,
    derived,
    confirmVisible,
    deleting,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    reload,
  };
}
