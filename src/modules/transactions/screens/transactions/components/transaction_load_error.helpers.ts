import { Strings } from '@/constants/strings';

export type TransactionLoadErrorVariant = 'initial' | 'refresh' | 'totals' | 'pagination';

const TRANSACTION_LOAD_ERROR_TITLES: Record<TransactionLoadErrorVariant, string> = {
  initial: Strings.transactionsLoadError,
  refresh: Strings.transactionsRefreshError,
  totals: Strings.transactionsTotalsLoadError,
  pagination: Strings.transactionsLoadMoreError,
};

export function resolveTransactionLoadErrorTitle(variant: TransactionLoadErrorVariant): string {
  return TRANSACTION_LOAD_ERROR_TITLES[variant];
}
