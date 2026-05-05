import { router } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

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
  const {
    state: txDetailDataState,
    setTx,
    resetData,
  } = useTxDetailStore(useShallow((s) => ({ state: s.state, setTx: s.setTx, resetData: s.reset })));
  const {
    state: txDetailUiState,
    setConfirmVisible,
    setDeleting,
    bumpReload,
    resetUi,
  } = useTxDetailState(
    useShallow((s) => ({
      state: s.state,
      setConfirmVisible: s.setConfirmVisible,
      setDeleting: s.setDeleting,
      bumpReload: s.bumpReload,
      resetUi: s.reset,
    })),
  );

  const { getById, deleteTransaction } = useTransactionStore(
    useShallow((s) => ({ getById: s.getById, deleteTransaction: s.deleteTransaction })),
  );

  const accounts = useAccountStore((s) => s.state.accounts);
  const categories = useCategoryStore((s) => s.state.categories);

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
  }, [id, getById, txDetailUiState.reloadKey, setTx]);

  useEffect(() => {
    return () => {
      resetData();
      resetUi();
    };
  }, [resetData, resetUi]);

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const viewState: DetailViewState =
    txDetailDataState.tx === undefined
      ? 'loading'
      : txDetailDataState.tx === null
        ? 'notFound'
        : 'ready';

  const derived = useMemo(() => {
    if (!txDetailDataState.tx) return null;
    const account = accountsById.get(txDetailDataState.tx.account_id);
    const toAccount = txDetailDataState.tx.to_account_id
      ? accountsById.get(txDetailDataState.tx.to_account_id)
      : undefined;
    const category = txDetailDataState.tx.category_id
      ? categoriesById.get(txDetailDataState.tx.category_id)
      : undefined;
    const { title } = formatTransactionTitle({
      tx: txDetailDataState.tx,
      account,
      toAccount,
      category,
    });

    const time = formatTime12h(txDetailDataState.tx.transaction_time);
    const dateLong = formatLongDate(txDetailDataState.tx.transaction_date);

    return {
      title,
      amountText: signedAmount(txDetailDataState.tx),
      dateTimeText: `${dateLong} · ${time}`,
      categoryLabel:
        category?.name ??
        (txDetailDataState.tx.type === TransactionType.Transfer ||
        txDetailDataState.tx.type === TransactionType.CCPayment
          ? TYPE_BADGE[txDetailDataState.tx.type]
          : Strings.uncategorized),
      categoryBadge: TYPE_BADGE[txDetailDataState.tx.type],
      accountLabel: toAccount
        ? `${account?.name ?? Strings.unknownAccount} → ${toAccount.name}`
        : (account?.name ?? Strings.unknownAccount),
      accountTypeLabel: account ? ACCOUNT_TYPE_LABELS[account.type] : undefined,
      originalAmountText:
        txDetailDataState.tx.currency === Currency.USD
          ? `${numberFmt.format(txDetailDataState.tx.amount)} USD`
          : undefined,
      exchangeRateText:
        txDetailDataState.tx.exchange_rate !== null
          ? `1 USD = ${numberFmt.format(txDetailDataState.tx.exchange_rate)} EGP`
          : undefined,
      noteText: txDetailDataState.tx.note?.trim() || Strings.detailNoteEmpty,
      category,
    };
  }, [txDetailDataState.tx, accountsById, categoriesById]);

  const openDeleteConfirm = useCallback(() => setConfirmVisible(true), [setConfirmVisible]);
  const closeDeleteConfirm = useCallback(() => {
    if (!txDetailUiState.deleting) setConfirmVisible(false);
  }, [txDetailUiState.deleting, setConfirmVisible]);

  const confirmDelete = useCallback(async () => {
    if (!txDetailDataState.tx) return;
    setDeleting(true);
    try {
      await deleteTransaction(txDetailDataState.tx.id);
      router.back();
    } catch (e) {
      console.error('[transactionDetail] delete failed', e);
      Alert.alert(Strings.errDeleteFailed);
    } finally {
      setDeleting(false);
      setConfirmVisible(false);
    }
  }, [txDetailDataState.tx, deleteTransaction, setDeleting, setConfirmVisible]);

  const reload = useCallback(() => bumpReload(), [bumpReload]);

  return {
    state: {
      viewState,
      tx: txDetailDataState.tx,
      derived,
      confirmVisible: txDetailUiState.confirmVisible,
      deleting: txDetailUiState.deleting,
    },
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    reload,
  };
}
