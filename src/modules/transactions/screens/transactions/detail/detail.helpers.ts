import { ACCOUNT_TYPE_ICONS, type AccountTypeIconName } from '@/constants/account_type_icons';
import { CURRENCY_CONFIG } from '@/constants/currency';
import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AcctTokens, CoreTokens, InfoTokens } from '@/constants/theme_tokens';
import { TRANSACTION_TYPE_ICONS } from '@/constants/transaction_type_icons';
import { resolveAccountBadgeColors } from '@/modules/accounts/constants/account_badge_color';
import {
  NON_TEXT_MIN_CONTRAST_RATIO,
  contrastRatio,
} from '@/modules/accounts/constants/account_palette';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { getTransactionAccountIds } from '@/modules/accounts/store/account_lookup.helpers';
import { isFrozenAccount } from '@/modules/accounts/utils/is_frozen_account';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import {
  STACKED_PREFIX,
  type StackedPrefix,
  TABBED_ORIGIN,
} from '@/modules/navigation/domain/stacked_route';
import { requiresDestination } from '@/modules/transactions/domain/transaction_amounts';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { resolveAccountName } from '@/utils/account_name';
import {
  type AmountSign,
  MINUS_SIGN,
  PLUS_SIGN,
  formatDisplayAmount,
  formatDisplayAmountParts,
  formatExchangeRateSentence,
  signAmountText,
} from '@/utils/format_amount';
import { formatWeekdayDate } from '@/utils/format_date';
import { formatTime12h } from '@/utils/format_time_12h';

import {
  buildTransactionRowPresentation,
  isCardCredit,
  primaryAmountFor,
  resolveCategoryGlyph,
  resolveRowTile,
  type RowTile,
} from '../components/transaction_row.helpers';
import { resolveDetailAmountRowFigure } from './components/detail.geometry';
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

// Frames C1 and C2 draw bare arrows where `TRANSACTION_TYPE_ICONS` draws circled ones.
const BARE_ARROW_ICON: Partial<Record<TransactionType, IconName>> = {
  [TransactionType.Expense]: 'arrow-up',
  [TransactionType.Income]: 'arrow-down',
};

const CARD_CREDIT_ICON: IconName = 'credit-card-refund';

export function resolveHeroTileGlyphColor(fill: string): string {
  return contrastRatio(fill, CoreTokens.text1) >= NON_TEXT_MIN_CONTRAST_RATIO
    ? CoreTokens.text1
    : CoreTokens.bg;
}

export interface TransactionDetailPresentationInput {
  tx: Transaction;
  account?: Account;
  toAccount?: Account;
  category?: Category;
  budget?: Budget;
}

export interface TransactionDetailHero {
  title: string;
  typeLabel: string;
  typeIcon: IconName;
  typeColor: string;
  badgeFill: string;
  badgeForeground: string;
  tileColor: string;
  tileGlyph: IconName;
  tileGlyphColor: string;
  amountValue: string;
  amountCode: string;
  amountAccessibilityLabel: string;
  caption: string;
}

export interface TransactionDetailPresentation {
  hero: TransactionDetailHero;
  accountRow?: DetailAccountRow;
  categoryRow?: DetailCategoryRow;
  dateText: string;
  timeText: string;
  source: DetailSource;
  amountRow?: DetailAmountRowText;
  exchangeRateText?: string;
  budgetLabel?: string;
  isTransferLike: boolean;
  transferFlow: {
    fromAccount: Account;
    toAccount: Account;
    fromAmountText: TransferCellText;
    toAmountText: TransferCellText;
  } | null;
}

export interface DetailAccountRow {
  name: string;
  tile: RowTile;
  archived: boolean;
}

export interface DetailCategoryRow {
  name: string;
  glyphName: IconName;
  glyphColor: string;
}

export type DetailSource = 'manual' | 'commitment';

export type DetailActionSet = 'editDelete' | 'viewCommitment' | 'archivedNotice';

/** A deleted account is archived too, yet never frozen: it keeps its row's tile and is never marked archived. */
export function resolveDetailAccountRow(account: Account | undefined): DetailAccountRow {
  const archived = account !== undefined && isFrozenAccount(account);
  return {
    name: resolveAccountName(account),
    tile: archived
      ? { color: AcctTokens.graphite.rich, type: account.type, hollow: true }
      : resolveRowTile(account),
    archived,
  };
}

export function findFrozenLeg(
  tx: Pick<Transaction, 'account_id' | 'to_account_id'>,
  accountsById: ReadonlyMap<string, Account>,
): Account | undefined {
  return getTransactionAccountIds(tx)
    .map((accountId) => accountsById.get(accountId))
    .find((account) => account !== undefined && isFrozenAccount(account));
}

/** A commitment's payment is checked first, so it shows View commitment on an archived account too. */
export function resolveDetailActionSet(
  tx: Pick<Transaction, 'account_id' | 'to_account_id' | 'commitment_payment_id'>,
  accountsById: ReadonlyMap<string, Account>,
): DetailActionSet {
  if (tx.commitment_payment_id !== null) return 'viewCommitment';
  return findFrozenLeg(tx, accountsById) ? 'archivedNotice' : 'editDelete';
}

export function resolveDetailActionBarCount(actionSet: DetailActionSet): 1 | 2 {
  return actionSet === 'editDelete' ? 2 : 1;
}

export interface DetailAmountRowText {
  label: string;
  value: string;
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
  signPrefix: Exclude<AmountSign, ''>,
): TransferCellText {
  const { withCode, printsAsZero } = formatDisplayAmountParts(amount, currency);
  return { display: signAmountText(withCode, signPrefix, printsAsZero), accessible: withCode };
}

function amountRowText(tx: Transaction): DetailAmountRowText | undefined {
  const figure = resolveDetailAmountRowFigure(tx);
  if (!figure) return undefined;
  return {
    label: figure.currency === Currency.EGP ? Strings.detailAmountInEgp : Strings.detailAmountInUsd,
    value: formatDisplayAmount(figure.amount, figure.currency),
  };
}

export function buildTransactionDetailPresentation({
  tx,
  account,
  toAccount,
  category,
  budget,
}: TransactionDetailPresentationInput): TransactionDetailPresentation {
  const cardCredit = isCardCredit(tx, account);
  const typeLabel = cardCredit ? Strings.cardCreditTitle : TYPE_BADGE[tx.type];
  const isTransferLike = requiresDestination(tx.type);
  const destinationAmount = tx.to_amount ?? tx.egp_amount;
  const destinationCurrency = toAccount?.currency ?? Currency.EGP;
  const row = buildTransactionRowPresentation({ tx, account, toAccount, category });
  const typeColor = cardCredit ? InfoTokens[500] : TRANSACTION_TYPE_ICONS[tx.type].color;
  const amount = primaryAmountFor(tx, cardCredit);
  const badge = resolveAccountBadgeColors(typeColor);
  const dateText = formatWeekdayDate(tx.transaction_date);
  const timeText = formatTime12h(tx.transaction_time);

  return {
    hero: {
      title: row.title,
      typeLabel,
      typeIcon: cardCredit
        ? CARD_CREDIT_ICON
        : (BARE_ARROW_ICON[tx.type] ?? TRANSACTION_TYPE_ICONS[tx.type].name),
      typeColor,
      badgeFill: badge.fill,
      badgeForeground: badge.foreground,
      tileColor: row.glyphColor,
      tileGlyph: row.glyphName,
      tileGlyphColor: resolveHeroTileGlyphColor(row.glyphColor),
      amountValue: amount.text,
      amountCode: CURRENCY_CONFIG[tx.currency].code,
      amountAccessibilityLabel: amount.withCode,
      caption: `${dateText}, ${timeText}`,
    },
    accountRow: isTransferLike ? undefined : resolveDetailAccountRow(account),
    categoryRow: isTransferLike
      ? undefined
      : { name: category?.name ?? Strings.uncategorized, ...resolveCategoryGlyph(category) },
    dateText,
    timeText,
    source: tx.commitment_payment_id === null ? 'manual' : 'commitment',
    amountRow: amountRowText(tx),
    exchangeRateText:
      tx.exchange_rate === null ? undefined : formatExchangeRateSentence(tx.exchange_rate),
    budgetLabel:
      tx.budget_id === null ? undefined : (budget?.name ?? Strings.detailBudgetUnavailable),
    isTransferLike,
    transferFlow:
      isTransferLike && account && toAccount
        ? {
            fromAccount: account,
            toAccount,
            fromAmountText: transferCellAmountText(tx.amount, tx.currency, MINUS_SIGN),
            toAmountText: transferCellAmountText(destinationAmount, destinationCurrency, PLUS_SIGN),
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

export function getCommitmentPaymentRoute(
  paymentId: string,
  originPrefix: StackedPrefix,
  originTransactionId: string,
):
  | `${typeof STACKED_PREFIX}/commitments/${string}?originTxId=${string}`
  | `${typeof STACKED_PREFIX}/commitments/${string}?originTxId=${string}&originTxCopy=${typeof TABBED_ORIGIN}` {
  // Always the stacked twin, so the detail sits above the tabs; the origin's copy rides on `originTxCopy`.
  if (originPrefix === '') {
    return `${STACKED_PREFIX}/commitments/${paymentId}?originTxId=${originTransactionId}&originTxCopy=${TABBED_ORIGIN}`;
  }
  return `${STACKED_PREFIX}/commitments/${paymentId}?originTxId=${originTransactionId}`;
}
