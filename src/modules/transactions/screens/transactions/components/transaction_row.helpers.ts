import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type React from 'react';

import { CURRENCY_CONFIG } from '@/constants/currency';
import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';
import {
  AccentCCTokens,
  AcctTokens,
  CoreTokens,
  GoldTokens,
  InfoTokens,
} from '@/constants/theme_tokens';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import { requiresDestination } from '@/modules/transactions/domain/transaction_amounts';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { resolveAccountName } from '@/utils/account_name';
import {
  MINUS_SIGN,
  PLUS_SIGN,
  formatCurrencyAmount,
  formatDisplayMagnitude,
  formatRateDisplayMagnitude,
  signAmountText,
} from '@/utils/format_amount';
import { formatTime12h } from '@/utils/format_time_12h';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export const TRANSACTION_ROW_HEIGHT = ms(60);
export const TRANSACTION_ROW_TITLE_FONT_SIZE = Type.bodyStrong;
export const TRANSACTION_ROW_CAPTION_FONT_SIZE = Type.micro;
export const TRANSACTION_ROW_AMOUNT_FONT_SIZE = Type.bodyStrong;
export const TRANSACTION_ROW_CODE_FONT_SIZE = Type.micro;
export const TRANSACTION_ROW_LINE_GAP = ms(2);
// A1 `.dual`: the second tile sits 16 in from the first, ringed in the row's background.
export const TRANSACTION_ROW_DUAL_OFFSET = ms(16);
export const TRANSACTION_ROW_DUAL_RING = ms(2);
export const TRANSACTION_ROW_DUAL_RING_COLOR = CoreTokens.bg;
// Mirrors TypeBadge's `sm` box (type_badge.tsx:28,46-49,81): its label line box plus the unscaled `py-[2px]` and 1 dp border it carries on each side.
export const TRANSACTION_ROW_TITLE_BADGE_HEIGHT = lineHeightFor(Type.compactBadge) + 2 * (2 + 1);
export const TRANSACTION_ROW_CAPTION_SEPARATOR = ' · ';

const FALLBACK_ICON: IconName = 'shape-outline';

export interface TransactionRowPresentationInput {
  tx: Transaction;
  account?: Account;
  toAccount?: Account;
  category?: Category;
}

export interface RowTile {
  color: string | null;
  type: AccountType;
  hollow: boolean;
}

export type RowTileSet = [] | [RowTile] | [RowTile, RowTile];

/** A caller's replacement for the caption's lead (the note, or from → to) and its time. */
export interface TransactionRowCaption {
  lead?: string;
  time?: string;
}

export interface TransactionRowPresentation {
  title: string;
  /** The lead and the time joined, as the label speaks it; the row draws the two parts. */
  caption: string;
  captionLead?: string;
  captionTime: string;
  primaryAmount: string;
  secondaryLine: string;
  ownershipLabel?: string;
  isCommitmentOwned: boolean;
  glyphName: IconName;
  glyphColor: string;
  amountClassName: string;
  tiles: RowTileSet;
  accessibilityLabel: string;
}

interface RowGlyph {
  glyphName: IconName;
  glyphColor: string;
}

const CARD_CREDIT_GLYPH: RowGlyph = {
  glyphName: 'credit-card-refund',
  glyphColor: InfoTokens[500],
};

// `undefined` takes the category's own glyph.
const TYPE_GLYPHS: Record<TransactionType, RowGlyph | undefined> = {
  [TransactionType.Expense]: undefined,
  [TransactionType.Income]: undefined,
  [TransactionType.Transfer]: { glyphName: 'swap-horizontal', glyphColor: InfoTokens[500] },
  [TransactionType.CCPayment]: {
    glyphName: 'credit-card-refund',
    glyphColor: AccentCCTokens[500],
  },
};

export function isCardCredit(tx: Transaction, account?: Account): boolean {
  return tx.type === TransactionType.Income && account?.type === AccountType.CreditCard;
}

/** An unresolved or deleted account draws the hollow graphite tile; an archived one stays filled. */
export function resolveRowTile(account: Account | undefined): RowTile {
  if (account === undefined || account.is_deleted === 1) {
    return {
      color: AcctTokens.graphite.rich,
      type: account?.type ?? AccountType.Bank,
      hollow: true,
    };
  }
  return { color: account.color, type: account.type, hollow: false };
}

function titleFor(tx: Transaction, account?: Account, category?: Category): string {
  if (isCardCredit(tx, account)) return Strings.cardCreditTitle;
  if (tx.type === TransactionType.Transfer) return Strings.transferTitle;
  if (tx.type === TransactionType.CCPayment) return Strings.addTxTypeCCPayment;
  return category?.name ?? Strings.uncategorized;
}

function accountPair(account?: Account, toAccount?: Account): string {
  return `${resolveAccountName(account)} → ${resolveAccountName(toAccount)}`;
}

function leadFor(tx: Transaction, account?: Account, toAccount?: Account): string | undefined {
  if (requiresDestination(tx.type)) return accountPair(account, toAccount);
  // oxlint-disable-next-line typescript/prefer-nullish-coalescing -- a blank note leaves the time alone
  return tx.note?.trim() || undefined;
}

function primaryAmountFor(tx: Transaction, cardCredit: boolean): string {
  const sign =
    tx.type === TransactionType.Expense
      ? MINUS_SIGN
      : tx.type === TransactionType.Income
        ? PLUS_SIGN
        : '';
  const { text, printsAsZero } = formatDisplayMagnitude(tx.amount, tx.currency);
  return signAmountText(text, cardCredit ? PLUS_SIGN : sign, printsAsZero);
}

function secondaryLineFor(tx: Transaction, toAccount?: Account): string {
  const code = CURRENCY_CONFIG[tx.currency].code;
  if (requiresDestination(tx.type)) {
    // Only a resolved destination in another currency adds anything the code does not.
    if (tx.to_amount === null || toAccount === undefined || toAccount.currency === tx.currency) {
      return code;
    }
    return `→ ${formatCurrencyAmount(tx.to_amount, toAccount.currency)}`;
  }
  if (tx.currency === Currency.EGP) return code;
  const egp = `≈ ${formatCurrencyAmount(tx.egp_amount, Currency.EGP)}`;
  if (tx.exchange_rate === null) return egp;
  return `${egp} @ ${formatRateDisplayMagnitude(tx.exchange_rate).text}`;
}

function amountClassNameFor(tx: Transaction, cardCredit: boolean): string {
  if (cardCredit) return 'text-info';
  if (tx.type === TransactionType.Income) return 'text-success';
  if (tx.type === TransactionType.Expense) return 'text-danger';
  if (tx.type === TransactionType.Transfer) return 'text-info';
  return 'text-accent-cc';
}

function glyphFor(tx: Transaction, cardCredit: boolean, category?: Category): RowGlyph {
  if (cardCredit) return CARD_CREDIT_GLYPH;
  return (
    TYPE_GLYPHS[tx.type] ?? {
      glyphName: toIconName(category?.icon, FALLBACK_ICON),
      glyphColor: category?.color ?? GoldTokens[500],
    }
  );
}

export function buildTransactionRowPresentation(
  { tx, account, toAccount, category }: TransactionRowPresentationInput,
  captionOverride?: TransactionRowCaption,
): TransactionRowPresentation {
  const cardCredit = isCardCredit(tx, account);
  const twoAccount = requiresDestination(tx.type);
  const title = titleFor(tx, account, category);
  const lead = captionOverride?.lead ?? leadFor(tx, account, toAccount);
  const captionLead = lead === '' ? undefined : lead;
  const captionTime = captionOverride?.time ?? formatTime12h(tx.transaction_time);
  const caption = [captionLead, captionTime]
    .filter((part): part is string => part !== undefined && part !== '')
    .join(TRANSACTION_ROW_CAPTION_SEPARATOR);
  const code: string = CURRENCY_CONFIG[tx.currency].code;
  const primaryAmount = primaryAmountFor(tx, cardCredit);
  const secondaryLine = secondaryLineFor(tx, toAccount);
  const ownershipLabel =
    tx.commitment_payment_id !== null
      ? Strings.typeBadgeCommitment
      : tx.budget_id !== null
        ? Strings.transactionBudgetAssigned
        : undefined;
  // The tile carries no label, so the account is spoken here, once: a two-account caption already speaks its own pair.
  const accountNames = !twoAccount
    ? resolveAccountName(account)
    : captionOverride?.lead === undefined
      ? undefined
      : accountPair(account, toAccount);

  return {
    title,
    caption,
    captionLead,
    captionTime,
    primaryAmount,
    secondaryLine,
    ownershipLabel,
    isCommitmentOwned: tx.commitment_payment_id !== null,
    ...glyphFor(tx, cardCredit, category),
    amountClassName: amountClassNameFor(tx, cardCredit),
    tiles: twoAccount
      ? [resolveRowTile(account), resolveRowTile(toAccount)]
      : [resolveRowTile(account)],
    accessibilityLabel: [
      title,
      accountNames,
      caption,
      `${primaryAmount} ${code}`,
      secondaryLine === code ? undefined : secondaryLine,
      ownershipLabel,
    ]
      .filter((value): value is string => value !== undefined && value !== '')
      .join(', '),
  };
}
