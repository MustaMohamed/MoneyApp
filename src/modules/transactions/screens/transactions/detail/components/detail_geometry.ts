import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { ms } from '@/utils/responsive';

export const DETAIL_HERO_MIN_HEIGHT = ms(190);
export const DETAIL_ROW_HEIGHT = ms(58);
export const DETAIL_TRANSFER_MIN_HEIGHT = ms(126);
export const DETAIL_NOTE_MIN_HEIGHT = ms(82);
export const DETAIL_ACTION_MIN_HEIGHT = ms(92);

export interface DetailSkeletonGeometry {
  rowCount: number;
  showTransfer: boolean;
  showNote: boolean;
}

export function buildDetailSkeletonGeometry(
  transaction?: Transaction | null,
): DetailSkeletonGeometry {
  const showTransfer =
    transaction?.type === TransactionType.Transfer ||
    transaction?.type === TransactionType.CCPayment;
  const rowCount =
    4 +
    (transaction?.budget_id ? 1 : 0) +
    (transaction?.currency === Currency.USD ? 1 : 0) +
    (transaction?.exchange_rate !== null && transaction?.exchange_rate !== undefined ? 1 : 0);

  return {
    rowCount,
    showTransfer,
    showNote: Boolean(transaction?.note?.trim()),
  };
}
