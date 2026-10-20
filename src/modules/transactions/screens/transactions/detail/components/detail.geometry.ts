import { DISPLAY_HEADLINE_MAX_FONT_SCALE } from '@/components/ui/display_headline.geometry';
import { resolveFactRowHeight } from '@/components/ui/fact_row.geometry';
import { STATUS_BADGE_PADDING_VERTICAL } from '@/components/ui/status_badge';
import {
  FITTED_LINE_SLACK,
  scaledFontSize,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { Currency } from '@/constants/enums';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { requiresDestination } from '@/modules/transactions/domain/transaction_amounts';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import type { ConvertedAmount } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form.helpers';
import { ms } from '@/utils/responsive';

export const DETAIL_HERO_AMOUNT_MAX_FONT_SCALE = DISPLAY_HEADLINE_MAX_FONT_SCALE;
export const DETAIL_HERO_SHELL_STYLE = { marginTop: Spacing.xs };
export const DETAIL_HERO_PADDING = Spacing.md;
export const DETAIL_HERO_TILE_GAP = Spacing.sm;
export const DETAIL_HERO_BADGE_GAP = Spacing.xxs;
export const DETAIL_HERO_OVERLINE_GAP = Spacing.md;
export const DETAIL_HERO_CAPTION_GAP = Spacing.xxs;
export const DETAIL_HERO_CODE_GAP = ms(6);
export const DETAIL_HERO_CODE_OPACITY = 0.8;
const DETAIL_HERO_BADGE_CHROME = 2 * STATUS_BADGE_PADDING_VERTICAL;
export const DETAIL_TRANSFER_MIN_HEIGHT = ms(126);
// Canvas `.note-card` holding one line: its 12 padding, the overline, a 4 gap and the body line.
export const DETAIL_NOTE_MIN_HEIGHT =
  2 * Spacing.sm + lineHeightFor(Type.overline) + Spacing.xxs + lineHeightFor(Type.body);
export const DETAIL_TRANSFER_LABEL_FONT_SIZE = Type.compactBadge;
export const DETAIL_TRANSFER_NAME_FONT_SIZE = Type.detail;
export const DETAIL_TRANSFER_AMOUNT_FONT_SIZE = Type.micro;
// Frame C3's tile and the gap between the cell's label, tile, name and amount, scaled with the card.
export const DETAIL_TRANSFER_TILE = Size.typeIconBox;
export const DETAIL_TRANSFER_CELL_GAP = Spacing.xxs;
const DETAIL_TRANSFER_CELL_CHROME = DETAIL_TRANSFER_TILE + 3 * DETAIL_TRANSFER_CELL_GAP;
// Raw, never ms(): the skeleton transfer cell's `h-20` at scale 1 and below.
const DETAIL_TRANSFER_SKELETON_CELL_HEIGHT = 80;

interface DetailHeroGeometry {
  titleFontSize: number;
  overlineFontSize: number;
  amountFontSize: number;
  codeFontSize: number;
  captionFontSize: number;
  badgeHeight: number;
  topHeight: number;
  amountHeight: number;
  height: number;
}

/** The loaded hero and its skeleton both stand at `height`; the amount line is fitted, so it keeps one device pixel of slack. */
export function resolveDetailHeroGeometry(fontScale: number): DetailHeroGeometry {
  const titleFontSize = scaledFontSize(Type.headline, fontScale);
  const overlineFontSize = scaledFontSize(Type.micro, fontScale);
  const captionFontSize = scaledFontSize(Type.micro, fontScale);
  const amountFontSize = scaledFontSize(
    Type.detailHero,
    fontScale,
    DETAIL_HERO_AMOUNT_MAX_FONT_SCALE,
  );
  const codeFontSize = scaledFontSize(Type.subhead, fontScale, DETAIL_HERO_AMOUNT_MAX_FONT_SCALE);
  const badgeHeight =
    lineHeightFor(scaledFontSize(Type.micro, fontScale)) + DETAIL_HERO_BADGE_CHROME;
  const topHeight = Math.max(
    Size.detailHeroTile,
    lineHeightFor(titleFontSize) + DETAIL_HERO_BADGE_GAP + badgeHeight,
  );
  const amountHeight = lineHeightFor(amountFontSize) + FITTED_LINE_SLACK;
  const height =
    2 * DETAIL_HERO_PADDING +
    topHeight +
    DETAIL_HERO_OVERLINE_GAP +
    lineHeightFor(overlineFontSize) +
    amountHeight +
    DETAIL_HERO_CAPTION_GAP +
    lineHeightFor(captionFontSize);

  return {
    titleFontSize,
    overlineFontSize,
    amountFontSize,
    codeFontSize,
    captionFontSize,
    badgeHeight,
    topHeight,
    amountHeight,
    height,
  };
}

export interface DetailSkeletonGeometry {
  rowHeights: readonly number[];
  showTransfer: boolean;
  showNote: boolean;
}

function transferLines(fontScale: number): number {
  return (
    scaledTextStyle(DETAIL_TRANSFER_LABEL_FONT_SIZE, fontScale).lineHeight +
    scaledTextStyle(DETAIL_TRANSFER_NAME_FONT_SIZE, fontScale).lineHeight +
    scaledTextStyle(DETAIL_TRANSFER_AMOUNT_FONT_SIZE, fontScale).lineHeight
  );
}

export function resolveTransferCellHeight(fontScale: number): number {
  return transferLines(fontScale) + DETAIL_TRANSFER_CELL_CHROME;
}

/** The card keeps its 1.0 space around the cell and never drops below its 1.0 height. */
export function resolveTransferCardHeight(fontScale: number): number {
  return Math.max(
    DETAIL_TRANSFER_MIN_HEIGHT,
    DETAIL_TRANSFER_MIN_HEIGHT + transferLines(fontScale) - transferLines(1),
  );
}

/** The `h-20` shape at scale 1 and below, the loaded cell's height above it. */
export function resolveTransferSkeletonCellHeight(fontScale: number): number {
  return fontScale <= 1
    ? DETAIL_TRANSFER_SKELETON_CELL_HEIGHT
    : resolveTransferCellHeight(fontScale);
}

/** A USD transaction's EGP amount, or what an EGP transfer or card payment delivered in USD; a stored rate means USD is involved. */
export function resolveDetailAmountRowFigure(
  transaction: Transaction,
): ConvertedAmount | undefined {
  if (transaction.currency === Currency.USD) {
    return { amount: transaction.egp_amount, currency: Currency.EGP };
  }
  if (
    requiresDestination(transaction.type) &&
    transaction.exchange_rate !== null &&
    transaction.to_amount !== null
  ) {
    return { amount: transaction.to_amount, currency: Currency.USD };
  }
  return undefined;
}

export type DetailFactSlot =
  | { kind: 'account' | 'category' | 'budget' | 'date' | 'time' | 'source' }
  | { kind: 'amount'; figure: ConvertedAmount }
  | { kind: 'rate'; rate: number };

export type DetailFactKind = DetailFactSlot['kind'];

/** The fact rows a transaction shows, in order, read from the transaction alone so the skeleton holds the same rows. */
export function resolveDetailFactSlots(transaction: Transaction): DetailFactSlot[] {
  const slots: DetailFactSlot[] = [];
  if (!requiresDestination(transaction.type)) slots.push({ kind: 'account' }, { kind: 'category' });
  if (transaction.budget_id !== null) slots.push({ kind: 'budget' });
  const figure = resolveDetailAmountRowFigure(transaction);
  if (figure) slots.push({ kind: 'amount', figure });
  if (transaction.exchange_rate !== null) {
    slots.push({ kind: 'rate', rate: transaction.exchange_rate });
  }
  slots.push({ kind: 'date' }, { kind: 'time' }, { kind: 'source' });
  return slots;
}

export function buildDetailSkeletonGeometry(
  transaction: Transaction,
  fontScale: number,
): DetailSkeletonGeometry {
  const showTransfer = requiresDestination(transaction.type);
  const rowHeight = resolveFactRowHeight(fontScale);
  const rowHeights = resolveDetailFactSlots(transaction).map(() => rowHeight);

  return {
    rowHeights,
    showTransfer,
    showNote: Boolean(transaction.note?.trim()),
  };
}
