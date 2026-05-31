import { router } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { EMPTY_ACCOUNTS, useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { formatTime12h } from '@/utils/format_time_12h';
import { formatTransactionTitle } from '@/utils/format_transaction_title';

import type { BadgeTone } from './components/detail_row';
import { getAccountTypeIcon } from './detail.helpers';
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
  const tx = useTxDetailStore.useState.tx();
  const setTx = useTxDetailStore.getState().setTx;
  const resetData = useTxDetailStore.getState().reset;
  const { confirmVisible, deleting, reloadKey } = useTxDetailState(
    useShallow((s) => ({
      confirmVisible: s.confirmVisible,
      deleting: s.deleting,
      reloadKey: s.reloadKey,
    })),
  );
  const setConfirmVisible = useTxDetailState.getState().setConfirmVisible;
  const setDeleting = useTxDetailState.getState().setDeleting;
  const bumpReload = useTxDetailState.getState().bumpReload;
  const resetUi = useTxDetailState.getState().reset;

  const getById = useTransactionStore.getState().getById;
  const deleteTransaction = useTransactionStore.getState().deleteTransaction;

  const { state: accountsState } = useAccountStore();
  const accounts = accountsState.accounts.value ?? EMPTY_ACCOUNTS;
  const categories = useCategoryStore.useState.categories();

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
    const { title } = formatTransactionTitle({
      tx,
      account,
      toAccount,
      category,
    });

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
      categoryBadgeTone: TYPE_BADGE_TONE[tx.type],
      accountLabel: toAccount
        ? `${account?.name ?? Strings.unknownAccount} → ${toAccount.name}`
        : (account?.name ?? Strings.unknownAccount),
      accountTypeLabel: account ? ACCOUNT_TYPE_LABELS[account.type] : undefined,
      accountIcon: getAccountTypeIcon(account?.type),
      originalAmountText:
        tx.currency === Currency.USD ? `${numberFmt.format(tx.amount)} USD` : undefined,
      exchangeRateText:
        tx.exchange_rate !== null ? `1 USD = ${numberFmt.format(tx.exchange_rate)} EGP` : undefined,
      // oxlint-disable-next-line typescript/prefer-nullish-coalescing -- || is intentional: empty string falls back to the 'No note' label
      noteText: tx.note?.trim() || Strings.detailNoteEmpty,
      category,
      isTransferLike: tx.type === TransactionType.Transfer || tx.type === TransactionType.CCPayment,
      transferFlow:
        (tx.type === TransactionType.Transfer || tx.type === TransactionType.CCPayment) &&
        account &&
        toAccount
          ? {
              fromAccount: account,
              toAccount,
              fromAmount: tx.amount,
              fromCurrency: tx.currency,
              toAmount: tx.to_amount ?? tx.egp_amount,
              toCurrency: toAccount.currency,
            }
          : null,
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
