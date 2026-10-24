import { resolveFactRowHeight } from '@/components/ui/fact_row.geometry';
import type { ConvertedAmount } from '@/components/ui/form_sheet.helpers';
import { resolveKeptSpaceHeight, scaledLineHeight } from '@/components/ui/text_scale.geometry';
import { Currency } from '@/constants/enums';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { requiresDestination } from '@/modules/transactions/domain/transaction_amounts';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { ms } from '@/utils/responsive';

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

export interface DetailSkeletonGeometry {
  rowHeights: readonly number[];
  showTransfer: boolean;
  showNote: boolean;
}

function transferLines(fontScale: number): number {
  return (
    scaledLineHeight(DETAIL_TRANSFER_LABEL_FONT_SIZE, fontScale) +
    scaledLineHeight(DETAIL_TRANSFER_NAME_FONT_SIZE, fontScale) +
    scaledLineHeight(DETAIL_TRANSFER_AMOUNT_FONT_SIZE, fontScale)
  );
}

export function resolveTransferCellHeight(fontScale: number): number {
  return transferLines(fontScale) + DETAIL_TRANSFER_CELL_CHROME;
}

/** The card keeps its 1.0 space around the cell and never drops below its 1.0 height. */
export function resolveTransferCardHeight(fontScale: number): number {
  return resolveKeptSpaceHeight(DETAIL_TRANSFER_MIN_HEIGHT, transferLines, fontScale);
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
