import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type React from 'react';
import { PixelRatio } from 'react-native';

import {
  STATUS_BADGE_XS_LABEL_FONT_SIZE,
  STATUS_BADGE_XS_PADDING_VERTICAL,
} from '@/components/ui/status_badge';
import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { CURRENCY_CONFIG } from '@/constants/currency';
import { CommitmentPaymentStatus, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { lineHeightFor } from '@/constants/theme';
import { AcctTokens, CoreTokens } from '@/constants/theme_tokens';
import {
  BADGE_TEXT_MIN_CONTRAST,
  resolveBadgeColors,
  type AccountBadgeColors,
} from '@/modules/accounts/constants/account_badge_color';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import {
  STATUS_COLORS,
  STATUS_ICONS,
  STATUS_LABELS,
  resolveDisplayAmount,
} from '@/modules/commitments/utils/commitment_status';
import {
  TRANSACTION_ROW_AMOUNT_FONT_SIZE,
  TRANSACTION_ROW_CAPTION_FONT_SIZE,
  TRANSACTION_ROW_CODE_FONT_SIZE,
  TRANSACTION_ROW_HEIGHT,
  TRANSACTION_ROW_LINE_GAP,
  TRANSACTION_ROW_TITLE_FONT_SIZE,
  resolveCategoryGlyph,
  resolveRowTile,
  type RowTile,
} from '@/modules/transactions/components/transaction_row.helpers';
import { resolveAccountName } from '@/utils/account_name';
import { formatDisplayAmount, formatDisplayAmountParts } from '@/utils/format_amount';
import { formatShortWeekdayDate } from '@/utils/format_date';

import { resolveCommitmentRowLegEgp } from '../../../domain/commitment_section_sums';
import { isPaidPayment, resolvePaymentState } from '../../../domain/payment_state';
import type { Commitment } from '../../../entities/commitment.entity';
import type {
  CommitmentMonthPayment,
  CommitmentPayment,
} from '../../../entities/commitment_payment.entity';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export const COMMITMENT_ROW_TITLE_FONT_SIZE = TRANSACTION_ROW_TITLE_FONT_SIZE;
export const COMMITMENT_ROW_CAPTION_FONT_SIZE = TRANSACTION_ROW_CAPTION_FONT_SIZE;
export const COMMITMENT_ROW_AMOUNT_FONT_SIZE = TRANSACTION_ROW_AMOUNT_FONT_SIZE;
export const COMMITMENT_ROW_CODE_FONT_SIZE = TRANSACTION_ROW_CODE_FONT_SIZE;
export const COMMITMENT_ROW_LINE_GAP = TRANSACTION_ROW_LINE_GAP;
export const COMMITMENT_STATUS_TAG_TEXT_MIN_CONTRAST = BADGE_TEXT_MIN_CONTRAST;

const LABEL_SEPARATOR = ', ';

function rowLineBox(fontSize: number, fontScale: number): number {
  return lineHeightFor(scaledFontSize(fontSize, fontScale));
}

function rowTallerColumn(fontScale: number): number {
  const nameLine = Math.max(
    rowLineBox(COMMITMENT_ROW_TITLE_FONT_SIZE, fontScale),
    rowLineBox(STATUS_BADGE_XS_LABEL_FONT_SIZE, fontScale) + 2 * STATUS_BADGE_XS_PADDING_VERTICAL,
  );
  const content =
    nameLine + COMMITMENT_ROW_LINE_GAP + rowLineBox(COMMITMENT_ROW_CAPTION_FONT_SIZE, fontScale);
  // The code sits on the amount's line in a smaller box, so the amount alone sets the value column.
  const value = rowLineBox(COMMITMENT_ROW_AMOUNT_FONT_SIZE, fontScale);
  return Math.max(content, value);
}

/** The transaction row's height rule over this row's columns: its 1.0 space kept, whole device pixels, never below 1.0. */
export function resolveCommitmentRowHeight(fontScale: number): number {
  return Math.max(
    TRANSACTION_ROW_HEIGHT,
    PixelRatio.roundToNearestPixel(
      TRANSACTION_ROW_HEIGHT + rowTallerColumn(fontScale) - rowTallerColumn(1),
    ),
  );
}

// A1 `.stag`: each tone's share of the fill over the card surface the rows sit on.
const TAG_FILL_SHARE: Record<CommitmentPaymentStatus, number> = {
  [CommitmentPaymentStatus.Overdue]: 0.15,
  [CommitmentPaymentStatus.Due]: 0.15,
  [CommitmentPaymentStatus.Upcoming]: 0.18,
  [CommitmentPaymentStatus.Paid]: 0.15,
  [CommitmentPaymentStatus.Skipped]: 0.3,
};
const TAG_INK: Partial<Record<CommitmentPaymentStatus, string>> = {
  [CommitmentPaymentStatus.Skipped]: AcctTokens.graphite.soft,
};

function tagColors(status: CommitmentPaymentStatus): AccountBadgeColors {
  return resolveBadgeColors({
    tone: STATUS_COLORS[status],
    backdrop: CoreTokens.surface,
    fillShare: TAG_FILL_SHARE[status],
    ink: TAG_INK[status],
    inkShare: 1,
  });
}

export const COMMITMENT_STATUS_TAG_COLORS: Record<CommitmentPaymentStatus, AccountBadgeColors> = {
  [CommitmentPaymentStatus.Overdue]: tagColors(CommitmentPaymentStatus.Overdue),
  [CommitmentPaymentStatus.Due]: tagColors(CommitmentPaymentStatus.Due),
  [CommitmentPaymentStatus.Upcoming]: tagColors(CommitmentPaymentStatus.Upcoming),
  [CommitmentPaymentStatus.Paid]: tagColors(CommitmentPaymentStatus.Paid),
  [CommitmentPaymentStatus.Skipped]: tagColors(CommitmentPaymentStatus.Skipped),
};

export function resolveCommitmentRowAccountId(
  payment: CommitmentPayment,
  commitment: Commitment | undefined,
): string | undefined {
  const id = isPaidPayment(payment) ? payment.account_id : commitment?.account_id;
  return id ?? undefined;
}

export interface CommitmentRowPresentationInput {
  payment: CommitmentMonthPayment;
  commitment: Commitment | undefined;
  category: Category | undefined;
  /** The lookup of `resolveCommitmentRowAccountId`; `undefined` when unresolved or absent. */
  account: Account | undefined;
  /** The local calendar date, `YYYY-MM-DD`. */
  today: string;
  /** EGP per USD, `undefined` until it loads. */
  liveRate: number | undefined;
}

export interface CommitmentRowPresentation {
  name: string;
  glyphName: IconName;
  glyphColor: string;
  tile: RowTile;
  statusLabel: string;
  statusIcon: IconName;
  statusFill: string;
  statusForeground: string;
  dueDay: string;
  /** The due day, then a USD row's `≈ n EGP` leg once it resolves. */
  caption: string;
  amountText: string;
  currencyCode: string;
  accessibilityLabel: string;
}

function amountFor(
  payment: CommitmentPayment,
  displayAmount: ReturnType<typeof resolveDisplayAmount>,
  code: string,
): { text: string; spoken: string } {
  const { amount, showTilde } = displayAmount;
  if (amount === undefined) {
    return showTilde
      ? {
          text: Strings.commitmentRowNoEstimate,
          spoken: Strings.commitmentRowNoEstimateLabel(code),
        }
      : {
          text: Strings.commitmentRowUnavailable,
          spoken: Strings.commitmentRowUnavailableLabel(code),
        };
  }
  const { text, withCode } = formatDisplayAmountParts(amount, payment.currency);
  return showTilde
    ? {
        text: Strings.commitmentRowEstimate(text),
        spoken: Strings.commitmentRowEstimate(withCode),
      }
    : { text, spoken: withCode };
}

export function buildCommitmentRowPresentation({
  payment,
  commitment,
  category,
  account,
  today,
  liveRate,
}: CommitmentRowPresentationInput): CommitmentRowPresentation {
  const name = commitment?.name ?? Strings.commitmentRowNoName;
  const status = resolvePaymentState(payment, today);
  const tagColors = COMMITMENT_STATUS_TAG_COLORS[status];
  const dueDay = formatShortWeekdayDate(payment.due_date, today);
  const currencyCode: string = CURRENCY_CONFIG[payment.currency].code;
  const displayAmount = resolveDisplayAmount(payment, commitment);
  const amount = amountFor(payment, displayAmount, currencyCode);
  const leg = resolveCommitmentRowLegEgp({ payment, amount: displayAmount.amount, rate: liveRate });
  const caption =
    leg === undefined
      ? dueDay
      : Strings.commitmentRowDueDayWithLeg(
          dueDay,
          Strings.addTxConvertedAmount(formatDisplayAmount(leg, Currency.EGP)),
        );
  // The tile carries no label, so the row speaks its account; a commitment with no account speaks none.
  const hasAccount = resolveCommitmentRowAccountId(payment, commitment) !== undefined;

  return {
    name,
    ...resolveCategoryGlyph(category),
    tile: resolveRowTile(hasAccount ? account : undefined),
    statusLabel: STATUS_LABELS[status],
    statusIcon: STATUS_ICONS[status],
    statusFill: tagColors.fill,
    statusForeground: tagColors.foreground,
    dueDay,
    caption,
    amountText: amount.text,
    currencyCode,
    accessibilityLabel: [
      name,
      hasAccount ? resolveAccountName(account) : undefined,
      STATUS_LABELS[status],
      caption,
      amount.spoken,
    ]
      .filter((part): part is string => part !== undefined)
      .join(LABEL_SEPARATOR),
  };
}
