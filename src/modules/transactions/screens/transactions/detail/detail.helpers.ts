import { ACCOUNT_TYPE_ICONS, type AccountTypeIconName } from '@/constants/account_type_icons';
import { ACCOUNT_TYPE_LABELS } from '@/constants/account_type_labels';
import { CURRENCY_CONFIG } from '@/constants/currency';
import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AccentCCTokens, InfoTokens, SemanticTokens } from '@/constants/theme_tokens';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import {
  formatCurrencyAmount,
  formatDisplayMagnitude,
  formatExchangeRateSentence,
} from '@/utils/format_amount';
import { formatLongDate } from '@/utils/format_date';
import { formatTime12h } from '@/utils/format_time_12h';
import { formatTransactionTitle } from '@/utils/format_transaction_title';

import type { BadgeTone } from './components/detail_row';
import type { TransactionDetailStatus } from './detail.state';

type IconName = AccountTypeIconName;

export type TransactionDetailViewState =
  | 'loading'
  | 'refreshing'
  | 'ready'
  | 'notFound'
  | 'firstLoadError'
  | 'refreshErrorWithData';

export function resolveDetailViewState(
  status: TransactionDetailStatus,
  hasTransaction: boolean,
  revalidating: boolean,
  refreshError: boolean,
): TransactionDetailViewState {
  if ((status === 'idle' || status === 'initialLoading') && !hasTransaction) return 'loading';
  if (status === 'notFound') return 'notFound';
  if (status === 'firstLoadError' && !hasTransaction) return 'firstLoadError';
  if (revalidating && hasTransaction) return 'refreshing';
  if (refreshError && hasTransaction) return 'refreshErrorWithData';
  return hasTransaction ? 'ready' : 'loading';
}

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
    fromAmountText: TransferCellText;
    toAmountText: TransferCellText;
  } | null;
}

/** Signed display text, plus unsigned text `Strings.detailOpenAccountAccessibility` composes. */
export interface TransferCellText {
  display: string;
  accessible: string;
}

/** `signPrefix` is direction of flow, and a magnitude that displays as zero carries no sign. */
export function transferCellAmountText(
  amount: number,
  currency: Currency,
  signPrefix: '+' | '−',
): TransferCellText {
  const { text, printsAsZero } = formatDisplayMagnitude(amount, currency);
  const accessible = `${text} ${CURRENCY_CONFIG[currency].code}`;
  return { display: printsAsZero ? accessible : `${signPrefix}${accessible}`, accessible };
}

function isCardCredit(tx: Transaction, account?: Account): boolean {
  return tx.type === TransactionType.Income && account?.type === AccountType.CreditCard;
}

function signedAmount(tx: Transaction): string {
  const { text, printsAsZero } = formatDisplayMagnitude(tx.egp_amount, Currency.EGP);
  const value = `${text} ${CURRENCY_CONFIG[Currency.EGP].code}`;
  if (printsAsZero) return value;
  if (tx.type === TransactionType.Expense) return `−${value}`;
  if (tx.type === TransactionType.Income) return `+${value}`;
  return value;
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
      tx.currency === Currency.USD ? formatCurrencyAmount(tx.amount, Currency.USD) : undefined,
    exchangeRateText:
      tx.exchange_rate === null ? undefined : formatExchangeRateSentence(tx.exchange_rate),
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
            fromAmountText: transferCellAmountText(tx.amount, tx.currency, '−'),
            toAmountText: transferCellAmountText(destinationAmount, destinationCurrency, '+'),
          }
        : null,
  };
}

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
