import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type React from 'react';
import { PixelRatio } from 'react-native';

import { STATUS_BADGE_XS_PADDING_VERTICAL } from '@/components/ui/status_badge';
import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { CURRENCY_CONFIG } from '@/constants/currency';
import { CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';
import { AcctTokens, CoreTokens, GoldTokens, SemanticTokens } from '@/constants/theme_tokens';
import { mixHex } from '@/modules/accounts/constants/account_badge_color';
import { contrastRatio } from '@/modules/accounts/constants/account_palette';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import {
  STATUS_ICONS,
  STATUS_LABELS,
  resolveDisplayAmount,
} from '@/modules/commitments/utils/commitment_status';
import {
  TRANSACTION_ROW_HEIGHT,
  TRANSACTION_ROW_LINE_GAP,
  resolveCategoryGlyph,
  resolveRowTile,
  type RowTile,
} from '@/modules/transactions/components/transaction_row.helpers';
import { resolveAccountName } from '@/utils/account_name';
import { formatDisplayAmountParts } from '@/utils/format_amount';
import { formatShortWeekdayDate } from '@/utils/format_date';

import { isPaidPayment, resolvePaymentState } from '../../../domain/payment_state';
import type { Commitment } from '../../../entities/commitment.entity';
import type { CommitmentPayment } from '../../../entities/commitment_payment.entity';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export const COMMITMENT_ROW_TITLE_FONT_SIZE = Type.bodyStrong;
export const COMMITMENT_ROW_CAPTION_FONT_SIZE = Type.micro;
export const COMMITMENT_ROW_AMOUNT_FONT_SIZE = Type.bodyStrong;
export const COMMITMENT_ROW_CODE_FONT_SIZE = Type.micro;
export const COMMITMENT_ROW_TAG_FONT_SIZE = Type.compactBadge;
export const COMMITMENT_ROW_LINE_GAP = TRANSACTION_ROW_LINE_GAP;
export const COMMITMENT_STATUS_TAG_TEXT_MIN_CONTRAST = 4.5;

const NO_VALUE = '—';
const LABEL_SEPARATOR = ', ';
const INK_SHARE_STEP = 0.05;
const INK_STEP_COUNT = Math.round(1 / INK_SHARE_STEP);

function rowLineBox(fontSize: number, fontScale: number): number {
  return lineHeightFor(scaledFontSize(fontSize, fontScale));
}

function rowTallerColumn(fontScale: number): number {
  const nameLine = Math.max(
    rowLineBox(COMMITMENT_ROW_TITLE_FONT_SIZE, fontScale),
    rowLineBox(COMMITMENT_ROW_TAG_FONT_SIZE, fontScale) + 2 * STATUS_BADGE_XS_PADDING_VERTICAL,
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

export interface CommitmentStatusTagColors {
  fill: string;
  foreground: string;
}

/** A1 `.stag`: the tone over the card surface, its ink stepped toward the text colour until it clears 4.5:1. */
function resolveStatusTagColors(
  tone: string,
  fillShare: number,
  ink: string = tone,
): CommitmentStatusTagColors {
  const fill = mixHex(tone, CoreTokens.surface, fillShare);
  for (let step = 0; step <= INK_STEP_COUNT; step += 1) {
    const foreground = mixHex(ink, CoreTokens.text1, Math.max(0, 1 - step * INK_SHARE_STEP));
    if (contrastRatio(fill, foreground) >= COMMITMENT_STATUS_TAG_TEXT_MIN_CONTRAST) {
      return { fill, foreground };
    }
  }
  return { fill, foreground: CoreTokens.text1 };
}

export const COMMITMENT_STATUS_TAG_COLORS: Record<
  CommitmentPaymentStatus,
  CommitmentStatusTagColors
> = {
  [CommitmentPaymentStatus.Overdue]: resolveStatusTagColors(SemanticTokens.negative, 0.15),
  [CommitmentPaymentStatus.Due]: resolveStatusTagColors(GoldTokens[500], 0.15),
  [CommitmentPaymentStatus.Upcoming]: resolveStatusTagColors(CoreTokens.text2, 0.18),
  [CommitmentPaymentStatus.Paid]: resolveStatusTagColors(SemanticTokens.positive, 0.15),
  [CommitmentPaymentStatus.Skipped]: resolveStatusTagColors(
    CoreTokens.text3,
    0.3,
    AcctTokens.graphite.soft,
  ),
};

/** A paid row shows the account it was paid from; any other, the commitment's preferred one. */
export function resolveCommitmentRowAccountId(
  payment: CommitmentPayment,
  commitment: Commitment | undefined,
): string | undefined {
  const id = isPaidPayment(payment) ? payment.account_id : commitment?.account_id;
  return id ?? undefined;
}

export interface CommitmentRowPresentationInput {
  payment: CommitmentPayment;
  commitment: Commitment | undefined;
  category: Category | undefined;
  /** The lookup of `resolveCommitmentRowAccountId`; `undefined` when unresolved or absent. */
  account: Account | undefined;
  /** The local calendar date, `YYYY-MM-DD`. */
  today: string;
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
  amountText: string;
  currencyCode: string;
  accessibilityLabel: string;
}

function amountFor(
  payment: CommitmentPayment,
  commitment: Commitment | undefined,
  code: string,
): { text: string; spoken: string } {
  const { amount, showTilde } = resolveDisplayAmount(payment, commitment);
  if (amount === undefined) {
    const mark = showTilde ? Strings.commitmentRowNoEstimate : NO_VALUE;
    return { text: mark, spoken: `${mark} ${code}` };
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
}: CommitmentRowPresentationInput): CommitmentRowPresentation {
  const name = commitment?.name ?? NO_VALUE;
  const status = resolvePaymentState(payment, today);
  const tagColors = COMMITMENT_STATUS_TAG_COLORS[status];
  const dueDay = formatShortWeekdayDate(payment.due_date, today);
  const currencyCode: string = CURRENCY_CONFIG[payment.currency].code;
  const amount = amountFor(payment, commitment, currencyCode);
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
    amountText: amount.text,
    currencyCode,
    accessibilityLabel: [
      name,
      hasAccount ? resolveAccountName(account) : undefined,
      STATUS_LABELS[status],
      dueDay,
      amount.spoken,
    ]
      .filter((part): part is string => part !== undefined)
      .join(LABEL_SEPARATOR),
  };
}
