import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type React from 'react';

import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AccentCCTokens, InfoTokens, SemanticTokens } from '@/constants/theme_tokens';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { formatLongDate } from '@/utils/format_date';
import { formatTime12h } from '@/utils/format_time_12h';
import { formatTransactionTitle } from '@/utils/format_transaction_title';

import type { BadgeTone } from './components/detail_row';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.Bank]: Strings.typeBank,
  [AccountType.SmartWallet]: Strings.typeSmartWallet,
  [AccountType.PhysicalWallet]: Strings.typePhysicalWallet,
  [AccountType.PhysicalSavings]: Strings.typePhysicalSavings,
  [AccountType.CreditCard]: Strings.typeCreditCard,
};

const TYPE_BADGE: Record<TransactionType, string> = {
  [TransactionType.Expense]: Strings.typeBadgeExpense,
  [TransactionType.Income]: Strings.typeBadgeIncome,
  [TransactionType.Transfer]: Strings.typeBadgeTransfer,
  [TransactionType.CCPayment]: Strings.typeBadgeCcPayment,
};

const TYPE_BADGE_TONE: Record<TransactionType, BadgeTone> = {
  [TransactionType.Expense]: 'danger',
  [TransactionType.Income]: 'success',
  [TransactionType.Transfer]: 'info',
  [TransactionType.CCPayment]: 'accent-cc',
};

const TYPE_HERO_COLOR: Record<TransactionType, string> = {
  [TransactionType.Expense]: SemanticTokens.negative,
  [TransactionType.Income]: SemanticTokens.positive,
  [TransactionType.Transfer]: InfoTokens[500],
  [TransactionType.CCPayment]: AccentCCTokens[500],
};

export interface TransactionDetailPresentationInput {
  tx: Transaction;
  account?: Account;
  toAccount?: Account;
  category?: Category;
  budget?: Budget;
}

export interface TransactionDetailPresentation {
  title: string;
  amountText: string;
  dateTimeText: string;
  categoryLabel: string;
  categoryBadge: string;
  categoryBadgeTone: BadgeTone;
  heroColor: string;
  accountLabel: string;
  accountTypeLabel?: string;
  accountIcon: IconName;
  originalAmountText?: string;
  exchangeRateText?: string;
  budgetLabel?: string;
  sourceLabel: string;
  category?: Category;
  isTransferLike: boolean;
  transferFlow: {
    fromAccount: Account;
    toAccount: Account;
    fromAmount: number;
    fromCurrency: Currency;
    fromAmountText: string;
    toAmount: number;
    toCurrency: Currency;
    toAmountText: string;
  } | null;
}

function isCardCredit(tx: Transaction, account?: Account): boolean {
  return tx.type === TransactionType.Income && account?.type === AccountType.CreditCard;
}

function signedAmount(tx: Transaction): string {
  const value = numberFmt.format(tx.egp_amount);
  if (tx.type === TransactionType.Expense) return `−${value} EGP`;
  if (tx.type === TransactionType.Income) return `+${value} EGP`;
  return `${value} EGP`;
}

export function buildTransactionDetailPresentation({
  tx,
  account,
  toAccount,
  category,
  budget,
}: TransactionDetailPresentationInput): TransactionDetailPresentation {
  const cardCredit = isCardCredit(tx, account);
  const formattedTitle = formatTransactionTitle({ tx, account, toAccount, category });
  const categoryBadge = cardCredit ? Strings.cardCreditTitle : TYPE_BADGE[tx.type];
  const categoryBadgeTone = cardCredit ? 'info' : TYPE_BADGE_TONE[tx.type];
  const isTransferLike =
    tx.type === TransactionType.Transfer || tx.type === TransactionType.CCPayment;
  const destinationAmount = tx.to_amount ?? tx.egp_amount;
  const destinationCurrency = toAccount?.currency ?? Currency.EGP;

  return {
    title: cardCredit ? Strings.cardCreditTitle : formattedTitle.title,
    amountText: signedAmount(tx),
    dateTimeText: `${formatLongDate(tx.transaction_date)} · ${formatTime12h(tx.transaction_time)}`,
    categoryLabel: category?.name ?? (isTransferLike ? categoryBadge : Strings.uncategorized),
    categoryBadge,
    categoryBadgeTone,
    heroColor: cardCredit ? InfoTokens[500] : TYPE_HERO_COLOR[tx.type],
    accountLabel: toAccount
      ? `${account?.name ?? Strings.unknownAccount} → ${toAccount.name}`
      : (account?.name ?? Strings.unknownAccount),
    accountTypeLabel: account ? ACCOUNT_TYPE_LABELS[account.type] : undefined,
    accountIcon: getAccountTypeIcon(account?.type),
    originalAmountText:
      tx.currency === Currency.USD ? `${numberFmt.format(tx.amount)} USD` : undefined,
    exchangeRateText:
      tx.exchange_rate === null ? undefined : `1 USD = ${numberFmt.format(tx.exchange_rate)} EGP`,
    budgetLabel:
      tx.budget_id === null ? undefined : (budget?.name ?? Strings.detailBudgetUnavailable),
    sourceLabel:
      tx.commitment_payment_id === null ? Strings.detailManualSource : Strings.typeBadgeCommitment,
    category,
    isTransferLike,
    transferFlow:
      isTransferLike && account && toAccount
        ? {
            fromAccount: account,
            toAccount,
            fromAmount: tx.amount,
            fromCurrency: tx.currency,
            fromAmountText: `${numberFmt.format(tx.amount)} ${tx.currency}`,
            toAmount: destinationAmount,
            toCurrency: destinationCurrency,
            toAmountText: `${numberFmt.format(destinationAmount)} ${destinationCurrency}`,
          }
        : null,
  };
}

/**
 * Maps an account type to its MaterialCommunityIcons glyph used by the
 * transaction detail screen's Account row. Mirrors the dashboard's
 * `account_card.tsx` mapping so the same account renders with the same
 * icon everywhere — a credit card is a credit card whether you're on the
 * dashboard or inside a transaction.
 *
 * Falls back to a generic card icon when the account type is unknown
 * (defensive — shouldn't happen with our enum but the DB has historical
 * rows that may not match the current enum).
 */
const ACCOUNT_TYPE_ICONS: Record<AccountType, IconName> = {
  [AccountType.Bank]: 'bank',
  [AccountType.SmartWallet]: 'cellphone-nfc',
  [AccountType.PhysicalWallet]: 'wallet',
  [AccountType.PhysicalSavings]: 'piggy-bank',
  [AccountType.CreditCard]: 'credit-card',
};

export function getAccountTypeIcon(type: string | undefined): IconName {
  if (type && type in ACCOUNT_TYPE_ICONS) {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- 'in' guard confirms type is a valid AccountType key
    return ACCOUNT_TYPE_ICONS[type as AccountType];
  }
  return 'card-bulleted-outline';
}

export function getCommitmentPaymentRoute(paymentId: string): `/commitments/${string}` {
  return `/commitments/${paymentId}`;
}
