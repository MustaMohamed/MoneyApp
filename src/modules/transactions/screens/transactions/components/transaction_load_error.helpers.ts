import { Strings } from '@/constants/strings';

// Not `TransactionLoadErrorVariant` in `../transactions.presentation.ts`, which picks the banner.
export type TransactionLoadErrorTitleVariant =
  | 'initial'
  | 'refresh'
  | 'totals'
  | 'accounts'
  | 'pagination';

const TRANSACTION_LOAD_ERROR_TITLES: Record<TransactionLoadErrorTitleVariant, string> = {
  initial: Strings.transactionsLoadError,
  refresh: Strings.transactionsRefreshError,
  totals: Strings.transactionsTotalsLoadError,
  accounts: Strings.transactionsAccountLookupError,
  pagination: Strings.transactionsLoadMoreError,
};

export function resolveTransactionLoadErrorTitle(
  variant: TransactionLoadErrorTitleVariant,
): string {
  return TRANSACTION_LOAD_ERROR_TITLES[variant];
}
