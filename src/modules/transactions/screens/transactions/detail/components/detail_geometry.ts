import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { ms } from '@/utils/responsive';

export const DETAIL_HERO_MIN_HEIGHT = ms(190);
export const DETAIL_ROW_HEIGHT = ms(58);
export const DETAIL_ACCOUNT_ROW_HEIGHT = ms(70);
export const DETAIL_TRANSFER_MIN_HEIGHT = ms(126);
export const DETAIL_NOTE_MIN_HEIGHT = ms(82);
export const DETAIL_ACTION_MIN_HEIGHT = ms(92);

export interface DetailSkeletonGeometry {
  rowHeights: readonly number[];
  showTransfer: boolean;
  showNote: boolean;
}

export function buildDetailSkeletonGeometry(transaction: Transaction): DetailSkeletonGeometry {
  const showTransfer =
    transaction.type === TransactionType.Transfer || transaction.type === TransactionType.CCPayment;
  const rowHeights = [
    DETAIL_ROW_HEIGHT,
    DETAIL_ACCOUNT_ROW_HEIGHT,
    ...(transaction.budget_id ? [DETAIL_ROW_HEIGHT] : []),
    DETAIL_ROW_HEIGHT,
    ...(transaction.currency === Currency.USD ? [DETAIL_ROW_HEIGHT] : []),
    ...(transaction.exchange_rate !== null ? [DETAIL_ROW_HEIGHT] : []),
    DETAIL_ROW_HEIGHT,
  ];

  return {
    rowHeights,
    showTransfer,
    showNote: Boolean(transaction.note?.trim()),
  };
}
