import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type React from 'react';

import { CURRENCY_CONFIG } from '@/constants/currency';
import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import {
  EXCHANGE_RATE_DECIMALS,
  MINUS_SIGN,
  PLUS_SIGN,
  formatAmount,
  formatCurrencyAmount,
  formatDisplayMagnitude,
  signAmountText,
} from '@/utils/format_amount';
import { formatTime12h } from '@/utils/format_time_12h';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export const TRANSACTION_ROW_ICON_SIZE = ms(36);
export const TRANSACTION_ROW_VALUE_WIDTH = ms(120);
export const TRANSACTION_ROW_HEIGHT = ms(60);
export const TRANSACTION_ROW_OPTIONAL_TRACK_HEIGHT = ms(8);

const FALLBACK_ICON: IconName = 'shape-outline';

export interface TransactionRowPresentationInput {
  tx: Transaction;
  account?: Account;
  toAccount?: Account;
  category?: Category;
}

export interface TransactionRowPresentation {
  title: string;
  context: string;
  primaryAmount: string;
  secondaryAmount?: string;
  rateText?: string;
  note?: string;
  ownershipLabel?: string;
  isCommitmentOwned: boolean;
  iconName: IconName;
  amountClassName: string;
  iconBackgroundClassName: string;
  timeText: string;
  accessibilityLabel: string;
}

function isCardCredit(tx: Transaction, account?: Account): boolean {
  return tx.type === TransactionType.Income && account?.type === AccountType.CreditCard;
}

function titleFor(tx: Transaction, account?: Account, category?: Category): string {
  if (isCardCredit(tx, account)) return Strings.cardCreditTitle;
  if (tx.type === TransactionType.Transfer) return Strings.transferTitle;
  if (tx.type === TransactionType.CCPayment) return Strings.addTxTypeCCPayment;
  return category?.name ?? Strings.uncategorized;
}

function contextFor(
  tx: Transaction,
  account?: Account,
  toAccount?: Account,
  category?: Category,
): string {
  const sourceName = account?.name ?? Strings.unknownAccount;
  if (isCardCredit(tx, account)) {
    return `${category?.name ?? Strings.uncategorized} · ${sourceName}`;
  }
  if (tx.type === TransactionType.Transfer || tx.type === TransactionType.CCPayment) {
    return `${sourceName} → ${toAccount?.name ?? Strings.unknownAccount}`;
  }
  return sourceName;
}

function primaryAmountFor(tx: Transaction, cardCredit: boolean): string {
  const sign =
    tx.type === TransactionType.Expense
      ? MINUS_SIGN
      : tx.type === TransactionType.Income
        ? PLUS_SIGN
        : '';
  const { text, printsAsZero } = formatDisplayMagnitude(tx.amount, tx.currency);
  const value = `${text} ${CURRENCY_CONFIG[tx.currency].code}`;
  return signAmountText(value, cardCredit ? PLUS_SIGN : sign, printsAsZero);
}

function destinationAmountFor(tx: Transaction, toAccount?: Account): string | undefined {
  if (tx.type !== TransactionType.Transfer && tx.type !== TransactionType.CCPayment) {
    if (tx.currency === Currency.EGP) return undefined;
    return `≈ ${formatCurrencyAmount(tx.egp_amount, Currency.EGP)}`;
  }
  if (tx.to_amount === null) return undefined;
  return `→ ${formatCurrencyAmount(tx.to_amount, toAccount?.currency ?? Currency.EGP)}`;
}

function amountClassNameFor(tx: Transaction, cardCredit: boolean): string {
  if (cardCredit) return 'text-info';
  if (tx.type === TransactionType.Income) return 'text-success';
  if (tx.type === TransactionType.Expense) return 'text-danger';
  if (tx.type === TransactionType.Transfer) return 'text-info';
  return 'text-accent-cc';
}

function iconBackgroundClassNameFor(tx: Transaction, cardCredit: boolean): string {
  if (cardCredit) return 'bg-info/15';
  if (tx.type === TransactionType.Income) return 'bg-success/15';
  if (tx.type === TransactionType.Expense) return 'bg-danger/15';
  if (tx.type === TransactionType.Transfer) return 'bg-info/15';
  return 'bg-accent-cc/15';
}

function iconFor(tx: Transaction, cardCredit: boolean, category?: Category): IconName {
  if (cardCredit) return 'credit-card-refund';
  if (tx.type === TransactionType.Transfer) return 'swap-horizontal';
  if (tx.type === TransactionType.CCPayment) return 'credit-card-refund';
  return toIconName(category?.icon, FALLBACK_ICON);
}

export function buildTransactionRowPresentation({
  tx,
  account,
  toAccount,
  category,
}: TransactionRowPresentationInput): TransactionRowPresentation {
  const cardCredit = isCardCredit(tx, account);
  const title = titleFor(tx, account, category);
  const context = contextFor(tx, account, toAccount, category);
  const primaryAmount = primaryAmountFor(tx, cardCredit);
  const secondaryAmount = destinationAmountFor(tx, toAccount);
  const ownershipLabel =
    tx.commitment_payment_id !== null
      ? Strings.typeBadgeCommitment
      : tx.budget_id !== null
        ? Strings.transactionBudgetAssigned
        : undefined;
  const timeText = formatTime12h(tx.transaction_time);

  return {
    title,
    context,
    primaryAmount,
    secondaryAmount,
    rateText:
      tx.exchange_rate === null
        ? undefined
        : `@ ${formatAmount(tx.exchange_rate, EXCHANGE_RATE_DECIMALS)}`,
    // oxlint-disable-next-line typescript/prefer-nullish-coalescing -- blank notes are intentionally omitted
    note: tx.note?.trim() || undefined,
    ownershipLabel,
    isCommitmentOwned: tx.commitment_payment_id !== null,
    iconName: iconFor(tx, cardCredit, category),
    amountClassName: amountClassNameFor(tx, cardCredit),
    iconBackgroundClassName: iconBackgroundClassNameFor(tx, cardCredit),
    timeText,
    accessibilityLabel: [title, context, primaryAmount, secondaryAmount, ownershipLabel]
      .filter((value): value is string => value !== undefined)
      .join(', '),
  };
}
