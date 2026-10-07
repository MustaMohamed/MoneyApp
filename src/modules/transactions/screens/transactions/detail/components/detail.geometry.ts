import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Currency, TransactionType } from '@/constants/enums';
import { Type, lineHeightFor } from '@/constants/theme';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { ms } from '@/utils/responsive';

export const DETAIL_HERO_MIN_HEIGHT = ms(190);
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

export interface DetailSkeletonGeometry {
  rowHeights: readonly number[];
  showTransfer: boolean;
  showNote: boolean;
}

function lineBox(fontSize: number, fontScale: number): number {
  return lineHeightFor(scaledFontSize(fontSize, fontScale));
}

function rowLines(fontScale: number, reserveSublabel: boolean): number {
  const label = lineBox(DETAIL_ROW_LABEL_FONT_SIZE, fontScale);
  const lines = label + lineBox(DETAIL_ROW_VALUE_FONT_SIZE, fontScale);
  return reserveSublabel ? lines + label : lines;
}

function transferLines(fontScale: number): number {
  return (
    lineBox(DETAIL_TRANSFER_LABEL_FONT_SIZE, fontScale) +
    lineBox(DETAIL_TRANSFER_NAME_FONT_SIZE, fontScale) +
    lineBox(DETAIL_TRANSFER_AMOUNT_FONT_SIZE, fontScale)
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

/** Today's shape at scale 1 and below, the loaded cell's height above it. */
export function resolveTransferSkeletonCellHeight(fontScale: number): number {
  return fontScale <= 1
    ? DETAIL_TRANSFER_SKELETON_CELL_HEIGHT
    : resolveTransferCellHeight(fontScale);
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
    ...(transaction.currency === Currency.USD ? [rowHeight] : []),
    ...(transaction.exchange_rate !== null ? [rowHeight] : []),
    rowHeight,
  ];

  return {
    rowHeights,
    showTransfer,
    showNote: Boolean(transaction.note?.trim()),
  };
}
