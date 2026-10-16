import { DISPLAY_HEADLINE_MAX_FONT_SCALE } from '@/components/ui/display_headline.geometry';
import { STATUS_BADGE_PADDING_VERTICAL } from '@/components/ui/status_badge';
import {
  FITTED_LINE_SLACK,
  scaledFontSize,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { Currency, TransactionType } from '@/constants/enums';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { requiresDestination } from '@/modules/transactions/domain/transaction_amounts';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
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
export const DETAIL_ROW_HEIGHT = ms(58);
export const DETAIL_ACCOUNT_ROW_HEIGHT = ms(70);
export const DETAIL_TRANSFER_MIN_HEIGHT = ms(126);
export const DETAIL_NOTE_MIN_HEIGHT = ms(82);
export const DETAIL_ACTION_MIN_HEIGHT = ms(92);
export const DETAIL_ROW_LABEL_FONT_SIZE = Type.overline;
export const DETAIL_ROW_VALUE_FONT_SIZE = Type.meta;
export const DETAIL_TRANSFER_LABEL_FONT_SIZE = Type.compactBadge;
export const DETAIL_TRANSFER_NAME_FONT_SIZE = Type.detail;
export const DETAIL_TRANSFER_AMOUNT_FONT_SIZE = Type.micro;
// Raw, never ms(): the transfer cell's `h-9` tile and its `mt-1.5`, `mt-1` and `mt-0.5` gaps.
const DETAIL_TRANSFER_CELL_CHROME = 48;
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

function rowLines(fontScale: number, reserveSublabel: boolean): number {
  const label = scaledTextStyle(DETAIL_ROW_LABEL_FONT_SIZE, fontScale).lineHeight;
  const lines = label + scaledTextStyle(DETAIL_ROW_VALUE_FONT_SIZE, fontScale).lineHeight;
  return reserveSublabel ? lines + label : lines;
}

function transferLines(fontScale: number): number {
  return (
    scaledTextStyle(DETAIL_TRANSFER_LABEL_FONT_SIZE, fontScale).lineHeight +
    scaledTextStyle(DETAIL_TRANSFER_NAME_FONT_SIZE, fontScale).lineHeight +
    scaledTextStyle(DETAIL_TRANSFER_AMOUNT_FONT_SIZE, fontScale).lineHeight
  );
}

/** The row keeps its 1.0 space around its lines and never drops below its 1.0 height. */
export function resolveDetailRowHeight(fontScale: number, reserveSublabel = false): number {
  const base = reserveSublabel ? DETAIL_ACCOUNT_ROW_HEIGHT : DETAIL_ROW_HEIGHT;
  return Math.max(base, base + rowLines(fontScale, reserveSublabel) - rowLines(1, reserveSublabel));
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

export interface DetailAmountRowFigure {
  amount: number;
  currency: Currency;
}

/** A USD transaction's EGP amount, or what an EGP transfer or card payment delivered in USD; a stored rate means USD is involved. */
export function resolveDetailAmountRowFigure(
  transaction: Transaction,
): DetailAmountRowFigure | undefined {
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

export function buildDetailSkeletonGeometry(
  transaction: Transaction,
  fontScale: number,
): DetailSkeletonGeometry {
  const showTransfer =
    transaction.type === TransactionType.Transfer || transaction.type === TransactionType.CCPayment;
  const rowHeight = resolveDetailRowHeight(fontScale);
  const rowHeights = [
    rowHeight,
    resolveDetailRowHeight(fontScale, true),
    ...(transaction.budget_id ? [rowHeight] : []),
    rowHeight,
    ...(resolveDetailAmountRowFigure(transaction) ? [rowHeight] : []),
    ...(transaction.exchange_rate !== null ? [rowHeight] : []),
    rowHeight,
  ];

  return {
    rowHeights,
    showTransfer,
    showNote: Boolean(transaction.note?.trim()),
  };
}
